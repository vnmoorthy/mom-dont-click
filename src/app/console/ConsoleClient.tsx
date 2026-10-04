"use client";

// The presenter console: everything needed to run the live demo from one screen.
import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  ClipboardPaste,
  History,
  KeyRound,
  LoaderCircle,
  MonitorPlay,
  Send,
  Trash2,
  UserPlus,
} from "lucide-react";
import { consoleKey, maskEmail, useLive } from "@/lib/client";
import type { CaseRecord, GuardianPublic, PublicConfig, SeedInfo } from "@/lib/types";
import { LiveDot, VerdictBadge, Wordmark, cx } from "@/components/ui/kit";
import { Ago, CopyButton, Elapsed, Switch, formatMs } from "@/components/home/bits";
import { RunOfShow } from "./RunOfShow";

/* ---------- console API (needs the HTTP status to notice a 401) ---------- */

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function call<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: init?.method ?? (init?.body !== undefined ? "POST" : "GET"),
      headers: { "content-type": "application/json", "x-console-key": consoleKey() },
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
    });
  } catch {
    throw new HttpError(0, "Can't reach the server.");
  }
  const data = (await res.json().catch(() => ({}))) as { error?: string } & T;
  if (!res.ok) throw new HttpError(res.status, data?.error || `Request failed (${res.status})`);
  return data;
}

function messageOf(e: unknown, fallback: string): string {
  if (e instanceof HttpError) {
    if (e.status === 401) return "Needs the console key.";
    if (e.status === 0 || e.status >= 500 || e.status === 404) return fallback;
    return e.message;
  }
  return fallback;
}

interface ConsoleStatus {
  config: PublicConfig;
  counts: { cases: number; guardians: number };
  inbox: { email: string | null; lastPollAt: number | null; lastError: string | null };
  warmBrowser: boolean;
}

type Fired = { state: "idle" | "sending" | "sent" | "error"; at: number; caseId?: string; message?: string };
type Level = "ok" | "warn" | "bad" | "off";

const KEY_STORAGE = "mdc-console-key";

/* ---------- the page ---------- */

