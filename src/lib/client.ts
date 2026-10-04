"use client";

// Browser-side data layer. Every screen reads live state through these hooks.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CaseMessage, CaseRecord, EvalReport, GuardianPublic, LiveEvent, PublicConfig } from "./types";

export interface LiveState {
  /** newest first */
  cases: CaseRecord[];
  byId: Record<string, CaseRecord>;
  config: PublicConfig | null;
  connected: boolean;
  /** caseId -> latest live frame number; bump means a new frame is at /api/cases/:id/frame?n= */
  frames: Record<string, number>;
  lastGuardian: GuardianPublic | null;
  evalReport: EvalReport | null;
  /** increments on every wall reset */
  resetCount: number;
  lastMessage: CaseMessage | null;
}

const KEY_STORAGE = "mdc-console-key";

export function consoleKey(): string {
  if (typeof window === "undefined") return "";
  const fromUrl = new URLSearchParams(window.location.search).get("key");
  if (fromUrl) {
    try {
      window.localStorage.setItem(KEY_STORAGE, fromUrl);
    } catch {}
    return fromUrl;
  }
  try {
    return window.localStorage.getItem(KEY_STORAGE) ?? "";
  } catch {
    return "";
  }
}

/** fetch wrapper for JSON APIs. Throws Error(message) on non-2xx. */
export async function api<T = unknown>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(path, {
    method: init?.method ?? (init?.body !== undefined ? "POST" : "GET"),
    headers: { "content-type": "application/json", "x-console-key": consoleKey() },
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string } & T;
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data;
}

/** One shared SSE connection per page. Reconnects automatically. */
export function useLive(): LiveState {
  const [cases, setCases] = useState<Record<string, CaseRecord>>({});
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [connected, setConnected] = useState(false);
  const [frames, setFrames] = useState<Record<string, number>>({});
  const [lastGuardian, setLastGuardian] = useState<GuardianPublic | null>(null);
  const [evalReport, setEvalReport] = useState<EvalReport | null>(null);
  const [resetCount, setResetCount] = useState(0);
  const [lastMessage, setLastMessage] = useState<CaseMessage | null>(null);
  const retry = useRef(0);

  useEffect(() => {
    let es: EventSource | null = null;
    let closed = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const open = () => {
      if (closed) return;
      es = new EventSource("/api/stream");
      es.onopen = () => {
        retry.current = 0;
        setConnected(true);
      };
      es.onmessage = (m) => {
        let ev: LiveEvent;
        try {
          ev = JSON.parse(m.data) as LiveEvent;
        } catch {
          return;
        }
        switch (ev.type) {
          case "hello": {
            const map: Record<string, CaseRecord> = {};
            for (const c of ev.cases) map[c.id] = c;
            setCases(map);
            setConfig(ev.config);
            break;
          }
          case "case":
            setCases((prev) => ({ ...prev, [ev.case.id]: ev.case }));
            break;
          case "frame":
            setFrames((prev) => ({ ...prev, [ev.caseId]: ev.n }));
            break;
          case "config":
            setConfig(ev.config);
            break;
          case "guardian":
            setLastGuardian(ev.guardian);
            break;
          case "eval":
            setEvalReport(ev.report);
            break;
          case "message":
            setLastMessage(ev.message);
            break;
          case "reset":
            setCases({});
            setFrames({});
            setResetCount((n) => n + 1);
            break;
        }
      };
      es.onerror = () => {
        setConnected(false);
        es?.close();
        retry.current = Math.min(retry.current + 1, 6);
        timer = setTimeout(open, 400 * retry.current);
      };
    };
    open();
    return () => {
      closed = true;
      if (timer) clearTimeout(timer);
      es?.close();
    };
  }, []);

  const list = useMemo(() => Object.values(cases).sort((a, b) => b.createdAt - a.createdAt), [cases]);
  return { cases: list, byId: cases, config, connected, frames, lastGuardian, evalReport, resetCount, lastMessage };
}

export interface GuardianAlert {
  caseId: string;
  line: string;
  at: number;
}

/**
 * Keeps a guardian's page "on duty": while it is open the server knows it can deliver
 * the heads-up on screen, and this returns each alert as it lands.
 */
export function useGuardianAlert(guardianId: string | null | undefined): GuardianAlert | null {
  const [alert, setAlert] = useState<GuardianAlert | null>(null);
  useEffect(() => {
    if (!guardianId) return;
    let es: EventSource | null = null;
    let closed = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const open = () => {
      if (closed) return;
      es = new EventSource(`/api/stream?guardian=${encodeURIComponent(guardianId)}`);
      es.onmessage = (m) => {
        try {
          const ev = JSON.parse(m.data) as LiveEvent;
          if (ev.type === "alert" && ev.guardianId === guardianId) setAlert({ caseId: ev.caseId, line: ev.line, at: ev.at });
        } catch {}
      };
      es.onerror = () => {
        es?.close();
        timer = setTimeout(open, 1500);
      };
    };
    open();
    return () => {
      closed = true;
      if (timer) clearTimeout(timer);
      es?.close();
    };
  }, [guardianId]);
  return alert;
}

/** A single case, kept live. `messages` are the follow-up Q&A for that case. */
export function useCase(id: string): {
  item: CaseRecord | null;
  messages: CaseMessage[];
  loading: boolean;
  notFound: boolean;
  frame: number;
  config: PublicConfig | null;
  refresh: () => void;
} {
  const live = useLive();
  const [initial, setInitial] = useState<CaseRecord | null>(null);
  const [messages, setMessages] = useState<CaseMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const refresh = useCallback(() => {
    api<{ case: CaseRecord; messages: CaseMessage[] }>(`/api/cases/${id}`)
      .then((d) => {
        setInitial(d.case);
        setMessages(d.messages);
        setNotFound(false);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const m = live.lastMessage;
    if (!m || m.caseId !== id) return;
    setMessages((prev) => (prev.some((p) => p.id === m.id) ? prev : [...prev, m]));
  }, [live.lastMessage, id]);

  // the stream carries no raw text (it feeds shared screens); keep the copy this page fetched
  const fresh = live.byId[id];
  const item = fresh ? { ...fresh, rawText: fresh.rawText || initial?.rawText || "" } : initial;
  return { item, messages, loading, notFound, frame: live.frames[id] ?? 0, config: live.config, refresh };
}

/** Mask an address for public screens: "ja***@gmail.com" */
export function maskEmail(email?: string | null): string {
  if (!email) return "";
  const [user, host] = email.split("@");
  if (!host) return email;
  return `${user.slice(0, 2)}${"•".repeat(Math.max(2, Math.min(5, user.length - 2)))}@${host}`;
}

/** hxxps://evil[.]example/path — safe to print on any screen. */
export function defang(url?: string | null): string {
  if (!url) return "";
  return url.replace(/^http/i, "hxxp").replace(/\./g, "[.]");
}

export function timeAgo(ts: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

/** Re-render every `ms` so relative times and elapsed timers stay fresh. */
export function useNow(ms = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}
