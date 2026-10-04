// Capture real product screenshots (and a short screen recording) for the README and the deck.
// Usage: node scripts/shots.mjs [baseUrl]
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const base = process.argv[2] || "http://localhost:3000";
const out = path.resolve("docs/media");
fs.mkdirSync(out, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const post = (p, body) =>
  fetch(base + p, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body ?? {}) }).then((r) => r.json());

const browser = await chromium.launch({ headless: true });

async function shot(page, name, opts = {}) {
  await page.screenshot({ path: path.join(out, name), ...opts });
  console.log("saved", name);
}

// ── the wall: idle, live browser, verdict slam, grid ───────────────────────
await post("/api/console/reset");
const wallCtx = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
  recordVideo: { dir: path.join(out, "_video"), size: { width: 1920, height: 1080 } },
});
const wall = await wallCtx.newPage();
await wall.goto(base + "/wall", { waitUntil: "networkidle" }).catch(() => {});
await sleep(2500);
await shot(wall, "wall-idle.png");

const { id } = await post("/api/console/seed", { seedId: "parcel" });
// wait for step 2 (the card demand) to be on screen
for (let i = 0; i < 60; i++) {
  const c = (await fetch(`${base}/api/cases/${id}`).then((r) => r.json())).case;
  if (c.browser?.asksFor?.some((a) => /card number/.test(a))) break;
  await sleep(250);
}
await sleep(900);
await shot(wall, "wall-live.png");
for (let i = 0; i < 80; i++) {
  const c = (await fetch(`${base}/api/cases/${id}`).then((r) => r.json())).case;
  if (c.status === "done") break;
  await sleep(250);
}
await sleep(1600);
await shot(wall, "wall-verdict.png");
await sleep(8500);

// fill the grid with the other seeds, including a repeat ("seen before") and a genuine one
for (const seedId of ["toll", "techsupport", "medicare", "grandchild", "genuine-order", "parcel"]) {
  await post("/api/console/seed", { seedId });
  await sleep(seedId === "genuine-order" ? 9000 : 2200);
  await wall.keyboard.press("Space").catch(() => {});
}
await sleep(9500);
await wall.keyboard.press("Space").catch(() => {});
await sleep(1500);
await shot(wall, "wall-grid.png");
await wallCtx.close();
const vids = fs.readdirSync(path.join(out, "_video")).filter((f) => f.endsWith(".webm"));
if (vids[0]) fs.renameSync(path.join(out, "_video", vids[0]), path.join(out, "wall-demo.webm"));
fs.rmSync(path.join(out, "_video"), { recursive: true, force: true });

// ── desktop pages ──────────────────────────────────────────────────────────
const desk = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const d = await desk.newPage();
await d.goto(base + "/", { waitUntil: "networkidle" }).catch(() => {});
await sleep(3500);
await shot(d, "home.png");
await d.goto(`${base}/case/${id}`, { waitUntil: "networkidle" }).catch(() => {});
await sleep(2500);
await shot(d, "case.png");
await shot(d, "case-full.png", { fullPage: true });
await d.goto(base + "/console", { waitUntil: "networkidle" }).catch(() => {});
await sleep(2500);
await shot(d, "console.png");
await d.goto(base + "/fake/parcelfast", { waitUntil: "networkidle" }).catch(() => {});
await sleep(1500);
await shot(d, "training-page.png");
await post("/api/eval");
await d.goto(base + "/eval", { waitUntil: "networkidle" }).catch(() => {});
await sleep(7000);
await shot(d, "eval.png");
await desk.close();

// ── phone pages ────────────────────────────────────────────────────────────
const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
const p = await phone.newPage();
await p.goto(base + "/check", { waitUntil: "networkidle" }).catch(() => {});
await sleep(2000);
await shot(p, "phone-check.png");
await p.goto(`${base}/case/${id}`, { waitUntil: "networkidle" }).catch(() => {});
await sleep(2500);
await shot(p, "phone-case.png");
await p.goto(base + "/guard", { waitUntil: "networkidle" }).catch(() => {});
await sleep(2000);
await shot(p, "phone-guard.png");
await phone.close();

await browser.close();
console.log("done ->", out);
