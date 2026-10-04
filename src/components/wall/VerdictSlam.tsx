"use client";

// The moment of the answer. The verdict colour floods the whole screen from the centre, the
// word slams down, then the plain sentence and the reasons arrive. When it leaves, the flood
// collapses towards the spot in the grid where the case's tile drops in.
import { useEffect, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Zap } from "lucide-react";
import type { CaseRecord, VerdictLevel } from "@/lib/types";
import { VERDICT_LABEL } from "@/lib/types";
import { cx } from "@/components/ui/kit";
import { ChannelIcon, EASE_IN_OUT, EASE_OUT } from "./bits";
import { FitText } from "./FitText";
import { agoWords, channelLabel, secs, stripVerdictPrefix } from "./util";

const LOOK: Record<
  VerdictLevel,
  {
    flood: string;
    soft: string;
    rule: string;
    chip: string;
    lines: string[];
    maxRem: number;
    /** keeps the word clear of the guardian alert in the top-right corner */
    box: string;
    fallback: string;
  }
> = {
  SCAM: {
    flood: "bg-scam text-cream",
    soft: "text-cream/85",
    rule: "border-cream/45",
    chip: "bg-ink text-cream",
    lines: ["SCAM"],
    maxRem: 34.5,
    box: "lg:max-w-[84rem]",
    fallback: "Do not click. Do not reply.",
  },
  TREAT_AS_SCAM: {
    flood: "bg-warn text-ink",
    soft: "text-ink/80",
    rule: "border-ink/35",
    chip: "bg-ink text-warn",
    lines: ["TREAT AS", "A SCAM"],
    maxRem: 19,
    box: "lg:max-w-[84rem]",
    fallback: "It could not be proven either way, so act as if it is one.",
  },
  NO_RED_FLAGS: {
    flood: "bg-calm text-cream",
    soft: "text-cream/85",
    rule: "border-cream/40",
    chip: "bg-ink/80 text-cream",
    lines: ["NO RED FLAGS", "FOUND"],
    maxRem: 15,
    box: "lg:max-w-[98rem]",
    fallback: "Nothing looked wrong this time. Stay careful anyway.",
  },
};

function Rise({ delay, className, children }: { delay: number; className?: string; children: ReactNode }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.55, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}

