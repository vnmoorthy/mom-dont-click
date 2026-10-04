// Compose the README hero image from real product screenshots.
// Usage: node scripts/hero.mjs   (run scripts/shots.mjs first)
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const media = path.resolve("docs/media");
const b64 = (f) => `data:image/png;base64,${fs.readFileSync(path.join(media, f)).toString("base64")}`;
const icon = fs.readFileSync(path.resolve("public/icon.svg"), "utf8");

const html = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,400..800&family=Instrument+Sans:wght@400;500;600&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box;margin:0}
  body{width:1600px;height:800px;overflow:hidden;background:#0d0b09;color:#f6f0e4;font-family:'Instrument Sans',sans-serif;position:relative;
    background-image:radial-gradient(900px 500px at 85% -10%, rgba(232,57,28,.22), transparent 60%),radial-gradient(700px 420px at 0% 110%, rgba(242,164,23,.08), transparent 60%),radial-gradient(rgba(246,240,228,.045) 1px, transparent 1px);background-size:auto,auto,24px 24px}
  .left{position:absolute;left:72px;top:70px;width:640px}
  .brand{display:flex;align-items:center;gap:14px;font:800 26px/1 'Bricolage Grotesque';letter-spacing:-.02em}
  .brand svg{width:44px;height:44px}
  h1{font:800 124px/.9 'Bricolage Grotesque';letter-spacing:-.05em;margin-top:64px;font-variation-settings:'wdth' 88}
  h2{font:800 58px/1 'Bricolage Grotesque';letter-spacing:-.04em;color:#e8391c;margin-top:18px;font-variation-settings:'wdth' 88}
  p{font:500 25px/1.45 'Instrument Sans';color:#cfc4b0;margin-top:34px;max-width:560px}
  .tools{position:absolute;left:72px;bottom:58px;font:500 14px/1 'JetBrains Mono';letter-spacing:.16em;color:#8f8473;text-transform:uppercase}
  .wall{position:absolute;left:760px;top:92px;width:1040px;border-radius:22px;overflow:hidden;border:1px solid rgba(246,240,228,.16);box-shadow:0 40px 120px rgba(0,0,0,.7);transform:rotate(-2.2deg)}
  .wall img{display:block;width:100%}
  .stamp{position:absolute;left:820px;top:560px;transform:rotate(-9deg);font:800 132px/1 'Bricolage Grotesque';letter-spacing:-.04em;color:#f6f0e4;background:#e8391c;padding:6px 34px 14px;border-radius:20px;box-shadow:0 24px 70px rgba(232,57,28,.45);font-variation-settings:'wdth' 85}
  .phone{position:absolute;left:1330px;top:330px;width:230px;border-radius:34px;overflow:hidden;border:7px solid #17130f;outline:1px solid rgba(246,240,228,.25);box-shadow:0 30px 80px rgba(0,0,0,.75);transform:rotate(5deg);height:470px;background:#f6f0e4}
  .phone img{display:block;width:100%}
</style></head><body>
  <div class="left">
    <div class="brand">${icon}<span>Mom, Don&rsquo;t Click</span></div>
    <h1>Mom,<br>don&rsquo;t click.</h1>
    <h2>We&rsquo;ll click it for you.</h2>
    <p>One email address your mom forwards anything sketchy to. An agent opens the link in a throwaway browser and answers in one giant plain sentence.</p>
  </div>
  <div class="tools">AgentMail · Kernel · Exa · Mastra · Neon · Fly.io · assistant-ui</div>
  <div class="wall"><img src="${b64("wall-live.png")}"></div>
  <div class="phone"><img src="${b64("phone-case.png")}"></div>
  <div class="stamp">SCAM</div>
</body></html>`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 800 }, deviceScaleFactor: 2 });
await page.setContent(html, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(600);
await page.screenshot({ path: path.join(media, "hero.png") });
// GitHub social preview: 1280x640
const social = await browser.newPage({ viewport: { width: 1600, height: 800 }, deviceScaleFactor: 0.8 });
await social.setContent(html, { waitUntil: "networkidle" });
await social.evaluate(() => document.fonts.ready);
await social.waitForTimeout(600);
await social.screenshot({ path: path.join(media, "social-preview.png") });
await browser.close();
console.log("hero.png + social-preview.png written");
