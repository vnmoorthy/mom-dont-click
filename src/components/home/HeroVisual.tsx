"use client";

// The whole product in one picture, drawn in code:
// a forwarded email -> a throwaway browser -> one giant answer.
// Everything is sized in `em` off a container-query font size, so the
// composition scales as one piece from a phone to a projector.
import { useRef, useState } from "react";
import { Mail, MousePointer2, RotateCcw } from "lucide-react";
import { motion, useInView } from "motion/react";
import { cx } from "@/components/ui/kit";

const SOFT: [number, number, number, number] = [0.16, 1, 0.3, 1];

// Beats of the little story, in seconds.
const T = {
  email: 0.1,
  arrow: 0.6,
  browser: 0.8,
  cursor: 1.25,
  typing: 1.6,
  box: 2.35,
  stamp: 2.8,
  reply: 3.15,
};

export function HeroVisual({ className }: { className?: string }) {
  const [run, setRun] = useState(0);
  // On a phone the picture sits below the fold, so the story waits until it is on screen.
  const holder = useRef<HTMLDivElement>(null);
  const inView = useInView(holder, { once: true, amount: 0.3 });
  return (
    <div className={className}>
      <p className="sr-only">
        Illustration. Mom forwards an email about a held parcel. A throwaway browser opens the link and finds a page
        asking for a card number. The answer comes back in one sentence: scam, do not click.
      </p>
      <div ref={holder} className="@container" aria-hidden>
        {inView ? <Scene key={run} /> : <div className="aspect-[40/34.5] w-full" />}
      </div>
      <div className="mt-2 flex justify-end">
        <button
          type="button"
          onClick={() => setRun((n) => n + 1)}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-3 transition-colors hover:bg-paper-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-scam"
        >
          <RotateCcw size={12} />
          Play it again
        </button>
      </div>
    </div>
  );
}

