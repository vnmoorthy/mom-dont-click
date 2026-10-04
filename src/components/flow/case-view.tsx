"use client";

// /case/[id] — one case, live while the agent works and legible once it has an answer.
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { HeartHandshake, Link2, Plus, RefreshCw, SearchX } from "lucide-react";
import { api, useCase } from "@/lib/client";
import type { CaseRecord } from "@/lib/types";
import { cx } from "@/components/ui/kit";
import { CopyButton, NavPill, Notice, PageShell, btnPrimary, btnQuiet, cardClass, eyebrowClass } from "./bits";
import { CaseBrowserSection } from "./case-browser";
import { CaseChat } from "./case-chat";
import { CaseEvidenceSection } from "./case-evidence";
import { CaseRunning } from "./case-running";
import { CaseSentSection } from "./case-sent";
import { CaseTraceSection } from "./case-trace";
import { CaseVerdict } from "./case-verdict";

const isFinished = (c: CaseRecord | null | undefined) => !!c && (c.status === "done" || c.status === "error");

/**
 * Safety net for a dropped event stream: while the case is still being worked on,
 * ask for it directly every few seconds and show whichever copy is newer.
 */
function useFreshest(id: string, item: CaseRecord | null): CaseRecord | null {
  const [polled, setPolled] = useState<CaseRecord | null>(null);
  const settled = isFinished(item) || isFinished(polled);
  const known = !!item;

  useEffect(() => {
    if (!known || settled) return;
    let alive = true;
    const timer = setInterval(() => {
      api<{ case: CaseRecord }>(`/api/cases/${encodeURIComponent(id)}`)
        .then((d) => {
          if (alive && d.case) setPolled(d.case);
        })
        .catch(() => {});
    }, 4000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [id, known, settled]);

  if (polled && item && polled.id === item.id && polled.updatedAt > item.updatedAt) return polled;
  return item;
}

export function CaseView({ id }: { id: string }) {
  // a fresh instance per case, so nothing from the previous case can flash on screen
  return <CaseViewInner key={id} id={id} />;
}

function CaseViewInner({ id }: { id: string }) {
  const { item: liveItem, messages, loading, notFound, frame, config, refresh } = useCase(id);
  const item = useFreshest(id, liveItem);
  const preferLiveView = config?.preferLiveView ?? true;
  const finished = isFinished(item);

  // when a case we watched live finishes, pick up anything stored alongside the verdict
  const sawRunning = useRef(false);
  useEffect(() => {
    if (item && !finished) sawRunning.current = true;
    if (finished && sawRunning.current) {
      sawRunning.current = false;
      refresh();
    }
  }, [item, finished, refresh]);

  let body: ReactNode;
  let key: string;
  if (!item) {
    if (loading) {
      key = "loading";
      body = <CaseSkeleton />;
    } else {
      key = "missing";
      body = <CaseMissing onRetry={refresh} couldBeOffline={notFound} />;
    }
  } else if (!finished) {
    key = "running";
    body = <CaseRunning item={item} frame={frame} preferLiveView={preferLiveView} />;
  } else {
    key = "finished";
    // the chat is seeded from stored messages, so wait until they have loaded
    const showChat = item.status === "done" && !loading;
    body = (
      <div className="space-y-8 lg:space-y-10">
        {/* One column on a phone (verdict, browser, evidence, chat, message, trace);
            two columns on a laptop, with the chat following you down the page. */}
        <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-10">
          <div className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-10">
            <div className="order-1 min-w-0">
              {item.status === "error" ? <CaseFailed item={item} /> : <CaseVerdict item={item} />}
            </div>
            <CaseEvidenceSection evidence={item.evidence ?? []} className="order-3 min-w-0" />
            <CaseSentSection item={item} className="order-5 min-w-0" />
            <CaseTraceSection item={item} config={config} className="order-6 min-w-0" />
          </div>
          <div className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-10">
            <CaseBrowserSection
              item={item}
              frame={frame}
              preferLiveView={preferLiveView}
              className="order-2 min-w-0"
            />
            {showChat && (
              <div className="order-4 min-w-0 lg:sticky lg:top-6">
                <CaseChat caseId={item.id} messages={messages} />
              </div>
            )}
          </div>
        </div>

        <CaseActions />
      </div>
    );
  }

  return (
    <PageShell
      width="wide"
      nav={
        <NavPill href="/check" icon={<Plus size={16} aria-hidden />} label="Check another" short="New" />
      }
    >
      {/* keyed so each state arrives with a short rise; no exit animation, so a
          phone that was asleep never gets stuck on the previous state */}
      <motion.div
        key={key}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      >
        {body}
      </motion.div>
    </PageShell>
  );
}

/* ------------------------------------------------------------------ */

function CaseActions() {
  return (
    <div className="flex flex-col gap-3 border-t border-line pt-7 sm:flex-row sm:flex-wrap sm:items-center">
      <CopyButton
        text={() => window.location.href}
        label="Copy link to this case"
        copiedLabel="Link copied"
        className={cx(btnQuiet, "min-h-[3.25rem] text-base")}
        iconSize={18}
      />
      <Link href="/check" className={cx(btnQuiet, "min-h-[3.25rem] text-base")}>
        <Link2 size={18} aria-hidden />
        Check something else
      </Link>
      <Link href="/guard" className={cx(btnPrimary, "min-h-[3.25rem] text-lg sm:ml-auto")}>
        <HeartHandshake size={20} aria-hidden />
        Guard someone you love
      </Link>
    </div>
  );
}

/** The agent could not finish. Say so plainly and still show whatever it gathered. */
function CaseFailed({ item }: { item: CaseRecord }) {
  return (
    <section className="overflow-hidden rounded-[28px] border-2 border-warn/50 bg-warn-soft">
      <div className="p-5 sm:p-8">
        <div className={eyebrowClass}>We hit a snag</div>
        <h1 className="mt-4 text-balance font-display text-[clamp(2rem,7.4vw,3.25rem)] font-extrabold leading-[1.03] tracking-tight">
          We could not finish checking this one.
        </h1>
        {item.subject && (
          <p className="mt-4 text-lg text-ink-2">
            About the message <span className="font-semibold text-ink">&ldquo;{item.subject}&rdquo;</span>
          </p>
        )}
        {item.error && <p className="mt-3 font-mono text-sm text-ink-3">{item.error}</p>}
      </div>
      <div className="border-t border-ink/10 bg-white/70 p-5 sm:p-8">
        <h2 className={eyebrowClass}>What to do for now</h2>
        <p className="mt-3 text-xl leading-snug sm:text-2xl sm:leading-snug">
          Until someone has looked at it, treat it as a scam. Do not click, do not reply, do not call any number in
          it.
        </p>
        <Link href="/check" className={cx(btnPrimary, "mt-5 min-h-14 text-lg")}>
          <RefreshCw size={19} aria-hidden />
          Send it in again
        </Link>
      </div>
    </section>
  );
}

function CaseMissing({ onRetry, couldBeOffline }: { onRetry: () => void; couldBeOffline: boolean }) {
  return (
    <div className="mx-auto max-w-xl py-10 text-center sm:py-16">
      <span className="mx-auto grid size-16 place-items-center rounded-full bg-paper-2 text-ink-3">
        <SearchX size={30} aria-hidden />
      </span>
      <h1 className="mt-6 font-display text-[clamp(2rem,8vw,3rem)] font-extrabold leading-[1.03] tracking-tight">
        We cannot find that case.
      </h1>
      <p className="mx-auto mt-4 max-w-md text-lg text-ink-2">
        The link may be missing a letter, or the case was cleared away. Nothing is wrong on your side.
      </p>
      {couldBeOffline && (
        <Notice className="mx-auto mt-5 max-w-md text-left">
          If you only just sent it in, give it a moment and try again.
        </Notice>
      )}
      <div className="mt-7 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
        <Link href="/check" className={cx(btnPrimary, "min-h-14 text-lg")}>
          Check something
        </Link>
        <button type="button" onClick={onRetry} className={cx(btnQuiet, "min-h-14 text-base")}>
          <RefreshCw size={17} aria-hidden />
          Try again
        </button>
      </div>
    </div>
  );
}

function CaseSkeleton() {
  const block = "animate-pulse rounded-2xl bg-paper-2";
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-10" role="status" aria-label="Loading the case">
      <div className={cx(cardClass, "space-y-5 p-5 sm:p-8")}>
        <div className={cx(block, "h-9 w-40 rounded-full")} />
        <div className="space-y-3">
          <div className={cx(block, "h-10 w-full")} />
          <div className={cx(block, "h-10 w-4/5")} />
        </div>
        <div className="space-y-3 pt-3">
          <div className={cx(block, "h-6 w-11/12")} />
          <div className={cx(block, "h-6 w-3/4")} />
          <div className={cx(block, "h-6 w-5/6")} />
        </div>
      </div>
      <div className={cx(block, "aspect-[4/3] rounded-[22px] sm:aspect-[16/10]")} />
    </div>
  );
}
