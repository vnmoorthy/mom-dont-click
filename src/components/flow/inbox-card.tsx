"use client";

import { Forward } from "lucide-react";
import { cx } from "@/components/ui/kit";
import { CopyButton, btnPrimary } from "./bits";

/** The forwardable address, written like a note stuck to the fridge. */
export function InboxCard({
  email,
  lead = "Or forward the email to",
  note = "Forward it from any mail app. The answer comes back as a reply.",
  className,
}: {
  email: string;
  lead?: string;
  note?: string;
  className?: string;
}) {
  return (
    <section
      className={cx(
        "relative rounded-[22px] border border-warn/50 bg-warn-soft px-5 pb-5 pt-7 sm:px-6",
        "shadow-[0_18px_36px_-26px_rgba(23,19,15,0.5)] -rotate-[0.6deg]",
        className,
      )}
    >
      <span
        aria-hidden
        className="absolute -top-3 left-1/2 h-6 w-24 -translate-x-1/2 rotate-[1.5deg] rounded-[3px] bg-paper-3/90 shadow-[0_1px_2px_rgba(23,19,15,0.15)]"
      />
      <div className="flex items-start gap-2 text-base font-semibold leading-snug text-warn-deep">
        <Forward size={18} className="mt-0.5 shrink-0" aria-hidden />
        {lead}
      </div>
      <div className="mt-2 break-all font-mono text-[1.15rem] font-bold leading-snug text-ink sm:text-xl">{email}</div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <CopyButton text={email} label="Copy address" className={cx(btnPrimary, "h-11 px-5 text-base")} />
        <p className="min-w-[12rem] flex-1 text-sm text-ink-3">{note}</p>
      </div>
    </section>
  );
}
