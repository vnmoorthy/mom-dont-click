"use client";

// A case is being worked on right now: the throwaway browser on the left, the story on the right.
import { useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Globe, Users } from "lucide-react";
import { defang, maskEmail, useNow } from "@/lib/client";
import type { CaseRecord, CaseStatus, TraceStep } from "@/lib/types";
import { EvidenceChip, LiveBrowser, LiveDot, cx } from "@/components/ui/kit";
import { ChannelIcon } from "./bits";
import { channelLabel, clock, hostOf } from "./util";

function Elapsed({ since }: { since: number }) {
  const now = useNow(250);
  const { value, unit } = clock(now - since);
  return (
    <div className="shrink-0 text-right" aria-label="Time so far">
      <div className="font-mono text-[2.5rem] font-bold leading-none tabular text-cream">{value}</div>
      <div className="mt-1.5 font-mono text-[0.65rem] uppercase tracking-[0.22em] text-cream-3">{unit}</div>
    </div>
  );
}

const PHASES: { status: CaseStatus; label: string }[] = [
  { status: "reading", label: "Read it" },
  { status: "investigating", label: "Check it" },
  { status: "deciding", label: "Decide" },
];

function Phases({ status }: { status: CaseStatus }) {
  const at = PHASES.findIndex((p) => p.status === status); // -1 while it waits in line
  return (
    <ol className="mt-5 grid grid-cols-3 gap-2.5" aria-label="Progress">
      {PHASES.map((p, i) => {
        const done = at > i;
        const current = at === i;
        return (
          <li key={p.status} aria-current={current ? "step" : undefined}>
            <div className="h-1.5 overflow-hidden rounded-full bg-cream/12">
              <div
                className={cx(
                  "h-full rounded-full transition-[width] duration-700 ease-out",
                  done ? "w-full bg-cream" : current ? "w-full animate-pulse bg-cream/70" : "w-0 bg-cream",
                )}
              />
            </div>
            <div
              className={cx(
                "mt-2 font-mono text-[0.68rem] uppercase tracking-[0.2em] transition-colors duration-500",
                done || current ? "text-cream" : "text-cream-3",
              )}
            >
              {p.label}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function TracePill({ step }: { step: TraceStep }) {
  const running = step.endedAt === undefined;
  const failed = !running && step.ok === false;
  return (
    <span
      className={cx(
        "inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1 font-mono text-xs animate-rise",
        running
          ? "border-cream/35 text-cream"
          : failed
            ? "border-warn/60 bg-warn/15 text-[#ffd98a]"
            : "border-cream bg-cream text-night",
      )}
    >
      {running && <span className="size-1.5 shrink-0 rounded-full bg-cream animate-pulse-dot" />}
      <span className="truncate">{step.step}</span>
      {step.tool && <span className="shrink-0 opacity-60">{step.tool}</span>}
    </span>
  );
}

/** true once the list is taller than its window, so the top edge can fade instead of cutting a chip in half */
function useOverflowing() {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [over, setOver] = useState(false);
  useLayoutEffect(() => {
    const o = outer.current;
    const i = inner.current;
    if (!o || !i) return;
    const check = () => setOver(i.offsetHeight > o.clientHeight + 1);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(o);
    observer.observe(i);
    return () => observer.disconnect();
  }, []);
  return { outer, inner, over };
}

/** Shown over the browser frame until the agent has actually opened one. */
function Standby({ item }: { item: CaseRecord }) {
  const hasLink = !!item.primaryUrl || item.links.length > 0;
  const early = item.status === "queued" || item.status === "reading";
  const title = hasLink
    ? "Getting a throwaway browser ready"
    : early
      ? "Reading it first"
      : "No link in this one";
  const detail = hasLink
    ? "The link opens there, not on anyone's phone."
    : early
      ? "Looking for links before opening anything."
      : "Checking the wording and who sent it instead.";
  return (
    <motion.div
      className="absolute inset-x-px bottom-px top-[calc(2.75rem+2px)] grid place-items-center overflow-hidden rounded-b-[21px] bg-night px-8 text-center"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div>
        <Globe className="mx-auto size-12 text-cream-3" strokeWidth={1.5} aria-hidden />
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            <p className="mt-5 font-display text-[2.2rem] font-extrabold leading-none tracking-tight text-cream">
              {title}
            </p>
            <p className="mt-3 text-xl text-cream-2">{detail}</p>
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export function Hero({
  item,
  frame,
  preferLiveView,
  waiting,
}: {
  item: CaseRecord;
  frame: number;
  preferLiveView: boolean;
  /** other cases that are also being worked on */
  waiting: CaseRecord[];
}) {
  const evidence = item.evidence.slice(-6);
  const trace = item.trace.slice(-7);
  const target = item.domain || (item.primaryUrl ? hostOf(item.primaryUrl) : "");
  const lastEvidenceId = evidence[evidence.length - 1]?.id ?? "";
  const list = useOverflowing();

  return (
    <div className="grid min-h-0 flex-1 gap-6 px-6 pb-10 pt-5 lg:grid-cols-[62fr_38fr] lg:grid-rows-[minmax(0,1fr)] lg:gap-10 lg:px-12 lg:pb-13 lg:pt-7">
      {/* pointer-events off: the live view must never steal the keyboard from the wall */}
      <div className="pointer-events-none relative min-h-[60vh] min-w-0 lg:min-h-0">
        <LiveBrowser item={item} frame={frame} preferLiveView={preferLiveView} night className="h-full" />
        <AnimatePresence initial={false}>{!item.browser && <Standby key="standby" item={item} />}</AnimatePresence>
      </div>

      <div className="flex min-h-0 min-w-0 flex-col">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-sm uppercase tracking-[0.2em] text-cream-3">
          <ChannelIcon channel={item.channel} className="size-5" />
          <span>{channelLabel(item.channel)}</span>
          {item.senderEmail && (
            <span className="normal-case tracking-normal text-cream-3/80">{maskEmail(item.senderEmail)}</span>
          )}
        </div>

        <h1 className="mt-3 line-clamp-3 text-balance font-display text-[3.1rem] font-extrabold leading-[0.98] tracking-[-0.015em] text-cream [font-variant-ligatures:none]">
          {item.subject || "Something sketchy"}
        </h1>

        {(item.claimedBrand || target) && (
          <dl className="mt-4 flex flex-wrap items-baseline gap-x-8 gap-y-1.5 text-lg">
            {item.claimedBrand && (
              <div className="flex min-w-0 items-baseline gap-3">
                <dt className="shrink-0 font-mono text-xs uppercase tracking-[0.2em] text-cream-3">Says it is</dt>
                <dd className="truncate font-semibold text-cream">{item.claimedBrand}</dd>
              </div>
            )}
            {target && (
              <div className="flex min-w-0 items-baseline gap-3">
                <dt className="shrink-0 font-mono text-xs uppercase tracking-[0.2em] text-cream-3">Link goes to</dt>
                <dd className="defanged truncate text-cream-2">{defang(target)}</dd>
              </div>
            )}
          </dl>
        )}

        <div className="mt-5 shrink-0 rounded-[22px] border border-cream/12 bg-cream/5 p-5">
          <div className="flex items-start gap-4" role="status" aria-live="polite">
            <LiveDot className="mt-2.5 size-3.5! shrink-0" />
            <div className="min-w-0 flex-1">
              <AnimatePresence mode="wait" initial={false}>
                <motion.p
                  key={item.stage}
                  className="text-[1.7rem] font-semibold leading-tight text-cream"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  {item.stage || "Getting ready"}
                </motion.p>
              </AnimatePresence>
            </div>
            <Elapsed since={item.createdAt} />
          </div>
          <Phases status={item.status} />
        </div>

        <div className="mt-5 flex min-h-[8rem] flex-1 flex-col">
          <div className="mb-2.5 flex shrink-0 items-center justify-between font-mono text-xs uppercase tracking-[0.2em] text-cream-3">
            <span>What it found</span>
            <span className="tabular">{item.evidence.length}</span>
          </div>
          {/* grows down from the top; once full, the oldest slide off the top so the newest stays in view */}
          <div
            ref={list.outer}
            className={cx(
              "flex min-h-0 flex-1 flex-col justify-end overflow-hidden",
              list.over && "[mask-image:linear-gradient(to_bottom,transparent,black_4.5rem)]",
            )}
          >
            <div ref={list.inner} className="mb-auto flex shrink-0 flex-col gap-2.5">
              {evidence.length === 0 && (
                <p className="rounded-2xl border border-dashed border-cream/15 px-5 py-4 text-lg text-cream-3">
                  Nothing yet. Each clue shows up here the moment it is found.
                </p>
              )}
              <AnimatePresence initial={false}>
                {evidence.map((ev) => (
                  <motion.div
                    key={ev.id}
                    layout="position"
                    layoutDependency={`${evidence.length}:${lastEvidenceId}`}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <EvidenceChip evidence={ev} night big />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {trace.length > 0 && (
          <div className="mt-4 flex max-h-[4.25rem] shrink-0 flex-wrap gap-1.5 overflow-hidden" aria-label="Steps so far">
            {trace.map((step) => (
              <TracePill key={`${step.step}:${step.tool}:${step.startedAt}`} step={step} />
            ))}
          </div>
        )}

        {waiting.length > 0 && (
          <div className="mt-4 flex shrink-0 items-center gap-3 overflow-hidden">
            <span className="flex shrink-0 items-center gap-2 rounded-full bg-cream/10 px-3 py-1 font-mono text-xs uppercase tracking-[0.18em] text-cream">
              <Users className="size-3.5" aria-hidden />
              In line: {waiting.length}
            </span>
            {waiting.slice(0, 3).map((w) => (
              <span key={w.id} className="min-w-0 max-w-[13rem] truncate text-sm text-cream-3">
                {w.subject || "Something sketchy"}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
