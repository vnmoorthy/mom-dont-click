"use client";

import { AnimatePresence, motion } from "motion/react";
import { LiveDot, Wordmark, cx } from "@/components/ui/kit";

/** One counter. The number rolls when it changes so the room notices it move. */
function Stat({ value, label, tone }: { value: string; label: string; tone?: "scam" }) {
  return (
    <div className="flex items-baseline gap-2.5">
      <span
        className={cx(
          "relative -my-1 inline-flex overflow-hidden py-1 font-display text-[1.9rem] font-extrabold leading-none tracking-tight tabular lg:text-[2.4rem]",
          tone === "scam" ? "text-scam" : "text-cream",
        )}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={value}
            className="inline-block"
            initial={{ y: "60%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "-60%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 520, damping: 36 }}
          >
            {value}
          </motion.span>
        </AnimatePresence>
      </span>
      <span className="font-mono text-xs uppercase tracking-[0.2em] text-cream-3">{label}</span>
    </div>
  );
}

export function WallHeader({
  checked,
  scams,
  medianLabel,
  connected,
  ready,
  capabilities,
  address,
}: {
  checked: number;
  scams: number;
  /** "14.2s", or a dash when nothing has finished yet */
  medianLabel: string;
  connected: boolean;
  /** the first snapshot has arrived */
  ready: boolean;
  capabilities: string[];
  /** Compact reminder of where to send things, shown whenever the big invitation is off screen. */
  address: { label: string; value: string } | null;
}) {
  return (
    <header className="relative z-10 flex shrink-0 flex-wrap items-center gap-x-10 gap-y-3 border-b border-cream/10 px-6 py-4 lg:h-[5.5rem] lg:flex-nowrap lg:px-12 lg:py-0">
      <Wordmark tone="cream" size="lg" className="shrink-0" />

      <div className="min-w-0 flex-1 basis-full lg:basis-0">
        <AnimatePresence initial={false}>
          {address && (
            <motion.div
              key="address"
              className="flex min-w-0 items-baseline gap-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <span className="shrink-0 font-mono text-xs uppercase tracking-[0.2em] text-cream-3">
                {address.label}
              </span>
              <span className="truncate font-display text-[1.7rem] font-extrabold leading-none tracking-tight text-cream">
                {address.value}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex min-w-0 flex-wrap items-baseline gap-x-6 gap-y-2 lg:shrink-0 lg:gap-x-8">
        <Stat value={String(checked)} label="checked" />
        <Stat value={String(scams)} label={scams === 1 ? "scam stopped" : "scams stopped"} tone="scam" />
        <Stat value={medianLabel} label="median" />
      </div>

      <div className="flex shrink-0 flex-col items-start gap-1.5 border-cream/10 lg:items-end lg:border-l lg:pl-8">
        <div
          className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em]"
          role="status"
          aria-live="polite"
        >
          {connected ? (
            <>
              <LiveDot />
              <span className="text-cream">Live</span>
            </>
          ) : (
            <>
              <span className="inline-block size-2 rounded-full border border-warn" />
              <span className="text-warn">{ready ? "Reconnecting" : "Connecting"}</span>
            </>
          )}
        </div>
        {capabilities.length > 0 && (
          <div className="hidden font-mono text-[0.68rem] uppercase tracking-[0.18em] text-cream-3 lg:block">
            {capabilities.join(" · ")}
          </div>
        )}
      </div>
    </header>
  );
}
