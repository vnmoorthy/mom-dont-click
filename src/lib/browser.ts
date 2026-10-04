// Step 2a — "detonate" the link somewhere that is not mom's phone.
// Three tiers, best available first:
//   kernel     a disposable Kernel cloud browser, driven over CDP, with a live view
//   playwright a local headless Chromium in a fresh context (dev fallback)
//   fetch      no browser at all: follow redirects and read the HTML
// The agent only ever LOOKS at third-party pages. It types (obviously fake)
// details in exactly one place: the training pages this app hosts under /fake/.
import { parse } from "node-html-parser";
import type { Browser, BrowserContext, Page } from "playwright-core";
import { browserTier, env, runtime } from "./config";
import { pushFrame } from "./bus";
import { assertPublicUrl, isLoopbackUrl, isOwnTrainingPage, looksInternal, resolvesPublic, safeParse } from "./urls";
import type { BrowserReport, BrowserTier } from "./types";

export interface Detonation {
  report: BrowserReport;
  /** what each step of the page asked for; index 0 is the landing page */
  asksByStep: string[][];
  pageText: string;
  challenge: boolean;
  httpStatus?: number;
  shot?: Buffer;
}

export interface DetonateHooks {
  onReport: (r: BrowserReport) => void;
  onAsk?: (step: number, asks: string[]) => void;
  /** eval runs skip the real browser and never stream frames */
  quiet?: boolean;
  /** presenter seeds jump the queue so the stage is never starved by the room */
  priority?: boolean;
  /** set by the browser tiers: closes the session so a hung page cannot hold a slot forever */
  cancel?: () => Promise<void>;
}

/** Run something inside the page, but never wait on a busy page for more than a few seconds. */
function within<T>(p: Promise<T>, ms: number, what: string): Promise<T> {
  return Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error(`Timeout: ${what}`)), ms))]);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const BUDGET_MS = 30_000;

// ── concurrency: a couple of sessions at a time, the rest wait in line ───────
interface Gate {
  active: number;
  waiters: Array<() => void>;
  local?: Promise<Browser>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  warm?: { session: any; at: number } | null;
  warming?: boolean;
}
const g = globalThis as unknown as { __mdcGate?: Gate };
const gate: Gate = (g.__mdcGate ??= { active: 0, waiters: [] });
const MAX_ACTIVE = 2;
const MAX_WAITING = 8;

/** Take a browser slot. Returns false when the line is too long: the caller reads the page without a browser instead. */
async function acquire(priority = false): Promise<boolean> {
  if (gate.active < MAX_ACTIVE) {
    gate.active++;
    return true;
  }
  if (!priority && gate.waiters.length >= MAX_WAITING) return false;
  await new Promise<void>((res) => (priority ? gate.waiters.unshift(res) : gate.waiters.push(res)));
  gate.active++;
  return true;
}
function release(): void {
  gate.active = Math.max(0, gate.active - 1);
  gate.waiters.shift()?.();
}
export function browserQueueLength(): number {
  return gate.waiters.length;
}

