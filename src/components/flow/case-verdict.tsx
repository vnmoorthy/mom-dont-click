"use client";

// The verdict hero: one giant plain sentence, why, and what to do instead.
import Link from "next/link";
import { ArrowUpRight, BellRing, History } from "lucide-react";
import { timeAgo, useNow } from "@/lib/client";
import type { CaseRecord, EvidenceTone } from "@/lib/types";
import { VERDICT_LABEL } from "@/lib/types";
import { TONE, VerdictBadge, cx, verdictTone } from "@/components/ui/kit";
import { btnPrimary, eyebrowClass, fmtMs, hostOf, safeHttpUrl } from "./bits";
import { CHANNEL_LABEL } from "./case-sent";

const NUMBER_STYLE: Record<EvidenceTone, string> = {
  red: "bg-scam text-cream",
  amber: "bg-warn text-ink",
  calm: "bg-calm text-cream",
  neutral: "bg-ink text-cream",
};

export function CaseVerdict({ item, className }: { item: CaseRecord; className?: string }) {
  const now = useNow(20_000);
  const tone = verdictTone(item.verdict);
  const t = TONE[tone];
  const headline = item.headline?.trim() || (item.verdict ? `${VERDICT_LABEL[item.verdict]}.` : "We finished checking.");
  const official = safeHttpUrl(item.officialUrl);
  const reasons = item.reasons ?? [];

  return (
    <section className={cx("overflow-hidden rounded-[28px] border-2", t.bg, t.border, className)}>
      <div className="p-5 sm:p-8">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="inline-block origin-left animate-slam">
            <VerdictBadge verdict={item.verdict} size="lg" />
          </span>
          <span className="font-mono text-[11px] uppercase tracking-widest text-ink-3">
            {CHANNEL_LABEL[item.channel]} · {timeAgo(item.createdAt, now)}
            {item.durationMs ? ` · checked in ${fmtMs(item.durationMs)}` : ""}
          </span>
        </div>

        <h1
          className="mt-5 text-balance font-display text-[clamp(2rem,7.4vw,3.5rem)] font-extrabold leading-[1.02] tracking-tight text-ink animate-rise"
          style={{ animationDelay: "160ms" }}
        >
          {headline}
        </h1>
        {item.subject && (
          <p className="mt-4 text-lg text-ink-2 animate-rise" style={{ animationDelay: "240ms" }}>
            About the message <span className="font-semibold text-ink">&ldquo;{item.subject}&rdquo;</span>
          </p>
        )}

        {reasons.length > 0 && (
          <div className="mt-8 animate-rise" style={{ animationDelay: "320ms" }}>
            <h2 className={eyebrowClass}>Why</h2>
            <ol className="mt-3.5 space-y-4">
              {reasons.map((r, i) => (
                <li key={i} className="flex items-start gap-4">
                  <span
                    className={cx(
                      "grid size-10 shrink-0 place-items-center rounded-full font-display text-xl font-extrabold tabular",
                      NUMBER_STYLE[tone],
                    )}
                    aria-hidden
                  >
                    {i + 1}
                  </span>
                  <span className="pt-1 text-xl font-medium leading-snug text-ink sm:text-2xl sm:leading-snug">{r}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

      {(item.advice || official) && (
        <div className="border-t border-ink/10 bg-white/70 p-5 animate-rise sm:p-8" style={{ animationDelay: "400ms" }}>
          <h2 className={eyebrowClass}>{item.verdict === "NO_RED_FLAGS" ? "What to keep in mind" : "What to do instead"}</h2>
          {item.advice && <p className="mt-3 text-xl leading-snug text-ink sm:text-2xl sm:leading-snug">{item.advice}</p>}
          {official ? (
            <a
              href={official}
              target="_blank"
              rel="noopener noreferrer"
              className={cx(btnPrimary, "mt-5 min-h-14 max-w-full py-3 text-lg")}
            >
              <span className="min-w-0 truncate">
                Go to the official {item.claimedBrand ? `${item.claimedBrand} ` : ""}site
              </span>
              <ArrowUpRight size={20} className="shrink-0" aria-hidden />
            </a>
          ) : item.officialUrl ? (
            <p className="mt-3 font-mono text-base text-ink-2">{item.officialUrl}</p>
          ) : null}
          {official && (
            <p className="mt-2.5 font-mono text-sm text-ink-3">
              Opens {hostOf(official)} in a new tab. This is the official address, not the link from the message.
            </p>
          )}
        </div>
      )}

      {(item.seenBefore || (item.guardianAlerted?.length ?? 0) > 0) && (
        <div className="space-y-3 border-t border-ink/10 bg-white/45 p-5 sm:px-8">
          {item.seenBefore && (
            <div className="flex items-start gap-3">
              <History size={20} className="mt-0.5 shrink-0 text-ink-3" aria-hidden />
              <p className="text-base text-ink-2 sm:text-lg">
                <span className="font-semibold text-ink">We have seen this one before.</span>{" "}
                <Link
                  href={`/case/${encodeURIComponent(item.seenBefore.caseId)}`}
                  className="rounded font-semibold text-ink underline decoration-ink-4 underline-offset-4 outline-none transition hover:decoration-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                >
                  See the first time
                </Link>{" "}
                <span className="text-ink-3">
                  ({timeAgo(item.seenBefore.at, now)}
                  {item.seenBefore.subject ? `, “${item.seenBefore.subject}”` : ""})
                </span>
              </p>
            </div>
          )}
          {item.guardianAlerted?.map((g, i) => (
            <div key={`${g.emailMasked}-${i}`} className="flex items-start gap-3">
              <BellRing size={20} className="mt-0.5 shrink-0 text-ink-3" aria-hidden />
              <p className="text-base text-ink-2 sm:text-lg">
                <span className="font-semibold text-ink">We let {g.name ? `${g.name}’s guardian` : "their guardian"} know.</span>{" "}
                <span className="font-mono text-sm text-ink-3">
                  {g.emailMasked} · {timeAgo(g.at, now)}
                </span>
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
