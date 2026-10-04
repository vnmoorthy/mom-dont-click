// The agent, as a Mastra workflow:
//
//   read-message ──► ┌ open-link     (Kernel cloud browser)  ┐
//                    ├ check-claims  (Exa web search)        ├──► decide ──► respond
//                    └ check-address (RDAP + address tricks) ┘
//
// Each step is a plain async function over a per-run context, so the same code
// also runs without Mastra if the workflow engine is unavailable.
import { nanoid } from "nanoid";
import { z } from "zod";
import { DEMO_MOM, capabilities, env, runtime } from "./config";
import { findSeenBefore, flushCase, guardiansFor, saveCase, saveShot, type Guardian } from "./repo";
import { emit, guardianOnline } from "./bus";
import { type ReadResult, fingerprints, readMessage } from "./reader";
import { type Detonation, browserQueueLength, detonate } from "./browser";
import { type DomainIntel, type Investigation, domainIntel, investigate } from "./investigate";
import { askEvidence, decideLevel, ev, investigationEvidence, languageEvidence, visitEvidence, writeVerdict } from "./verdict";
import { brandByName, findBrand, isOfficialDomain, knownGoodDomain } from "./brands";
import { domainOf, isOwnTrainingPage, maskEmail, safeParse, sharedHostOf } from "./urls";
import * as mail from "./mail";
import type { CaseChannel, CaseRecord, TraceStep } from "./types";

export interface CaseInput {
  channel: CaseChannel;
  subject?: string;
  text?: string;
  html?: string;
  imageDataUrl?: string;
  /** paste-a-link shortcut */
  url?: string;
  senderEmail?: string;
  senderName?: string;
  /** email the verdict here when the case did not arrive by email */
  notifyEmail?: string;
  mail?: { inboxId: string; messageId: string; threadId: string };
  /** sent "as Mom" from the console: alert guardians of the demo persona */
  demoMom?: boolean;
  /** eval runs: not stored, not shown, no browser, no email */
  quiet?: boolean;
  /** fired from the presenter console: goes to the front of the browser queue */
  priority?: boolean;
}

interface Ctx {
  c: CaseRecord;
  input: CaseInput;
  quiet: boolean;
  fps: string[];
  read?: ReadResult;
  det?: Detonation;
  inv?: Investigation;
  intel?: DomainIntel;
  officialGuess: boolean;
  short: boolean; // answered from memory; later steps do nothing
  unreadable?: boolean; // a screenshot nobody could read: never "no red flags"
}

const g = globalThis as unknown as { __mdcRuns?: Map<string, Ctx> };
const runs: Map<string, Ctx> = (g.__mdcRuns ??= new Map());

function save(ctx: Ctx): void {
  saveCase(ctx.c, { quiet: ctx.quiet, fp: ctx.fps[0] ?? null });
}

async function traced<T>(ctx: Ctx, step: string, tool: string, stage: string | null, fn: () => Promise<T>): Promise<T | undefined> {
  const t: TraceStep = { step, tool, startedAt: Date.now() };
  ctx.c.trace.push(t);
  if (stage) ctx.c.stage = stage;
  save(ctx);
  try {
    const out = await fn();
    t.ok = true;
    return out;
  } catch (err) {
    t.ok = false;
    t.note = ((err as Error)?.message ?? String(err)).slice(0, 160);
    console.error(`[pipeline] ${step} failed:`, t.note);
    return undefined;
  } finally {
    t.endedAt = Date.now();
    save(ctx);
  }
}

