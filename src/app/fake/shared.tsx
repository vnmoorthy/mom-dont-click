"use client";

// Shared pieces for the two training pages.
//
// These pages imitate what a phishing page looks like so the agent has something
// harmless to walk through on stage. They are deliberately inert:
//   - no fetch, no beacon, no form action (forms use method="dialog", which never navigates)
//   - inputs are uncontrolled and never read, so nothing typed is kept anywhere
//   - every step carries the disclosure strip below
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

export const TRAINING_NOTICE = "Training page for Mom, Don't Click · fictional brand · nothing you type is sent or stored";

/** The persistent disclosure strip. Present on every step of every training page. */
export function TrainingStrip() {
  return (
    <div
      role="note"
      data-training-notice
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/20 bg-[#16130f] px-3 py-1.5 text-center text-[11px] leading-snug text-[#f6f0e4]"
      style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
    >
      {TRAINING_NOTICE}
    </div>
  );
}

/** mm:ss countdown that only lives in this tab. Stops at zero. */
export function useCountdown(startSeconds: number): string {
  const [left, setLeft] = useState(startSeconds);
  useEffect(() => {
    const t = setInterval(() => setLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);
  const m = Math.floor(left / 60);
  const s = left % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** True once React is running, so a submit can never fall through to the browser. */
export function useHydrated(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return ready;
}

/** Step 3 of both pages: the mask comes off. */
export function TrainingReveal({
  lead,
  tells,
  accent,
  onRestart,
}: {
  lead: string;
  tells: string[];
  accent: string;
  onRestart: () => void;
}) {
  return (
    <section data-step="3" className="mx-auto max-w-[640px] px-4 py-10 sm:py-14">
      <div className="rounded-lg border-4 border-dashed bg-white p-6 sm:p-9" style={{ borderColor: accent }}>
        <div className="text-[12px] font-bold uppercase tracking-[0.16em]" style={{ color: accent }}>
          The end of the walk
        </div>
        <h1 className="mt-2 text-[30px] font-bold leading-[1.1] text-[#16130f] sm:text-[38px]">This was a training page.</h1>
        <p className="mt-3 text-[19px] font-bold leading-snug text-[#16130f] sm:text-[21px]">{lead}</p>
        <p className="mt-3 text-[16px] leading-relaxed text-[#3d362d]">
          Nothing you typed left this page. It was not sent anywhere and it was not saved. The brand is made up.
        </p>

        <h2 className="mt-7 text-[13px] font-bold uppercase tracking-[0.14em] text-[#3d362d]">What gave it away</h2>
        <ul className="mt-2 space-y-2">
          {tells.map((t) => (
            <li key={t} className="flex gap-3 text-[16px] leading-snug text-[#16130f]">
              <span aria-hidden className="mt-[7px] inline-block size-2 shrink-0 rounded-full" style={{ background: accent }} />
              {t}
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
          <button
            type="button"
            onClick={onRestart}
            className="rounded px-5 py-2.5 text-[15px] font-bold text-white"
            style={{ background: accent }}
          >
            Start again
          </button>
          <a href="/fake" className="text-[15px] font-bold text-[#16130f] underline underline-offset-4">
            About these training pages
          </a>
          <a href="/" className="text-[15px] font-bold text-[#16130f] underline underline-offset-4">
            What is Mom, Don&rsquo;t Click?
          </a>
        </div>
      </div>
    </section>
  );
}

/** A labelled input in the plain, slightly dated style both fake brands share. */
export function PhishField({
  id,
  label,
  help,
  focusColor,
  children,
}: {
  id: string;
  label: string;
  help?: string;
  focusColor: string;
  children: ReactNode;
}) {
  return (
    <div className="phish-field" style={{ ["--phish-focus" as string]: focusColor }}>
      <label htmlFor={id} className="block text-[13px] font-bold text-[#2a3345]">
        {label}
      </label>
      <div className="mt-1 [&_input]:h-11 [&_input]:w-full [&_input]:rounded-[3px] [&_input]:border [&_input]:border-[#9aa6ba] [&_input]:bg-white [&_input]:px-3 [&_input]:text-[16px] [&_input]:text-[#111827] [&_input:focus]:border-[var(--phish-focus)]">
        {children}
      </div>
      {help && <p className="mt-1 text-[12px] leading-snug text-[#5b6577]">{help}</p>}
    </div>
  );
}