// ── what the page asks for (runs inside the page) ────────────────────────────
function scanPage(): { asks: string[]; title: string; text: string; inputs: number } {
  const asks: string[] = [];
  const seen = new Set<string>();
  const labelOf = (el: HTMLInputElement): string => {
    const byFor = el.id ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`) : null;
    return [
      byFor?.textContent, el.closest("label")?.textContent, el.getAttribute("aria-label"), el.placeholder, el.name, el.id,
    ].filter(Boolean).join(" ").toLowerCase();
  };
  const kinds: Array<[string, (el: HTMLInputElement, l: string) => boolean]> = [
    ["card security code", (el, l) => /cc-csc/.test(el.autocomplete || "") || /\b(cvv|cvc|csc)\b|security code/.test(l)],
    ["card expiry date", (el, l) => /cc-exp/.test(el.autocomplete || "") || /expir|mm ?\/ ?yy/.test(l)],
    ["card number", (el, l) => /cc-number/.test(el.autocomplete || "") || /card ?(number|no\b|#)|cardnumber|credit card|debit card/.test(l)],
    ["Social Security number", (_el, l) => /\bssn\b|social security/.test(l)],
    ["Medicare number", (_el, l) => /medicare/.test(l)],
    ["card PIN", (_el, l) => /\bpin\b/.test(l)],
    ["bank account number", (_el, l) => /routing|account number|\biban\b/.test(l)],
    ["date of birth", (_el, l) => /date of birth|\bdob\b|birth ?date/.test(l)],
    ["one-time code", (el, l) => /one-time-code/.test(el.autocomplete || "") || /one[- ]time|\botp\b|verification code/.test(l)],
    ["password", (el) => el.type === "password"],
  ];
  let layer = document.getElementById("__mdc_layer");
  if (!layer) {
    layer = document.createElement("div");
    layer.id = "__mdc_layer";
    layer.style.cssText = "position:absolute;left:0;top:0;width:0;height:0;z-index:2147483647;pointer-events:none";
    document.documentElement.appendChild(layer);
  }
  layer.replaceChildren(); // not innerHTML: pages with a Trusted Types policy reject that
  const inputs = Array.from(document.querySelectorAll<HTMLInputElement>("input, select, textarea"));
  let visible = 0;
  for (const el of inputs) {
    if (el.type === "hidden" || el.type === "submit" || el.type === "button") continue;
    const r = el.getBoundingClientRect();
    if (r.width < 6 || r.height < 6) continue;
    visible++;
    const l = labelOf(el);
    for (const [name, test] of kinds) {
      if (!test(el, l)) continue;
      if (!seen.has(name)) {
        seen.add(name);
        asks.push(name);
      }
      const box = document.createElement("div");
      box.style.cssText = `position:absolute;left:${r.left + window.scrollX - 5}px;top:${r.top + window.scrollY - 5}px;width:${r.width + 10}px;height:${r.height + 10}px;border:3px solid #e8391c;border-radius:8px;box-shadow:0 0 0 4px rgba(232,57,28,.22)`;
      const tag = document.createElement("div");
      tag.textContent = `ASKS FOR: ${name.toUpperCase()}`;
      tag.style.cssText = "position:absolute;left:-3px;top:-24px;background:#e8391c;color:#fff;font:700 11px/1 ui-monospace,Menlo,monospace;padding:5px 7px;border-radius:5px 5px 5px 0;white-space:nowrap;letter-spacing:.04em";
      box.appendChild(tag);
      layer.appendChild(box);
      break;
    }
  }
  return {
    asks,
    title: document.title || "",
    text: (document.body?.innerText || "").replace(/\s+/g, " ").slice(0, 2500),
    inputs: visible,
  };
}

/** Fill every visible field with obviously fake details. Training pages only. */
async function canaryFill(page: Page): Promise<void> {
  const fields = page.locator("form input:visible, form select:visible");
  const n = Math.min(await fields.count(), 8);
  for (let i = 0; i < n; i++) {
    const f = fields.nth(i);
    const meta = await f.evaluate((el) => {
      const e = el as HTMLInputElement;
      return { type: e.type, name: (e.name || "").toLowerCase(), ac: e.autocomplete || "", value: e.value, tag: e.tagName };
    });
    if (meta.tag !== "INPUT" || meta.value || ["checkbox", "radio", "submit", "button"].includes(meta.type)) continue;
    let v = "canary";
    if (meta.type === "email" || /email/.test(meta.name)) v = "canary@example.com";
    else if (/cc-number|cardnumber/.test(meta.ac + meta.name)) v = "0000 0000 0000 0000";
    else if (/cc-exp|expiry/.test(meta.ac + meta.name)) v = "01/30";
    else if (/cc-csc|cvv|cvc/.test(meta.ac + meta.name)) v = "000";
    else if (/ssn/.test(meta.name)) v = "000-00-0000";
    else if (/pin/.test(meta.name)) v = "0000";
    else if (meta.type === "tel" || /phone/.test(meta.name)) v = "555-0100";
    else if (meta.type === "password") v = "not-a-real-password";
    else if (/name|user/.test(meta.name)) v = "Canary Test";
    await f.scrollIntoViewIfNeeded().catch(() => {});
    await f.pressSequentially(v, { delay: 28 }).catch(() => {});
  }
}