// ── steps ────────────────────────────────────────────────────────────────────
async function stepRead(ctx: Ctx): Promise<void> {
  const { c, input } = ctx;
  c.status = "reading";
  const readerTool = capabilities().llm === "rules" ? "Reader (rules)" : capabilities().llm === "neon-gateway" ? "Neon AI Gateway" : "Reader";
  await traced(ctx, "read-message", readerTool, "Reading what was sent", async () => {
    const text = input.url && !input.text ? input.url : (input.text ?? "");
    const r = await readMessage({ subject: input.subject, text, html: input.html, imageDataUrl: input.imageDataUrl });
    if (input.url && !input.text) {
      // a bare link claims nothing. Words in its path or query ("/search?q=amazon") are not a sender;
      // only a brand in the host name itself counts ("paypal.com.account-fix.top").
      const inHost = findBrand((safeParse(input.url)?.hostname ?? "").replace(/[.\-_]/g, " "));
      r.claimedBrand = inHost?.name;
      r.category = inHost?.category ?? "other";
      r.pressure = [];
      r.phones = [];
    }
    ctx.read = r;
    c.subject = input.url && !input.text ? `A link to ${domainOf(input.url) ?? "a website"}` : r.subject;
    c.rawText = r.text || text;
    c.links = r.links;
    c.primaryUrl = input.url && safeParse(input.url) ? input.url : r.primaryUrl;
    c.domain = c.primaryUrl ? domainOf(c.primaryUrl) : undefined;
    c.claimedBrand = r.claimedBrand;
    c.category = r.category;
    c.pressure = r.pressure;
    ctx.fps = fingerprints({ primaryUrl: c.primaryUrl, phones: r.phones, text: c.rawText, claimedBrand: c.claimedBrand });
    const brand = brandByName(c.claimedBrand);
    ctx.officialGuess = c.claimedBrand ? isOfficialDomain(brand, c.domain) : !!knownGoodDomain(c.domain);
    if (r.fromVision) c.evidence.push(ev("vision", "neutral", "Read the text out of the screenshot", "Neon AI Gateway"));
    if (input.imageDataUrl && !r.fromVision && c.rawText.trim().length < 8) {
      ctx.unreadable = true;
      c.subject = "A screenshot we could not read";
      c.evidence.push(ev("vision", "amber", "We could not read the words in this picture", "Reader", "Reading screenshots needs a vision model, and none is switched on. Paste the text or the link instead."));
    }
    c.evidence.push(...languageEvidence(c, r.phones));
  });

  // reading failed outright: never let "we saw nothing" pass for "nothing to see"
  if (!ctx.read) {
    ctx.unreadable = true;
    c.evidence.push(ev("language", "amber", "We could not read this message properly", "Reader", "Something went wrong while reading it, so we are being careful."));
  }

  // memory: have we answered this exact scam already?
  if (!ctx.quiet && ctx.fps.length) {
    const memory = capabilities().db === "neon" ? "Neon" : "Postgres";
    const prior = await traced(ctx, "recall", memory, "Checking whether we have seen this before", () => findSeenBefore(ctx.fps, c.id));
    if (prior && prior.verdict) {
      const ago = Math.max(1, Math.round((Date.now() - prior.createdAt) / 1000));
      const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"} ago`;
      const when = ago < 90 ? plural(ago, "second") : ago < 5400 ? plural(Math.round(ago / 60), "minute") : plural(Math.round(ago / 3600), "hour");
      c.seenBefore = { caseId: prior.id, at: prior.createdAt, subject: prior.subject };
      c.verdict = prior.verdict;
      c.headline = prior.headline;
      c.reasons = prior.reasons;
      c.advice = prior.advice;
      c.officialUrl = prior.officialUrl;
      c.evidence = [
        ev("memory", "red", `Seen before. Same scam as ${when}`, memory, "We recognised the address and answered from memory instead of opening it again."),
        // the original findings, not an earlier "seen before" chip
        ...prior.evidence.filter((e) => e.tone === "red" && e.kind !== "memory").slice(0, 3).map((e) => ({ ...e, id: nanoid(8), at: Date.now() })),
      ];
      ctx.short = true;
    }
  }
  c.status = ctx.short ? "deciding" : "investigating";
  save(ctx);
}

