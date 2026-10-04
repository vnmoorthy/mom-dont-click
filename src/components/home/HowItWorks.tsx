"use client";

// Four steps, each with a small picture drawn in code.
import type { ReactNode } from "react";
import { ArrowRight, BellRing, Forward, Globe, Mail, Search } from "lucide-react";
import { cx } from "@/components/ui/kit";
import { Reveal, SectionHeading } from "./bits";

export function HowItWorks({ inboxEmail }: { inboxEmail: string | null }) {
  return (
    <section id="how" className="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 sm:py-28">
      <Reveal>
        <SectionHeading
          eyebrow="How it works"
          title={
            <>
              She forwards it.
              <br />
              We do the dangerous part.
            </>
          }
          lede="No app. No new habit. Forwarding an email is something she already knows how to do."
        />
      </Reveal>

      <ol className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2">
        <Step
          n={1}
          delay={0}
          title="Mom forwards it."
          body="An email looks off. Instead of clicking, she forwards it to one address, the same way she would forward it to you."
          tools="AgentMail · the forwardable address"
        >
          <ForwardArt inboxEmail={inboxEmail} />
        </Step>
        <Step
          n={2}
          delay={0.08}
          title="The agent reads it and finds the real link."
          body="Buttons hide where they go. The agent pulls out the address underneath, who the email claims to be, and how hard it pushes."
          tools="The reader · link, brand, pressure"
        >
          <ReadArt />
        </Step>
        <Step
          n={3}
          delay={0}
          title="A throwaway browser opens it. Web search checks the story."
          body="A fresh cloud browser walks into the page, so nobody's real computer has to. At the same moment, a search finds the company's official site and what other people have reported."
          tools="Kernel + Exa · at the same time"
        >
          <InvestigateArt />
        </Step>
        <Step
          n={4}
          delay={0.08}
          title="One giant sentence comes back."
          body="Mom gets a reply she can read without her glasses. If it was a scam, you get a heads-up too. Otherwise you never hear a thing."
          tools="The reply · and a heads-up for you"
        >
          <AnswerArt />
        </Step>
      </ol>
    </section>
  );
}

function Step({
  n,
  title,
  body,
  tools,
  delay,
  children,
}: {
  n: number;
  title: string;
  body: string;
  tools: string;
  delay: number;
  children: ReactNode;
}) {
  return (
    <li className="min-w-0 list-none">
      <Reveal delay={delay} className="h-full">
        <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-[22px] border border-line bg-white/55">
          <div aria-hidden className="relative grid h-52 place-items-center overflow-hidden border-b border-line bg-paper-2/70 px-5 sm:h-56 lg:h-64">
            <div className="flex w-full min-w-0 max-w-[400px] justify-center lg:max-w-[350px] lg:scale-[1.3] xl:max-w-[400px] xl:scale-[1.35] [&>*]:min-w-0">
              {children}
            </div>
          </div>
          <div className="flex flex-1 flex-col p-6 sm:p-7">
            <div className="flex items-start gap-4">
              <span className="font-display text-6xl font-extrabold leading-[0.8] tracking-tighter text-scam tabular">{n}</span>
              <h3 className="font-display text-2xl font-extrabold leading-[1.08] tracking-tight text-ink sm:text-[1.7rem]">
                {title}
              </h3>
            </div>
            <p className="mt-4 text-[17px] leading-relaxed text-ink-3">{body}</p>
            <div className="mt-auto pt-5 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-4">{tools}</div>
          </div>
        </article>
      </Reveal>
    </li>
  );
}

/* ---------- the four small pictures ---------- */

function MiniCard({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cx("rounded-2xl border border-line bg-[#fffdf8] shadow-[0_14px_28px_-18px_rgba(23,19,15,0.4)]", className)}>
      {children}
    </div>
  );
}

function ForwardArt({ inboxEmail }: { inboxEmail: string | null }) {
  return (
    <div className="flex w-full max-w-md items-center justify-center gap-3">
      <MiniCard className="w-[46%] -rotate-3 p-3.5">
        <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest text-ink-4">
          <Mail size={11} /> Inbox
        </div>
        <div className="mt-1.5 text-[13px] font-bold leading-tight text-ink">Your parcel is being held</div>
        <div className="mt-2 space-y-1">
          <i className="block h-1.5 w-full rounded-full bg-paper-3" />
          <i className="block h-1.5 w-4/5 rounded-full bg-paper-3" />
        </div>
        <div className="mt-2.5 inline-flex items-center gap-1 rounded-full bg-ink px-2.5 py-1 text-[10px] font-bold text-cream">
          <Forward size={11} /> Forward
        </div>
      </MiniCard>
      <ArrowRight size={22} className="shrink-0 text-ink-3" />
      <div className="min-w-0 max-w-[46%] rotate-2 rounded-full border-2 border-ink bg-white px-3.5 py-2.5">
        <div className="font-mono text-[8px] uppercase tracking-widest text-ink-4">To</div>
        <div className="truncate font-mono text-[12px] font-bold text-ink">{inboxEmail ?? "one address"}</div>
      </div>
    </div>
  );
}