function classifyFailure(message: string): string {
  if (/ERR_NAME_NOT_RESOLVED|DNS_NOT_FOUND|ENOTFOUND/i.test(message)) return "That web address does not exist. Scam pages are often taken down within hours.";
  if (/ERR_CERT|certificate|SSL/i.test(message)) return "The page's security certificate is broken.";
  if (/ERR_CONNECTION|ECONNREFUSED|ECONNRESET/i.test(message)) return "The server refused the connection.";
  if (/Timeout|timed out|aborted/i.test(message)) return "The page never finished loading. Some scam pages hide from scanners.";
  if (/private network|Unusual port|Not a web address|ERR_BLOCKED_BY_CLIENT/i.test(message)) return "That address is not a public web page.";
  return "The page could not be opened.";
}

// ── tiers ────────────────────────────────────────────────────────────────────
async function localBrowser(): Promise<Browser> {
  gate.local ??= (async () => {
    const { chromium } = await import("playwright-core");
    const executablePath = process.env.CHROMIUM_PATH || undefined;
    const b = await chromium.launch({ headless: true, executablePath, args: ["--disable-dev-shm-usage", "--no-first-run"] });
    b.on("disconnected", () => {
      gate.local = undefined;
    });
    return b;
  })().catch((err) => {
    gate.local = undefined;
    runtime.localChromium = false;
    throw err;
  });
  const b = await gate.local;
  runtime.localChromium = true;
  return b;
}

