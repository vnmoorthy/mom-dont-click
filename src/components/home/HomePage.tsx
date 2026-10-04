"use client";

// The product home page: sells it in five seconds, lets you try it in ten.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Mail } from "lucide-react";
import { MotionConfig } from "motion/react";
import { api, useLive } from "@/lib/client";
import type { CaseRecord, GuardianPublic, PublicConfig } from "@/lib/types";
import { Mark } from "@/components/ui/kit";
import { CopyButton, Reveal } from "./bits";
import { BuiltWith } from "./BuiltWith";
import { HeroVisual } from "./HeroVisual";
import { HowItWorks } from "./HowItWorks";
import { LiveNow } from "./LiveNow";
import { QuickCheck } from "./QuickCheck";
import { SiteFooter } from "./SiteFooter";
import { SiteNav } from "./SiteNav";
import { Vocabulary } from "./Vocabulary";

export function HomePage() {
  const live = useLive();
  const [restConfig, setRestConfig] = useState<PublicConfig | null>(null);
  const [restCases, setRestCases] = useState<CaseRecord[]>([]);
  const [guardianCount, setGuardianCount] = useState<number | null>(null);

  // The live stream is the source of truth. These two plain requests only make
  // the first paint faster and cover a stream that is slow to connect.
  useEffect(() => {
    let alive = true;
    api<PublicConfig>("/api/config")
      .then((c) => alive && c && typeof c === "object" && "capabilities" in c && setRestConfig(c))
      .catch(() => {});
    api<{ cases: CaseRecord[] }>("/api/cases?limit=60")
      .then((d) => alive && Array.isArray(d.cases) && setRestCases(d.cases))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (live.resetCount > 0) setRestCases([]);
  }, [live.resetCount]);

  useEffect(() => {
    let alive = true;
    api<{ guardians: GuardianPublic[]; count: number }>("/api/guard")
      .then((d) => alive && setGuardianCount(typeof d.count === "number" ? d.count : (d.guardians?.length ?? 0)))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [live.lastGuardian, live.resetCount]);

  const config = live.config ?? restConfig;
  const inbox = config?.inboxEmail ?? null;

  const cases = useMemo(() => {
    const map = new Map<string, CaseRecord>();
    for (const c of restCases) map.set(c.id, c);
    for (const c of live.cases) map.set(c.id, c);
    return [...map.values()].sort((a, b) => b.createdAt - a.createdAt);
  }, [restCases, live.cases]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="paper-grain min-h-dvh overflow-x-clip bg-paper text-ink">
        <SiteNav />

        <main>
          {/* ---------- hero ---------- */}
          <section className="mx-auto grid max-w-[1240px] grid-cols-1 items-center gap-x-10 gap-y-12 px-5 pb-8 pt-6 sm:px-8 sm:pb-16 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)] lg:pb-28 lg:pt-10">
            <div>
              <p className="animate-rise font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-ink-3">
                A second opinion for every sketchy email
              </p>
              <h1
                className="mt-4 animate-rise font-display text-[clamp(3.6rem,17vw,7rem)] font-extrabold leading-[0.86] tracking-[-0.05em] text-ink lg:text-[clamp(4.5rem,9vw,7.2rem)]"
                style={{ animationDelay: "60ms" }}
              >
                Mom,
                <br />
                don&rsquo;t click.
              </h1>
              <p
                className="mt-4 animate-rise font-display text-[clamp(1.9rem,7.6vw,3.2rem)] font-extrabold leading-none tracking-[-0.035em] text-scam lg:text-[clamp(2.2rem,4vw,3.2rem)]"
                style={{ animationDelay: "140ms" }}
              >
                We&rsquo;ll click it for you.
              </p>
              <p
                className="mt-6 max-w-xl animate-rise text-lg leading-relaxed text-ink-2 sm:text-xl"
                style={{ animationDelay: "220ms" }}
              >
                One email address your mom forwards anything sketchy to. An agent opens the link in a throwaway browser,
                far away from her computer, and answers in one giant plain sentence.
              </p>

              {inbox && (
                <div className="mt-8 animate-rise" style={{ animationDelay: "300ms" }}>
                  <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-3">
                    <Mail size={13} />
                    Forward anything sketchy to
                  </div>
                  <div className="mt-2 flex w-fit max-w-full items-center gap-2 rounded-full border-2 border-ink bg-white py-1.5 pl-5 pr-1.5">
                    <span className="min-w-0 select-all truncate font-mono text-[15px] font-bold text-ink sm:text-xl">{inbox}</span>
                    <CopyButton text={inbox} />
                  </div>
                </div>
              )}

              <div className="mt-7 animate-rise" style={{ animationDelay: inbox ? "380ms" : "300ms" }}>
                {inbox && (
                  <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-3">Or check one right here</div>
                )}
                <QuickCheck />
              </div>
            </div>

            <HeroVisual className="mx-auto w-full max-w-[640px] lg:max-w-none" />
          </section>

          <HowItWorks inboxEmail={inbox} />
          <Vocabulary />
          <LiveNow cases={cases} connected={live.connected} guardianCount={guardianCount} />
          <GuardBand />
          <BuiltWith />
        </main>

        <SiteFooter />
      </div>
    </MotionConfig>
  );
}

/** The one dark band on the page: the pitch to the grown-up kid. */
function GuardBand() {
  return (
    <section id="guard" className="night-grain text-cream">
      <div className="mx-auto grid max-w-[1240px] grid-cols-1 items-center gap-12 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[1.25fr_0.75fr]">
        <Reveal>
          <div className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-cream-3">For the grown-up kids</div>
          <h2 className="mt-3 font-display text-[clamp(2.3rem,6.4vw,4.6rem)] font-extrabold leading-[0.94] tracking-[-0.035em]">
            You only hear about it when it matters.
          </h2>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-cream-2 sm:text-xl">
            Put your email next to hers. If something she forwards turns out to be a scam, you get one short heads-up.
            Nothing to install. Nothing to check.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/guard"
              className="inline-flex items-center gap-2 rounded-full bg-scam px-6 py-3.5 font-display text-lg font-extrabold tracking-tight text-cream transition-[transform,background-color] hover:bg-scam-deep active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream"
            >
              Guard someone
              <ArrowRight size={19} strokeWidth={2.6} />
            </Link>
            <Link
              href="/wall"
              className="inline-flex items-center rounded-full border-2 border-cream/30 px-6 py-3.5 text-[17px] font-semibold text-cream transition-colors hover:border-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream"
            >
              Open the wall
            </Link>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div aria-hidden className="mx-auto w-full max-w-sm rotate-2 rounded-[30px] border border-cream/15 bg-night-2 p-4 shadow-[0_40px_80px_-40px_rgba(0,0,0,0.9)] lg:ml-auto lg:mr-0">
            <div className="flex items-center justify-between px-1 font-mono text-[10px] uppercase tracking-[0.2em] text-cream-3">
              <span>now</span>
              <span>your phone</span>
            </div>
            <div className="mt-3 rounded-[20px] bg-night-3 p-5">
              <div className="flex items-center gap-2.5">
                <Mark size={24} />
                <span className="text-sm font-semibold text-cream">Heads-up about Mom</span>
              </div>
              <p className="mt-3 font-display text-[1.7rem] font-extrabold leading-[1.05] tracking-tight text-cream">
                She was sent a <span className="text-scam">scam</span>. She forwarded it instead of clicking.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-cream-2">
                A fake parcel page asked for her card number. We told her not to click.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