export function VerdictSlam({
  slamKey,
  item,
  verdict,
  replay,
  crowded,
  exitAt,
  onDone,
}: {
  slamKey: string;
  item: CaseRecord;
  verdict: VerdictLevel;
  /** shown again with R, not a fresh answer */
  replay: boolean;
  /** more verdicts are waiting behind this one, so hold it for less time */
  crowded: boolean;
  /** "x% y%" of the screen: where the flood collapses to on the way out */
  exitAt: string;
  onDone: (key: string) => void;
}) {
  const reduce = useReducedMotion();
  const look = LOOK[verdict];
  const [hold] = useState(() => (crowded ? 5000 : 8000));

  useEffect(() => {
    const t = setTimeout(() => onDone(slamKey), hold);
    return () => clearTimeout(t);
  }, [hold, onDone, slamKey]);

  const label = VERDICT_LABEL[verdict];
  const headline = item.headline ? stripVerdictPrefix(item.headline, verdict) : look.fallback;
  const reasons = item.reasons.filter(Boolean).slice(0, 3);
  const seen = item.seenBefore;

  const flood = reduce
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1, transition: { duration: 0.2 } },
        exit: { opacity: 0, transition: { duration: 0.2 } },
      }
    : {
        // 80% of the reference radius is just past the farthest corner at any aspect ratio, so the
        // iris is already visibly closing on the first frame of the exit
        initial: { clipPath: "circle(0% at 50% 45%)" },
        animate: { clipPath: "circle(80% at 50% 45%)", transition: { duration: 0.5, ease: EASE_OUT } },
        exit: { clipPath: `circle(0% at ${exitAt})`, transition: { duration: 0.55, ease: EASE_IN_OUT } },
      };

  return (
    <div
      className="fixed inset-0 z-50 cursor-pointer select-none overflow-hidden"
      onClick={() => onDone(slamKey)}
      role="alert"
      aria-label={`${label}. ${headline}`}
    >
      <motion.div className={cx("absolute inset-0 flex flex-col", look.flood)} {...flood}>
        {/* halftone, like a rubber stamp on paper */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:radial-gradient(currentColor_1.3px,transparent_1.3px)] [background-size:10px_10px]"
        />

        <div
          className={cx(
            "relative flex min-h-0 flex-1 flex-col px-6 pb-10 pt-6 lg:px-[4.5rem] lg:pb-14 lg:pt-11",
            verdict === "SCAM" && "animate-shake",
          )}
          style={verdict === "SCAM" ? { animationDelay: "480ms" } : undefined}
        >
          <Rise delay={0.1} className={cx("flex min-w-0 items-center gap-3", look.soft, look.box)}>
            <ChannelIcon channel={item.channel} className="size-6 shrink-0" />
            <span className="shrink-0 font-mono text-sm uppercase tracking-[0.22em]">
              {channelLabel(item.channel)}
            </span>
            <span className="truncate text-2xl font-semibold">{item.subject || "Something sketchy"}</span>
          </Rise>

          <div className={cx("mt-5 lg:mt-4", look.box)}>
            <FitText
              lines={look.lines.map((text) => ({ text }))}
              maxRem={look.maxRem}
              minRem={3}
              className="font-display font-extrabold leading-[0.82] tracking-[-0.03em]"
              innerClassName="animate-slam"
              innerStyle={{ animationDelay: "170ms" }}
            />
          </div>

          <Rise delay={0.62} className="mt-7 max-w-[104rem]">
            <p className="line-clamp-3 text-balance font-display text-[2.1rem] font-extrabold leading-[1.05] tracking-[-0.012em] [font-variant-ligatures:none] lg:text-[3.8rem]">
              {headline}
            </p>
          </Rise>

          {reasons.length > 0 && (
            <ol className="mt-8 grid gap-x-10 gap-y-4 lg:mt-9 lg:grid-cols-3">
              {reasons.map((reason, i) => (
                <motion.li
                  key={i}
                  className={cx("flex gap-4 border-t-[3px] pt-3.5", look.rule)}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.82 + i * 0.11, duration: 0.55, ease: EASE_OUT }}
                >
                  <span className={cx("mt-1 shrink-0 font-mono text-base font-bold tabular", look.soft)}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="line-clamp-3 text-[1.25rem] font-semibold leading-snug lg:text-[1.9rem]">
                    {reason}
                  </span>
                </motion.li>
              ))}
            </ol>
          )}

          <div className="min-h-4 flex-1" />

          <Rise delay={1.2} className="flex flex-wrap items-center gap-x-6 gap-y-3">
            {seen && (
              <span
                className={cx(
                  "inline-flex items-center gap-3 rounded-full px-5 py-2.5 font-display text-[1.45rem] font-extrabold leading-none tracking-tight",
                  look.chip,
                )}
              >
                <Zap className="size-6 shrink-0" fill="currentColor" aria-hidden />
                <span>SEEN BEFORE</span>
                <span className="font-sans text-[1.15rem] font-medium opacity-85">
                  same as the one {agoWords(item.createdAt - seen.at)}
                </span>
              </span>
            )}
            {typeof item.durationMs === "number" && (
              <span className={cx("font-mono text-base uppercase tracking-[0.2em] tabular", look.soft)}>
                checked in {secs(item.durationMs)}
              </span>
            )}
            {replay && (
              <span className={cx("font-mono text-base uppercase tracking-[0.2em]", look.soft)}>replay</span>
            )}
            <span className={cx("ml-auto font-mono text-sm uppercase tracking-[0.2em]", look.soft)}>
              Space to continue
            </span>
          </Rise>
        </div>

        {/* how long the verdict stays up */}
        <motion.div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-2 origin-left bg-current opacity-35"
          initial={{ scaleX: 1 }}
          animate={{ scaleX: 0 }}
          transition={{ duration: hold / 1000, ease: "linear" }}
        />
      </motion.div>
    </div>
  );
}