async function stepOpenLink(ctx: Ctx): Promise<void> {
  const { c } = ctx;
  if (ctx.short || !c.primaryUrl) return;
  const url = c.primaryUrl;
  const own = isOwnTrainingPage(url);
  const tier = capabilities().browser;
  const tool = ctx.quiet ? "Safe fetch" : tier === "kernel" ? "Kernel" : tier === "playwright" ? "Sandbox browser" : "Safe fetch";
  const waiting = browserQueueLength();
  await traced(ctx, "open-link", tool, waiting ? `Waiting for a browser (${waiting} ahead)` : "Opening the link in a throwaway browser", async () => {
    let hasAsk = false;
    ctx.det = await detonate(url, c.id, {
      quiet: ctx.quiet,
      priority: ctx.input.priority,
      onReport: (r) => {
        c.browser = { ...r, steps: [...r.steps], asksFor: [...r.asksFor], redirectChain: [...r.redirectChain] };
        const last = r.steps[r.steps.length - 1]?.label;
        if (last && r.live) c.stage = last;
        save(ctx);
      },
      onAsk: (step, asks) => {
        const chips = askEvidence(step, asks, c.browser?.tier ?? "fetch", ctx.officialGuess, own);
        if (chips.length) {
          hasAsk = true;
          c.evidence.push(...chips);
          save(ctx);
        }
      },
    });
    c.evidence.push(...visitEvidence(ctx.det, ctx.officialGuess, hasAsk));
    // credit the tool that actually opened the page (a tier can fall back mid-run)
    const used = ctx.det.report.tier;
    const mine = c.trace.find((t) => t.step === "open-link" && !t.endedAt);
    if (mine) mine.tool = used === "kernel" ? "Kernel" : used === "playwright" ? "Sandbox browser" : "Safe fetch";
    if (ctx.det.shot && !ctx.quiet) await saveShot(c.id, ctx.det.shot);
  });
}

async function stepCheckClaims(ctx: Ctx): Promise<void> {
  const { c } = ctx;
  if (ctx.short) return;
  await traced(ctx, "check-claims", env.exaKey && !ctx.quiet ? "Exa" : "Known sites", null, async () => {
    ctx.inv = await investigate({
      claimedBrand: c.claimedBrand,
      category: c.category ?? "other",
      primaryUrl: c.primaryUrl,
      pressure: c.pressure,
      phones: ctx.read?.phones ?? [],
      quiet: ctx.quiet,
    });
  });
}

async function stepCheckAddress(ctx: Ctx): Promise<void> {
  const { c } = ctx;
  if (ctx.short || !c.primaryUrl) return;
  await traced(ctx, "check-address", "RDAP", null, async () => {
    ctx.intel = await domainIntel({ primaryUrl: c.primaryUrl, claimedBrand: c.claimedBrand, quiet: ctx.quiet });
  });
}

