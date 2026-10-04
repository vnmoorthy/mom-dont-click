"use client";

// "Live right now": the latest finished cases, straight off the live stream.
import Link from "next/link";
import { ArrowUpRight, History } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { defang } from "@/lib/client";
import type { CaseChannel, CaseRecord } from "@/lib/types";
import { LiveDot, TONE, VerdictBadge, cx, verdictTone } from "@/components/ui/kit";
import { Ago, Reveal, formatMs } from "./bits";
import { QUICK_CHECK_INPUT_ID } from "./links";

const CHANNEL: Record<CaseChannel, string> = {
  email: "forwarded by email",
  paste: "pasted in",
  screenshot: "from a screenshot",
  seed: "example",
};

function median(nums: number[]): number | undefined {
  if (nums.length === 0) return undefined;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function LiveNow({
  cases,
  connected,
  guardianCount,
}: {
  cases: CaseRecord[];
  connected: boolean;
  guardianCount: number | null;
}) {
  const done = cases.filter((c) => c.status === "done" && c.verdict);
  const latest = done.slice(0, 6);
  const inFlight = cases.filter((c) => c.status !== "done" && c.status !== "error").length;
  const scams = done.filter((c) => c.verdict === "SCAM").length;
  const typical = median(done.filter((c) => !c.seenBefore && c.durationMs).map((c) => c.durationMs as number));

  const focusQuickCheck = () => {
    const el = document.getElementById(QUICK_CHECK_INPUT_ID);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => el.focus({ preventScroll: true }), 350);
  };

  return (
    <section id="live" className="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 sm:py-28">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-ink-3">
              {connected ? <LiveDot /> : <i className="inline-block size-2 rounded-full bg-ink-4/50" />}
              {connected ? "Live right now" : "Reconnecting to the live feed"}
            </div>
            <h2 className="mt-3 font-display text-[clamp(2.1rem,6vw,4rem)] font-extrabold leading-[0.95] tracking-[-0.035em] text-ink">
              What people just checked.
            </h2>
          </div>
          <Link
            href="/wall"
            className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink px-5 py-2.5 text-[15px] font-semibold text-ink transition-colors hover:bg-ink hover:text-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-scam"
          >
            Watch the wall
            <ArrowUpRight size={16} />
          </Link>
        </div>
      </Reveal>

      <Reveal delay={0.05}>
        <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-8 border-y border-line py-8 lg:grid-cols-4">
          <Counter value={String(done.length)} label="checked" note={inFlight > 0 ? `${inFlight} in progress` : undefined} />
          <Counter value={String(scams)} label="scams caught" tone="scam" />
          <Counter value={typical ? formatMs(typical) : "–"} label="typical answer time" />
          <Counter value={guardianCount === null ? "–" : String(guardianCount)} label="people standing guard" />
        </dl>
      </Reveal>

      {latest.length === 0 ? (
        <Reveal delay={0.1}>
          <div className="mt-8 rounded-[22px] border-2 border-dashed border-line px-6 py-14 text-center">
            <p className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Nothing checked yet.</p>
            <p className="mx-auto mt-3 max-w-md text-lg text-ink-3">
              Be the first. Paste a link you were not sure about and watch it get opened somewhere far away.
            </p>
            <button
              type="button"
              onClick={focusQuickCheck}
              className="mt-6 rounded-full bg-ink px-6 py-3 text-[15px] font-semibold text-cream transition-[transform,background-color] hover:bg-ink-2 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-scam"
            >
              Check the first one
            </button>
          </div>
        </Reveal>
      ) : (
        <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence initial={false} mode="popLayout">
            {latest.map((c) => {
              const t = TONE[verdictTone(c.verdict)];
              return (
                <motion.li
                  key={c.id}
                  layout
                  initial={{ opacity: 0, y: 18, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 260, damping: 26 }}
                  className="min-w-0 list-none"
                >
                  <Link
                    href={`/case/${c.id}`}
                    className="group flex h-full flex-col rounded-[22px] border border-line bg-white/60 p-5 transition-[transform,border-color,background-color] hover:-translate-y-0.5 hover:border-ink hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-scam"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <VerdictBadge verdict={c.verdict} size="sm" />
                      <Ago ts={c.updatedAt || c.createdAt} className="font-mono text-[11px] text-ink-4 tabular" />
                    </div>
                    <h3 className="mt-4 line-clamp-2 font-display text-xl font-extrabold leading-[1.1] tracking-tight text-ink">
                      {c.subject || "Something sketchy"}
                    </h3>
                    {c.domain && <div className={cx("defanged mt-2 truncate text-xs", t.text)}>{defang(c.domain)}</div>}
                    <div className="mt-auto flex items-center justify-between gap-3 pt-5 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-4">
                      <span className="flex min-w-0 items-center gap-1.5">
                        {c.seenBefore ? (
                          <>
                            <History size={12} className="shrink-0" />
                            <span className="truncate">seen before, answered instantly</span>
                          </>
                        ) : (
                          <span className="truncate">{CHANNEL[c.channel] ?? "checked"}</span>
                        )}
                      </span>
                      <ArrowUpRight size={15} className="shrink-0 text-ink-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </div>
                  </Link>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}
    </section>
  );
}

function Counter({
  value,
  label,
  note,
  tone = "ink",
}: {
  value: string;
  label: string;
  note?: string;
  tone?: "ink" | "scam";
}) {
  return (
    <div>
      <dd
        className={cx(
          "font-display text-[clamp(2.6rem,7vw,4.5rem)] font-extrabold leading-none tracking-[-0.04em] tabular",
          tone === "scam" ? "text-scam" : "text-ink",
        )}
      >
        {value}
      </dd>
      <dt className="mt-2 text-[15px] font-semibold text-ink-3">
        {label}
        {note && <span className="ml-2 font-mono text-[11px] font-normal uppercase tracking-wider text-ink-4">{note}</span>}
      </dt>
    </div>
  );
}
