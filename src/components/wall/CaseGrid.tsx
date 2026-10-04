"use client";

// The grid of answered cases. A tile is the verdict slam, shrunk: red is filled so it is
// unmistakable from the back of the room; amber and slate are outlined so red always wins.
import { memo } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CircleAlert, Hourglass, Inbox, Zap } from "lucide-react";
import type { CaseRecord, VerdictLevel } from "@/lib/types";
import { VerdictBadge, cx } from "@/components/ui/kit";
import { Ago, ChannelIcon } from "./bits";
import { finishedAt, topEvidence } from "./util";

const LOOK: Record<
  VerdictLevel,
  { wrap: string; bar: string; evidence: string; meta: string; badge: string; zap: string }
> = {
  SCAM: {
    wrap: "border-scam bg-scam text-cream shadow-[0_22px_60px_-24px_rgba(232,57,28,0.85)]",
    bar: "bg-scam-deep",
    evidence: "text-cream/90",
    meta: "text-cream/75",
    badge: "bg-cream! text-scam-deep!",
    zap: "bg-ink/25 text-cream",
  },
  TREAT_AS_SCAM: {
    wrap: "border-warn/60 bg-night-2 text-cream",
    bar: "bg-warn",
    evidence: "text-[#ffd98a]",
    meta: "text-cream-3",
    badge: "",
    zap: "bg-warn/20 text-warn",
  },
  NO_RED_FLAGS: {
    wrap: "border-calm/70 bg-night-2 text-cream",
    bar: "bg-calm",
    evidence: "text-[#b9cbdb]",
    meta: "text-cream-3",
    badge: "",
    zap: "bg-calm/35 text-[#b9cbdb]",
  },
};

const TILE =
  "group relative flex h-[11rem] flex-col overflow-hidden rounded-[22px] border p-5 pl-7 outline-none transition-[filter] duration-200 hover:brightness-110 focus-visible:ring-4 focus-visible:ring-cream/60";