/** Is a local Chromium launchable? Called once at boot so the console can say so. */
export async function probeLocalChromium(): Promise<boolean> {
  if (env.kernelKey) return true;
  try {
    await localBrowser();
    return true;
  } catch {
    return false;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function kernelClient(): Promise<any> {
  const Kernel = (await import("@onkernel/sdk")).default;
  return new Kernel({ apiKey: env.kernelKey });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function createKernelSession(): Promise<any> {
  const kernel = await kernelClient();
  return kernel.browsers.create({ stealth: true, timeout_seconds: 240 });
}

/** Keep one Kernel browser ready so the first frame appears in about a second. */
export function warmKernel(): void {
  if (!env.kernelKey || gate.warming || (gate.warm && Date.now() - gate.warm.at < 200_000)) return;
  gate.warming = true;
  createKernelSession()
    .then((session) => {
      gate.warm = { session, at: Date.now() };
      runtime.warmBrowser = true;
    })
    .catch((err) => console.error("[kernel] warm failed", err?.message ?? err))
    .finally(() => {
      gate.warming = false;
    });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function takeKernelSession(): Promise<any> {
  const w = gate.warm;
  gate.warm = null;
  runtime.warmBrowser = false;
  if (w && Date.now() - w.at < 200_000) return w.session;
  return createKernelSession();
}

async function drive(
  page: Page,
  url: string,
  caseId: string,
  report: BrowserReport,
  hooks: DetonateHooks,
): Promise<Omit<Detonation, "report">> {
  const own = isOwnTrainingPage(url);
  const step = (label: string) => {
    report.steps.push({ label, at: Date.now() });
    hooks.onReport(report);
  };
  let live = true;
  const streaming = hooks.quiet
    ? Promise.resolve()
    : (async () => {
        while (live) {
          try {
            pushFrame(caseId, await page.screenshot({ type: "jpeg", quality: 62, timeout: 4000 }));
          } catch {}
          await sleep(260);
        }
      })();

  const chain: string[] = [];
  page.on("framenavigated", (f) => {
    if (f === page.mainFrame() && f.url() && f.url() !== "about:blank" && chain[chain.length - 1] !== f.url()) chain.push(f.url());
  });
  page.on("dialog", (d) => d.dismiss().catch(() => {}));

  const asksByStep: string[][] = [];
  let pageText = "";
  let challenge = false;
  let httpStatus: number | undefined;
  let shot: Buffer | undefined;

  try {
    step("Opening the link in a throwaway browser");
    const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 16_000 });
    httpStatus = resp?.status();
    // the redirect chain as the server reported it
    const hops: string[] = [];
    for (let r = resp?.request().redirectedFrom(); r; r = r.redirectedFrom()) hops.unshift(r.url());
    report.redirectChain = [...new Set([...hops, ...chain, page.url()])];
    await sleep(900);
    report.finalUrl = page.url();
    report.title = (await page.title().catch(() => "")) || undefined;
    hooks.onReport(report);

    step("Looking at what the page asks for");
    let scan = await within(page.evaluate(scanPage), 6000, "the page was too busy to inspect");
    pageText = scan.text;
    challenge = /just a moment|attention required|verify you are human|checking your browser|captcha/i.test(`${scan.title} ${scan.text.slice(0, 400)}`) && scan.inputs <= 1;
    asksByStep.push(scan.asks);
    report.asksFor = [...scan.asks];
    hooks.onAsk?.(0, scan.asks);
    hooks.onReport(report);

    if (own) {
      // Canary walk: type obviously fake details to see what the page asks for next.
      // One step only: we stop the moment the page shows what it is really after.
      report.canaryWalk = true;
      const submit = page.locator("form button[type=submit]:visible").first();
      if (await submit.count()) {
        step("Typing obviously fake details to see what happens next");
        await canaryFill(page);
        await sleep(350);
        const fieldNames = () =>
          page.evaluate(() => Array.from(document.querySelectorAll("form input"), (el) => (el as HTMLInputElement).name).join(",")).catch(() => "");
        const before = await fieldNames();
        // the boxes drawn for step 1 must not hang over step 2 while it loads
        await page.evaluate(() => document.getElementById("__mdc_layer")?.replaceChildren()).catch(() => {});
        const clicked = await submit.click({ timeout: 8000 }).then(() => true, () => false);
        await sleep(1100);
        scan = await within(page.evaluate(scanPage), 6000, "the page was too busy to inspect");
        // only report a second step if the form really moved on
        if (clicked && scan.inputs > 0 && (await fieldNames()) !== before) {
          asksByStep.push(scan.asks);
          for (const a of scan.asks) if (!report.asksFor.includes(a)) report.asksFor.push(a);
          hooks.onAsk?.(1, scan.asks);
          step(scan.asks.length ? `Step 2 asks for: ${scan.asks.join(", ")}. Stopping here` : "Step 2 loaded");
          await sleep(1800);
        }
      }
    } else {
      step("Scrolling through the page (looking, never typing)");
      for (let i = 0; i < 3; i++) {
        await page.mouse.wheel(0, 380).catch(() => {});
        await sleep(380);
      }
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" })).catch(() => {});
      await sleep(500);
      const again = await within(page.evaluate(scanPage), 5000, "inspect").catch(() => null);
      if (again) for (const a of again.asks) if (!report.asksFor.includes(a)) report.asksFor.push(a);
      if (again && asksByStep[0].length === 0) asksByStep[0] = again.asks;
    }

    if (httpStatus && httpStatus >= 400) report.unreachable = `The page answered with an error (${httpStatus}).`;
    if (challenge) report.unreachable = "The page hid behind a robot check instead of showing itself.";
    shot = await page.screenshot({ type: "jpeg", quality: 78, timeout: 5000 }).catch(() => undefined);
    step("Destroying the browser");
  } catch (err) {
    const message = (err as Error)?.message ?? String(err);
    report.unreachable = classifyFailure(message);
    report.finalUrl ??= url;
    if (report.redirectChain.length === 0) report.redirectChain = [url];
    shot = await page.screenshot({ type: "jpeg", quality: 70, timeout: 3000 }).catch(() => undefined);
  } finally {
    live = false;
    await streaming;
  }
  return { asksByStep, pageText, challenge, httpStatus, shot };
}

async function viaKernel(url: string, caseId: string, report: BrowserReport, hooks: DetonateHooks) {
  const session = await takeKernelSession();
  warmKernel();
  const { chromium } = await import("playwright-core");
  let browser: Browser | null = null;
  try {
    report.liveViewUrl = session.browser_live_view_url ?? undefined;
    hooks.onReport(report);
    browser = await chromium.connectOverCDP(session.cdp_ws_url, { timeout: 15_000 });
    const connected = browser;
    hooks.cancel = async () => {
      await connected.close().catch(() => {});
    };
    const context = browser.contexts()[0] ?? (await browser.newContext());
    const page = context.pages()[0] ?? (await context.newPage());
    return await drive(page, url, caseId, report, hooks);
  } finally {
    await browser?.close().catch(() => {});
    kernelClient()
      .then((k) => k.browsers.deleteByID(session.session_id))
      .catch(() => {});
  }
}

async function viaPlaywright(url: string, caseId: string, report: BrowserReport, hooks: DetonateHooks) {
  await assertPublicUrl(url);
  const browser = await localBrowser();
  let context: BrowserContext | null = null;
  try {
    context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      acceptDownloads: false,
      serviceWorkers: "block",
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
    });
    const own = isOwnTrainingPage(url);
    // nothing the page loads may reach into this machine's network
    await context.route("**/*", async (route) => {
      const u = safeParse(route.request().url());
      if (!u) return route.continue(); // data:, blob:, about:
      // our own training page may load its own assets from this app and nothing else internal
      if (own && isOwnTrainingPage(`${u.protocol}//${u.host}/fake/`)) return route.continue();
      if (looksInternal(u.hostname)) return route.abort();
      // names that resolve inward (redirect targets, rebinding) are refused too
      if (!(await resolvesPublic(u.hostname))) return route.abort();
      return route.continue();
    });
    const page = await context.newPage();
    // Playwright's route handlers are NOT called for redirect hops, so every request (including each
    // redirect target) is also paused over CDP and held to the same rule before it leaves this machine.
    const cdp = await context.newCDPSession(page);
    await cdp.send("Fetch.enable", { patterns: [{ urlPattern: "*" }] });
    cdp.on("Fetch.requestPaused", async (e) => {
      const u = safeParse(e.request.url);
      const ok = !u || (own && isOwnTrainingPage(`${u.protocol}//${u.host}/fake/`)) || (await resolvesPublic(u.hostname));
      if (ok) await cdp.send("Fetch.continueRequest", { requestId: e.requestId }).catch(() => {});
      else await cdp.send("Fetch.failRequest", { requestId: e.requestId, errorReason: "BlockedByClient" }).catch(() => {});
    });
    const opened = context;
    hooks.cancel = async () => {
      await opened.close().catch(() => {});
    };
    return await drive(page, url, caseId, report, hooks);
  } finally {
    await context?.close().catch(() => {});
  }
}

