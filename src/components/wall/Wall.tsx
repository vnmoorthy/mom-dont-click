"use client";

// The big screen. Driven entirely by useLive(): it only watches, it never calls the API.
//
//   idle    the invitation (address + QR) beside the grid of answered cases
//   hero    a case is being worked on: live browser + evidence arriving
//   slam    a verdict just landed: the whole screen floods with its colour
//
// Sizes are written in rem as if for a 1920x1080 canvas; the root font size follows the
// viewport, so the same composition holds on a 720p projector, a laptop or a 4K screen.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useLive } from "@/lib/client";
import type { CaseRecord, PublicConfig } from "@/lib/types";
import { cx } from "@/components/ui/kit";
import { EASE_OUT } from "./bits";
import { CaseGrid } from "./CaseGrid";
import { GuardianToasts, type ToastEntry } from "./GuardianToast";
import { Hero } from "./Hero";
import { HintBar } from "./HintBar";
import { Invitation } from "./Invitation";
import { VerdictSlam } from "./VerdictSlam";
import { WallHeader } from "./WallHeader";
import { capabilityList, finishedAt, hostOf, isActive, median, sameSet, secs } from "./util";

interface SlamEntry {
  key: string;
  id: string;
  replay: boolean;
}

interface Observed {
  sig: string;
  at: number;
  moved: boolean;
}

/** A case that shows no progress for this long stops holding the big screen hostage. */
const STALE_AFTER_MS = 90_000;
/** Still "in progress" this long after it was sent, and never seen moving: left over from earlier. */
const ANCIENT_AFTER_MS = 10 * 60_000;
/** Verdicts allowed to wait behind the one on screen. Older ones go straight to the grid. */
const MAX_WAITING = 4;
const HINT_IDLE_MS = 6000;
const NONE: ReadonlySet<string> = new Set<string>();

const WALL_CSS = `
html{font-size:clamp(10px,min(0.8333vw,1.4815vh),44px);background:#0d0b09}
@media (max-width:1023px){html{font-size:15px}}
.wall-idle,.wall-idle *{cursor:none!important}
`;

/**
 * Who gets the big screen. The current hero keeps it until it is answered (no flipping
 * mid-case when the room sends ten at once); a case still waiting in line gives way to
 * one that is actually being worked on.
 */
function pickHero(active: CaseRecord[], stickyId: string | null): CaseRecord | null {
  const current = stickyId ? active.find((c) => c.id === stickyId) : undefined;
  if (current && current.status !== "queued") return current;
  const running = active.find((c) => c.status !== "queued"); // newest first
  return running ?? current ?? active[active.length - 1] ?? null;
}

/** true while the mouse has moved in the last few seconds */
function useAwake(idleMs: number): boolean {
  const [awake, setAwake] = useState(true);
  useEffect(() => {
    let timer = setTimeout(() => setAwake(false), idleMs);
    const wake = () => {
      setAwake(true);
      clearTimeout(timer);
      timer = setTimeout(() => setAwake(false), idleMs);
    };
    window.addEventListener("mousemove", wake);
    window.addEventListener("pointerdown", wake);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("mousemove", wake);
      window.removeEventListener("pointerdown", wake);
    };
  }, [idleMs]);
  return awake;
}