async function stepDecide(ctx: Ctx): Promise<void> {
  const { c } = ctx;
  c.status = "deciding";
  if (ctx.short) return;
  const writer = capabilities().llm === "rules" || ctx.quiet ? "Rules" : capabilities().llm === "neon-gateway" ? "Neon AI Gateway" : "Rules + model";
  await traced(ctx, "decide", writer, "Weighing the evidence", async () => {
    const inv: Investigation = ctx.inv ?? { brand: null, brandUnknown: false, linkIsOfficial: ctx.officialGuess, reports: [], searched: false };
    const intel: DomainIntel = ctx.intel ?? { red: [], amber: [] };
    // Genuine mail often uses click-tracking links. What matters is where the browser actually landed.
    const landed = ctx.det && !ctx.det.report.unreachable ? domainOf(ctx.det.report.finalUrl ?? "") : undefined;
    // (a page on user-content space that bounces to its host's front door proves nothing about the page)
    const userContent = !!sharedHostOf(safeParse(c.primaryUrl ?? "")?.hostname ?? "");
    if (!inv.linkIsOfficial && landed && landed !== c.domain && !userContent) {
      const brand = brandByName(c.claimedBrand);
      const landedOfficial = c.claimedBrand
        ? isOfficialDomain(brand, landed) || (!!inv.official && (landed === inv.official.domain || landed.endsWith("." + inv.official.domain)))
        : !!knownGoodDomain(landed);
      if (landedOfficial) {
        inv.linkIsOfficial = true;
        // the tracking hop itself is not a tell once we know where it ends
        intel.amber = intel.amber.filter((t) => !/shortened|sub-names|hyphens/.test(t));
        c.evidence = c.evidence.filter((e) => !(e.kind === "browser" && /Bounces through/.test(e.title)));
        c.evidence.push(ev("browser", "calm", `The link passes through a tracking service and lands on ${landed}`, c.browser?.tier === "kernel" ? "Kernel" : "Sandbox browser"));
      }
    }
    // No search result to lean on: an address that carries the sender's own name and has existed
    // for years is their site. Lookalikes fail this because they are registered days before use.
    const years = intel.ageDays !== undefined ? Math.floor(intel.ageDays / 365) : 0;
    const established = years >= 1 && intel.red.length === 0;
    if (!inv.linkIsOfficial && established && c.domain) {
      const stem = c.domain.split(".")[0].replace(/[^a-z0-9]/g, "");
      const words = (c.claimedBrand ?? "").toLowerCase().replace(/[^a-z0-9 ]/g, "").split(" ").filter((t) => t.length > 2);
      const carriesName = words.length > 0 && (stem === words.join("") || (words[0].length > 3 && stem === words[0]));
      if (carriesName) {
        inv.linkIsOfficial = true;
        c.evidence.push(ev("domain", "calm", `The address matches the sender's name and has existed for ${years} year${years === 1 ? "" : "s"}`, "RDAP"));
      } else if (!c.claimedBrand) {
        // a bare link with no message around it: a sign-in form on a long-standing site is ordinary
        for (const e of c.evidence) {
          if (e.kind !== "browser" || e.tone !== "red") continue;
          if (/password/.test(e.title) && !/card|Social Security|PIN|Medicare|bank account/.test(e.title)) {
            e.tone = "neutral";
            e.title = `Asks you to sign in. The website has existed for ${years} year${years === 1 ? "" : "s"}`;
          } else {
            e.tone = "amber";
            e.detail = "Only enter payment or identity details on a site you went looking for yourself.";
          }
        }
      }
    }
    // Exa may have confirmed the link as official after the browser chips were drawn: soften them.
    if (inv.linkIsOfficial && !ctx.officialGuess) {
      for (const e of c.evidence) if (e.kind === "browser" && e.tone !== "neutral") e.tone = "neutral";
    }
    // Scam reports only corroborate. A search for "<brand> scam warning" always finds something,
    // so on their own, or against the brand's own site, they say nothing about this message.
    const otherwiseSuspicious = c.evidence.some((e) => e.tone === "red" || e.tone === "amber") || intel.red.length > 0 || intel.amber.length > 0 || (!!c.claimedBrand && !!inv.official && !inv.linkIsOfficial) || inv.brandUnknown;
    if (inv.linkIsOfficial || !otherwiseSuspicious) inv.reports = [];
    c.evidence.push(...investigationEvidence(inv, intel, c));
    // strongest first, so every screen leads with the reason that matters
    const order = { red: 0, amber: 1, calm: 2, neutral: 3 } as const;
    c.evidence.sort((a, b) => order[a.tone] - order[b.tone] || a.at - b.at);
    const level = decideLevel(c.evidence, {
      hasLink: !!c.primaryUrl,
      linkIsOfficial: inv.linkIsOfficial,
      unreachable: !!ctx.det?.report.unreachable,
    });
    c.officialUrl = inv.official?.url;
    // What gets remembered. An address is only remembered as bad when the address itself was implicated
    // (not just the wording around it), and never when it belongs to a well-known site.
    const implicated = c.evidence.some(
      (e) => e.tone === "red" && (e.kind === "browser" || e.kind === "domain" || (e.kind === "search" && /^(Not |No company)/.test(e.title))),
    );
    if (!implicated || knownGoodDomain(c.domain) || inv.linkIsOfficial) ctx.fps = ctx.fps.filter((f) => !f.startsWith("d:"));
    if (ctx.unreadable && level === "NO_RED_FLAGS") {
      const picture = !!ctx.input.imageDataUrl;
      c.verdict = "TREAT_AS_SCAM";
      c.headline = picture ? "Treat this as a scam for now. We could not read the screenshot." : "Treat this as a scam for now. We could not read the message.";
      c.reasons = [picture ? "We could not read the words in this picture, so we could not check it." : "We could not read this message properly, so we could not check it."];
      c.advice = "Paste the text of the message, or the link, and we will check it properly.";
      return;
    }
    const words = await writeVerdict(level, c, c.evidence, c.officialUrl, ctx.quiet);
    c.verdict = level;
    c.headline = words.headline;
    c.reasons = words.reasons;
    c.advice = words.advice;
  });
  if (!c.verdict) {
    // deciding itself failed: fail closed
    c.verdict = "TREAT_AS_SCAM";
    c.headline = "Treat this as a scam. We could not finish checking it.";
    c.reasons = ["Something went wrong while we were checking, so we are being careful."];
    c.advice = "Do not use the link or phone number in the message. Go to the official website yourself.";
  }
}

