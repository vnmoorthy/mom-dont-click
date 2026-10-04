"use client";

// The live view of a case while the agent is still working on it.
import { AnimatePresence, motion } from "motion/react";
import { useNow } from "@/lib/client";
import type { CaseRecord } from "@/lib/types";
import { EvidenceChip, LiveDot, cx } from "@/components/ui/kit";
import { cardClass, eyebrowClass, fmtClock, fmtMs } from "./bits";
import { BrowserFrame, TIER_LABEL } from "./case-browser";
import { StepIcon, stepLabel } from "./case-trace";

const PHASES = ["Reading it", "Looking into it", "Deciding"] as const;

function phaseIndex(status: CaseRecord["status"]): number {
  if (status === "deciding") return 2;
  if (status === "investigating") return 1;
  return 0;
}

export function CaseRunning({
  item,
  frame,
  preferLiveView,
}: {
  item: CaseRecord;
  frame: number;
  preferLiveView: boolean;
}) {
  const now = useNow(1000);
  const phase = phaseIndex(item.status);
  const trace = item.trace ?? [];
  const evidence = item.evidence ?? [];
  const tier = item.browser?.tier;

  return (
    <div className="flex flex-col gap-7 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start lg:gap-10">
      <div className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-8">
        {/* what is being checked, and what is happening right now */}
        <div className="order-1 min-w-0">
          <div className="flex items-center gap-2.5">
            <LiveDot className="size-2.5" />
            <span className={eyebrowClass}>Checking it now</span>
            <span className="font-mono text-xs text-ink-4 tabular" aria-label="time so far">
              {fmtClock(now - item.createdAt)}
            </span>
          </div>
          <h1 className="mt-3 text-balance font-display text-[clamp(1.9rem,7vw,3rem)] font-extrabold leading-[1.03] tracking-tight">
            {item.subject || "Your message"}
          </h1>

          <p
            key={item.stage}
            role="status"
            className="mt-4 text-xl font-semibold leading-snug text-ink-2 animate-rise sm:text-2xl"
          >
            {item.stage || "Getting started"}
            <span className="text-ink-4">…</span>
          </p>

          <ol className="mt-6 grid grid-cols-3 gap-2" aria-label="Progress">
            {PHASES.map((label, i) => (
              <li key={label} aria-current={i === phase ? "step" : undefined}>
                <div className="h-1.5 overflow-hidden rounded-full bg-line">
                  <motion.div
                    className={cx("h-full rounded-full", i === phase ? "bg-scam" : "bg-ink")}
                    initial={false}
                    animate={{ width: i < phase ? "100%" : i === phase ? "55%" : "0%" }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
                <div className={cx("mt-2 text-sm font-semibold leading-tight", i <= phase ? "text-ink" : "text-ink-4")}>
                  {label}
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* the steps the agent has taken so far */}
        <section className="order-3 min-w-0" aria-label="Steps so far">
          <h2 className={cx(eyebrowClass, "mb-2.5")}>Step by step</h2>
          {trace.length === 0 ? (
            <div className={cx(cardClass, "flex items-center gap-3 px-4 py-3 text-base text-ink-3")}>
              <span className="size-2 rounded-full bg-ink-4 animate-pulse-dot" aria-hidden />
              Waiting for the first step
            </div>
          ) : (
            <ol className="space-y-2">
              <AnimatePresence initial={false}>
                {trace.map((s, i) => (
                  <motion.li
                    key={`${s.step}-${s.startedAt}-${i}`}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    className={cx(cardClass, "flex items-start gap-3 px-4 py-3 shadow-none")}
                  >
                    <span className="mt-0.5 shrink-0">
                      <StepIcon step={s} size={17} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-base font-semibold leading-snug text-ink">{stepLabel(s.step)}</div>
                      <div className="mt-0.5 break-words font-mono text-[10px] uppercase tracking-widest text-ink-4">
                        {s.tool}
                      </div>
                    </div>
                    <span className="mt-0.5 shrink-0 text-right font-mono text-xs text-ink-3 tabular">
                      {fmtMs((s.endedAt ?? now) - s.startedAt)}
                    </span>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ol>
          )}
        </section>

        {/* evidence, as it lands */}
        <section className="order-4 min-w-0" aria-label="What we have found so far">
          <h2 className={cx(eyebrowClass, "mb-2.5")}>
            What we have found so far{evidence.length > 0 ? ` · ${evidence.length}` : ""}
          </h2>
          {evidence.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line px-4 py-5 text-base text-ink-3">
              Each thing we find will land here, one at a time.
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {evidence.map((e) => (
                <EvidenceChip key={e.id} evidence={e} />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* the throwaway browser */}
      <div className="order-2 min-w-0 lg:sticky lg:top-6">
        <BrowserFrame item={item} frame={frame} preferLiveView={preferLiveView} />
        <p className="mt-3 text-sm text-ink-3">
          This is a throwaway browser{tier && tier !== "none" ? ` (${TIER_LABEL[tier]})` : ""}, far away from your
          phone. Nothing it opens can touch you.
        </p>
      </div>
    </div>
  );
}
