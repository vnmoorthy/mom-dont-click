"use client";

// "Guardian alerted": drawn like the notification that just landed on the grown-up child's phone.
import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BellRing } from "lucide-react";
import { maskEmail } from "@/lib/client";
import { Mark } from "@/components/ui/kit";
import { categoryPhrase, pronounFor } from "./util";

export interface ToastEntry {
  key: string;
  caseId: string;
  /** who the guardian looks after: "Mom" */
  name: string;
  emailMasked: string;
  category?: string;
}

const STAY_MS = 7000;

function Toast({ entry, onDone }: { entry: ToastEntry; onDone: (key: string) => void }) {
  useEffect(() => {
    const t = setTimeout(() => onDone(entry.key), STAY_MS);
    return () => clearTimeout(t);
  }, [entry.key, onDone]);

  const who = entry.name.trim() || "Mom";
  // already masked by the server; mask again only if a plain address ever slips through
  const address = /[•*…]/.test(entry.emailMasked) ? entry.emailMasked : maskEmail(entry.emailMasked);

  return (
    <motion.button
      type="button"
      layout="position"
      onClick={() => onDone(entry.key)}
      aria-label="Guardian alerted. Dismiss"
      className="pointer-events-auto block w-[31rem] max-w-full cursor-pointer rounded-[1.75rem] border border-ink/10 bg-cream/95 p-5 text-left text-ink shadow-[0_30px_80px_-20px_rgba(0,0,0,0.75)] outline-none backdrop-blur-xl focus-visible:ring-4 focus-visible:ring-ink/40"
      initial={{ opacity: 0, x: 90, scale: 0.92 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 70, scale: 0.96, transition: { duration: 0.25 } }}
      transition={{ type: "spring", stiffness: 420, damping: 30 }}
    >
      <div className="flex items-center gap-2.5">
        <Mark size={26} />
        <span className="text-sm font-semibold uppercase tracking-[0.14em] text-ink-3">Mom, Don&rsquo;t Click</span>
        <span className="ml-auto text-sm text-ink-4">now</span>
      </div>
      <div className="mt-3.5 font-display text-[1.75rem] font-extrabold leading-none tracking-tight">
        Guardian alerted
      </div>
      <p className="mt-2 text-xl leading-snug text-ink-2">
        {who} was sent {categoryPhrase(entry.category)}. {pronounFor(who)} did not click. Handled.
      </p>
      {address && (
        <div className="mt-3.5 flex items-center gap-2 font-mono text-sm text-ink-3">
          <BellRing className="size-4 shrink-0" aria-hidden />
          <span className="truncate">sent to {address}</span>
        </div>
      )}
    </motion.button>
  );
}

export function GuardianToasts({ toasts, onDone }: { toasts: ToastEntry[]; onDone: (key: string) => void }) {
  return (
    <div
      className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col items-end gap-3 lg:inset-x-auto lg:bottom-auto lg:right-6 lg:top-6"
      role="status"
      aria-live="polite"
    >
      <AnimatePresence initial={false}>
        {toasts.map((entry) => (
          <Toast key={entry.key} entry={entry} onDone={onDone} />
        ))}
      </AnimatePresence>
    </div>
  );
}