const HTML_KINDS: Array<[string, RegExp]> = [
  ["card security code", /cc-csc|\bcvv\b|\bcvc\b|security code/i],
  ["card number", /cc-number|card ?number|cardnumber|credit card/i],
  ["Social Security number", /\bssn\b|social security/i],
  ["Medicare number", /medicare (number|id)/i],
  ["date of birth", /date of birth|\bdob\b/i],
];

async function viaFetch(url: string, report: BrowserReport, hooks: DetonateHooks): Promise<Omit<Detonation, "report">> {
  const step = (label: string) => {
    report.steps.push({ label, at: Date.now() });
    hooks.onReport(report);
  };
  step("Following the link without a browser");
  const chain: string[] = [url];
  let current = url;
  let html = "";
  let status: number | undefined;
  try {
    for (let hop = 0; hop < 6; hop++) {
      await assertPublicUrl(current);
      const res = await fetch(current, {
        redirect: "manual",
        signal: AbortSignal.timeout(9000),
        headers: { "user-agent": "Mozilla/5.0 (compatible; MomDontClick/1.0; +safety check)", accept: "text/html,*/*" },
      });
      status = res.status;
      const loc = res.headers.get("location");
      if (res.status >= 300 && res.status < 400 && loc) {
        current = new URL(loc, current).toString();
        chain.push(current);
        continue;
      }
      html = (await res.text()).slice(0, 400_000);
      break;
    }
  } catch (err) {
    report.unreachable = classifyFailure((err as Error)?.message ?? String(err));
  }
  report.redirectChain = chain;
  report.finalUrl = current;
  const asks: string[] = [];
  let text = "";
  if (html) {
    const root = parse(html);
    report.title = root.querySelector("title")?.text.trim() || undefined;
    text = root.structuredText.replace(/\s+/g, " ").slice(0, 2500);
    const inputs = root.querySelectorAll("input");
    if (inputs.some((i) => i.getAttribute("type") === "password")) asks.push("password");
    const attrs = inputs.map((i) => `${i.getAttribute("name") ?? ""} ${i.getAttribute("autocomplete") ?? ""} ${i.getAttribute("placeholder") ?? ""}`).join(" | ");
    for (const [name, re] of HTML_KINDS) if (re.test(attrs) || (name !== "card number" && re.test(text) && inputs.length > 0)) asks.push(name);
    step("Reading the page's HTML for what it asks for");
  }
  if (status && status >= 400) report.unreachable = `The page answered with an error (${status}).`;
  report.asksFor = asks;
  hooks.onAsk?.(0, asks);
  const challenge = /just a moment|attention required|verify you are human/i.test(text.slice(0, 400));
  return { asksByStep: [asks], pageText: text, challenge, httpStatus: status };
}