export function Wall() {
  const { cases, byId, frames, config, connected, resetCount } = useLive();

  const [queue, setQueue] = useState<SlamEntry[]>([]);
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const [gridOnly, setGridOnly] = useState(false);
  const [stickyId, setStickyId] = useState<string | null>(null);
  const [staleIds, setStaleIds] = useState<ReadonlySet<string>>(NONE);
  const [fullscreen, setFullscreen] = useState(false);
  const [origin, setOrigin] = useState("");
  const awake = useAwake(HINT_IDLE_MS);

  // What this wall has already shown. Refs, not state: they must never trigger a render.
  const slammed = useRef(new Set<string>());
  const toasted = useRef(new Set<string>());
  const watched = useRef(new Set<string>());
  const observed = useRef(new Map<string, Observed>());
  const lastSlam = useRef<string | null>(null);
  const needsBaseline = useRef(true);
  const prevConfig = useRef<PublicConfig | null>(null);
  const lastReset = useRef(resetCount);
  const casesRef = useRef(cases);
  const framesRef = useRef(frames);
  const queueRef = useRef(queue);

  // 1. A wall reset wipes everything this screen remembers. Declared first so that it runs
  //    before the detection below when a reset and a new case land in the same render.
  useLayoutEffect(() => {
    if (lastReset.current === resetCount) return;
    lastReset.current = resetCount;
    slammed.current.clear();
    toasted.current.clear();
    watched.current.clear();
    observed.current.clear();
    lastSlam.current = null;
    setQueue([]);
    setToasts([]);
    setStaleIds(NONE);
  }, [resetCount]);

  useLayoutEffect(() => {
    casesRef.current = cases;
    framesRef.current = frames;
    queueRef.current = queue;
  });

  // 2. While the stream is down we cannot tell old from new, so the next snapshot is a baseline.
  useLayoutEffect(() => {
    if (!connected) needsBaseline.current = true;
  }, [connected]);

  // 3. Spot new verdicts and new guardian alerts.
  //    Every snapshot ("hello") carries a fresh config object, which is how one is recognised.
  //    Cases already answered in a snapshot are history: they go to the grid without a slam,
  //    unless this wall was watching them when the connection dropped.
  //    A case that was never seen in progress (a "seen before" repeat resolves in under two
  //    seconds) still slams, because anything answered after the baseline is new.
  useLayoutEffect(() => {
    const snapshot = needsBaseline.current && config !== null && prevConfig.current !== config;
    prevConfig.current = config;
    if (snapshot) needsBaseline.current = false;

    const fresh: CaseRecord[] = [];
    const alerts: ToastEntry[] = [];
    for (const c of cases) {
      const live = isActive(c);
      if (live) watched.current.add(c.id);
      const history = snapshot && !live && !watched.current.has(c.id);
      if (history) slammed.current.add(c.id);

      if (c.status === "done" && c.verdict && !slammed.current.has(c.id)) {
        slammed.current.add(c.id);
        fresh.push(c);
      }
      for (const g of c.guardianAlerted ?? []) {
        const key = `${c.id}:${g.at}:${g.emailMasked}`;
        if (toasted.current.has(key)) continue;
        toasted.current.add(key);
        if (!history) {
          alerts.push({ key, caseId: c.id, name: g.name, emailMasked: g.emailMasked, category: c.category });
        }
      }
    }

    if (fresh.length > 0) {
      fresh.sort((a, b) => finishedAt(a) - finishedAt(b));
      const entries = fresh.map((c) => ({ key: `slam:${c.id}`, id: c.id, replay: false }));
      setQueue((q) => {
        const next = [...q, ...entries];
        return next.length > MAX_WAITING + 1 ? [next[0], ...next.slice(-MAX_WAITING)] : next;
      });
    }
    if (alerts.length > 0) setToasts((t) => [...t, ...alerts.slice(0, 2)].slice(-2));
  }, [cases, config]);

  // 4. Notice cases that have stopped moving, so a stuck one cannot own the screen forever.
  //    Progress is judged by what this screen sees change, not by comparing clocks.
  const sweep = useCallback(() => {
    const now = Date.now();
    const seen = observed.current;
    const stale = new Set<string>();
    const alive = new Set<string>();
    for (const c of casesRef.current) {
      if (!isActive(c)) continue;
      alive.add(c.id);
      const sig = `${c.updatedAt}|${c.status}|${c.stage}|${c.evidence.length}|${c.trace.length}|${framesRef.current[c.id] ?? 0}`;
      let o = seen.get(c.id);
      if (!o) {
        o = { sig, at: now, moved: false };
        seen.set(c.id, o);
      } else if (o.sig !== sig) {
        o = { sig, at: now, moved: true };
        seen.set(c.id, o);
      }
      const leftover = !o.moved && now - c.createdAt > ANCIENT_AFTER_MS;
      if (leftover || now - o.at > STALE_AFTER_MS) stale.add(c.id);
    }
    for (const id of [...seen.keys()]) if (!alive.has(id)) seen.delete(id);
    setStaleIds((prev) => (sameSet(prev, stale) ? prev : stale));
  }, []);

  useLayoutEffect(() => {
    sweep();
  }, [cases, frames, sweep]);

  useEffect(() => {
    const t = setInterval(sweep, 4000);
    return () => clearInterval(t);
  }, [sweep]);

  // ---- what to show -------------------------------------------------------------------

  const active = useMemo(() => cases.filter((c) => isActive(c) && !staleIds.has(c.id)), [cases, staleIds]);
  const hero = pickHero(active, stickyId);
  const heroId = hero?.id ?? null;
  if (heroId !== stickyId) setStickyId(heroId); // derived state: settle it during render

  const waiting = useMemo(() => active.filter((c) => c.id !== heroId), [active, heroId]);

  const slam = queue[0] ?? null;
  const slamCase = slam ? byId[slam.id] : undefined;
  const slamKey = slam?.key ?? null;
  const slamId = slam?.id ?? null;

  const settled = useMemo(() => {
    const waitingForSlam = new Set(queue.filter((q) => !q.replay).map((q) => q.id));
    return cases
      .filter((c) => (!isActive(c) || staleIds.has(c.id)) && !waitingForSlam.has(c.id))
      .sort((a, b) => finishedAt(b) - finishedAt(a));
  }, [cases, staleIds, queue]);

  const stats = useMemo(() => {
    const done = cases.filter((c) => c.status === "done");
    const times = done.map((c) => c.durationMs).filter((n): n is number => typeof n === "number" && n > 0);
    const mid = median(times);
    return {
      checked: done.length,
      scams: done.filter((c) => c.verdict === "SCAM").length,
      medianLabel: mid === null ? "–" : secs(mid),
      canReplay: done.some((c) => !!c.verdict),
    };
  }, [cases]);

  const capabilities = useMemo(() => (config ? capabilityList(config.capabilities) : []), [config]);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);
  const base = useMemo(() => {
    let raw = (config?.publicUrl || origin).trim().replace(/\/+$/, "");
    if (!raw) return "";
    if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
    // a QR that says "localhost" is useless to a phone in the room: if this screen is being
    // served from a real address, print that one instead
    const local = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i;
    if (origin && local.test(hostOf(raw)) && !local.test(hostOf(origin))) return origin.replace(/\/+$/, "");
    return raw;
  }, [config, origin]);
  const checkUrl = base ? `${base}/check` : "";
  const checkLabel = base ? `${hostOf(base)}/check` : "";
  const inboxEmail = config?.inboxEmail ?? null;

  // ---- verdict queue ------------------------------------------------------------------

  useEffect(() => {
    if (slamId) lastSlam.current = slamId;
  }, [slamId]);

  // a queued verdict whose case has vanished (wiped elsewhere) must not block the queue
  useEffect(() => {
    if (slamKey && !slamCase?.verdict) setQueue((q) => q.filter((e) => e.key !== slamKey));
  }, [slamKey, slamCase]);

  const dismissSlam = useCallback((key: string) => {
    setQueue((q) => (q[0]?.key === key ? q.slice(1) : q));
  }, []);

  const dismissCurrent = useCallback(() => {
    const head = queueRef.current[0];
    if (head) dismissSlam(head.key);
  }, [dismissSlam]);

  const replay = useCallback(() => {
    if (queueRef.current.length > 0) return;
    const answered = casesRef.current.filter((c) => c.status === "done" && !!c.verdict);
    const target =
      answered.find((c) => c.id === lastSlam.current) ??
      [...answered].sort((a, b) => finishedAt(b) - finishedAt(a))[0];
    if (!target) return;
    const entry: SlamEntry = { key: `replay:${target.id}:${Date.now()}`, id: target.id, replay: true };
    setQueue((q) => (q.length > 0 ? q : [entry]));
  }, []);

  const dismissToast = useCallback((key: string) => {
    setToasts((t) => t.filter((e) => e.key !== key));
  }, []);

  // ---- keyboard, fullscreen, focus ----------------------------------------------------

  const toggleFullscreen = useCallback(() => {
    try {
      if (document.fullscreenElement) void document.exitFullscreen?.().catch(() => {});
      else void document.documentElement.requestFullscreen?.().catch(() => {});
    } catch {
      // some browsers (phones) have no fullscreen for pages; nothing to do
    }
  }, []);

  const toggleGrid = useCallback(() => setGridOnly((v) => !v), []);

  useEffect(() => {
    const sync = () => setFullscreen(!!document.fullscreenElement);
    sync();
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      if (e.code === "Space" || e.key === " " || e.key === "Escape") {
        if (queueRef.current.length > 0) {
          e.preventDefault();
          dismissCurrent();
        }
        return;
      }
      const key = e.key.toLowerCase();
      if (key === "f") {
        e.preventDefault();
        toggleFullscreen();
      } else if (key === "g") {
        toggleGrid();
      } else if (key === "r") {
        replay();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dismissCurrent, replay, toggleFullscreen, toggleGrid]);

  // If the embedded live view ever takes focus, take it back so the keys keep working.
  useEffect(() => {
    const onBlur = () => {
      setTimeout(() => {
        const el = document.activeElement;
        if (el instanceof HTMLIFrameElement) {
          el.blur();
          window.focus();
        }
      }, 0);
    };
    window.addEventListener("blur", onBlur);
    return () => window.removeEventListener("blur", onBlur);
  }, []);

  // ---- render -------------------------------------------------------------------------

  // where the flood collapses to: the first tile of the grid, wherever that currently is
  const exitAt = hero ? "50% -10%" : gridOnly ? "14% 23%" : "59% 23%";
  const invitationOnScreen = !hero && !gridOnly;
  const headerAddress =
    invitationOnScreen || !checkLabel
      ? null
      : inboxEmail
        ? { label: "Forward it to", value: inboxEmail }
        : { label: "Paste it at", value: checkLabel };

  return (
    <MotionConfig reducedMotion="user">
      <style dangerouslySetInnerHTML={{ __html: WALL_CSS }} />
      <main
        className={cx(
          "night-grain relative flex min-h-dvh flex-col text-cream lg:h-dvh lg:overflow-hidden",
          !awake && "wall-idle",
        )}
      >
        <WallHeader
          checked={stats.checked}
          scams={stats.scams}
          medianLabel={stats.medianLabel}
          connected={connected}
          ready={config !== null}
          capabilities={capabilities}
          address={headerAddress}
        />

        <div className="relative flex min-h-0 flex-1 flex-col">
          <AnimatePresence mode="wait" initial={false}>
            {hero ? (
              <motion.div
                key={`hero:${hero.id}`}
                className="flex min-h-0 flex-1 flex-col"
                initial={{ opacity: 0, y: 18, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: EASE_OUT } }}
                exit={{ opacity: 0, scale: 0.99, transition: { duration: 0.22 } }}
              >
                <Hero
                  item={hero}
                  frame={frames[hero.id] ?? 0}
                  preferLiveView={config?.preferLiveView ?? true}
                  waiting={waiting}
                />
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                className="relative flex min-h-0 flex-1 flex-col gap-10 px-6 pb-16 pt-8 lg:flex-row lg:gap-12 lg:px-12 lg:pb-12 lg:pt-9"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: 0.45 } }}
                exit={{ opacity: 0, transition: { duration: 0.2 } }}
              >
                <AnimatePresence mode="popLayout" initial={false}>
                  {!gridOnly && (
                    <motion.div
                      key="invitation"
                      className="shrink-0 lg:w-[44%]"
                      initial={{ opacity: 0, x: -48 }}
                      animate={{ opacity: 1, x: 0, transition: { duration: 0.5, ease: EASE_OUT } }}
                      exit={{ opacity: 0, x: -48, transition: { duration: 0.2 } }}
                    >
                      {checkUrl && (
                        <Invitation inboxEmail={inboxEmail} checkUrl={checkUrl} checkLabel={checkLabel} />
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
                <CaseGrid
                  items={settled}
                  staleIds={staleIds}
                  wide={gridOnly}
                  ready={config !== null}
                  connected={connected}
                  hasPending={queue.some((q) => !q.replay)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <HintBar
          visible={awake}
          fullscreen={fullscreen}
          gridOnly={gridOnly}
          canReplay={stats.canReplay}
          slamming={slam !== null}
          onFullscreen={toggleFullscreen}
          onGrid={toggleGrid}
          onReplay={replay}
          onDismiss={dismissCurrent}
        />

        <GuardianToasts toasts={toasts} onDone={dismissToast} />

        <AnimatePresence>
          {slam && slamCase?.verdict && (
            <VerdictSlam
              key={slam.key}
              slamKey={slam.key}
              item={slamCase}
              verdict={slamCase.verdict}
              replay={slam.replay}
              crowded={queue.length > 1}
              exitAt={exitAt}
              onDone={dismissSlam}
            />
          )}
        </AnimatePresence>
      </main>
    </MotionConfig>
  );
}