export function ConsoleClient() {
  const live = useLive();

  const [status, setStatus] = useState<ConsoleStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [needsKey, setNeedsKey] = useState(false);
  const [keyVersion, setKeyVersion] = useState(0);

  const [seeds, setSeeds] = useState<SeedInfo[] | null>(null);
  const [seedsError, setSeedsError] = useState<string | null>(null);
  const [seedsTry, setSeedsTry] = useState(0);
  const [viaEmail, setViaEmail] = useState(false);
  const [fired, setFired] = useState<Record<string, Fired>>({});

  const [guardians, setGuardians] = useState<GuardianPublic[]>([]);
  const [guardCount, setGuardCount] = useState<number | null>(null);
  const [guardTick, setGuardTick] = useState(0);

  /** Every console request goes through here so a 401 anywhere reveals the key box. */
  const guarded = useCallback(async <T,>(path: string, init?: { method?: string; body?: unknown }): Promise<T> => {
    try {
      return await call<T>(path, init);
    } catch (e) {
      if (e instanceof HttpError && e.status === 401) setNeedsKey(true);
      throw e;
    }
  }, []);

  // status, every 3 seconds
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const s = await guarded<ConsoleStatus>("/api/console/status");
        if (!alive) return;
        setStatus(s);
        setStatusError(null);
      } catch (e) {
        if (!alive) return;
        setStatusError(messageOf(e, "Can't reach the server. Trying again every few seconds."));
      }
    };
    void tick();
    const t = setInterval(tick, 3000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [guarded, keyVersion]);

  // seeds (retries by itself until the backend answers)
  useEffect(() => {
    let alive = true;
    let retry: ReturnType<typeof setTimeout> | null = null;
    guarded<{ seeds: SeedInfo[] }>("/api/seeds")
      .then((d) => {
        if (!alive) return;
        setSeeds(Array.isArray(d.seeds) ? d.seeds : []);
        setSeedsError(null);
      })
      .catch((e) => {
        if (!alive) return;
        setSeedsError(messageOf(e, "The example emails have not loaded yet. Trying again."));
        retry = setTimeout(() => setSeedsTry((n) => n + 1), 4000);
      });
    return () => {
      alive = false;
      if (retry) clearTimeout(retry);
    };
  }, [guarded, keyVersion, seedsTry]);

  // guardians
  useEffect(() => {
    let alive = true;
    guarded<{ guardians: GuardianPublic[]; count: number }>("/api/guard")
      .then((d) => {
        if (!alive) return;
        const list = Array.isArray(d.guardians) ? d.guardians : [];
        setGuardians(list);
        setGuardCount(typeof d.count === "number" ? d.count : list.length);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [guarded, keyVersion, guardTick, live.lastGuardian, live.resetCount]);

  const config = status?.config ?? live.config;
  const caps = config?.capabilities;
  const emailOn = !!caps?.email;
  const sendViaEmail = viaEmail && emailOn;

  /* ----- firing seeds ----- */
  const viaRef = useRef(sendViaEmail);
  viaRef.current = sendViaEmail;

  const fire = useCallback(
    async (seed: SeedInfo) => {
      const stamp = Date.now();
      setFired((p) => ({ ...p, [seed.id]: { ...p[seed.id], state: "sending", at: stamp, message: undefined } }));
      try {
        const res = await guarded<{ id?: string }>("/api/console/seed", {
          body: { seedId: seed.id, viaEmail: viaRef.current },
        });
        setFired((p) => ({ ...p, [seed.id]: { state: "sent", at: stamp, caseId: res.id || p[seed.id]?.caseId } }));
        window.setTimeout(() => {
          setFired((p) => (p[seed.id]?.at === stamp ? { ...p, [seed.id]: { ...p[seed.id], state: "idle" } } : p));
        }, 2800);
      } catch (e) {
        setFired((p) => ({
          ...p,
          [seed.id]: { ...p[seed.id], state: "error", at: stamp, message: messageOf(e, "Could not send. Try again.") },
        }));
      }
    },
    [guarded],
  );

  const seedsRef = useRef<SeedInfo[]>([]);
  seedsRef.current = seeds ?? [];
  const fireRef = useRef(fire);
  fireRef.current = fire;

  // number keys 1-9 fire the matching seed
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      if (e.key.length !== 1 || e.key < "1" || e.key > "9") return;
      const seed = seedsRef.current[Number(e.key) - 1];
      if (!seed) return;
      e.preventDefault();
      void fireRef.current(seed);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (live.resetCount > 0) setFired({});
  }, [live.resetCount]);

  /* ----- console key ----- */
  const saveKey = useCallback((key: string) => {
    try {
      window.localStorage.setItem(KEY_STORAGE, key);
      // a stale ?key= in the address bar would win over the saved one, so drop it
      const url = new URL(window.location.href);
      if (url.searchParams.has("key")) {
        url.searchParams.delete("key");
        window.history.replaceState(null, "", url.toString());
      }
    } catch {
      // private mode: the key simply will not persist
    }
    setNeedsKey(false);
    setKeyVersion((n) => n + 1);
  }, []);

  const counts = status?.counts ?? { cases: live.cases.length, guardians: guardCount ?? 0 };

  return (
    <div className="paper-grain min-h-dvh bg-paper text-ink">
      <header className="sticky top-0 z-20 border-b border-line bg-paper/92 backdrop-blur">
        <div className="mx-auto flex max-w-[1560px] flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3">
          <Link href="/" aria-label="Mom, Don't Click, home" className="rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-scam">
            <Wordmark size="sm" />
          </Link>
          <span className="border-l border-line pl-5 font-mono text-[11px] uppercase tracking-[0.22em] text-ink-3">
            Presenter console
          </span>
          <div className="ml-auto flex flex-wrap items-center gap-x-5 gap-y-1 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-3">
            <span className="flex items-center gap-2">
              {live.connected ? <LiveDot /> : <i className="inline-block size-2 rounded-full bg-warn" />}
              {live.connected ? "live feed on" : "live feed reconnecting"}
            </span>
            <span className="tabular">
              <b className="text-ink">{counts.cases}</b> cases
            </span>
            <span className="tabular">
              <b className="text-ink">{counts.guardians}</b> guardians
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1560px] px-5 pb-16 pt-5">
        {needsKey && <KeyPrompt onSave={saveKey} />}
        {statusError && !needsKey && (
          <div role="status" className="mb-5 rounded-2xl border border-warn/50 bg-warn-soft px-4 py-3 text-sm font-semibold text-warn-deep">
            {statusError}
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
          <div className="min-w-0 space-y-5 xl:col-span-8">
            <Panel
              title="Send as Mom"
              hint="Press 1 to 9, or click. Each one goes through the same steps as a forwarded email."
              right={
                <Switch
                  checked={sendViaEmail}
                  onChange={setViaEmail}
                  disabled={!emailOn}
                  label="Send through real email"
                  hint={emailOn ? "Goes out and comes back through the inbox." : "Email is off, so examples go straight in."}
                />
              }
            >
              {seeds === null ? (
                <p className="py-8 text-center text-sm text-ink-3">{seedsError ?? "Loading the example emails…"}</p>
              ) : seeds.length === 0 ? (
                <p className="py-8 text-center text-sm text-ink-3">There are no example emails on this server.</p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {seeds.map((s, i) => (
                    <SeedCard key={s.id} seed={s} index={i} fired={fired[s.id]} known={live.byId} onFire={fire} />
                  ))}
                </div>
              )}
            </Panel>

            <Panel
              title="Cases"
              hint={live.cases.length ? "Newest first. Each row opens the case in a new tab." : undefined}
              right={<span className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-4 tabular">{live.cases.length} on the wall</span>}
            >
              <CaseList cases={live.cases} connected={live.connected} />
            </Panel>
          </div>

          <aside className="min-w-0 space-y-5 xl:col-span-4">
            <Panel title="Run of show" hint="Two minutes on stage, one minute of questions.">
              <RunOfShow />
            </Panel>

            <Panel title="Stage controls">
              <StageControls config={config} guarded={guarded} onConfig={(c) => setStatus((s) => (s ? { ...s, config: c } : s))} />
            </Panel>

            <Panel title="What is switched on" hint="Amber means a fallback is doing the job.">
              <Capabilities config={config} status={status} />
            </Panel>

            <Panel title="Demo guardian" hint={`Who gets the heads-up when ${config?.demoMom.name ?? "Mom"} is sent a scam.`}>
              <GuardianForm
                config={config}
                guardians={guardians}
                count={guardCount}
                guarded={guarded}
                onSaved={() => setGuardTick((n) => n + 1)}
              />
            </Panel>
          </aside>
        </div>
      </main>
    </div>
  );
}

/* ---------- pieces ---------- */

function Panel({
  title,
  hint,
  right,
  children,
}: {
  title: string;
  hint?: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[22px] border border-line bg-white/60 p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h2 className="font-display text-xl font-extrabold leading-none tracking-tight text-ink">{title}</h2>
          {hint && <p className="mt-1.5 text-sm leading-snug text-ink-3">{hint}</p>}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

function KeyPrompt({ onSave }: { onSave: (key: string) => void }) {
  const [draft, setDraft] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const key = draft.trim();
    if (key) onSave(key);
  };
  return (
    <form
      onSubmit={submit}
      className="mb-5 flex flex-wrap items-center gap-3 rounded-[22px] border-2 border-warn bg-warn-soft px-5 py-4 animate-rise"
    >
      <KeyRound size={20} className="shrink-0 text-warn-deep" />
      <label htmlFor="console-key" className="mr-auto text-[15px] font-semibold text-ink">
        This console is locked. Enter the console key to use the controls.
      </label>
      <input
        id="console-key"
        type="password"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        autoComplete="off"
        spellCheck={false}
        placeholder="Console key"
        className="h-10 w-56 rounded-xl border border-line bg-white px-3 font-mono text-sm text-ink placeholder:text-ink-4 focus:border-ink focus:outline-none"
      />
      <button
        type="submit"
        disabled={!draft.trim()}
        className="h-10 rounded-xl bg-ink px-4 text-sm font-semibold text-cream hover:bg-ink-2 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-scam"
      >
        Save and retry
      </button>
    </form>
  );
}

/** Print a sender line without leaving a live-looking address on screen. */
function defangSender(from: string): string {
  return from.replace(/\S+@\S+/g, (m) => m.replace(/\./g, "[.]"));
}

function SeedCard({
  seed,
  index,
  fired,
  known,
  onFire,
}: {
  seed: SeedInfo;
  index: number;
  fired?: Fired;
  known: Record<string, CaseRecord>;
  onFire: (seed: SeedInfo) => void;
}) {
  const state = fired?.state ?? "idle";
  const hotkey = index < 9 ? String(index + 1) : null;
  const caseId = fired?.caseId && known[fired.caseId] ? fired.caseId : undefined;

  return (
    <article
      className={cx(
        "flex min-w-0 flex-col rounded-2xl border bg-white/80 p-3.5 transition-[border-color,box-shadow] duration-200",
        state === "sent" ? "border-ink shadow-[0_0_0_3px_rgba(23,19,15,0.08)]" : state === "error" ? "border-scam/60" : "border-line",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        {hotkey ? (
          <kbd className="grid size-7 place-items-center rounded-lg border border-line bg-paper font-mono text-sm font-bold text-ink">
            {hotkey}
          </kbd>
        ) : (
          <span />
        )}
        <span className="flex items-center gap-1.5">
          <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-4">expect</span>
          <VerdictBadge verdict={seed.expected} size="sm" />
        </span>
      </div>

      <h3 className="mt-3 font-display text-lg font-extrabold leading-tight tracking-tight text-ink">{seed.label}</h3>
      <div className="mt-1 line-clamp-1 text-sm font-semibold text-ink-2">{seed.subject}</div>
      <p className="mt-1 line-clamp-2 text-sm leading-snug text-ink-3">{seed.preview}</p>
      <div className="mt-2 truncate font-mono text-[10px] text-ink-4" title={defangSender(seed.from)}>
        from {defangSender(seed.from)}
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
        <button
          type="button"
          onClick={() => onFire(seed)}
          disabled={state === "sending"}
          className={cx(
            "inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-[transform,background-color] active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-scam disabled:cursor-wait",
            state === "sent" ? "bg-ink text-cream" : "bg-scam text-cream hover:bg-scam-deep",
          )}
        >
          {state === "sending" ? (
            <>
              <LoaderCircle size={14} className="animate-spin" /> Sending
            </>
          ) : state === "sent" ? (
            <>
              <Check size={14} strokeWidth={3} /> Sent
            </>
          ) : (
            <>
              <Send size={14} /> Send as Mom
            </>
          )}
        </button>
        {seed.hasPage && (
          <span className="rounded-full border border-line px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-3">
            has training page
          </span>
        )}
        {caseId && (
          <a
            href={`/case/${caseId}`}
            target="_blank"
            rel="noopener"
            className="ml-auto inline-flex items-center gap-0.5 text-xs font-semibold text-ink-2 underline decoration-line decoration-2 underline-offset-2 hover:decoration-ink"
          >
            last case <ArrowUpRight size={12} />
          </a>
        )}
      </div>
      {state === "error" && (
        <p role="alert" className="mt-2 text-xs font-semibold text-scam-deep">
          {fired?.message}
        </p>
      )}
    </article>
  );
}

function CaseList({ cases, connected }: { cases: CaseRecord[]; connected: boolean }) {
  if (cases.length === 0) {
    return (
      <p className="rounded-2xl border-2 border-dashed border-line px-4 py-10 text-center text-sm text-ink-3">
        {connected
          ? "The wall is empty. Press 1 to send the first email as Mom."
          : "Waiting for the live feed. Cases will appear here as soon as it connects."}
      </p>
    );
  }
  return (
    <ul className="-mx-2 max-h-[560px] divide-y divide-line/70 overflow-y-auto">
      {cases.map((c) => {
        const active = c.status !== "done" && c.status !== "error";
        const line = c.status === "done" ? c.headline : c.status === "error" ? (c.error ?? "Something went wrong") : c.stage;
        return (
          <li key={c.id}>
            <a
              href={`/case/${c.id}`}
              target="_blank"
              rel="noopener"
              className="group flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-paper-2/70 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-scam"
            >
              <span className="grid w-4 shrink-0 place-items-center">{active && <LiveDot />}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[15px] font-semibold text-ink">{c.subject || "Untitled"}</span>
                  {c.seenBefore && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-paper-2 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-3">
                      <History size={10} /> seen before
                    </span>
                  )}
                </div>
                <div className={cx("truncate text-xs", c.status === "error" ? "text-scam-deep" : "text-ink-3")}>
                  <span className="font-mono uppercase tracking-wider text-ink-4">{c.status}</span>
                  {line ? ` · ${line}` : ""}
                </div>
              </div>
              <span className="hidden w-40 shrink-0 truncate text-right font-mono text-[10px] text-ink-4 lg:block">
                {c.channel}
                {c.senderEmail ? ` · ${maskEmail(c.senderEmail)}` : ""}
              </span>
              <span className="hidden w-16 shrink-0 text-right font-mono text-[10px] text-ink-4 md:block">
                <Ago ts={c.createdAt} />
              </span>
              {c.status === "error" ? (
                <span className="shrink-0 rounded-full border border-scam/50 px-2.5 py-0.5 font-display text-[11px] font-extrabold uppercase tracking-wide text-scam-deep">
                  Error
                </span>
              ) : (
                <VerdictBadge verdict={c.verdict} size="sm" className="shrink-0" />
              )}
              <span className="w-12 shrink-0 text-right font-mono text-xs text-ink-2 tabular">
                {active ? <Elapsed since={c.createdAt} /> : formatMs(c.durationMs) || "–"}
              </span>
              <ArrowUpRight size={14} className="shrink-0 text-ink-4 group-hover:text-ink" />
            </a>
          </li>
        );
      })}
    </ul>
  );
}

function StageControls({
  config,
  guarded,
  onConfig,
}: {
  config: PublicConfig | null;
  guarded: <T>(path: string, init?: { method?: string; body?: unknown }) => Promise<T>;
  onConfig: (c: PublicConfig) => void;
}) {
  const [reset, setReset] = useState<"idle" | "confirm" | "working" | "done">("idle");
  const [resetError, setResetError] = useState<string | null>(null);
  const [preferPending, setPreferPending] = useState<boolean | null>(null);
  const [preferError, setPreferError] = useState<string | null>(null);

  // the confirm step quietly backs out if nobody presses it
  useEffect(() => {
    if (reset !== "confirm" && reset !== "done") return;
    const t = setTimeout(() => setReset("idle"), reset === "confirm" ? 6000 : 2400);
    return () => clearTimeout(t);
  }, [reset]);

  const doReset = async () => {
    setReset("working");
    setResetError(null);
    try {
      await guarded<{ ok: true }>("/api/console/reset", { method: "POST", body: {} });
      setReset("done");
    } catch (e) {
      setReset("idle");
      setResetError(messageOf(e, "The reset did not go through. Try again."));
    }
  };

  const [pacePending, setPacePending] = useState<number | null>(null);
  const setPace = async (next: number) => {
    setPacePending(next);
    try {
      const r = await guarded<{ config: PublicConfig }>("/api/console/settings", { body: { stagePace: next } });
      if (r.config) onConfig(r.config);
    } catch (e) {
      setPreferError(messageOf(e, "Could not change that setting. Try again."));
    } finally {
      setPacePending(null);
    }
  };

  const setPrefer = async (next: boolean) => {
    setPreferPending(next);
    setPreferError(null);
    try {
      const r = await guarded<{ config: PublicConfig }>("/api/console/settings", { body: { preferLiveView: next } });
      if (r.config) onConfig(r.config);
    } catch (e) {
      setPreferError(messageOf(e, "Could not change that setting. Try again."));
    } finally {
      setPreferPending(null);
    }
  };

  const tile =
    "flex items-center gap-2 rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm font-semibold text-ink transition-[transform,border-color] hover:border-ink active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-scam";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5">
        <button type="button" onClick={() => window.open("/wall", "mdc-wall")} className={tile}>
          <MonitorPlay size={17} className="shrink-0" /> Open the wall
        </button>
        <button type="button" onClick={() => window.open("/check", "mdc-check")} className={tile}>
          <ClipboardPaste size={17} className="shrink-0" /> Open the paste form
        </button>
      </div>

      {config?.inboxEmail && (
        <div className="flex items-center gap-2 rounded-2xl border border-line bg-paper px-4 py-2.5">
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-4">The room forwards to</div>
            <div className="truncate font-mono text-sm font-bold text-ink">{config.inboxEmail}</div>
          </div>
          <CopyButton text={config.inboxEmail} className="px-3 py-1.5 text-xs" />
        </div>
      )}

      <Switch
        checked={preferPending ?? config?.preferLiveView ?? false}
        onChange={setPrefer}
        disabled={!config || preferPending !== null}
        label="Prefer Kernel live view on the wall"
        hint={
          config && config.capabilities.browser !== "kernel"
            ? "Kernel is not the active browser, so the wall shows screenshots either way."
            : "On: the real browser, streamed. Off: a steady stream of screenshots."
        }
      />
      {preferError && (
        <p role="alert" className="text-xs font-semibold text-scam-deep">
          {preferError}
        </p>
      )}
      <Switch
        checked={(pacePending ?? config?.stagePace ?? 1) > 1}
        onChange={(on: boolean) => setPace(on ? 2.2 : 1)}
        disabled={!config || pacePending !== null}
        label="Stage pace"
        hint="Slows the browser walk down so the room can follow each step. Verdicts are unchanged."
      />

      <div className="border-t border-line pt-4">
        {reset === "confirm" ? (
          <div className="flex flex-wrap items-center gap-2 animate-rise">
            <span className="mr-auto text-sm font-semibold text-ink">Clear every case off the wall?</span>
            <button
              type="button"
              onClick={doReset}
              className="h-9 rounded-full bg-scam px-4 text-sm font-semibold text-cream hover:bg-scam-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              Yes, reset
            </button>
            <button
              type="button"
              onClick={() => setReset("idle")}
              className="h-9 rounded-full border border-line px-4 text-sm font-semibold text-ink hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-scam"
            >
              Keep them
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setReset("confirm")}
            disabled={reset === "working"}
            className="inline-flex h-9 items-center gap-2 rounded-full border border-scam/50 px-4 text-sm font-semibold text-scam-deep transition-colors hover:bg-scam-soft disabled:cursor-wait focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-scam"
          >
            {reset === "working" ? (
              <>
                <LoaderCircle size={14} className="animate-spin" /> Resetting
              </>
            ) : reset === "done" ? (
              <>
                <Check size={14} strokeWidth={3} /> The wall is clear
              </>
            ) : (
              <>
                <Trash2 size={14} /> Reset the wall
              </>
            )}
          </button>
        )}
        {resetError && (
          <p role="alert" className="mt-2 text-xs font-semibold text-scam-deep">
            {resetError}
          </p>
        )}
      </div>
    </div>
  );
}

const DOT: Record<Level, string> = {
  ok: "bg-calm",
  warn: "bg-warn",
  bad: "bg-scam",
  off: "border border-ink-4 bg-transparent",
};

function Capabilities({ config, status }: { config: PublicConfig | null; status: ConsoleStatus | null }) {
  if (!config) {
    return <p className="py-4 text-sm text-ink-3">Waiting for the server to say what is switched on…</p>;
  }
  const c = config.capabilities;
  const inbox = status?.inbox;

  const reader: Record<typeof c.llm, [string, Level]> = {
    "neon-gateway": ["Neon AI Gateway", "ok"],
    openai: ["OpenAI", "ok"],
    anthropic: ["Anthropic", "ok"],
    rules: ["rule-based fallback", "warn"],
  };
  const browser: Record<typeof c.browser, [string, Level]> = {
    kernel: ["Kernel cloud browser", "ok"],
    playwright: ["local sandbox browser", "ok"],
    fetch: ["safe fetch only", "warn"],
    none: ["off", "warn"],
  };
  const [readerText, readerLevel] = reader[c.llm] ?? [String(c.llm), "warn"];
  const [browserText, browserLevel] = browser[c.browser] ?? [String(c.browser), "warn"];
  const emailAddress = inbox?.email ?? config.inboxEmail;

  const rows: Array<{ name: string; value: ReactNode; level: Level; note?: ReactNode }> = [
    { name: "Reader", value: readerText, level: readerLevel },
    { name: "Browser", value: browserText, level: browserLevel },
    { name: "Web search", value: c.search ? "Exa on" : "off", level: c.search ? "ok" : "warn" },
    {
      name: "Email",
      value: c.email ? (emailAddress ?? "AgentMail on") : "off · paste form only",
      level: inbox?.lastError ? "bad" : c.email ? "ok" : "warn",
      note:
        c.email && inbox ? (
          <>
            {inbox.lastPollAt ? (
              <span>
                inbox last checked <Ago ts={inbox.lastPollAt} />
              </span>
            ) : (
              <span>inbox not checked yet</span>
            )}
            {inbox.lastError && <span className="block font-semibold text-scam-deep">{inbox.lastError}</span>}
          </>
        ) : undefined,
    },
    { name: "Database", value: c.db === "neon" ? "Neon Postgres" : "PGlite (local)", level: c.db === "neon" ? "ok" : "warn" },
    { name: "Workflow", value: c.workflow === "mastra" ? "Mastra" : "direct", level: c.workflow === "mastra" ? "ok" : "off" },
    {
      name: "Warm browser",
      value: status ? (status.warmBrowser ? "yes, one is waiting" : "no, first open is slower") : "unknown",
      level: status?.warmBrowser ? "ok" : "off",
    },
  ];

  return (
    <dl className="divide-y divide-line/70">
      {rows.map((r) => (
        <div key={r.name} className="flex items-start gap-3 py-2.5">
          <i className={cx("mt-1.5 inline-block size-2.5 shrink-0 rounded-full", DOT[r.level])} />
          <dt className="w-28 shrink-0 text-sm font-semibold text-ink">{r.name}</dt>
          <dd className="min-w-0 flex-1 text-right">
            <div
              className={cx(
                "break-words font-mono text-[13px]",
                r.level === "warn" ? "text-warn-deep" : r.level === "bad" ? "text-scam-deep" : "text-ink-2",
              )}
            >
              {r.value}
            </div>
            {r.note && <div className="mt-0.5 text-[11px] leading-snug text-ink-4">{r.note}</div>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function GuardianForm({
  config,
  guardians,
  count,
  guarded,
  onSaved,
}: {
  config: PublicConfig | null;
  guardians: GuardianPublic[];
  count: number | null;
  guarded: <T>(path: string, init?: { method?: string; body?: unknown }) => Promise<T>;
  onSaved: () => void;
}) {
  const momName = config?.demoMom.name ?? "Mom";
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<GuardianPublic | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const guardianEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guardianEmail)) {
      setError("That email address does not look right.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // parentEmail is left out on purpose: that guards the demo persona.
      const r = await guarded<{ guardian: GuardianPublic }>("/api/guard", {
        body: { guardianEmail, parentName: name.trim() || momName },
      });
      setSaved(r.guardian ?? null);
      setEmail("");
      onSaved();
    } catch (err) {
      setError(messageOf(err, "Could not save that just now. Try again."));
    } finally {
      setBusy(false);
    }
  };

  const field =
    "h-10 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink placeholder:text-ink-4 focus:border-ink focus:outline-none";

  return (
    <div>
      <form onSubmit={submit} noValidate className="grid grid-cols-1 gap-2.5 sm:grid-cols-[1fr_7.5rem_auto] xl:grid-cols-1 2xl:grid-cols-[1fr_7.5rem_auto]">
        <div>
          <label htmlFor="guardian-email" className="sr-only">
            Email that gets the heads-up
          </label>
          <input
            id="guardian-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError(null);
            }}
            placeholder="Email that gets the heads-up"
            aria-invalid={!!error}
            className={field}
          />
        </div>
        <div>
          <label htmlFor="guardian-parent" className="sr-only">
            What you call her
          </label>
          <input
            id="guardian-parent"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={momName}
            autoComplete="off"
            className={field}
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-ink px-4 text-sm font-semibold text-cream hover:bg-ink-2 disabled:cursor-wait disabled:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-scam"
        >
          {busy ? <LoaderCircle size={14} className="animate-spin" /> : <UserPlus size={14} />}
          Guard {name.trim() || momName}
        </button>
      </form>
      {error && (
        <p role="alert" className="mt-2 text-xs font-semibold text-scam-deep">
          {error}
        </p>
      )}
      {saved && !error && (
        <p role="status" className="mt-2 text-xs font-semibold text-ink-2 animate-rise">
          Done. Heads-ups about {saved.parentName} go to {saved.guardianEmailMasked}.
        </p>
      )}

      <div className="mt-4 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-ink-4">
        <span>On guard now</span>
        <span className="tabular">{count ?? guardians.length}</span>
      </div>
      {guardians.length === 0 ? (
        <p className="mt-2 text-sm text-ink-3">Nobody yet. Add yourself so your phone buzzes on stage.</p>
      ) : (
        <ul className="mt-1 max-h-48 divide-y divide-line/70 overflow-y-auto">
          {guardians.map((g) => (
            <li key={g.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span className="min-w-0 truncate font-mono text-[13px] text-ink-2">{g.guardianEmailMasked}</span>
              <span className="shrink-0 text-xs text-ink-3">
                guards <b className="font-semibold text-ink">{g.parentName}</b>
                {g.parentEmailMasked ? ` (${g.parentEmailMasked})` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
