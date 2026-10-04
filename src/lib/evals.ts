// A small labelled set run through the same pipeline (quiet mode: no browser, no email, nothing stored).
import { emit } from "./bus";
import { EVAL_IDS, seedById } from "./seeds";
import { runQuiet } from "./pipeline";
import type { EvalReport } from "./types";

const g = globalThis as unknown as { __mdcEval?: EvalReport | null };

export function lastEval(): EvalReport | null {
  return g.__mdcEval ?? null;
}

export function startEval(): boolean {
  if (g.__mdcEval?.running) return false;
  const rows = EVAL_IDS.map((id) => seedById(id)!).filter(Boolean);
  const report: EvalReport = {
    ranAt: Date.now(),
    rows: rows.map((s) => ({ id: s.id, label: s.label, expected: s.expected })),
    correct: 0,
    total: rows.length,
    running: true,
  };
  g.__mdcEval = report;
  emit({ type: "eval", report });
  void (async () => {
    for (const [i, s] of rows.entries()) {
      const t0 = Date.now();
      try {
        const c = await runQuiet({ channel: "seed", subject: s.subject, text: s.text, html: s.html });
        const row = report.rows[i];
        row.got = c.verdict;
        row.ok = c.verdict === s.expected;
        row.ms = Date.now() - t0;
        row.headline = c.headline;
        if (row.ok) report.correct++;
      } catch {
        report.rows[i].ok = false;
        report.rows[i].ms = Date.now() - t0;
      }
      emit({ type: "eval", report: { ...report, rows: [...report.rows] } });
    }
    report.running = false;
    emit({ type: "eval", report: { ...report, rows: [...report.rows] } });
  })();
  return true;
}
