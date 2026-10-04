"use client";

// A phone lock screen showing the one kind of note a guardian ever receives.
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { BatteryFull, Camera, Flashlight, Signal, Wifi } from "lucide-react";
import { Mark, cx } from "@/components/ui/kit";

/** "She" for Mom / Grandma, "He" for Dad / Grandpa, otherwise the neutral "They". */
export function pronounFor(name: string): "She" | "He" | "They" {
  const n = name.trim().toLowerCase();
  if (n === "mom" || n === "grandma") return "She";
  if (n === "dad" || n === "grandpa") return "He";
  return "They";
}

export function alertSentence(name: string): string {
  const who = name.trim() || "Mom";
  return `${who} was sent a scam. ${pronounFor(who)} did not click. Handled.`;
}

function useClock(): { time: string; date: string } {
  // a fixed time on the server, the real one after the page wakes up
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(t);
  }, []);
  if (!now) return { time: "9:41", date: "Today" };
  const h = now.getHours() % 12 || 12;
  const m = String(now.getMinutes()).padStart(2, "0");
  const date = now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  return { time: `${h}:${m}`, date };
}

export function LockScreen({
  parentName,
  arrived,
  line,
  className,
}: {
  parentName: string;
  /** bump to make the notification drop in again */
  arrived: number;
  /** a real alert that just landed: replaces the sample wording */
  line?: string | null;
  className?: string;
}) {
  const { time, date } = useClock();
  const reduce = useReducedMotion();
  const who = parentName.trim() || "Mom";
  // "Mom was sent a parcel scam. She did not click. Handled." -> headline + the rest
  const cut = line ? line.indexOf(". ") : -1;
  const first = line ? (cut > 0 ? line.slice(0, cut + 1) : line) : `${who} was sent a scam.`;
  const rest = line ? (cut > 0 ? line.slice(cut + 2) : "") : `${pronounFor(who)} did not click. Handled.`;

  return (
    <div
      className={cx(
        "night-grain relative mx-auto flex aspect-[9/15] w-full max-w-[19.5rem] flex-col overflow-hidden rounded-[2.6rem] border-[6px] border-night-3 text-cream",
        "shadow-[0_30px_60px_-30px_rgba(23,19,15,0.7)]",
        className,
      )}
      role="img"
      aria-label={`A phone lock screen with one notification: ${line ?? alertSentence(who)}`}
    >
      {/* status bar */}
      <div className="flex items-center justify-between px-6 pt-4 text-cream-2" aria-hidden>
        <span className="font-sans text-[13px] font-semibold tabular">{time}</span>
        <span className="absolute left-1/2 top-3 h-6 w-24 -translate-x-1/2 rounded-full bg-night" />
        <span className="flex items-center gap-1.5">
          <Signal size={14} />
          <Wifi size={14} />
          <BatteryFull size={17} />
        </span>
      </div>

      {/* clock */}
      <div className="mt-9 text-center" aria-hidden>
        <div className="text-sm font-medium text-cream-2">{date}</div>
        <div className="mt-1 font-display text-[4.6rem] font-extrabold leading-none tracking-tight tabular">{time}</div>
      </div>

      {/* the notification */}
      <div className="mt-8 px-3" aria-hidden>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={arrived}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -28, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            transition={{ type: "spring", stiffness: 380, damping: 26 }}
            className="rounded-[22px] border border-cream/10 bg-cream/12 p-3.5 backdrop-blur-md"
          >
            <div className="flex items-center gap-2">
              <Mark size={22} />
              <span className="flex-1 truncate text-[11px] font-semibold uppercase tracking-wider text-cream-2">
                Mom, Don&rsquo;t Click
              </span>
              <span className="text-[11px] text-cream-3">now</span>
            </div>
            <p className="mt-2 break-words text-[17px] font-semibold leading-snug text-cream">{first}</p>
            {rest && <p className="text-[15px] leading-snug text-cream-2">{rest}</p>}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* bottom furniture */}
      <div className="mt-auto flex items-center justify-between px-8 pb-5" aria-hidden>
        <span className="grid size-11 place-items-center rounded-full bg-cream/10 text-cream-2">
          <Flashlight size={18} />
        </span>
        <span className="grid size-11 place-items-center rounded-full bg-cream/10 text-cream-2">
          <Camera size={18} />
        </span>
      </div>
      <div className="mx-auto mb-2 h-1 w-28 rounded-full bg-cream/40" aria-hidden />
    </div>
  );
}
