"use client";

// /fake: what the two training pages are, and a way to send the agent into them.
import { useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, EyeOff, LoaderCircle, MousePointer2, Unplug } from "lucide-react";
import { api } from "@/lib/client";
import { friendlyError } from "@/components/home/bits";
import { SiteFooter } from "@/components/home/SiteFooter";
import { SiteNav } from "@/components/home/SiteNav";

const PAGES = [
  {
    path: "/fake/parcelfast",
    brand: "ParcelFast Delivery",
    pitch: "A courier that is holding your parcel until you pay $1.99.",
    steps: ["Asks for your email and your email password", "Asks for your card to pay a tiny fee", "The mask comes off"],
    bar: "#0f2a52",
    accent: "#f26a1b",
    alert: "#c8102e",
    font: "Arial, Helvetica, sans-serif",
    wordmark: (
      <span className="text-lg font-black italic tracking-tight text-white">
        Parcel<span style={{ color: "#f26a1b" }}>Fast</span>
      </span>
    ),
    banner: "FINAL NOTICE: RETURNED TO SENDER IN 14:59",
  },
  {
    path: "/fake/northbank",
    brand: "Northbank Online",
    pitch: "A bank that is about to lock your account unless you verify.",
    steps: ["Asks for your username and password", "Asks for your Social Security number, card PIN and phone", "The mask comes off"],
    bar: "#0b4a8f",
    accent: "#0b4a8f",
    alert: "#8a6a00",
    font: "Georgia, 'Times New Roman', serif",
    wordmark: <span className="text-lg font-bold tracking-tight text-white">Northbank</span>,
    banner: "SECURITY ALERT: ACCESS SUSPENDED IN 09:59",
  },
] as const;

export function FakeIndex() {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<{ path: string; text: string } | null>(null);

  const sendAgent = async (path: string) => {
    if (busy) return;
    setBusy(path);
    setError(null);
    try {
      const { id } = await api<{ id: string }>("/api/cases", {
        body: { kind: "link", url: `${window.location.origin}${path}` },
      });
      if (!id) throw new Error("");
      router.push(`/case/${id}`);
    } catch (e) {
      setError({ path, text: friendlyError(e) });
      setBusy(null);
    }
  };

  return (
    <div className="paper-grain min-h-dvh overflow-x-clip bg-paper text-ink">
      <SiteNav />

      <main className="mx-auto max-w-[1100px] px-5 pb-24 pt-6 sm:px-8 sm:pt-12">
        <p className="animate-rise font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-ink-3">Training pages</p>
        <h1
          className="mt-3 max-w-4xl animate-rise font-display text-[clamp(2.6rem,9vw,5.4rem)] font-extrabold leading-[0.92] tracking-[-0.045em]"
          style={{ animationDelay: "60ms" }}
        >
          Two scam pages we built on purpose.
        </h1>
        <p className="mt-6 max-w-2xl animate-rise text-lg leading-relaxed text-ink-2 sm:text-xl" style={{ animationDelay: "140ms" }}>
          They copy the tricks of a phishing page: a countdown, a logo that is almost right, and a form that asks for a
          little more on every step. The brands are made up. Nothing you type is sent or stored.
        </p>

        <section className="mt-10 animate-rise rounded-[22px] border-2 border-ink bg-white/70 p-6 sm:p-8" style={{ animationDelay: "220ms" }}>
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-3">
            <MousePointer2 size={13} /> Why they exist
          </div>
          <h2 className="mt-2 font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">The canary walk.</h2>
          <p className="mt-3 max-w-3xl text-[17px] leading-relaxed text-ink-2">
            The most telling thing about a scam page is what it asks for next. So on these pages the agent types obviously
            made-up details and keeps going: a password first, then a card number. It only ever does that here, on pages we
            host ourselves. On anybody else&rsquo;s page it looks, and never types.
          </p>
        </section>

        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
          {PAGES.map((p) => (
            <article key={p.path} className="flex flex-col overflow-hidden rounded-[22px] border border-line bg-white/60">
              <div aria-hidden style={{ fontFamily: p.font }}>
                <div className="px-4 py-1.5 text-center text-[10px] font-bold tracking-wide text-white" style={{ background: p.alert }}>
                  {p.banner}
                </div>
                <div className="flex items-center justify-between px-5 py-4" style={{ background: p.bar }}>
                  {p.wordmark}
                  <span className="rounded-sm bg-white/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                    Secure
                  </span>
                </div>
                <div className="h-1" style={{ background: p.accent }} />
              </div>

              <div className="flex flex-1 flex-col p-6">
                <h3 className="font-display text-2xl font-extrabold leading-tight tracking-tight">{p.brand}</h3>
                <p className="mt-1.5 text-[17px] leading-snug text-ink-3">{p.pitch}</p>
                <ol className="mt-5 space-y-2">
                  {p.steps.map((s, i) => (
                    <li key={s} className="flex items-start gap-3 text-[15px] leading-snug text-ink-2">
                      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-ink font-mono text-[11px] font-bold text-cream">
                        {i + 1}
                      </span>
                      {s}
                    </li>
                  ))}
                </ol>

                <div className="mt-auto flex flex-wrap items-center gap-2.5 pt-7">
                  <button
                    type="button"
                    onClick={() => void sendAgent(p.path)}
                    disabled={!!busy}
                    className="inline-flex h-11 items-center gap-2 rounded-full bg-scam px-5 text-[15px] font-semibold text-cream transition-[transform,background-color] hover:bg-scam-deep active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-wait disabled:opacity-80"
                  >
                    {busy === p.path ? <LoaderCircle size={16} className="animate-spin" /> : <MousePointer2 size={16} />}
                    Send the agent in
                  </button>
                  <Link
                    href={p.path}
                    prefetch={false}
                    className="inline-flex h-11 items-center gap-1.5 rounded-full border-2 border-ink px-5 text-[15px] font-semibold text-ink transition-colors hover:bg-ink hover:text-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-scam"
                  >
                    Walk through it yourself
                    <ArrowUpRight size={16} />
                  </Link>
                </div>
                {error?.path === p.path && (
                  <p role="alert" className="mt-3 text-sm font-semibold text-scam-deep">
                    {error.text}
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>

        <section className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
          <Pledge
            icon={<Unplug size={18} />}
            title="Nothing leaves the page"
            text="No requests, no form action, no tracking. Pressing a button only moves you to the next step on your own screen."
          />
          <Pledge
            icon={<EyeOff size={18} />}
            title="Nothing is kept"
            text="The page never reads what you type. Close the tab and it is gone."
          />
          <Pledge
            icon={<MousePointer2 size={18} />}
            title="Nobody is being copied"
            text="Both brands are invented. The pages are hidden from search engines and say what they are on every step."
          />
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function Pledge({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-[22px] border border-line bg-paper-2/50 p-6">
      <div className="grid size-9 place-items-center rounded-full bg-ink text-cream">{icon}</div>
      <h3 className="mt-4 font-display text-xl font-extrabold leading-tight tracking-tight">{title}</h3>
      <p className="mt-1.5 text-[15px] leading-relaxed text-ink-3">{text}</p>
    </div>
  );
}