function ReadArt() {
  return (
    <MiniCard className="w-full max-w-sm p-4">
      <div className="text-[12px] leading-snug text-ink-3">
        Pay the redelivery fee{" "}
        <mark className="rounded bg-warn-soft px-1 font-semibold text-warn-deep">within 24 hours</mark> or your parcel
        will be returned.
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span className="rounded-lg bg-[#f26a1b] px-3 py-1.5 text-[11px] font-bold text-white">Track my parcel</span>
        <span className="font-mono text-[9px] uppercase tracking-widest text-ink-4">says the button</span>
      </div>
      <div className="ml-6 h-4 w-px border-l-2 border-dashed border-scam" />
      <div className="flex items-center gap-2 rounded-xl border border-scam/40 bg-scam-soft px-3 py-2">
        <span className="defanged min-w-0 flex-1 truncate text-[11px] font-medium text-scam-deep">
          hxxps://parcelfast-redelivery[.]co/pay
        </span>
        <span className="shrink-0 font-mono text-[9px] uppercase tracking-widest text-scam-deep">really goes here</span>
      </div>
    </MiniCard>
  );
}

function InvestigateArt() {
  return (
    <div className="grid w-full max-w-md grid-cols-[1fr_auto_1fr] items-center gap-2.5">
      <div className="overflow-hidden rounded-2xl border border-night-4 bg-night-2 shadow-[0_14px_28px_-16px_rgba(13,11,9,0.7)]">
        <div className="flex items-center gap-1.5 border-b border-cream/10 bg-night-3 px-2.5 py-1.5">
          <i className="size-1.5 rounded-full bg-scam/80" />
          <i className="size-1.5 rounded-full bg-warn/80" />
          <i className="size-1.5 rounded-full bg-cream/25" />
          <Globe size={10} className="ml-auto text-cream-3" />
        </div>
        <div className="space-y-1.5 bg-[#fbfaf6] p-2.5">
          <i className="block h-1.5 w-2/3 rounded-full bg-[#12264d]/70" />
          <i className="block h-4 rounded border border-[#c9d1de] bg-white" />
          <i className="block h-4 rounded border-2 border-scam bg-white" />
          <i className="block h-3.5 w-1/2 rounded bg-[#f26a1b]" />
        </div>
        <div className="bg-night-3 px-2.5 py-1.5 font-mono text-[8px] uppercase tracking-widest text-cream-2">
          the browser looks
        </div>
      </div>

      <div className="flex flex-col items-center gap-1 font-mono text-[8px] uppercase tracking-widest text-ink-4">
        <i className="h-6 w-px bg-line" />
        <span className="[writing-mode:vertical-rl]">same time</span>
        <i className="h-6 w-px bg-line" />
      </div>

      <MiniCard className="p-2.5">
        <div className="flex items-center gap-1.5 rounded-full border border-line bg-white px-2 py-1">
          <Search size={10} className="text-ink-4" />
          <i className="block h-1.5 w-3/4 rounded-full bg-paper-3" />
        </div>
        <div className="mt-2 rounded-lg bg-calm-soft px-2 py-1.5 text-[10px] font-semibold leading-tight text-calm-deep">
          The official site is somewhere else
        </div>
        <div className="mt-1.5 rounded-lg bg-scam-soft px-2 py-1.5 text-[10px] font-semibold leading-tight text-scam-deep">
          Others reported this one
        </div>
        <div className="mt-2 font-mono text-[8px] uppercase tracking-widest text-ink-4">the search asks around</div>
      </MiniCard>
    </div>
  );
}

function AnswerArt() {
  return (
    <div className="relative w-full max-w-md">
      <div className="mr-10 rounded-2xl bg-ink px-4 py-3.5 shadow-[0_14px_28px_-16px_rgba(23,19,15,0.7)]">
        <div className="font-mono text-[8px] uppercase tracking-widest text-cream-3">Reply to Mom</div>
        <div className="mt-1 font-display text-[22px] font-extrabold leading-[1.02] tracking-tight text-cream">
          <span className="text-scam">SCAM.</span> Do not click.
        </div>
      </div>
      <div className="-mt-2 ml-auto flex w-[62%] rotate-2 items-start gap-2.5 rounded-2xl border border-line bg-[#fffdf8] px-3 py-2.5 shadow-[0_14px_28px_-16px_rgba(23,19,15,0.5)]">
        <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-scam text-cream">
          <BellRing size={14} />
        </span>
        <div className="min-w-0">
          <div className="text-[12px] font-bold leading-tight text-ink">Heads-up about Mom</div>
          <div className="text-[11px] leading-snug text-ink-3">She was sent a scam. She forwarded it instead of clicking.</div>
        </div>
      </div>
    </div>
  );
}
