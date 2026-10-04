"use client";

// "How the agent worked" — the workflow trace drawn as a waterfall.
import { motion } from "motion/react";
import { Check, CircleX } from "lucide-react";
import type { CaseRecord, PublicConfig, TraceStep } from "@/lib/types";
import { cx } from "@/components/ui/kit";
import { SectionHeading, Spinner, cardClass, eyebrowClass, fmtMs } from "./bits";

/** Plain words for the workflow's step ids. Unknown ids are tidied up and shown as they are. */
const STEP_LABEL: Record<string, string> = {
  "read-message": "Reading the message",
  recall: "Checking if we have seen it before",
  "open-link": "Opening the link in a throwaway browser",
  "check-claims": "Checking who they claim to be",
  "check-address": "Looking up the web address",
  decide: "Weighing it all up",
  respond: "Writing the answer",
};

export function stepLabel(step: string): string {
  const known = STEP_LABEL[step];
  if (known) return known;
  const tidy = step.replace(/[-_]+/g, " ").trim();
  return tidy ? tidy.charAt(0).toUpperCase() + tidy.slice(1) : "Step";
}

function stepState(s: TraceStep): "running" | "failed" | "ok" {
  if (s.endedAt === undefined) return "running";
  return s.ok === false ? "failed" : "ok";
}

export function StepIcon({ step, size = 16 }: { step: TraceStep; size?: number }) {
  const state = stepState(step);
  if (state === "running") return <Spinner size={size} className="text-scam" />;
  if (state === "failed") return <CircleX size={size} className="text-scam-deep" aria-label="failed" />;
  return (
    <span className="grid size-[1.15rem] place-items-center rounded-full bg-ink text-cream" aria-label="ok">
      <Check size={11} strokeWidth={3.2} aria-hidden />
    </span>
  );
}

function builtOn(config: PublicConfig | null, item: CaseRecord): string[] {
  const out: string[] = [];
  const cap = config?.capabilities;
  if (cap) {
    out.push(cap.workflow === "mastra" ? "workflow: Mastra" : "workflow: direct");
    out.push(`model: ${cap.llm}`);
  }
  if (item.browser && item.browser.tier !== "none") out.push(`browser: ${item.browser.tier}`);
  if (cap?.search) out.push("search: Exa");
  if (cap) out.push(`memory: ${cap.db === "neon" ? "Neon Postgres" : "PGlite"}`);
  return out;
}

export function CaseTraceSection({
  item,
  config,
  className,
}: {
  item: CaseRecord;
  config: PublicConfig | null;
  className?: string;
}) {
  const trace = item.trace ?? [];
  const t0 = trace.length ? Math.min(...trace.map((s) => s.startedAt)) : item.createdAt;
  const tEnd = trace.length ? Math.max(...trace.map((s) => s.endedAt ?? s.startedAt)) : item.updatedAt;
  const span = Math.max(1, tEnd - t0);
  const total = item.durationMs ?? span;
  const label = config?.capabilities.workflow === "direct" ? "Direct pipeline trace" : "Mastra workflow trace";
  const tags = builtOn(config, item);

  return (
    <section className={className}>
      <SectionHeading
        eyebrow={label}
        title="How the agent worked"
        aside={
          <span className="font-mono text-xs uppercase tracking-widest text-ink-3 tabular">
            {fmtMs(total)} in all
          </span>
        }
      />
      <div className={cx(cardClass, "p-4 sm:p-5")}>
        {trace.length === 0 ? (
          <p className="text-base text-ink-3">No steps were recorded for this case.</p>
        ) : (
          <ol className="space-y-3.5">
            {trace.map((s, i) => {
              const state = stepState(s);
              const dur = s.endedAt !== undefined ? s.endedAt - s.startedAt : null;
              const left = ((s.startedAt - t0) / span) * 100;
              const width = Math.max(1.5, (((s.endedAt ?? tEnd) - s.startedAt) / span) * 100);
              return (
                <li key={`${s.step}-${s.startedAt}-${i}`}>
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 shrink-0">
                      <StepIcon step={s} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-base font-semibold leading-snug text-ink">{stepLabel(s.step)}</div>
                      <div className="mt-0.5 break-words font-mono text-[10px] uppercase tracking-widest text-ink-4">
                        {s.step} · {s.tool}
                      </div>
                    </div>
                    <span
                      className={cx(
                        "shrink-0 text-right font-mono text-xs tabular",
                        state === "failed" ? "text-scam-deep" : "text-ink-2",
                      )}
                    >
                      {dur !== null ? `${Math.round(dur)} ms` : "…"}
                      <span className={cx("block text-[10px] uppercase tracking-widest", state === "failed" ? "text-scam-deep" : "text-ink-4")}>
                        {state}
                      </span>
                    </span>
                  </div>
                  <div className="relative mt-2 h-2 overflow-hidden rounded-full bg-paper-2" aria-hidden>
                    <motion.span
                      className={cx(
                        "absolute inset-y-0 rounded-full",
                        state === "failed" ? "bg-scam" : state === "running" ? "bg-warn" : "bg-ink",
                      )}
                      style={{ left: `${Math.min(98.5, left)}%`, transformOrigin: "left center" }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100 - Math.min(98.5, left), width)}%` }}
                      transition={{ duration: 0.6, delay: Math.min(0.6, i * 0.06), ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                  {s.note && <p className="mt-1.5 text-sm text-ink-3">{s.note}</p>}
                </li>
              );
            })}
          </ol>
        )}

        {tags.length > 0 && (
          <div className="mt-5 border-t border-line pt-4">
            <div className={eyebrowClass}>Built on</div>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <li key={t} className="rounded-md border border-line bg-paper px-2 py-1 font-mono text-[11px] text-ink-2">
                  {t}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