function Scene() {
  return (
    <div style={{ fontSize: "2.5cqw" }} className="pointer-events-none relative aspect-[40/34.5] w-full select-none">
      {/* 1. the forwarded email */}
      <motion.div
        initial={{ opacity: 0, x: "-5em", y: "1.5em", rotate: -13 }}
        animate={{ opacity: 1, x: 0, y: 0, rotate: -4 }}
        transition={{ type: "spring", stiffness: 130, damping: 17, delay: T.email }}
        className="absolute left-0 top-[0.6em] z-10 w-[17.5em] rounded-[1.3em] border border-line bg-[#fffdf8] p-[1.2em] shadow-[0_1.4em_2.6em_-1.2em_rgba(23,19,15,0.4)]"
      >
        <div className="flex items-center gap-[0.5em] font-mono text-[0.62em] uppercase tracking-[0.18em] text-ink-4">
          <Mail className="size-[1.5em]" />
          Forwarded by Mom
        </div>
        <div className="mt-[0.45em] font-display text-[1.3em] font-extrabold leading-[1.05] tracking-tight text-ink">
          Fwd: Your parcel is being held
        </div>
        <div className="mt-[0.75em] rounded-[0.8em] bg-paper px-[0.9em] py-[0.65em]">
          <div className="text-[0.84em] italic leading-snug text-ink-2">
            &ldquo;Is this real? It says I have to pay today.&rdquo;
          </div>
        </div>
        <div className="mt-[0.8em] text-[0.78em] leading-snug text-ink-3">
          Pay the $1.99 redelivery fee within 24 hours or your parcel goes back.
        </div>
        <div className="mt-[0.7em] inline-block rounded-[0.5em] bg-scam-soft px-[0.6em] py-[0.3em]">
          <span className="defanged block text-[0.6em] font-medium text-scam-deep">hxxps://parcelfast-redelivery[.]co</span>
        </div>
      </motion.div>

      {/* the hop from her inbox to our browser */}
      <svg viewBox="0 0 400 345" className="absolute inset-0 z-10 size-full overflow-visible" fill="none">
        <motion.path
          d="M 184 40 C 236 10, 318 18, 324 74"
          stroke="var(--color-ink)"
          strokeWidth="2"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ delay: T.arrow, duration: 0.55, ease: SOFT }}
        />
        <motion.path
          d="M 315 62 L 324 76 L 335 64"
          stroke="var(--color-ink)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: T.arrow + 0.45, duration: 0.2 }}
        />
      </svg>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: T.arrow + 0.25, duration: 0.4 }}
        className="absolute left-[21em] top-[0.2em] z-10 rotate-[4deg] font-mono text-[0.62em] uppercase tracking-[0.16em] text-ink-3"
      >
        we open it. she doesn&rsquo;t.
      </motion.div>

      {/* 2. the throwaway browser */}
      <motion.div
        initial={{ opacity: 0, y: "3em", scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 150, damping: 19, delay: T.browser }}
        className="absolute right-0 top-[8em] z-20 w-[23.6em] overflow-hidden rounded-[1.3em] border border-night-4 bg-night-2 shadow-[0_2em_3.4em_-1.4em_rgba(13,11,9,0.65)]"
      >
        <div className="flex items-center gap-[0.7em] border-b border-cream/10 bg-night-3 px-[0.9em] py-[0.65em]">
          <span className="flex gap-[0.32em]">
            <i className="size-[0.62em] rounded-full bg-scam/80" />
            <i className="size-[0.62em] rounded-full bg-warn/80" />
            <i className="size-[0.62em] rounded-full bg-cream/25" />
          </span>
          <div className="min-w-0 flex-1 rounded-full bg-night px-[0.9em] py-[0.38em]">
            <span className="block truncate font-mono text-[0.6em] text-cream-2">hxxps://parcelfast-redelivery[.]co/pay</span>
          </div>
          <span className="flex items-center gap-[0.4em] font-mono text-[0.5em] uppercase tracking-[0.16em] text-cream-3">
            <i className="size-[0.75em] rounded-full bg-scam animate-pulse-dot" />
            throwaway
          </span>
        </div>

        <div className="relative bg-[#fbfaf6] px-[1.2em] pb-[1.25em] pt-[1em] text-[#12264d]">
          <div className="flex items-center justify-between">
            <div className="text-[1.05em] font-black italic tracking-tight">
              Parcel<span className="text-[#f26a1b]">Fast</span>
            </div>
            <div className="rounded-[0.3em] bg-[#f26a1b] px-[0.6em] py-[0.25em]">
              <span className="block text-[0.54em] font-bold uppercase tracking-wide text-white">Final notice · 14:59</span>
            </div>
          </div>
          <div className="mt-[0.75em] text-[1em] font-bold leading-tight">Pay the $1.99 redelivery fee</div>

          <FakeField label="Name on card" value="Made Up Person" />

          <div className="relative">
            <FakeField label="Card number" typed="0000 0000 0000 0000" delay={T.typing} />
            <motion.div
              initial={{ opacity: 0, scale: 1.18 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: T.box, type: "spring", stiffness: 420, damping: 20 }}
              className="absolute -inset-x-[0.5em] -bottom-[0.5em] top-[0.25em] rounded-[0.7em] border-[0.2em] border-scam"
            />
            <motion.div
              initial={{ opacity: 0, y: "0.4em" }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: T.box + 0.12, duration: 0.3, ease: SOFT }}
              className="absolute right-[-0.5em] top-[0.25em] rounded-bl-[0.45em] rounded-tr-[0.55em] bg-scam px-[0.6em] py-[0.22em]"
            >
              <span className="block font-mono text-[0.52em] font-bold uppercase tracking-[0.12em] text-cream">
                asks for a card number
              </span>
            </motion.div>
          </div>

          <div className="mt-[1.15em] rounded-[0.5em] bg-[#f26a1b] py-[0.55em] text-center">
            <span className="block text-[0.78em] font-bold text-white">Pay $1.99</span>
          </div>

          <motion.div
            initial={{ opacity: 0, x: "7em", y: "5em" }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ delay: T.cursor, duration: 0.5, ease: SOFT }}
            className="absolute right-[3.2em] top-[10.9em]"
          >
            <MousePointer2 className="size-[1.7em] fill-ink text-cream drop-shadow-[0_0.15em_0.2em_rgba(0,0,0,0.3)]" strokeWidth={1.5} />
          </motion.div>
        </div>
      </motion.div>

      {/* 3. the verdict, stamped */}
      <motion.div
        initial={{ opacity: 0, scale: 2.4, rotate: -22 }}
        animate={{ opacity: 0.94, scale: 1, rotate: -9 }}
        transition={{ delay: T.stamp, type: "spring", stiffness: 520, damping: 23 }}
        className="absolute left-[0.2em] top-[19em] z-40 mix-blend-multiply"
      >
        <div className="rounded-[0.9em] border-[0.42em] border-scam px-[0.9em] pb-[0.15em] pt-[0.45em]">
          <div className="font-display text-[5em] font-extrabold leading-[0.9] tracking-[-0.04em] text-scam">SCAM</div>
        </div>
      </motion.div>

      {/* the one giant sentence */}
      <motion.div
        initial={{ opacity: 0, y: "1.6em" }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: T.reply, duration: 0.6, ease: SOFT }}
        className="absolute inset-x-0 bottom-0 z-30 rounded-[1.3em] bg-ink px-[1.4em] py-[1.1em] shadow-[0_1.6em_2.6em_-1.4em_rgba(23,19,15,0.6)]"
      >
        <div className="font-mono text-[0.6em] uppercase tracking-[0.2em] text-cream-3">The reply Mom gets · 41 seconds later</div>
        <div className="mt-[0.3em] font-display text-[1.62em] font-extrabold leading-[1.05] tracking-[-0.02em] text-cream">
          <span className="text-scam">SCAM.</span> Do not click. Carriers never ask for a card by email.
        </div>
      </motion.div>
    </div>
  );
}

function FakeField({
  label,
  value,
  typed,
  delay = 0,
}: {
  label: string;
  value?: string;
  typed?: string;
  delay?: number;
}) {
  return (
    <div className="pt-[0.75em]">
      <div className="text-[0.58em] font-semibold uppercase tracking-wide text-[#5b6b85]">{label}</div>
      <div
        className={cx(
          "mt-[0.25em] flex h-[1.9em] items-center rounded-[0.45em] border bg-white px-[0.7em]",
          typed ? "border-[#9aa6ba]" : "border-[#c9d1de]",
        )}
      >
        <span className="font-mono text-[0.74em] text-[#12264d]">
          {value}
          {typed &&
            typed.split("").map((ch, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: delay + i * 0.034, duration: 0.01 }}
              >
                {ch === " " ? " " : ch}
              </motion.span>
            ))}
        </span>
      </div>
    </div>
  );
}
