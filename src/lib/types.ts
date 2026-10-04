// Shared contract between the pipeline, the API and every screen.
// Keep this file dependency-free: it is imported by both server and client code.

/** Fixed verdict vocabulary. The agent never says "safe" or "real". */
export type VerdictLevel = "SCAM" | "TREAT_AS_SCAM" | "NO_RED_FLAGS";

export type CaseStatus = "queued" | "reading" | "investigating" | "deciding" | "done" | "error";

export type CaseChannel = "email" | "paste" | "screenshot" | "seed";

export type EvidenceKind = "browser" | "search" | "domain" | "language" | "memory" | "vision";

export type EvidenceTone = "red" | "amber" | "neutral" | "calm";

export interface Evidence {
  id: string;
  kind: EvidenceKind;
  tone: EvidenceTone;
  /** Short chip text, readable from the back of a room. e.g. "Asks for a card number on step 2" */
  title: string;
  /** One or two plain sentences of detail for the case page. */
  detail?: string;
  /** Which tool produced it: "Kernel", "Exa", "RDAP", "Reader", "Neon". */
  source: string;
  /** Optional supporting link (already safe to show; never the suspicious link itself). */
  url?: string;
  at: number;
}

export type BrowserTier = "kernel" | "playwright" | "fetch" | "none";

export interface BrowserReport {
  tier: BrowserTier;
  /** Kernel live view url (iframe-able). Only set while the session is alive. */
  liveViewUrl?: string;
  live: boolean;
  startedAt?: number;
  endedAt?: number;
  finalUrl?: string;
  redirectChain: string[];
  title?: string;
  /** e.g. ["password", "card number", "CVV"] */
  asksFor: string[];
  /** Narrated steps shown under the live view: "Opening the link", "Typing fake details"… */
  steps: { label: string; at: number }[];
  /** true once a final annotated screenshot is available at /api/cases/:id/frame */
  hasScreenshot: boolean;
  /** the page was dead, blocked the scanner or timed out */
  unreachable?: string;
  /** canary walk ran (only ever on pages we host ourselves) */
  canaryWalk?: boolean;
}

export interface TraceStep {
  step: string;
  tool: string;
  startedAt: number;
  endedAt?: number;
  ok?: boolean;
  note?: string;
}

export interface CaseRecord {
  id: string;
  createdAt: number;
  updatedAt: number;
  channel: CaseChannel;

  /** Who sent it in. Masked on public screens. */
  senderEmail?: string;
  senderName?: string;

  /** Sanitised, PII-free display line for the wall: "Your parcel is being held" */
  subject: string;
  /** What was forwarded, as plain text (trimmed). Shown only on the case page. */
  rawText: string;

  links: string[];
  /** The link the agent chose to open. */
  primaryUrl?: string;
  /** Registrable domain of primaryUrl, lower-case. */
  domain?: string;
  claimedBrand?: string;
  /** parcel | toll | bank | tech-support | government | family-emergency | prize | account | invoice | other */
  category?: string;
  /** Pressure phrases quoted from the message. */
  pressure: string[];

  status: CaseStatus;
  /** Human sentence for what is happening now: "Opening the link in a throwaway browser" */
  stage: string;

  verdict?: VerdictLevel;
  /** The one giant sentence. "SCAM. Do not click. Carriers never ask for a card by email." */
  headline?: string;
  reasons: string[];
  /** What to do instead. */
  advice?: string;
  officialUrl?: string;

  evidence: Evidence[];
  browser?: BrowserReport;
  seenBefore?: { caseId: string; at: number; subject: string };
  trace: TraceStep[];

  mail?: { inboxId: string; messageId: string; threadId: string; replied?: boolean };
  /** only recorded when the heads-up actually reached someone: by email, or on their open /guard page */
  guardianAlerted?: { name: string; emailMasked: string; at: number; via?: "email" | "screen" }[];
  durationMs?: number;
  error?: string;
}

export interface CaseMessage {
  id: string;
  caseId: string;
  role: "user" | "assistant";
  text: string;
  at: number;
  via: "web" | "email";
}

export interface Capabilities {
  llm: "neon-gateway" | "openai" | "anthropic" | "rules";
  browser: BrowserTier;
  search: boolean;
  email: boolean;
  db: "neon" | "pglite";
  workflow: "mastra" | "direct";
}

export interface PublicConfig {
  /** The forwardable address, or null when AgentMail is not configured. */
  inboxEmail: string | null;
  publicUrl: string;
  capabilities: Capabilities;
  /** Wall setting: prefer the Kernel live view iframe over the screenshot stream. */
  preferLiveView: boolean;
  /** Persona used by seeded emails. */
  demoMom: { name: string; email: string };
}

export interface SeedInfo {
  id: string;
  label: string;
  subject: string;
  preview: string;
  from: string;
  expected: VerdictLevel;
  /** uses one of our self-hosted training pages, so the canary walk runs */
  hasPage: boolean;
}

export interface GuardianPublic {
  id: string;
  guardianEmailMasked: string;
  parentName: string;
  parentEmailMasked: string | null;
  createdAt: number;
}

export interface EvalRow {
  id: string;
  label: string;
  expected: VerdictLevel;
  got?: VerdictLevel;
  ok?: boolean;
  ms?: number;
  headline?: string;
}

export interface EvalReport {
  ranAt: number;
  rows: EvalRow[];
  correct: number;
  total: number;
  running: boolean;
}

/** Events on GET /api/stream (Server-Sent Events, `data:` is JSON of this union). */
export type LiveEvent =
  | { type: "hello"; cases: CaseRecord[]; config: PublicConfig }
  | { type: "case"; case: CaseRecord }
  | { type: "frame"; caseId: string; n: number }
  | { type: "message"; message: CaseMessage }
  | { type: "config"; config: PublicConfig }
  | { type: "guardian"; guardian: GuardianPublic }
  | { type: "alert"; guardianId: string; caseId: string; line: string; at: number }
  | { type: "eval"; report: EvalReport }
  | { type: "reset" };

export const VERDICT_LABEL: Record<VerdictLevel, string> = {
  SCAM: "SCAM",
  TREAT_AS_SCAM: "TREAT AS A SCAM",
  NO_RED_FLAGS: "NO RED FLAGS FOUND",
};

export const VERDICT_TONE: Record<VerdictLevel, EvidenceTone> = {
  SCAM: "red",
  TREAT_AS_SCAM: "amber",
  NO_RED_FLAGS: "calm",
};
