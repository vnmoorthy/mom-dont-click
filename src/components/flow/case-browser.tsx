"use client";

// "What the browser saw" — the throwaway browser, the redirect chain and what the page asked for.
import Link from "next/link";
import { ArrowDown, FlaskConical, Globe } from "lucide-react";
import { defang } from "@/lib/client";
import type { BrowserReport, BrowserTier, CaseRecord } from "@/lib/types";
import { LiveBrowser, cx } from "@/components/ui/kit";
import { SectionHeading, cardClass, eyebrowClass, fmtMs } from "./bits";

export const TIER_LABEL: Record<BrowserTier, string> = {
  kernel: "Kernel cloud browser",
  playwright: "local sandbox browser",
  fetch: "safe fetch (no browser)",
  none: "no browser needed",
};

/** The shared LiveBrowser at a fixed shape: 16:10 on a laptop, a little taller on a phone. */
export function BrowserFrame({
  item,
  frame,
  preferLiveView,
  className,
}: {
  item: CaseRecord;
  frame: number;
  preferLiveView: boolean;
  className?: string;
}) {
  return (
    <div className={cx("relative aspect-[4/3] sm:aspect-[16/10]", className)}>
      <div className="absolute inset-0">
        <LiveBrowser
          item={item}
          frame={frame}
          night={false}
          preferLiveView={preferLiveView}
          // on a narrow phone the status label would squeeze the address bar to nothing
          className="h-full shadow-xl max-sm:[&>div:first-child>span:last-child]:hidden"
        />
      </div>
    </div>
  );
}

function hops(b: BrowserReport, primaryUrl?: string): string[] {
  const list = [...(b.redirectChain ?? [])];
  if (list.length === 0 && primaryUrl) list.push(primaryUrl);
  if (b.finalUrl && list[list.length - 1] !== b.finalUrl) list.push(b.finalUrl);
  return list.filter((u, i) => !!u && u !== list[i - 1]);
}

export function CaseBrowserSection({
  item,
  frame,
  preferLiveView,
  className,
}: {
  item: CaseRecord;
  frame: number;
  preferLiveView: boolean;
  className?: string;
}) {
  const b = item.browser;

  if (!b || b.tier === "none") {
    return (
      <section className={className}>
        <SectionHeading title="What the browser saw" />
        <div className={cx(cardClass, "flex items-start gap-3.5 p-5 text-lg text-ink-2")}>
          <Globe size={22} className="mt-0.5 shrink-0 text-ink-4" aria-hidden />
          {item.seenBefore ? (
            <p>
              We recognised this one, so we answered from memory instead of opening the link again.{" "}
              <Link
                href={`/case/${encodeURIComponent(item.seenBefore.caseId)}`}
                className="rounded font-semibold text-ink underline decoration-ink-4 underline-offset-4 outline-none transition hover:decoration-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                See what the browser saw the first time
              </Link>
              .
            </p>
          ) : (item.links?.length ?? 0) > 0 ? (
            <p>We did not open the link this time. The answer is based on the message and the address alone.</p>
          ) : (
            <p>There was no link to open this time, so we did not need a browser. We judged it on the words alone.</p>
          )}
        </div>
      </section>
    );
  }

  const chain = hops(b, item.primaryUrl);
  const alarm = chain.length > 1 && item.verdict !== "NO_RED_FLAGS";
  const openFor = b.startedAt && b.endedAt ? b.endedAt - b.startedAt : null;
  const t0 = b.startedAt ?? b.steps[0]?.at ?? 0;
  const asksFor = b.asksFor ?? [];

  return (
    <section className={className}>
      <SectionHeading eyebrow={TIER_LABEL[b.tier]} title="What the browser saw" />
      <BrowserFrame item={item} frame={frame} preferLiveView={preferLiveView} />

      {asksFor.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2" aria-label="What the page asked for">
          {asksFor.map((a) => (
            <li
              key={a}
              className="rounded-full bg-scam px-3.5 py-1.5 text-[15px] font-bold leading-tight text-cream animate-rise"
            >
              asked for: {a}
            </li>
          ))}
        </ul>
      )}

      <div className={cx(cardClass, "mt-4 divide-y divide-line")}>
        {b.unreachable && (
          <div className="p-4 sm:p-5">
            <div className={eyebrowClass}>The page would not load</div>
            <p className="mt-1.5 text-base text-ink-2">{b.unreachable}</p>
          </div>
        )}

        {chain.length > 0 && (
          <div className="p-4 sm:p-5">
            <div className={eyebrowClass}>{alarm ? "Where the link really went" : "Where the link went"}</div>
            <ol className="mt-3">
              {chain.map((u, i) => {
                const last = i === chain.length - 1;
                return (
                  <li key={`${i}-${u}`}>
                    {i > 0 && <ArrowDown size={16} className="my-1.5 ml-1 text-ink-4" aria-hidden />}
                    <div
                      className={cx(
                        "rounded-xl border px-3 py-2",
                        last && alarm ? "border-scam/40 bg-scam-soft" : "border-line bg-paper",
                      )}
                    >
                      <div className="font-mono text-[10px] uppercase tracking-widest text-ink-3">
                        {last ? "final address" : i === 0 ? "the link in the message" : `hop ${i}`}
                      </div>
                      <div className="defanged mt-0.5 select-all text-sm text-ink">{defang(u)}</div>
                    </div>
                  </li>
                );
              })}
            </ol>
            {b.title && (
              <p className="mt-3 text-base text-ink-2">
                The page called itself <span className="font-semibold text-ink">&ldquo;{b.title}&rdquo;</span>.
              </p>
            )}
          </div>
        )}

        {b.canaryWalk && (
          <div className="flex items-start gap-3 p-4 sm:p-5">
            <FlaskConical size={20} className="mt-0.5 shrink-0 text-warn-deep" aria-hidden />
            <p className="text-base text-ink-2">
              We typed obviously fake details to see what it asked for next &mdash; only ever on our own training
              pages.
            </p>
          </div>
        )}

        {b.steps.length > 0 && (
          <div className="p-4 sm:p-5">
            <div className={eyebrowClass}>What we did in there</div>
            <ol className="mt-2.5 space-y-1.5">
              {b.steps.map((s, i) => (
                <li key={`${s.at}-${i}`} className="flex items-baseline gap-3 text-base text-ink-2">
                  <span className="w-14 shrink-0 text-right font-mono text-xs text-ink-4 tabular">
                    +{(Math.max(0, s.at - t0) / 1000).toFixed(1)}s
                  </span>
                  <span className="min-w-0">{s.label}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 p-4 font-mono text-[11px] uppercase tracking-widest text-ink-3 sm:px-5">
          <span>{TIER_LABEL[b.tier]}</span>
          {openFor !== null && <span>· open for {fmtMs(openFor)}</span>}
          {!b.live && b.tier !== "fetch" && <span>· session destroyed</span>}
        </div>
      </div>
    </section>
  );
}