/** Open `url` away from the user and report what it does. Never throws. */
export async function detonate(url: string, caseId: string, hooks: DetonateHooks): Promise<Detonation> {
  const report: BrowserReport = { tier: "none", live: false, redirectChain: [], asksFor: [], steps: [], hasScreenshot: false };
  // only our own training page, on this machine, is ever opened locally when a cloud browser is available
  const localUrl = isLoopbackUrl(url) && isOwnTrainingPage(url);
  let tier: BrowserTier = hooks.quiet ? "fetch" : browserTier();
  if (tier === "kernel" && localUrl) tier = "playwright"; // a cloud browser cannot see this laptop
  const empty = { asksByStep: [[]] as string[][], pageText: "", challenge: false };

  const gotSlot = await acquire(!!hooks.priority);
  if (!gotSlot && tier !== "fetch") {
    tier = "fetch"; // the room is busy: read the page directly rather than keep someone waiting
    report.steps.push({ label: "Every browser is busy, so reading the page directly", at: Date.now() });
  }
  report.startedAt = Date.now();
  let result: Omit<Detonation, "report"> = empty;
  try {
    const attempt = async (t: BrowserTier) => {
      report.tier = t;
      report.live = t !== "fetch";
      hooks.onReport(report);
      if (t === "kernel") return viaKernel(url, caseId, report, hooks);
      if (t === "playwright") return viaPlaywright(url, caseId, report, hooks);
      return viaFetch(url, report, hooks);
    };
    const withBudget = async <T,>(p: Promise<T>): Promise<T> => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        return await Promise.race([
          p,
          new Promise<never>((_, rej) => {
            timer = setTimeout(() => rej(new Error("Timeout: budget exceeded")), BUDGET_MS);
          }),
        ]);
      } catch (err) {
        // out of time or broken: close the session so the attempt unwinds and its slot is really free
        await hooks.cancel?.().catch(() => {});
        p.catch(() => {});
        throw err;
      } finally {
        if (timer) clearTimeout(timer);
        hooks.cancel = undefined;
      }
    };
    try {
      result = await withBudget(attempt(tier));
    } catch (err) {
      const message = (err as Error)?.message ?? String(err);
      const blocked = /private network|Unusual port|Not a web address|DNS_NOT_FOUND/.test(message);
      if (blocked || tier === "fetch") {
        report.unreachable = classifyFailure(message);
        if (report.redirectChain.length === 0) report.redirectChain = [url];
      } else {
        // the browser itself failed (launch, CDP, quota): fall down ONE tier at a time rather than fail the case.
        // A hung page is not retried in another browser; it goes straight to the plain read.
        console.error(`[browser] ${tier} failed, falling back:`, message);
        const hung = /budget exceeded/.test(message);
        const next: BrowserTier = tier === "kernel" && !hung && runtime.localChromium !== false ? "playwright" : "fetch";
        report.steps.push({ label: next === "playwright" ? "Cloud browser unavailable, using the local sandbox browser" : "Browser unavailable, reading the page directly instead", at: Date.now() });
        result = await withBudget(attempt(next))
          .catch((e) => {
            if (next === "fetch") throw e;
            report.steps.push({ label: "Browser unavailable, reading the page directly instead", at: Date.now() });
            return withBudget(attempt("fetch"));
          })
          .catch((e) => {
            report.unreachable = classifyFailure((e as Error)?.message ?? String(e));
            return empty;
          });
      }
    }
  } finally {
    if (gotSlot) release();
  }
  report.live = false;
  report.liveViewUrl = undefined;
  report.endedAt = Date.now();
  report.hasScreenshot = !!result.shot;
  if (!report.finalUrl) report.finalUrl = url;
  hooks.onReport(report);
  return { report, ...result };
}