async function stepRespond(ctx: Ctx): Promise<void> {
  const { c, input } = ctx;
  if (ctx.quiet) return;
  const canMail = capabilities().email;
  await traced(ctx, "respond", canMail ? "AgentMail" : "Web", "Sending the answer", async () => {
    if (canMail && c.mail && !c.mail.replied) {
      const m = mail.verdictEmail(c);
      await mail.reply(c.mail.inboxId, c.mail.messageId, { text: m.text, html: m.html }, c.mail.threadId);
      c.mail.replied = true;
    } else if (canMail && input.notifyEmail) {
      const m = mail.verdictEmail(c);
      await mail.send(input.notifyEmail, m.subject, { text: m.text, html: m.html });
    }
    if (c.verdict === "SCAM") {
      const watchers: Guardian[] = [];
      if (input.senderEmail && input.senderEmail !== DEMO_MOM.email) watchers.push(...(await guardiansFor(input.senderEmail)));
      if (input.demoMom) watchers.push(...(await guardiansFor(null)));
      const sent: NonNullable<CaseRecord["guardianAlerted"]> = [];
      const done = new Set<string>();
      let emails = 0;
      for (const w of watchers) {
        if (done.has(w.guardianEmail)) continue;
        done.add(w.guardianEmail);
        // two ways to reach a guardian: their open /guard page (everyone who is listening), and email (the newest few)
        const onScreen = guardianOnline(w.id);
        if (onScreen) emit({ type: "alert", guardianId: w.id, caseId: c.id, line: mail.guardianLine(c, w.parentName), at: Date.now() });
        let emailed = false;
        if (canMail && emails < 8) {
          try {
            const m = mail.guardianEmail(c, w.parentName);
            await mail.send(w.guardianEmail, m.subject, { text: m.text, html: m.html });
            emailed = true;
            emails++;
          } catch (err) {
            console.error("[pipeline] guardian email failed", (err as Error)?.message ?? err);
          }
        }
        // nothing delivered, nothing claimed
        if (!emailed && !onScreen && process.env.MDC_SIMULATE_ALERTS !== "1") continue;
        if (sent.length < 6) sent.push({ name: w.parentName, emailMasked: maskEmail(w.guardianEmail), at: Date.now(), via: emailed ? "email" : "screen" });
      }
      if (sent.length) c.guardianAlerted = sent;
    }
  });
}

function finish(ctx: Ctx): void {
  const { c } = ctx;
  c.status = "done";
  c.stage = "Done";
  c.durationMs = Date.now() - c.createdAt;
  save(ctx);
}

// ── Mastra wiring ────────────────────────────────────────────────────────────
const io = z.object({ caseId: z.string() });
const ctxOf = (id: string): Ctx => {
  const ctx = runs.get(id);
  if (!ctx) throw new Error(`no run context for case ${id}`);
  return ctx;
};

