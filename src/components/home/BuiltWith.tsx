"use client";

// Text only, on purpose. Each tool is named with the one job it does here.
import { ArrowUpRight } from "lucide-react";
import { Reveal, SectionHeading } from "./bits";
import { GITHUB_URL } from "./links";

const TOOLS: Array<{ name: string; job: string; detail: string }> = [
  { name: "AgentMail", job: "The forwardable address", detail: "Receives what she forwards and sends the one-sentence reply." },
  { name: "Kernel", job: "The throwaway browser", detail: "Opens the link in the cloud, far from anyone's real computer, then is destroyed." },
  { name: "Exa", job: "Official site and scam reports", detail: "Finds where the company really lives and what others have said about this message." },
  { name: "Mastra", job: "The workflow and trace", detail: "Runs the steps in order, in parallel where it can, and records each one." },
  { name: "Neon", job: "Case memory and AI gateway", detail: "Remembers every case, so a repeat scam is answered instantly." },
  { name: "Fly.io", job: "Where it runs", detail: "Keeps the inbox watcher and the live wall awake." },
  { name: "assistant-ui", job: "The follow-up conversation", detail: "Lets her ask “but what if I already clicked?” on the case page." },
];

export function BuiltWith() {
  return (
    <section id="built-with" className="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 sm:py-28">
      <Reveal>
        <SectionHeading
          eyebrow="Built with"
          title="Seven tools. One job each."
          lede="Nothing here is decoration. Take any one away and a step of the answer goes missing."
        />
      </Reveal>

      <Reveal delay={0.05}>
        <div className="mt-12 grid grid-cols-1 overflow-hidden rounded-[22px] border border-line bg-line [gap:1px] sm:grid-cols-2 lg:grid-cols-4">
          {TOOLS.map((t) => (
            <div key={t.name} className="flex flex-col bg-paper p-6 sm:p-7">
              <div className="font-display text-[1.75rem] font-extrabold leading-none tracking-tight text-ink">{t.name}</div>
              <div className="mt-3 font-mono text-[11px] uppercase tracking-[0.16em] text-scam-deep">{t.job}</div>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-3">{t.detail}</p>
            </div>
          ))}
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col justify-between bg-ink p-6 text-cream transition-colors hover:bg-ink-2 focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-scam sm:p-7"
          >
            <div className="font-display text-[1.75rem] font-extrabold leading-[1.02] tracking-tight">
              See how it fits together
            </div>
            <div className="mt-6 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.16em] text-cream-2">
              Source and architecture on GitHub
              <ArrowUpRight size={18} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </div>
          </a>
        </div>
      </Reveal>
    </section>
  );
}