const Tile = memo(function Tile({
  item,
  stale,
  layoutKey,
}: {
  item: CaseRecord;
  stale: boolean;
  layoutKey: string;
}) {
  const answered = item.status === "done" && !!item.verdict;
  const look = answered ? LOOK[item.verdict as VerdictLevel] : null;
  const evidence = answered ? topEvidence(item) : undefined;
  const subject = item.subject || "Something sketchy";

  return (
    <motion.a
      layout="position"
      layoutDependency={layoutKey}
      href={`/case/${item.id}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Open the case: ${subject}`}
      // a new tile lands a beat late, just as the verdict's flood closes onto its slot;
      // the tiles it pushes aside move straight away, under cover of the flood
      initial={{ opacity: 0, y: -56, scale: 1.14 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      transition={{
        type: "spring",
        stiffness: 380,
        damping: 28,
        mass: 0.9,
        delay: 0.34,
        opacity: { duration: 0.25, delay: 0.34 },
        layout: { type: "spring", stiffness: 380, damping: 34 },
      }}
      className={cx(TILE, look ? look.wrap : "border-cream/12 bg-night-2/70 text-cream-3")}
    >
      <i aria-hidden className={cx("absolute inset-y-0 left-0 w-2", look ? look.bar : "bg-night-4")} />

      {item.seenBefore && look && (
        <span
          title="Seen before"
          className={cx("absolute right-4 top-4 grid size-8 place-items-center rounded-full", look.zap)}
        >
          <Zap className="size-4" fill="currentColor" aria-hidden />
          <span className="sr-only">Seen before</span>
        </span>
      )}

      <div
        className={cx(
          "line-clamp-2 font-display text-[1.65rem] font-extrabold leading-[1.08] tracking-[-0.015em] [font-variant-ligatures:none]",
          item.seenBefore && look && "pr-10",
          !look && "text-cream-2",
        )}
      >
        {subject}
      </div>

      <div className={cx("mt-2 truncate text-[1.05rem] font-medium", look ? look.evidence : "text-cream-3")}>
        {look ? (
          (evidence?.title ?? item.reasons[0] ?? item.headline ?? "")
        ) : (
          <span className="inline-flex items-center gap-2">
            {stale ? (
              <Hourglass className="size-4 shrink-0" aria-hidden />
            ) : (
              <CircleAlert className="size-4 shrink-0" aria-hidden />
            )}
            {stale ? "This one is taking a long time" : "Could not check this one"}
          </span>
        )}
      </div>

      <div className="mt-auto flex items-center gap-3">
        {look ? (
          <VerdictBadge verdict={item.verdict} size="sm" className={look.badge} />
        ) : (
          <span className="rounded-full border border-cream/20 px-2.5 py-0.5 font-display text-[11px] font-extrabold uppercase tracking-wide">
            {stale ? "Still working" : "Not checked"}
          </span>
        )}
        <span
          className={cx(
            "ml-auto flex items-center gap-2 font-mono text-xs tabular",
            look ? look.meta : "text-cream-3",
          )}
        >
          <ChannelIcon channel={item.channel} className="size-4" />
          <Ago ts={finishedAt(item)} />
        </span>
      </div>
    </motion.a>
  );
});

function Legend() {
  const items: { label: string; swatch: string }[] = [
    { label: "Scam", swatch: "bg-scam" },
    { label: "Treat as a scam", swatch: "bg-warn" },
    { label: "No red flags found", swatch: "bg-calm" },
  ];
  return (
    <div className="hidden items-center gap-5 font-mono text-[0.68rem] uppercase tracking-[0.18em] text-cream-3 sm:flex">
      {items.map((it) => (
        <span key={it.label} className="flex items-center gap-2">
          <i aria-hidden className={cx("size-2.5 rounded-[3px]", it.swatch)} />
          {it.label}
        </span>
      ))}
    </div>
  );
}

export function CaseGrid({
  items,
  staleIds,
  wide,
  ready,
  connected,
  hasPending,
}: {
  /** answered, failed or stalled cases, newest answer first */
  items: CaseRecord[];
  staleIds: ReadonlySet<string>;
  /** grid-only mode: four columns across the whole screen */
  wide: boolean;
  ready: boolean;
  connected: boolean;
  /** a verdict is on screen right now and its tile has not dropped in yet */
  hasPending: boolean;
}) {
  const shown = items.slice(0, wide ? 24 : 12);

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col" aria-label="Checked so far">
      <div className="mb-4 flex shrink-0 items-center justify-between gap-6">
        <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-cream-3">Just checked</h2>
        <Legend />
      </div>

      {shown.length === 0 && !hasPending ? (
        <div className="grid min-h-[18rem] flex-1 place-items-center rounded-[22px] border-2 border-dashed border-cream/15 px-8 py-12 text-center animate-rise">
          <div className="max-w-[34rem]">
            <Inbox className="mx-auto size-14 text-cream-3" strokeWidth={1.5} aria-hidden />
            {ready ? (
              <>
                <p className="mt-6 font-display text-[2.8rem] font-extrabold leading-none tracking-tight">
                  Nothing checked yet.
                </p>
                <p className="mt-4 text-balance text-xl leading-snug text-cream-2">
                  Send in the first sketchy thing. The plain answer lands right here.
                </p>
              </>
            ) : (
              <>
                <p className="mt-6 font-display text-[2.8rem] font-extrabold leading-none tracking-tight">
                  {connected ? "Catching up." : "Reaching the agent."}
                </p>
                <p className="mt-4 text-balance text-xl leading-snug text-cream-2">
                  {connected
                    ? "The checked cases will show up here in a moment."
                    : "It is not answering yet. This screen keeps trying on its own."}
                </p>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="-mx-4 -mt-4 min-h-0 flex-1 px-4 pt-4 lg:overflow-hidden lg:[mask-image:linear-gradient(to_bottom,black_calc(100%_-_6rem),transparent)]">
          <div className={cx("grid gap-5 sm:grid-cols-2", wide && "lg:grid-cols-4")}>
            <AnimatePresence initial={false}>
              {shown.map((item, i) => (
                <Tile
                  key={item.id}
                  item={item}
                  stale={staleIds.has(item.id)}
                  layoutKey={`${wide ? "wide" : "half"}:${i}`}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </section>
  );
}