async function buildWorkflow() {
  const { createStep, createWorkflow } = await import("@mastra/core/workflows");
  const step = <T extends string>(id: T, fn: (ctx: Ctx) => Promise<void>) =>
    createStep({
      id,
      inputSchema: io,
      outputSchema: io,
      execute: async ({ inputData }) => {
        await fn(ctxOf(inputData.caseId));
        return { caseId: inputData.caseId };
      },
    });
  const read = step("read-message", stepRead);
  const open = step("open-link", stepOpenLink);
  const claims = step("check-claims", stepCheckClaims);
  const address = step("check-address", stepCheckAddress);
  const fanIn = z.object({ "open-link": io, "check-claims": io, "check-address": io });
  const decide = createStep({
    id: "decide",
    inputSchema: fanIn,
    outputSchema: io,
    execute: async ({ inputData }) => {
      const caseId = inputData["open-link"].caseId;
      await stepDecide(ctxOf(caseId));
      return { caseId };
    },
  });
  const respond = step("respond", stepRespond);
  const workflow = createWorkflow({ id: "mom-dont-click", inputSchema: io, outputSchema: io })
    .then(read)
    .parallel([open, claims, address])
    .then(decide)
    .then(respond)
    .commit();
  // a workflow has a .then() method, so never hand it back bare from an async function
  return { workflow };
}

// Module scope on purpose (not globalThis): the workflow closes over the step functions,
// so a hot reload in development must rebuild it.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const wf: { __mdcWorkflow?: Promise<any> } = {};

async function runDirect(ctx: Ctx): Promise<void> {
  await stepRead(ctx);
  await Promise.all([stepOpenLink(ctx), stepCheckClaims(ctx), stepCheckAddress(ctx)]);
  await stepDecide(ctx);
  await stepRespond(ctx);
}

async function execute(ctx: Ctx): Promise<void> {
  runs.set(ctx.c.id, ctx);
  try {
    let ran = false;
    if (runtime.mastraOk !== false) {
      try {
        wf.__mdcWorkflow ??= buildWorkflow();
        const { workflow } = await wf.__mdcWorkflow;
        const run = await workflow.createRun();
        const result = await run.start({ inputData: { caseId: ctx.c.id } });
        if (result.status !== "success") throw new Error(`workflow ${result.status}`);
        runtime.mastraOk = true;
        ran = true;
      } catch (err) {
        console.error("[pipeline] Mastra run failed, continuing without it:", (err as Error)?.message ?? err);
        if (ctx.c.trace.length === 0) {
          runtime.mastraOk = false;
          wf.__mdcWorkflow = undefined;
        }
      }
    }
    if (!ran) {
      if (ctx.c.trace.length === 0) await runDirect(ctx);
      else {
        // the engine failed mid-run: finish the remaining steps directly
        if (!ctx.c.verdict) await stepDecide(ctx);
        if (!ctx.c.trace.some((t) => t.step === "respond")) await stepRespond(ctx);
      }
    }
    finish(ctx);
  } catch (err) {
    ctx.c.status = "error";
    ctx.c.error = ((err as Error)?.message ?? String(err)).slice(0, 200);
    ctx.c.stage = "Could not check this one";
    save(ctx);
  } finally {
    runs.delete(ctx.c.id);
  }
}

function newCase(input: CaseInput): CaseRecord {
  const now = Date.now();
  return {
    id: nanoid(12),
    createdAt: now,
    updatedAt: now,
    channel: input.channel,
    senderEmail: input.senderEmail,
    senderName: input.senderName,
    subject: "Something just came in",
    rawText: "",
    links: [],
    pressure: [],
    status: "queued",
    stage: "Just arrived",
    reasons: [],
    evidence: [],
    trace: [],
    mail: input.mail,
    viewToken: nanoid(24),
  };
}

/** Create a case and run the agent in the background. Returns immediately. */
export function startCase(input: CaseInput): CaseRecord {
  const c = newCase(input);
  const ctx: Ctx = { c, input, quiet: false, fps: [], officialGuess: false, short: false };
  save(ctx);
  void execute(ctx);
  return c;
}

/** Run the agent to completion without storing or showing anything (used by the eval). */
export async function runQuiet(input: CaseInput): Promise<CaseRecord> {
  const c = newCase(input);
  const ctx: Ctx = { c, input: { ...input, quiet: true }, quiet: true, fps: [], officialGuess: false, short: false };
  await execute(ctx);
  return c;
}

export { flushCase };
