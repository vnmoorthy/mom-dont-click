"use client";

// "The evidence" — every finding as a card, the worst news first.
import {
  ExternalLink,
  Globe,
  History,
  Image as ImageIcon,
  MessageSquareWarning,
  ScanSearch,
  Search,
} from "lucide-react";
import type { Evidence, EvidenceKind, EvidenceTone } from "@/lib/types";
import { TONE, cx } from "@/components/ui/kit";
import { SectionHeading, cardClass, safeHttpUrl } from "./bits";

const ORDER: EvidenceTone[] = ["red", "amber", "neutral", "calm"];

const GROUP_LABEL: Record<EvidenceTone, string> = {
  red: "Red flags",
  amber: "Worth a second look",
  neutral: "For the record",
  calm: "Nothing odd here",
};

const KIND: Record<EvidenceKind, { icon: typeof Globe; label: string }> = {
  browser: { icon: Globe, label: "The page" },
  search: { icon: Search, label: "The web" },
  domain: { icon: ScanSearch, label: "The address" },
  language: { icon: MessageSquareWarning, label: "The wording" },
  memory: { icon: History, label: "Our memory" },
  vision: { icon: ImageIcon, label: "The picture" },
};

function EvidenceCard({ evidence }: { evidence: Evidence }) {
  const t = TONE[evidence.tone] ?? TONE.neutral;
  const kind = KIND[evidence.kind] ?? KIND.browser;
  const Icon = kind.icon;
  const link = safeHttpUrl(evidence.url);
  return (
    <article className={cx("rounded-[22px] border p-4 animate-rise sm:p-5", t.bg, t.border)}>
      <div className="flex items-start gap-3.5">
        <span className={cx("grid size-10 shrink-0 place-items-center rounded-full bg-white/75", t.text)}>
          <Icon size={19} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h4 className={cx("text-lg font-semibold leading-snug", t.text)}>{evidence.title}</h4>
          {evidence.detail && <p className="mt-1.5 text-base leading-relaxed text-ink-2">{evidence.detail}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] uppercase tracking-widest text-ink-3">
            <span>
              {kind.label} · {evidence.source}
            </span>
            {link && (
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded text-ink underline decoration-ink-4 underline-offset-4 outline-none transition hover:decoration-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                source
                <ExternalLink size={11} aria-hidden />
              </a>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export function CaseEvidenceSection({ evidence, className }: { evidence: Evidence[]; className?: string }) {
  const groups = ORDER.map((tone) => ({ tone, items: evidence.filter((e) => e.tone === tone) })).filter(
    (g) => g.items.length > 0,
  );

  return (
    <section className={className}>
      <SectionHeading
        title="The evidence"
        aside={
          evidence.length > 0 ? (
            <span className="font-mono text-xs uppercase tracking-widest text-ink-3 tabular">
              {evidence.length} {evidence.length === 1 ? "finding" : "findings"}
            </span>
          ) : undefined
        }
      />
      {groups.length === 0 ? (
        <div className={cx(cardClass, "p-5 text-lg text-ink-2")}>
          We did not record any separate findings for this one. The answer above is based on the message itself.
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <div key={g.tone}>
              <h3 className="mb-2.5 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-ink-2">
                <span className={cx("size-2.5 rounded-full", TONE[g.tone].dot)} aria-hidden />
                {GROUP_LABEL[g.tone]}
                <span className="font-mono font-normal text-ink-4 tabular">{g.items.length}</span>
              </h3>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {g.items.map((e) => (
                  <EvidenceCard key={e.id} evidence={e} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
