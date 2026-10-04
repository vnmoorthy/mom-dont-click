"use client";

// The two-minute stage script, with a clock that points at the beat you should be on.
import { useEffect, useState } from "react";
import { Play, RotateCcw, Square } from "lucide-react";
import { cx } from "@/components/ui/kit";

const BEATS: Array<{ at: number; text: string; key?: string }> = [
  { at: 0, text: "Invite the room to forward something sketchy to the address on the wall." },
  { at: 10, text: "Press 1. Mom forwards the parcel email.", key: "1" },
  { at: 15, text: "The throwaway browser walks into the page. Let it play." },
  { at: 40, text: "The verdict slams. Read the sentence out loud." },
  { at: 50, text: "The guardian's phone buzzes. Hold it up." },
  { at: 65, text: "Press 1 again. “Seen before”, answered in 2 seconds.", key: "1" },
  { at: 80, text: "Point at the room's tiles filling the wall." },
  { at: 105, text: "Close: “Mom forwards. It clicks. You only hear about it when it matters.”" },
];

const TOTAL = 120;

function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function RunOfShow() {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [frozen, setFrozen] = useState<number | null>(null); // elapsed seconds when stopped
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (startedAt === null) return;
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, [startedAt]);

  const running = startedAt !== null;
  const elapsed = running ? (now - startedAt) / 1000 : (frozen ?? 0);
  const touched = running || frozen !== null;
  const over = elapsed > TOTAL;
  let current = -1;
  if (touched) BEATS.forEach((b, i) => elapsed >= b.at && (current = i));

  const start = () => {
    const from = frozen ?? 0;
    setNow(Date.now());
    setStartedAt(Date.now() - from * 1000);
    setFrozen(null);
  };
  const stop = () => {
    if (startedAt !== null) setFrozen((Date.now() - startedAt) / 1000);
    setStartedAt(null);
  };
  const reset = () => {
    setStartedAt(null);
    setFrozen(null);
  };

  return (
    <div>
      <div className="flex items-center gap-3">
        <div
          className={cx(
            "font-display text-5xl font-extrabold leading-none tracking-[-0.04em] tabular",
            over ? "text-scam" : "text-ink",
          )}
          aria-live="off"
        >
          {clock(elapsed)}
        </div>
        <div className="font-mono text-[10px] uppercase leading-tight tracking-[0.18em] text-ink-4">
          of 2:00
          <br />
          {over ? "over time" : running ? "on stage" : touched ? "paused" : "not started"}
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          {running ? (
            <button
              type="button"
              onClick={stop}
              className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink px-3.5 py-1.5 text-sm font-semibold text-ink hover:bg-ink hover:text-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-scam"
            >
              <Square size={12} className="fill-current" /> Pause
            </button>
          ) : (
            <button
              type="button"
              onClick={start}
              className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-1.5 text-sm font-semibold text-cream hover:bg-ink-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-scam"
            >
              <Play size={12} className="fill-current" /> {touched ? "Resume" : "Start the clock"}
            </button>
          )}
          <button
            type="button"
            onClick={reset}
            disabled={!touched}
            aria-label="Reset the clock"
            title="Reset the clock"
            className="grid size-8 place-items-center rounded-full border border-line text-ink-3 hover:border-ink hover:text-ink disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-scam"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-paper-3">
        <div
          className={cx("h-full rounded-full transition-[width] duration-200 ease-linear", over ? "bg-scam" : "bg-ink")}
          style={{ width: `${Math.min(100, (elapsed / TOTAL) * 100)}%` }}
        />
      </div>

      <ol className="mt-4 space-y-0.5">
        {BEATS.map((b, i) => {
          const isCurrent = i === current;
          const past = touched && i < current;
          return (
            <li
              key={b.at}
              aria-current={isCurrent ? "step" : undefined}
              className={cx(
                "flex items-start gap-3 rounded-xl px-2.5 py-2 transition-colors duration-200",
                isCurrent ? "bg-ink text-cream" : past ? "text-ink-4" : "text-ink-2",
              )}
            >
              <span className={cx("w-9 shrink-0 pt-px font-mono text-xs tabular", isCurrent ? "text-cream-2" : "text-ink-4")}>
                {clock(b.at)}
              </span>
              <span className={cx("text-sm leading-snug", isCurrent && "font-semibold", past && "line-through decoration-ink-4/40")}>
                {b.text}
              </span>
              {b.key && (
                <kbd
                  className={cx(
                    "ml-auto grid size-6 shrink-0 place-items-center rounded-md border font-mono text-xs font-bold",
                    isCurrent ? "border-cream/40 text-cream" : "border-line bg-paper text-ink-2",
                  )}
                >
                  {b.key}
                </kbd>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
