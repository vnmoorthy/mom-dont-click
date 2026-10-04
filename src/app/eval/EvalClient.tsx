"use client";

// "How accurate is it?" A small labelled set, run through the same pipeline, scored in public.
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, LoaderCircle, Play, X } from "lucide-react";
import { api, useLive } from "@/lib/client";
import type { EvalReport, EvalRow } from "@/lib/types";
import { LiveDot, VerdictBadge, cx } from "@/components/ui/kit";
import { Ago, formatMs, friendlyError } from "@/components/home/bits";
import { SiteFooter } from "@/components/home/SiteFooter";
import { SiteNav } from "@/components/home/SiteNav";

/** A row is finished once it has an answer, or once it failed without one. */
function settled(row: EvalRow): boolean {
  return row.got !== undefined || row.ok !== undefined;
}

function progressOf(r: EvalReport): number {
  return r.rows.filter(settled).length;
}

/** The live stream and the plain request can both hold a report. Use whichever is further along. */
function fresher(a: EvalReport | null, b: EvalReport | null): EvalReport | null {
  if (!a) return b;
  if (!b) return a;
  if (a.ranAt !== b.ranAt) return a.ranAt > b.ranAt ? a : b;
  const pa = progressOf(a);
  const pb = progressOf(b);
  if (pa !== pb) return pa > pb ? a : b;
  return a.running ? b : a;
}

