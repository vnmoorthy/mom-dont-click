// Films the real product, end to end, and builds everything needed for a narrated demo video.
//
//   node scripts/film/record.mjs [--base http://localhost:3000] [--pace 2.6]
//
// Outputs (docs/video/):
//   demo.mp4             the product film, 1920x1080, silent
//   demo-guide.mp4       the same film with a synthetic guide voice, for timing only
//   cues.json            when each line should be spoken, measured from the real recording
//   voiceover.srt        the same lines as subtitles
//   teleprompter.html    open it, press Start, read along while you record yourself
//   VOICEOVER.md         the script with timestamps
//
// The app must be running (production build recommended: `pnpm demo`). The console API is used
// to fire example emails, so run this on the same machine as the app.
import { chromium } from "playwright-core";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const BASE = arg("base", "http://localhost:3000").replace(/\/$/, "");
const PACE = Number(arg("pace", "2.6"));
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = path.join(ROOT, "docs/video");
const WORK = path.join(process.env.TMPDIR || "/tmp", "mdc-film");
const FRAMES = path.join(WORK, "frames");
const TTS = path.join(WORK, "tts");
for (const d of [OUT, WORK]) fs.mkdirSync(d, { recursive: true });
fs.rmSync(FRAMES, { recursive: true, force: true });
fs.mkdirSync(FRAMES, { recursive: true });
fs.mkdirSync(TTS, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(`[film ${new Date().toISOString().slice(11, 19)}]`, ...a);

// ── the script ─────────────────────────────────────────────────────────────
// `line` is what you read aloud. `say` is the same words spelled for the guide voice.
const SCENES = [
  { id: "open", line: "My mom texts me “is this real?” about once a week. Usually while I’m in a meeting." },
  { id: "problem", line: "Last year, Americans over sixty reported losing almost five billion dollars to fraud. And in every family, someone is the unpaid fraud desk." },
  { id: "idea", line: "So I built Mom, Don’t Click. It’s one email address. She forwards anything sketchy, and an agent clicks the link for her." },
  { id: "guard", line: "I sign up once, as her guardian. That’s the whole setup." },
  { id: "walk", line: "This morning she forwarded this: a parcel is being held, pay a dollar ninety-nine. She never opens it. A throwaway browser does, far away from her computer. It types obviously fake details, and watches what the page asks for next." },
  { id: "verdict", line: "Step two wants her card number. So the answer is one sentence she can act on. Scam. Do not click." },
  { id: "note", line: "And I get exactly one note. “Mom was sent a parcel scam. She did not click. Handled.”" },
  { id: "again", line: "When the same scam comes back, it’s answered from memory. Instantly." },
  { id: "paste", line: "Anyone can try it from their phone. Here’s the classic: “Hi Mom, new number, send money by Zelle.” There’s no link at all, and it still catches it." },
  { id: "genuine", line: "And it isn’t paranoid. A real order email gets “no red flags found,” and a nudge to use the official site. It never calls anything safe." },
  { id: "chat", line: "Every answer comes with a follow-up chat, in plain words. Could it still be real? Call them on the number you already have." },
  { id: "hood", line: "Under the hood, it’s one Mastra workflow. Read the message, check memory, then open the link, check the claims and check the address, all in parallel. Rules decide the verdict. The model only writes the sentence." },
  { id: "stack", line: "Kernel is the throwaway browser. Exa checks the claims. AgentMail is the inbox. Neon is the memory. And without the keys, every piece falls back, and it still works." },
  { id: "close", line: "Mom forwards. It clicks. You only hear about it when it matters." },
];
const LEAD = 0.35; // seconds between a scene starting and its line starting
const TAIL = 0.75; // breathing room after a line

// ── 1. a guide voice, to know how long each line takes ─────────────────────
function seconds(file) {
  return Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString().trim());
}
const voice = (() => {
  try {
    const list = execFileSync("say", ["-v", "?"]).toString();
    return ["Samantha", "Ava", "Allison", "Alex", "Daniel"].find((v) => new RegExp(`^${v}\\s`, "m").test(list)) ?? null;
  } catch {
    return null;
  }
})();
for (const s of SCENES) {
  const file = path.join(TTS, `${s.id}.aiff`);
  const words = s.line.replace(/[“”]/g, "").replace(/’/g, "'");
  execFileSync("say", [...(voice ? ["-v", voice] : []), "-r", "158", "-o", file, words]);
  s.file = file;
  s.speech = seconds(file);
  s.min = LEAD + s.speech + TAIL;
}
log(`guide voice ${voice ?? "default"}; script ${SCENES.reduce((a, s) => a + s.speech, 0).toFixed(1)}s of speech`);

