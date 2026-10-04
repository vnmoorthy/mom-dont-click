"use client";

// "What was sent" — the original message, quoted, with every link defanged.
import { useId, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { defang, maskEmail } from "@/lib/client";
import type { CaseChannel, CaseRecord } from "@/lib/types";
import { cx } from "@/components/ui/kit";
import { SectionHeading, cardClass, eyebrowClass } from "./bits";

export const CHANNEL_LABEL: Record<CaseChannel, string> = {
  email: "Forwarded by email",
  paste: "Pasted on this site",
  screenshot: "Sent as a screenshot",
  seed: "One of our example messages",
};

type Token = { kind: "text" | "url" | "pressure"; value: string };

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Split the raw message into plain text, links (to defang) and quoted pressure phrases (to highlight). */
function tokenize(raw: string, links: string[], pressure: string[]): Token[] {
  const literalLinks = links
    .flatMap((l) => [l, l.replace(/^https?:\/\//i, "")])
    .map((l) => l.trim())
    .filter((l) => l.length >= 4)
    .sort((a, b) => b.length - a.length)
    .map(escapeRe);
  const urlSource = [...literalLinks, String.raw`(?:https?:\/\/|hxxps?:\/\/|www\.)[^\s<>"')\]]+`].join("|");
  const phraseSource = pressure
    .map((p) => p.trim())
    .filter((p) => p.length >= 3)
    .sort((a, b) => b.length - a.length)
    .map(escapeRe)
    .join("|");

  let re: RegExp;
  try {
    re = new RegExp(phraseSource ? `(${urlSource})|(${phraseSource})` : `(${urlSource})`, "gi");
  } catch {
    return [{ kind: "text", value: raw }];
  }

  const out: Token[] = [];
  let last = 0;
  for (const m of raw.matchAll(re)) {
    const start = m.index ?? 0;
    let value = m[0];
    if (!value) continue;
    const isUrl = m[1] !== undefined;
    if (isUrl) {
      // sentence punctuation right after a link is not part of the link
      const trimmed = value.replace(/[.,;:!?]+$/, "");
      if (trimmed) value = trimmed;
    }
    if (start > last) out.push({ kind: "text", value: raw.slice(last, start) });
    out.push({ kind: isUrl ? "url" : "pressure", value });
    last = start + value.length;
  }
  if (last < raw.length) out.push({ kind: "text", value: raw.slice(last) });
  return out;
}

export function CaseSentSection({ item, className }: { item: CaseRecord; className?: string }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const raw = item.rawText?.trim() ?? "";
  const pressure = item.pressure ?? [];
  const tokens = useMemo(() => tokenize(raw, item.links ?? [], pressure), [raw, item.links, pressure]);
  const sender = item.senderEmail ? maskEmail(item.senderEmail) : "";

  return (
    <section className={className}>
      <SectionHeading eyebrow={CHANNEL_LABEL[item.channel] ?? undefined} title="What was sent" />
      <div className={cx(cardClass, "overflow-hidden")}>
        {pressure.length > 0 && (
          <div className="border-b border-line p-4 sm:p-5">
            <div className={eyebrowClass}>Words meant to rush you</div>
            <ul className="mt-2.5 flex flex-wrap gap-2">
              {pressure.map((p, i) => (
                <li
                  key={`${p}-${i}`}
                  className="rounded-full border border-warn/50 bg-warn-soft px-3 py-1 text-[15px] font-semibold text-warn-deep"
                >
                  &ldquo;{p}&rdquo;
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex w-full items-center justify-between gap-4 p-4 text-left outline-none transition hover:bg-paper/70 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink sm:px-5"
        >
          <span className="min-w-0">
            <span className="block text-lg font-semibold text-ink">
              {open ? "Hide the original message" : "Read the original message"}
            </span>
            <span className="mt-0.5 block truncate text-sm text-ink-3">
              {sender ? `Sent in by ${sender}. ` : ""}
              Links are scrambled on purpose so nobody can tap them.
            </span>
          </span>
          <ChevronDown
            size={22}
            className={cx("shrink-0 text-ink-3 transition-transform duration-300", open && "rotate-180")}
            aria-hidden
          />
        </button>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              id={panelId}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="border-t border-line p-4 sm:p-5">
                {raw ? (
                  <blockquote className="max-h-[28rem] overflow-y-auto border-l-4 border-ink/20 pl-4 text-base leading-relaxed text-ink-2">
                    <p className="whitespace-pre-wrap break-words">
                      {tokens.map((t, i) =>
                        t.kind === "url" ? (
                          <span key={i} className="defanged rounded bg-paper-2 px-1 py-0.5 text-[0.9em] text-ink">
                            {defang(t.value)}
                          </span>
                        ) : t.kind === "pressure" ? (
                          <mark key={i} className="rounded bg-warn-soft px-0.5 text-warn-deep">
                            {t.value}
                          </mark>
                        ) : (
                          <span key={i}>{t.value}</span>
                        ),
                      )}
                    </p>
                  </blockquote>
                ) : (
                  <p className="text-base text-ink-3">
                    {item.channel === "screenshot"
                      ? "This one came in as a picture, and we could not read any words in it."
                      : "There was no text in what was sent."}
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