export function EvalClient() {
  const live = useLive();
  const [fetched, setFetched] = useState<EvalReport | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [unreachable, setUnreachable] = useState(false);
  const [starting, setStarting] = useState(false);
  const [expecting, setExpecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ranAtWhenPressed = useRef<number | null>(null);

  const load = useCallback(() => {
    return api<{ report: EvalReport | null }>("/api/eval")
      .then((d) => {
        setFetched(d.report ?? null);
        setUnreachable(false);
      })
      .catch(() => setUnreachable(true))
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const report = fresher(live.evalReport, fetched);
  const running = !!report?.running;

  // keep asking while a run is in flight, in case the live stream drops
  useEffect(() => {
    if (!running && !expecting) return;
    const t = setInterval(() => void load(), 2000);
    return () => clearInterval(t);
  }, [running, expecting, load]);

  // "expecting" covers the gap between pressing the button and the first sign of the new run
  useEffect(() => {
    if (!expecting) return;
    if (report && (report.running || report.ranAt !== ranAtWhenPressed.current)) setExpecting(false);
  }, [expecting, report]);
  useEffect(() => {
    if (!expecting) return;
    const t = setTimeout(() => setExpecting(false), 20000);
    return () => clearTimeout(t);
  }, [expecting]);

  const run = async () => {
    if (starting || running || expecting) return;
    setStarting(true);
    setError(null);
    ranAtWhenPressed.current = report?.ranAt ?? null;
    try {
      await api<{ started: true }>("/api/eval", { method: "POST", body: {} });
      setExpecting(true);
      void load();
    } catch (e) {
      setError(friendlyError(e, "The eval could not start just now. Please try again in a moment."));
    } finally {
      setStarting(false);
    }
  };

  const busy = starting || running || expecting;
  const rows = report?.rows ?? [];
  const total = report?.total || rows.length;
  const checked = report ? progressOf(report) : 0;
  const correct = report?.correct ?? 0;
  const finished = !!report && !report.running && checked > 0;
  const ranAt = report?.ranAt ?? 0;

  const scamRows = rows.filter((r) => r.expected !== "NO_RED_FLAGS");
  const genuineRows = rows.filter((r) => r.expected === "NO_RED_FLAGS");
  const firstPending = rows.findIndex((r) => !settled(r));

  return (
    <div className="paper-grain min-h-dvh overflow-x-clip bg-paper text-ink">
      <SiteNav />

      <main className="mx-auto max-w-[1100px] px-5 pb-24 pt-6 sm:px-8 sm:pt-12">
        <p className="animate-rise font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-ink-3">The honest score</p>
        <h1
          className="mt-3 animate-rise font-display text-[clamp(2.8rem,10vw,6rem)] font-extrabold leading-[0.9] tracking-[-0.045em]"
          style={{ animationDelay: "60ms" }}
        >
          How accurate is it?
        </h1>
        <p className="mt-6 max-w-2xl animate-rise text-lg leading-relaxed text-ink-2 sm:text-xl" style={{ animationDelay: "140ms" }}>
          We keep a small set of messages where we already know the answer: some are scams, some are genuine. Each one
          is run through the same pipeline that answers a forwarded email, and this is the score.
        </p>

        {/* ---------- the score ---------- */}
        <section
          aria-live="polite"
          className="mt-10 animate-rise rounded-[22px] border-2 border-ink bg-white/70 p-6 sm:p-10"
          style={{ animationDelay: "220ms" }}
        >
          <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-3">
                {running ? (
                  <>
                    <LiveDot /> Running now · {checked} of {total} checked
                  </>
                ) : finished ? (
                  <>
                    Last run <Ago ts={ranAt} />
                  </>
                ) : !loaded ? (
                  "Looking for the last run…"
                ) : (
                  "No run yet"
                )}
              </div>

              <div
                key={finished ? `done-${ranAt}` : "live"}
                className={cx(
                  "mt-3 flex items-baseline gap-3 font-display font-extrabold leading-[0.82] tracking-[-0.05em] tabular",
                  finished && "animate-slam origin-left",
                )}
              >
                <span className="text-[clamp(5.5rem,22vw,11rem)]">{report && checked > 0 ? correct : "–"}</span>
                <span className="text-[clamp(2.6rem,10vw,5rem)] text-ink-4">/ {report && total ? total : "–"}</span>
              </div>

              <p className="mt-4 max-w-md text-[17px] leading-relaxed text-ink-3">
                {finished ? (
                  <>
                    {scamRows.length > 0 && (
                      <>
                        Called <b className="font-semibold text-ink">{scamRows.filter((r) => r.ok).length} of {scamRows.length}</b>{" "}
                        scams correctly.{" "}
                      </>
                    )}
                    {genuineRows.length > 0 && (
                      <>
                        Left <b className="font-semibold text-ink">{genuineRows.filter((r) => r.ok).length} of {genuineRows.length}</b>{" "}
                        genuine messages alone.
                      </>
                    )}
                  </>
                ) : running ? (
                  "Each message is being read and judged right now. Answers appear below as they land."
                ) : unreachable && loaded ? (
                  "We can't reach the server right now, so there is no score to show. It will appear here when it is back."
                ) : (
                  "Press the button to run every message through the pipeline and see the score for yourself."
                )}
              </p>
            </div>

            <div className="shrink-0">
              <button
                type="button"
                onClick={run}
                disabled={busy}
                className="inline-flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-scam px-7 font-display text-xl font-extrabold tracking-tight text-cream transition-[transform,background-color] hover:bg-scam-deep active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-wait disabled:bg-ink md:w-auto"
              >
                {busy ? (
                  <>
                    <LoaderCircle size={20} className="animate-spin" />
                    {running ? `Running ${checked} of ${total}` : "Starting"}
                  </>
                ) : (
                  <>
                    <Play size={18} className="fill-current" />
                    {finished ? "Run it again" : "Run the eval"}
                  </>
                )}
              </button>
              {error && (
                <p role="alert" className="mt-2 max-w-xs text-sm font-semibold text-scam-deep">
                  {error}
                </p>
              )}
            </div>
          </div>

          {(running || finished) && total > 0 && (
            <div className="mt-8 h-2 overflow-hidden rounded-full bg-paper-3" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={checked}>
              <div
                className="h-full rounded-full bg-ink transition-[width] duration-500 ease-out"
                style={{ width: `${Math.min(100, (checked / total) * 100)}%` }}
              />
            </div>
          )}
        </section>

        {/* ---------- the rows ---------- */}
        {rows.length > 0 && (
          <section className="mt-10">
            <h2 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">Every message, one by one</h2>

            {/* phones: cards */}
            <ul className="mt-5 space-y-3 md:hidden">
              {rows.map((r, i) => (
                <li key={r.id} className="rounded-[22px] border border-line bg-white/60 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-display text-lg font-extrabold leading-tight tracking-tight">{r.label}</h3>
                    <Mark row={r} pending={running && i === firstPending} />
                  </div>
                  <dl className="mt-3 grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 text-sm">
                    <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-4">Expected</dt>
                    <dd>
                      <VerdictBadge verdict={r.expected} size="sm" />
                    </dd>
                    <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-4">Got</dt>
                    <dd>
                      <Got row={r} pending={running && i === firstPending} waiting={running} />
                    </dd>
                  </dl>
                  {r.headline && <p className="mt-3 text-[15px] leading-snug text-ink-2">{r.headline}</p>}
                  {r.ms !== undefined && <div className="mt-2 font-mono text-[11px] text-ink-4 tabular">{formatMs(r.ms)}</div>}
                </li>
              ))}
            </ul>

            {/* wider screens: a table */}
            <div className="mt-5 hidden overflow-hidden rounded-[22px] border border-line bg-white/60 md:block">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-line font-mono text-[10px] uppercase tracking-[0.18em] text-ink-4">
                    <th scope="col" className="px-5 py-3 font-medium">Message</th>
                    <th scope="col" className="px-3 py-3 font-medium">Expected</th>
                    <th scope="col" className="px-3 py-3 font-medium">Got</th>
                    <th scope="col" className="px-3 py-3 font-medium">
                      <span className="sr-only">Correct?</span>
                    </th>
                    <th scope="col" className="px-3 py-3 text-right font-medium">Time</th>
                    <th scope="col" className="px-5 py-3 font-medium">What it said</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.id} className={cx("border-b border-line/70 align-middle last:border-0", r.ok === false && "bg-scam-soft/45")}>
                      <th scope="row" className="max-w-[15rem] px-5 py-3.5 text-[15px] font-semibold leading-snug text-ink">
                        {r.label}
                      </th>
                      <td className="px-3 py-3.5">
                        <VerdictBadge verdict={r.expected} size="sm" />
                      </td>
                      <td className="px-3 py-3.5">
                        <Got row={r} pending={running && i === firstPending} waiting={running} />
                      </td>
                      <td className="px-3 py-3.5">
                        <Mark row={r} pending={running && i === firstPending} />
                      </td>
                      <td className="px-3 py-3.5 text-right font-mono text-xs text-ink-3 tabular">{formatMs(r.ms) || "–"}</td>
                      <td className="max-w-[22rem] px-5 py-3.5 text-sm leading-snug text-ink-2">{r.headline ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ---------- the footnote ---------- */}
        <aside className="mt-10 rounded-[22px] border border-line bg-paper-2/60 p-6 sm:p-8">
          <h2 className="font-display text-xl font-extrabold tracking-tight">Read this before you trust the number</h2>
          <ul className="mt-3 max-w-3xl space-y-2 text-[17px] leading-relaxed text-ink-2">
            <li>This is a small set that we wrote ourselves. It is a smoke test, not a benchmark.</li>
            <li>It shows the pipeline gives the answers we expect on these examples today. It does not show it will catch every scam.</li>
            <li>A miss is a miss. Only an exact match with the expected answer counts, and wrong answers stay in the table.</li>
            <li>
              The eval runs quietly so anyone can press the button: it fetches each page instead of opening the cloud browser,
              skips the web search, and stores nothing. A forwarded email gets more evidence than this.
            </li>
            <li>The answer is always a second opinion. When money is involved, go to the official site yourself.</li>
          </ul>
        </aside>
      </main>

      <SiteFooter />
    </div>
  );
}

function Got({ row, pending, waiting }: { row: EvalRow; pending: boolean; waiting: boolean }) {
  if (row.got !== undefined) {
    return (
      <span key={row.got} className="inline-block animate-rise">
        <VerdictBadge verdict={row.got} size="sm" />
      </span>
    );
  }
  if (row.ok === false) {
    return <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-scam-deep">no answer</span>;
  }
  if (pending) {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">
        <LoaderCircle size={13} className="animate-spin" /> checking
      </span>
    );
  }
  return <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-4">{waiting ? "waiting" : "not run"}</span>;
}

function Mark({ row, pending }: { row: EvalRow; pending: boolean }) {
  if (row.ok === undefined) {
    return <span className={cx("inline-block size-7 rounded-full", pending && "border-2 border-dashed border-line")} aria-hidden />;
  }
  return row.ok ? (
    <span className="grid size-7 shrink-0 animate-rise place-items-center rounded-full bg-ink text-cream" title="Matched what we expected">
      <Check size={15} strokeWidth={3.2} />
      <span className="sr-only">Correct</span>
    </span>
  ) : (
    <span className="grid size-7 shrink-0 animate-rise place-items-center rounded-full bg-scam text-cream" title="Did not match what we expected">
      <X size={15} strokeWidth={3.2} />
      <span className="sr-only">Wrong</span>
    </span>
  );
}