// ── 2. a tiny static server for the stage page (same site as the app, so cookies work in iframes) ─
const TYPES = { ".html": "text/html", ".png": "image/png", ".svg": "image/svg+xml", ".js": "text/javascript", ".json": "application/json" };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) return res.writeHead(404).end();
  res.writeHead(200, { "content-type": TYPES[path.extname(p)] ?? "application/octet-stream" });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(3999, "127.0.0.1", r));
const STAGE = "http://localhost:3999/scripts/film/stage.html";

// ── 3. app helpers ─────────────────────────────────────────────────────────
async function api(p, body) {
  const res = await fetch(BASE + p, body === undefined ? {} : { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return res.json();
}
const getCase = async (id) => (await api(`/api/cases/${id}`)).case;
async function until(fn, ms = 40_000, every = 120) {
  const end = Date.now() + ms;
  for (;;) {
    const v = await fn().catch(() => null);
    if (v) return v;
    if (Date.now() > end) throw new Error("timed out waiting");
    await sleep(every);
  }
}

// warm up: the first case after a restart pays for a browser launch and a database wake-up
await api("/api/console/settings", { stagePace: 1 });
{
  const { id } = await api("/api/console/seed", { seedId: "parcel" });
  await until(async () => (await getCase(id)).status === "done", 90_000).catch(() => {});
}
await api("/api/console/reset?guardians=1", {});
await api("/api/console/settings", { stagePace: PACE });
log(`app ready at ${BASE}; stage pace ${PACE}`);

// ── 4. the camera ──────────────────────────────────────────────────────────
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const page = await context.newPage();
page.on("pageerror", (e) => log("page error:", e.message));
await page.goto(STAGE, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
const S = (fn, ...args) => page.evaluate(([f, a]) => window.stage[f](...a), [fn, args]);
async function frame(id) {
  const handle = await page.$(`#${id}`);
  return handle.contentFrame();
}
/** close a verdict that is still on the wall (it closes on click), without touching the grid */
async function clearWall() {
  const w = await frame("wall");
  const showing = await w.evaluate(() => /SPACE TO CONTINUE|space to continue/i.test(document.body.innerText)).catch(() => false);
  if (showing) await page.mouse.click(960, 300).catch(() => {});
}

// preload the screens so nothing loads on camera
await S("src", "wall", `${BASE}/wall`);
await S("src", "desk", `${BASE}/`);
await S("src", "phone", `${BASE}/guard`);
await sleep(4000);

const cdp = await context.newCDPSession(page);
const stamps = [];
let n = 0;
cdp.on("Page.screencastFrame", async ({ data, metadata, sessionId }) => {
  n++;
  const name = `f${String(n).padStart(6, "0")}.jpg`;
  fs.writeFileSync(path.join(FRAMES, name), Buffer.from(data, "base64"));
  stamps.push({ name, t: metadata.timestamp });
  await cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
});
await cdp.send("Page.startScreencast", { format: "jpeg", quality: 90, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
await sleep(300);

const marks = [];
async function scene(s, run) {
  const start = Date.now() / 1000;
  marks.push({ id: s.id, t: start });
  log(`scene ${s.id} (${s.min.toFixed(1)}s)`);
  const done = run ? run().catch((e) => log(`  ${s.id} action failed: ${e.message}`)) : Promise.resolve();
  await Promise.all([done, sleep(s.min * 1000)]);
}
const by = Object.fromEntries(SCENES.map((s) => [s.id, s]));
const ids = {};

// ── 5. the film ────────────────────────────────────────────────────────────
await S("card", "t1");
await S("fadeIn");
await scene(by.open);

await scene(by.problem, async () => {
  await S("card", "t2");
});

await scene(by.idea, async () => {
  await S("card", null);
  await S("layout", "desk");
  await S("caption", "01", "One email address");
  await sleep(4200);
  const d = await frame("desk");
  await d.evaluate(() => window.scrollTo({ top: 760, behavior: "smooth" }));
});

await scene(by.guard, async () => {
  await S("caption", "02", "I sign up once, as her guardian");
  await S("layout", "split");
  const p = await frame("phone");
  await sleep(900);
  await p.locator('input[type="email"]').first().pressSequentially("me@example.com", { delay: 45 });
  await sleep(300);
  await p.locator('button[type="submit"]').first().click();
  await sleep(1400);
  await p.evaluate(() => document.querySelector('[role="img"]')?.scrollIntoView({ behavior: "smooth", block: "center" }));
});

await scene(by.walk, async () => {
  await S("caption", null);
  await S("layout", "wall");
  await sleep(700);
  const { id } = await api("/api/console/seed", { seedId: "parcel" });
  ids.parcel = id;
  await until(async () => (await getCase(id)).status === "done");
});
const parcelDoneAt = Date.now();

await scene(by.verdict, async () => {
  // the wall holds a verdict for eight seconds; if the line ran long, bring it back
  if (Date.now() - parcelDoneAt > 2500) await (await frame("wall")).press("body", "r");
});

await scene(by.note, async () => {
  await S("caption", "03", "One note to me");
  await S("layout", "split");
  const p = await frame("phone");
  await p.evaluate(() => document.querySelector('[role="img"]')?.scrollIntoView({ behavior: "smooth", block: "center" }));
});

await scene(by.again, async () => {
  await S("caption", null);
  await S("layout", "wall");
  await sleep(300);
  await clearWall();
  await sleep(900);
  await api("/api/console/seed", { seedId: "parcel" });
  await S("src", "phone", `${BASE}/check`);
});

await scene(by.paste, async () => {
  await S("layout", "phone");
  await S("side", "No link needed", "“Hi Mom, new&nbsp;number…”", "Paste a message, a link or a screenshot.");
  const p = await frame("phone");
  await p.waitForLoadState("domcontentloaded");
  await p.evaluate(() => window.scrollTo(0, 0));
  await sleep(700);
  await p.getByRole("radio", { name: /whole message/i }).first().click({ timeout: 4000 }).catch(() => p.getByText(/whole message/i).first().click({ timeout: 4000 }));
  await sleep(500);
  await p.locator("textarea").first().fill("Hi Mom, this is my new number, I dropped my phone in the sink. Can you send $600 by Zelle today? I will pay you back Friday. Please don't tell Dad.");
  await sleep(1300);
  const since = Date.now() - 2000;
  await p.getByRole("button", { name: /check it for me/i }).first().click({ timeout: 5000 });
  ids.himom = await until(async () => {
    const { cases } = await api("/api/cases?limit=5");
    return cases.find((c) => c.channel === "paste" && c.createdAt > since && c.status === "done")?.id;
  }, 20_000);
  await sleep(1500);
  await p.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
});

await scene(by.genuine, async () => {
  await S("side", null);
  await S("caption", null);
  await clearWall();
  await sleep(400);
  await clearWall();
  await S("layout", "wall");
  await sleep(600);
  const { id } = await api("/api/console/seed", { seedId: "genuine-order" });
  ids.genuine = id;
  await until(async () => (await getCase(id)).status === "done", 40_000);
  await sleep(2000);
});

await scene(by.chat, async () => {
  await S("src", "desk", `${BASE}/case/${ids.parcel}`);
  await S("layout", "phone");
  await S("side", "Ask a follow-up", "Could it still be&nbsp;real?", "Plain words, from what it actually found.");
  const p = await frame("phone");
  await p.evaluate(() => {
    const el = [...document.querySelectorAll("button")].find((b) => /could it still be real/i.test(b.textContent || ""));
    el?.scrollIntoView({ behavior: "smooth", block: "end" });
  });
  await sleep(1600);
  await p.getByRole("button", { name: /could it still be real/i }).first().click();
  await sleep(2200);
  await p.evaluate(() => window.scrollBy({ top: 420, behavior: "smooth" }));
});

await scene(by.hood, async () => {
  await S("side", null);
  await S("caption", "05", "Under the hood");
  await S("layout", "desk");
  const d = await frame("desk");
  const to = (re) =>
    d.evaluate((src) => {
      const r = new RegExp(src, "i");
      const el = [...document.querySelectorAll("h2,h3")].find((h) => r.test(h.textContent || ""));
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, re);
  await sleep(1500);
  await to("what the browser saw");
  await sleep(4200);
  await to("how the agent worked");
});

await scene(by.stack, async () => {
  await S("img", "http://localhost:3999/docs/media/architecture.png");
  await S("caption", "06", "The stack");
  await S("layout", "img");
});

await scene(by.close, async () => {
  await S("caption", null);
  await S("layout", "title");
  await S("card", "tEnd");
  await sleep(500);
  await S("endLine", 1);
  await sleep(1300);
  await S("endLine", 2);
  await sleep(1300);
  await S("endLine", 3);
});
await sleep(1500);
await S("fadeOut");
await sleep(900);
const endT = Date.now() / 1000;
await cdp.send("Page.stopScreencast");
await sleep(300);
await browser.close();
server.close();
await api("/api/console/settings", { stagePace: 1 });
log(`captured ${stamps.length} frames`);

// ── 6. encode ──────────────────────────────────────────────────────────────
const t0 = stamps[0].t;
const total = endT - t0;
const list = ["ffconcat version 1.0"];
for (let i = 0; i < stamps.length; i++) {
  const next = i + 1 < stamps.length ? stamps[i + 1].t : endT;
  list.push(`file '${path.join(FRAMES, stamps[i].name)}'`, `duration ${Math.max(0.001, next - stamps[i].t).toFixed(4)}`);
}
list.push(`file '${path.join(FRAMES, stamps[stamps.length - 1].name)}'`);
fs.writeFileSync(path.join(WORK, "frames.txt"), list.join("\n"));
const video = path.join(OUT, "demo.mp4");
execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", path.join(WORK, "frames.txt"),
  "-vf", "fps=30,format=yuv420p", "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-movflags", "+faststart", "-t", total.toFixed(2), video]);
log(`wrote ${video} (${total.toFixed(1)}s)`);

// cue sheet from the measured scene starts
const cues = marks.map((m, i) => {
  const s = by[m.id];
  const start = m.t - t0 + LEAD;
  const sceneEnd = (marks[i + 1]?.t ?? endT) - t0;
  return { id: s.id, start: +start.toFixed(2), end: +Math.min(sceneEnd, start + s.speech + 0.4).toFixed(2), sceneEnd: +sceneEnd.toFixed(2), line: s.line };
});
fs.writeFileSync(path.join(OUT, "cues.json"), JSON.stringify({ duration: +total.toFixed(2), cues }, null, 2));

// guide voice mixed at the measured times
const inputs = SCENES.flatMap((s) => ["-i", s.file]);
const delays = cues.map((c, i) => `[${i}:a]adelay=${Math.round(c.start * 1000)}|${Math.round(c.start * 1000)},aformat=channel_layouts=stereo[a${i}]`);
const mix = `${delays.join(";")};${cues.map((_, i) => `[a${i}]`).join("")}amix=inputs=${cues.length}:normalize=0,apad,atrim=0:${total.toFixed(2)}[out]`;
const guideWav = path.join(WORK, "guide.wav");
execFileSync("ffmpeg", ["-v", "error", "-y", ...inputs, "-filter_complex", mix, "-map", "[out]", "-ar", "48000", guideWav]);
execFileSync("ffmpeg", ["-v", "error", "-y", "-i", video, "-i", guideWav, "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "-shortest", path.join(OUT, "demo-guide.mp4")]);
log("wrote demo-guide.mp4");

// subtitles
const ts = (x) => {
  const ms = Math.round(x * 1000);
  const h = String(Math.floor(ms / 3600000)).padStart(2, "0");
  const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, "0");
  const s = String(Math.floor((ms % 60000) / 1000)).padStart(2, "0");
  return `${h}:${m}:${s},${String(ms % 1000).padStart(3, "0")}`;
};
fs.writeFileSync(path.join(OUT, "voiceover.srt"), cues.map((c, i) => `${i + 1}\n${ts(c.start)} --> ${ts(c.end)}\n${c.line}\n`).join("\n"));

// the script, as a document
const mmss = (x) => `${Math.floor(x / 60)}:${String(Math.floor(x % 60)).padStart(2, "0")}`;
fs.writeFileSync(
  path.join(OUT, "VOICEOVER.md"),
  `# Voiceover\n\nRead these lines over \`demo.mp4\` (${mmss(total)} long). Each line starts at the time shown; finish before the next one. The easiest way is the teleprompter: open \`teleprompter.html\`, press **Start**, and read.\n\n| Starts | Line |\n| --- | --- |\n${cues.map((c) => `| ${mmss(c.start)} | ${c.line} |`).join("\n")}\n\nThen merge your recording:\n\n\`\`\`bash\nscripts/film/combine.sh ~/Desktop/me.mov\n\`\`\`\n`,
);

// the teleprompter
const tpl = fs.readFileSync(path.join(ROOT, "scripts/film/teleprompter.template.html"), "utf8");
fs.writeFileSync(path.join(OUT, "teleprompter.html"), tpl.replace("__CUES__", JSON.stringify({ duration: total, cues })));
log("wrote cues.json, voiceover.srt, VOICEOVER.md, teleprompter.html");
console.log(JSON.stringify({ ids, duration: +total.toFixed(1) }));
