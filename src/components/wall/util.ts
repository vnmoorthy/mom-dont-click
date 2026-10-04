// Small pure helpers for the wall. No React in here.
import type { Capabilities, CaseChannel, CaseRecord, Evidence, VerdictLevel } from "@/lib/types";
import { VERDICT_LABEL } from "@/lib/types";

/** Still being worked on (anything that is not finished or failed). */
export function isActive(c: CaseRecord): boolean {
  return c.status !== "done" && c.status !== "error";
}

/** When the answer landed. Used to order the grid so the newest answer is first. */
export function finishedAt(c: CaseRecord): number {
  return typeof c.durationMs === "number" ? c.createdAt + c.durationMs : c.updatedAt;
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** 14230 -> "14.2s" */
export function secs(ms: number): string {
  const s = Math.max(0, ms) / 1000;
  return s >= 100 ? `${Math.round(s)}s` : `${s.toFixed(1)}s`;
}

/** Running clock for the hero: "12.4" under a minute, "1:04" after. */
export function clock(ms: number): { value: string; unit: string } {
  const s = Math.max(0, ms) / 1000;
  if (s < 60) return { value: s.toFixed(1), unit: "sec" };
  const whole = Math.floor(s);
  return { value: `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`, unit: "min" };
}

export function channelLabel(channel: CaseChannel): string {
  if (channel === "paste") return "Someone pasted:";
  if (channel === "screenshot") return "Screenshot:";
  return "Mom forwarded:";
}

const CATEGORY_PHRASE: Record<string, string> = {
  parcel: "a parcel scam",
  toll: "a road toll scam",
  bank: "a bank scam",
  "tech-support": "a tech support scam",
  government: "a government scam",
  "family-emergency": "a family emergency scam",
  prize: "a prize scam",
  account: "an account scam",
  invoice: "an invoice scam",
};

/** "parcel" -> "a parcel scam". Unknown categories fall back to "a scam". */
export function categoryPhrase(category?: string): string {
  return (category && CATEGORY_PHRASE[category.toLowerCase()]) || "a scam";
}

/** Pick a pronoun from what the family calls them. Falls back to "They". */
export function pronounFor(name: string): "She" | "He" | "They" {
  const n = name.toLowerCase();
  if (/\b(mom|mum|mam|mama|mamma|mother|mummy|mommy|grandma|granny|gran|nana|nan|aunt|auntie|amma|maa)\b/.test(n)) {
    return "She";
  }
  if (/\b(dad|daddy|papa|father|pop|pops|grandpa|grandad|granddad|uncle|appa)\b/.test(n)) return "He";
  return "They";
}

/** The tools that are actually switched on, for the tiny header line. */
export function capabilityList(c: Capabilities): string[] {
  const out: string[] = [];
  if (c.browser === "kernel") out.push("Kernel");
  else if (c.browser === "playwright") out.push("Playwright");
  else if (c.browser === "fetch") out.push("Fetch");
  if (c.search) out.push("Exa");
  if (c.email) out.push("AgentMail");
  if (c.workflow === "mastra") out.push("Mastra");
  out.push(c.db === "neon" || c.llm === "neon-gateway" ? "Neon" : "PGlite");
  return out;
}

/** The one evidence line a tile shows: first red, else first amber, else the first one. */
export function topEvidence(c: CaseRecord): Evidence | undefined {
  return (
    c.evidence.find((e) => e.tone === "red") ?? c.evidence.find((e) => e.tone === "amber") ?? c.evidence[0]
  );
}

/**
 * The headline usually opens with the verdict word ("SCAM. Do not click."). On the slam the
 * word is already gigantic, so drop the repeat and keep the sentence.
 */
export function stripVerdictPrefix(headline: string, verdict: VerdictLevel): string {
  const text = headline.trim();
  const label = VERDICT_LABEL[verdict].replace(/\s+/g, "\\s+");
  const rest = text.replace(new RegExp(`^${label}\\s*[.!:,;—–-]+\\s*`, "i"), "").trim();
  if (rest.length < 6 || rest === text) return text;
  return rest.charAt(0).toUpperCase() + rest.slice(1);
}

/** 42000 -> "42 seconds ago" (spelled out, for the big screen). */
export function agoWords(ms: number): string {
  const s = Math.max(1, Math.round(ms / 1000));
  if (s < 90) return `${s} second${s === 1 ? "" : "s"} ago`;
  const m = Math.round(s / 60);
  if (m < 90) return `${m} minutes ago`;
  const h = Math.round(m / 60);
  if (h < 36) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

export function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url.replace(/^[a-z]+:\/\//i, "").replace(/\/.*$/, "");
  }
}

export function sameSet(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}
