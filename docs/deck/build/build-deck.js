/*
 * Mom, Don't Click - pitch deck generator.
 *
 *   node build-deck.js      -> deck-raw.pptx + anim-plan.json (in this folder)
 *   python3 animate.py      -> ../mom-dont-click.pptx (theme colours, transitions, animations, video autoplay)
 *
 * or simply:  ./build.sh
 *
 * pptxgenjs cannot write theme colours, transitions or animations, so this script
 * only lays the slides out and names every shape. animate.py reads anim-plan.json
 * and post-processes the package.
 */
const fs = require("fs");
const path = require("path");
const pptxgen = require("pptxgenjs");
const sharp = require("sharp");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const lu = require("react-icons/lu");
const fa = require("react-icons/fa");

const HERE = __dirname;
const MEDIA = path.resolve(HERE, "../../media");
const PUBLIC = path.resolve(HERE, "../../../public");
const ASSETS = path.join(HERE, "assets");
const OUT_RAW = path.join(HERE, "deck-raw.pptx");
const OUT_PLAN = path.join(HERE, "anim-plan.json");

// ---------------------------------------------------------------- identity
const THEME = {
  name: "Mom Dont Click",
  headFontFace: "Arial Black",
  bodyFontFace: "Arial",
  colors: {
    dk1: "17130F", // ink
    lt1: "F6F0E4", // cream
    dk2: "0D0B09", // night
    lt2: "CFC4B0", // muted cream
    accent1: "E8391C", // scam red
    accent2: "F2A417", // amber
    accent3: "5D7186", // slate
    accent4: "8F8473", // dim
    accent5: "241E19", // night-3
    accent6: "D6CAB3", // line on paper
    hlink: "E8391C",
    folHlink: "8F8473",
  },
};
// Colours the twelve theme slots cannot hold (and hex-only options such as icons).
const HEX = {
  ink: "17130F",
  cream: "F6F0E4",
  red: "E8391C",
  amber: "F2A417",
  dim: "8F8473",
  card: "FFFDF8", // card on paper
  paper2: "EDE5D4", // tinted block on paper
  inkSoft: "62574A", // secondary text on paper
  darkLine: "3A3129", // card border on night
};
const HEAD = "Arial Black";
const MONO = "Courier New";

const W = 13.333;
const MX = 0.6;
const CW = W - 2 * MX;

// ---------------------------------------------------------------- assets
function iconData(Icon, hex, size = 256) {
  const svg = ReactDOMServer.renderToStaticMarkup(React.createElement(Icon, { color: `#${hex}`, size }));
  return sharp(Buffer.from(svg))
    .png()
    .toBuffer()
    .then((b) => "image/png;base64," + b.toString("base64"));
}

async function roundedImage(src, out, { crop, width, radius }) {
  let img = sharp(src);
  if (crop) img = img.extract(crop);
  if (width) img = img.resize({ width });
  const buf = await img.png().toBuffer();
  const meta = await sharp(buf).metadata();
  const mask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${meta.width}" height="${meta.height}"><rect width="${meta.width}" height="${meta.height}" rx="${radius}" ry="${radius}" fill="#fff"/></svg>`
  );
  await sharp(buf)
    .composite([{ input: mask, blend: "dest-in" }])
    .png({ compressionLevel: 9 })
    .toFile(out);
  return { w: meta.width, h: meta.height };
}

async function prepareAssets() {
  fs.mkdirSync(ASSETS, { recursive: true });
  const A = {};
  // logo mark
  A.logo = path.join(ASSETS, "logo.png");
  await sharp(path.join(PUBLIC, "icon.svg"), { density: 600 }).resize(512, 512).png().toFile(A.logo);
  // slide 1 hero: the wall mid-run, without the wall's own header row
  A.hero = path.join(ASSETS, "hero.png");
  A.heroSize = await roundedImage(path.join(MEDIA, "wall-live.png"), A.hero, {
    crop: { left: 24, top: 96, width: 1896, height: 960 },
    radius: 37,
  });
  // slide 4 step 2: the card fields boxed in red
  A.step2 = path.join(ASSETS, "step2.png");
  A.step2Size = await roundedImage(path.join(MEDIA, "wall-live.png"), A.step2, {
    crop: { left: 130, top: 528, width: 640, height: 360 },
    radius: 30,
  });
  // slide 4 step 4: the verdict slam
  A.step4 = path.join(ASSETS, "step4.png");
  A.step4Size = await roundedImage(path.join(MEDIA, "wall-verdict.png"), A.step4, { width: 1000, radius: 48 });
  // slide 10: guardian sign-up on a phone
  A.phone = path.join(ASSETS, "phone.png");
  A.phoneSize = await roundedImage(path.join(MEDIA, "phone-guard.png"), A.phone, { crop: { left: 0, top: 0, width: 1170, height: 2444 }, radius: 96 });
  // slide 5: poster frame for the video
  const poster = await sharp(path.join(MEDIA, "wall-live.png")).resize(1280, 720).png({ compressionLevel: 9 }).toBuffer();
  A.poster = "image/png;base64," + poster.toString("base64");
  A.video = path.join(MEDIA, "wall-demo.mp4");
  if (!fs.existsSync(A.video)) throw new Error(`Missing ${A.video}. Run build.sh, which converts wall-demo.webm first.`);

  const I = {};
  const want = {
    mailCream: [lu.LuMail, HEX.cream],
    mailInk: [lu.LuMail, HEX.ink],
    forwardCream: [lu.LuForward, HEX.cream],
    bellCream: [lu.LuBell, HEX.cream],
    badge: [lu.LuBadgeCheck, HEX.cream],
    flag: [lu.LuFlag, HEX.cream],
    calendar: [lu.LuCalendarClock, HEX.cream],
    browser: [lu.LuAppWindow, HEX.cream],
    search: [lu.LuSearch, HEX.cream],
    workflow: [lu.LuWorkflow, HEX.cream],
    database: [lu.LuDatabase, HEX.cream],
    server: [lu.LuServer, HEX.cream],
    chat: [lu.LuMessagesSquare, HEX.cream],
    key: [lu.LuKeyRound, HEX.cream],
    scale: [lu.LuScale, HEX.cream],
    eye: [lu.LuEye, HEX.cream],
    unlink: [lu.LuUnlink, HEX.cream],
    eyeOff: [lu.LuEyeOff, HEX.cream],
    phone: [lu.LuSmartphone, HEX.cream],
    dashboard: [lu.LuLayoutDashboard, HEX.cream],
    users: [lu.LuUsers, HEX.cream],
    github: [fa.FaGithub, HEX.cream],
  };
  for (const [k, [Icon, hex]] of Object.entries(want)) {
    if (!Icon) throw new Error(`Icon for "${k}" not found in react-icons`);
    I[k] = await iconData(Icon, hex);
  }
  return { A, I };
}

// ---------------------------------------------------------------- deck
async function main() {
  const { A, I } = await prepareAssets();

  const pres = new pptxgen();
  pres.layout = "LAYOUT_WIDE";
  pres.title = "Mom, Don't Click";
  pres.subject = "One email address your mom forwards anything sketchy to";
  pres.author = "Mom, Don't Click";
  pres.company = "Mom, Don't Click";
  pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };

  const C = pres.SchemeColor;
  const P = {
    ink: C.text1,
    cream: C.background1,
    night: C.text2,
    muted: C.background2,
    red: C.accent1,
    amber: C.accent2,
    slate: C.accent3,
    dim: C.accent4,
    night3: C.accent5,
    line: C.accent6,
  };

  // Text box helper: zero padding, real text box.
  const T = (slide, text, o) => slide.addText(text, { margin: 0, isTextBox: true, ...o });
  const label = (slide, text, o) =>
    T(slide, text, { fontFace: MONO, bold: true, fontSize: 12, charSpacing: 3, h: 0.28, valign: "middle", ...o });

  // ---- layouts (one per slide frame)
  const footer = (textColor) => [
    { image: { path: A.logo, x: MX, y: 6.93, w: 0.26, h: 0.26 } },
    {
      text: {
        text: "MOM, DON'T CLICK",
        options: { x: MX + 0.36, y: 6.93, w: 4, h: 0.26, margin: 0, fontFace: MONO, bold: true, fontSize: 10, charSpacing: 3, color: textColor, valign: "middle" },
      },
    },
  ];
  const slideNo = (color) => ({ x: W - MX - 0.8, y: 6.93, w: 0.8, h: 0.26, margin: 0, fontFace: MONO, bold: true, fontSize: 10, color, align: "right", valign: "middle" });
  const contentTitle = (color) => ({
    placeholder: {
      options: { name: "title", type: "title", x: MX, y: 0.7, w: CW, h: 0.82, margin: 0, fontSize: 34, color, align: "left", valign: "middle" },
      text: "",
    },
  });

  pres.defineSlideMaster({
    title: "TITLE_NIGHT",
    background: { color: P.night },
    objects: [
      {
        placeholder: {
          options: { name: "title", type: "title", x: MX, y: 1.3, w: 9.6, h: 0.98, margin: 0, fontSize: 54, color: P.cream, align: "left", valign: "middle" },
          text: "",
        },
      },
    ],
  });
  pres.defineSlideMaster({
    title: "STATEMENT_NIGHT",
    background: { color: P.night },
    objects: [
      {
        placeholder: {
          options: { name: "title", type: "title", x: MX, y: 0.9, w: CW, h: 0.85, margin: 0, fontSize: 40, color: P.cream, align: "left", valign: "middle" },
          text: "",
        },
      },
    ],
  });
  pres.defineSlideMaster({
    title: "DEMO_NIGHT",
    background: { color: P.night },
    objects: [
      {
        placeholder: {
          options: { name: "title", type: "title", x: 1.47, y: 0.26, w: 6, h: 0.3, margin: 0, fontFace: MONO, bold: true, fontSize: 12, color: P.cream, align: "left", valign: "middle" },
          text: "",
        },
      },
    ],
  });
  pres.defineSlideMaster({
    title: "VERDICT_RED",
    background: { color: P.red },
    objects: [
      {
        placeholder: {
          options: { name: "title", type: "title", x: 0.44, y: 0, w: 12.4, h: 4.5, margin: 0, fontSize: 220, color: P.cream, align: "left", valign: "middle" },
          text: "",
        },
      },
    ],
  });
  pres.defineSlideMaster({
    title: "CONTENT_NIGHT",
    background: { color: P.night },
    objects: [...footer(P.dim), contentTitle(P.cream)],
    slideNumber: slideNo(P.dim),
  });
  pres.defineSlideMaster({
    title: "CONTENT_PAPER",
    background: { color: P.cream },
    objects: [...footer(HEX.inkSoft), contentTitle(P.ink)],
    slideNumber: slideNo(HEX.inkSoft),
  });

  // Inline (base64) images are the small icons: give them a plain alt text instead of "preencoded.png".
  const addSlide = pres.addSlide.bind(pres);
  pres.addSlide = (o) => {
    const s = addSlide(o);
    const addImage = s.addImage.bind(s);
    s.addImage = (opt) => addImage(opt.data && !opt.altText ? { ...opt, altText: "Icon" } : opt);
    return s;
  };

  const plan = { theme: THEME, slides: {} };

  // =============================================================== 1 TITLE
  pres.addSection({ title: "Open" });
  {
    const s = pres.addSlide({ masterName: "TITLE_NIGHT", sectionTitle: "Open" });
    s.addImage({ path: A.logo, x: MX, y: 0.5, w: 0.5, h: 0.5, objectName: "s1-logo", altText: "Mom, Don't Click logo" });
    T(s, "Mom, Don't Click", { x: 1.25, y: 0.5, w: 4, h: 0.5, fontFace: HEAD, fontSize: 16, color: P.cream, valign: "middle", objectName: "s1-wordmark" });
    s.addText("Mom, don't click.", { placeholder: "title", charSpacing: -1.5, objectName: "s1-title" });
    T(s, "We'll click it for you.", { x: MX, y: 2.24, w: 9.6, h: 0.98, fontFace: HEAD, fontSize: 54, charSpacing: -1.5, color: P.red, valign: "middle", objectName: "s1-line2" });
    T(s, "One email address your mom forwards anything sketchy to.", { x: MX, y: 3.75, w: 4.3, h: 1.3, fontSize: 20, color: P.muted, valign: "top", objectName: "s1-sub" });
    const shotW = 9.2;
    const shotH = (shotW * A.heroSize.h) / A.heroSize.w;
    s.addImage({ path: A.hero, x: 5.5, y: 3.6, w: shotW, h: shotH, objectName: "s1-shot", altText: "The wall mid-run: a throwaway browser on a fake carrier page with the card fields boxed in red" });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 5.5, y: 3.6, w: shotW, h: shotH, rectRadius: 0.18, line: { color: HEX.darkLine, width: 1 }, objectName: "s1-shot-frame" });
    label(s, [{ text: "BUILD PERSONAL AGENTS HACK", options: { breakLine: true } }, { text: "SAN FRANCISCO · 2026" }], {
      x: MX, y: 6.4, w: 4.6, h: 0.56, fontSize: 12, color: P.dim, valign: "top", objectName: "s1-footer",
    });
    s.addNotes(
      "This is Mom, Don't Click. Every family has one person who gets the text: is this real? In mine, that is me. So I gave my mom one email address. She forwards anything sketchy, and it clicks so she never does."
    );
    plan.slides[1] = {
      transition: { type: "fade" },
      steps: [
        { match: ["@title"], effect: "wipe", dur: 500, delay: 200 },
        { match: ["s1-line2"], effect: "wipe", dur: 500, delay: 150 },
        { match: ["s1-sub"], effect: "fade", dur: 400, delay: 150 },
        { match: ["s1-shot", "s1-shot-frame"], effect: "floatLeft", dur: 800, delay: 0 },
      ],
    };
  }

  // =============================================================== 2 PROBLEM
  pres.addSection({ title: "Problem" });
  {
    const s = pres.addSlide({ masterName: "CONTENT_PAPER", sectionTitle: "Problem" });
    label(s, "THE PROBLEM", { x: MX, y: 0.42, w: 6, color: HEX.inkSoft, objectName: "s2-eyebrow" });
    s.addText("You are your family's fraud desk", { placeholder: "title", charSpacing: -0.75, objectName: "s2-title" });

    // phone-style thread
    const px = MX, py = 1.85, pw = 5.4, ph = 4.6;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: px, y: py, w: pw, h: ph, rectRadius: 0.18, fill: { color: HEX.card }, line: { color: P.line, width: 1 }, objectName: "s2-thread" });
    s.addShape(pres.shapes.OVAL, { x: px + 0.3, y: py + 0.28, w: 0.52, h: 0.52, fill: { color: P.ink }, objectName: "s2-avatar" });
    T(s, "M", { x: px + 0.3, y: py + 0.28, w: 0.52, h: 0.52, fontFace: HEAD, fontSize: 16, color: P.cream, align: "center", valign: "middle", objectName: "s2-avatar-letter" });
    T(s, "Mom", { x: px + 0.98, y: py + 0.26, w: 3, h: 0.3, fontSize: 16, bold: true, color: P.ink, valign: "middle", objectName: "s2-name" });
    label(s, "TEXT MESSAGE", { x: px + 0.98, y: py + 0.57, w: 3, h: 0.26, color: HEX.inkSoft, objectName: "s2-kind" });

    s.addText("is this real?? it says my account is suspended", {
      shape: pres.shapes.ROUNDED_RECTANGLE, rectRadius: 0.24, x: px + 0.3, y: py + 1.15, w: 3.9, h: 1.0,
      fill: { color: HEX.paper2 }, margin: [16, 16, 0, 0], fontSize: 18, color: P.ink, valign: "middle", objectName: "s2-bubble-mom",
    });
    label(s, "THREE HOURS LATER", { x: px + 0.3, y: py + 2.42, w: pw - 0.6, align: "center", color: HEX.inkSoft, objectName: "s2-later" });
    s.addText([{ text: "sorry, was in meetings. " }, { text: "DON'T CLICK", options: { bold: true } }], {
      shape: pres.shapes.ROUNDED_RECTANGLE, rectRadius: 0.24, x: px + pw - 0.3 - 3.7, y: py + 2.95, w: 3.7, h: 1.0,
      fill: { color: P.ink }, margin: [16, 16, 0, 0], fontSize: 18, color: P.cream, valign: "middle", objectName: "s2-bubble-you",
    });
    label(s, "YOU", { x: px + pw - 0.3 - 3.7, y: py + 4.04, w: 3.7, h: 0.26, align: "right", color: HEX.inkSoft, objectName: "s2-you" });

    // stats
    const sx = 6.7, sw = W - MX - sx;
    T(s, "$4.88B", { x: sx, y: 1.75, w: sw, h: 1.15, fontFace: HEAD, fontSize: 72, charSpacing: -2, color: P.red, valign: "middle", objectName: "s2-stat1-num" });
    // explicit breaks: the year and the percentage never get stranded on a line of their own
    T(s, [{ text: "reported lost to fraud by Americans 60 and over", options: { breakLine: true } }, { text: "in 2024 (FBI IC3)" }], { x: sx, y: 2.92, w: sw, h: 0.75, fontSize: 18, color: P.ink, valign: "top", objectName: "s2-stat1-label" });
    T(s, "$12.5B", { x: sx, y: 3.9, w: sw, h: 1.15, fontFace: HEAD, fontSize: 72, charSpacing: -2, color: P.ink, valign: "middle", objectName: "s2-stat2-num" });
    T(s, [{ text: "reported lost to fraud by US consumers", options: { breakLine: true } }, { text: "in 2024, up 25% (FTC)" }], { x: sx, y: 5.07, w: sw, h: 0.75, fontSize: 18, color: P.ink, valign: "top", objectName: "s2-stat2-label" });
    T(s, "Sources: FBI Internet Crime Complaint Center 2024 report; FTC Consumer Sentinel 2024.", { x: sx, y: 6.15, w: sw, h: 0.3, fontSize: 10, color: HEX.inkSoft, valign: "middle", objectName: "s2-sources" });

    s.addNotes(
      "You are your family's fraud desk. Mom texts: is this real? You are in a meeting. You answer three hours later. Sometimes that is after the click. Americans over sixty reported losing 4.88 billion dollars to fraud in 2024. For all US consumers it was 12.5 billion."
    );
    plan.slides[2] = {
      transition: { type: "push", dir: "l" },
      steps: [
        { match: ["s2-bubble-mom"], effect: "rise", dur: 400, delay: 300 },
        { match: ["s2-later"], effect: "fade", dur: 400, delay: 500 },
        { match: ["s2-bubble-you", "s2-you"], effect: "rise", dur: 400, delay: 200 },
        { match: ["s2-stat1-*"], effect: "fade", dur: 500, delay: 400 },
        { match: ["s2-stat2-*"], effect: "fade", dur: 500, delay: 200 },
      ],
    };
  }

  // =============================================================== 3 INSIGHT
  {
    const s = pres.addSlide({ masterName: "STATEMENT_NIGHT", sectionTitle: "Problem" });
    s.addText("Parents won't install an app.", { placeholder: "title", charSpacing: -1, objectName: "s3-title" });
    T(s, "They already know how to forward.", { x: MX, y: 1.72, w: CW, h: 0.85, fontFace: HEAD, fontSize: 40, charSpacing: -1, color: P.red, valign: "middle", objectName: "s3-line2" });
    T(s, "So the whole product is an address. No app, no account, no setup.", { x: MX, y: 2.85, w: CW, h: 0.5, fontSize: 22, color: P.muted, valign: "middle", objectName: "s3-sub" });

    const py = 4.85, ph = 1.5;
    label(s, "THE ENTIRE ONBOARDING", { x: MX, y: py - 0.5, w: 6, h: 0.32, fontSize: 14, color: P.amber, objectName: "s3-pill-label" });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: MX, y: py, w: CW, h: ph, rectRadius: ph / 2, fill: { color: P.cream }, objectName: "s3-pill" });
    s.addShape(pres.shapes.OVAL, { x: MX + 0.3, y: py + 0.3, w: 0.9, h: 0.9, fill: { color: P.red }, objectName: "s3-pill-dot" });
    s.addImage({ data: I.mailCream, x: MX + 0.53, y: py + 0.53, w: 0.44, h: 0.44, objectName: "s3-pill-icon" });
    T(s, "momdontclick@agentmail.to", { x: MX + 1.5, y: py, w: CW - 1.9, h: ph, fontFace: MONO, bold: true, fontSize: 44, color: P.ink, valign: "middle", objectName: "s3-pill-text" });

    s.addNotes(
      "Here is the insight. Parents will not install an app. But they already know how to forward an email. So the whole product is an address. No app, no account, no setup. Give your mom this address and you are done."
    );
    plan.slides[3] = {
      transition: { type: "fade" },
      steps: [
        { match: ["@title"], effect: "wipe", dur: 500, delay: 200 },
        { match: ["s3-line2"], effect: "wipe", dur: 600, delay: 400 },
        { match: ["s3-sub"], effect: "fade", dur: 400, delay: 200 },
        { match: ["s3-pill", "s3-pill-dot", "s3-pill-icon", "s3-pill-text", "s3-pill-label"], effect: "rise", dur: 600, delay: 300 },
      ],
    };
  }

  // =============================================================== 4 HOW IT WORKS
  pres.addSection({ title: "Product" });
  {
    const s = pres.addSlide({ masterName: "CONTENT_PAPER", sectionTitle: "Product" });
    label(s, "HOW IT WORKS", { x: MX, y: 0.42, w: 6, color: HEX.inkSoft, objectName: "s4-eyebrow" });
    s.addText("Forward it. We click it. One sentence back", { placeholder: "title", charSpacing: -0.75, objectName: "s4-title" });

    const cw = 2.86, gap = (CW - 4 * 2.86) / 3, cy = 1.8, ch = 3.72, pad = 0.18;
    const vw = cw - 2 * pad, vh = (vw * 9) / 16;
    const steps = [
      { n: "1", title: "Mom forwards it", sub: "By email, by pasting a link, or as a screenshot." },
      { n: "2", title: "A throwaway browser opens the link", sub: "Far from her computer. It watches what the page asks for." },
      { n: "3", title: "The claims get checked", sub: "The official site, scam reports, the age of the address." },
      { n: "4", title: "One giant sentence", sub: "In words a 75-year-old\ncan act on." },
    ];
    steps.forEach((st, i) => {
      const x = MX + i * (cw + gap);
      const n = `s4-step${i + 1}`;
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: cy, w: cw, h: ch, rectRadius: 0.18, fill: { color: HEX.card }, line: { color: P.line, width: 1 }, objectName: `${n}-card` });
      const vx = x + pad, vy = cy + pad;
      if (i === 0) {
        s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: vx, y: vy, w: vw, h: vh, rectRadius: 0.12, fill: { color: HEX.paper2 }, objectName: `${n}-visual` });
        s.addShape(pres.shapes.OVAL, { x: vx + 0.16, y: vy + 0.17, w: 0.44, h: 0.44, fill: { color: P.ink }, objectName: `${n}-dot` });
        s.addImage({ data: I.forwardCream, x: vx + 0.27, y: vy + 0.28, w: 0.22, h: 0.22, objectName: `${n}-icon` });
        T(s, "Fwd: Your parcel is being held", { x: vx + 0.72, y: vy + 0.14, w: vw - 0.84, h: 0.5, fontSize: 12, bold: true, color: P.ink, valign: "middle", objectName: `${n}-subject` });
        s.addText("momdontclick@agentmail.to", {
          shape: pres.shapes.ROUNDED_RECTANGLE, rectRadius: 0.19, x: vx + 0.14, y: vy + vh - 0.56, w: vw - 0.28, h: 0.38,
          fill: { color: HEX.card }, line: { color: P.line, width: 0.75 }, margin: 0, fontFace: MONO, bold: true, fontSize: 10, color: P.ink, align: "center", valign: "middle", objectName: `${n}-address`,
        });
      } else if (i === 1) {
        s.addImage({ path: A.step2, x: vx, y: vy, w: vw, h: vh, objectName: `${n}-visual`, altText: "The page's card number, expiry and security code fields boxed in red" });
        s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: vx, y: vy, w: vw, h: vh, rectRadius: 0.12, line: { color: P.line, width: 1 }, objectName: `${n}-visual-frame` });
      } else if (i === 2) {
        s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: vx, y: vy, w: vw, h: vh, rectRadius: 0.12, fill: { color: P.night }, objectName: `${n}-visual` });
        const chips = [
          ["Official site", "EXA", I.badge],
          ["Scam reports", "EXA", I.flag],
          ["Age of address", "RDAP", I.calendar],
        ];
        const chH = 0.35, chGap = (vh - 0.2 - 3 * chH) / 2;
        chips.forEach(([t, src, ic], k) => {
          const yy = vy + 0.1 + k * (chH + chGap);
          s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: vx + 0.1, y: yy, w: vw - 0.2, h: chH, rectRadius: 0.08, fill: { color: P.night3 }, line: { color: HEX.darkLine, width: 0.75 }, objectName: `${n}-chip${k + 1}` });
          s.addImage({ data: ic, x: vx + 0.2, y: yy + (chH - 0.18) / 2, w: 0.18, h: 0.18, objectName: `${n}-chip${k + 1}-icon` });
          T(s, t, { x: vx + 0.46, y: yy, w: 1.4, h: chH, fontSize: 12, bold: true, color: P.cream, valign: "middle", objectName: `${n}-chip${k + 1}-text` });
          T(s, src, { x: vx + vw - 0.2 - 0.52, y: yy, w: 0.52, h: chH, fontFace: MONO, bold: true, fontSize: 12, color: P.amber, align: "right", valign: "middle", objectName: `${n}-chip${k + 1}-src` });
        });
      } else {
        s.addImage({ path: A.step4, x: vx, y: vy, w: vw, h: vh, objectName: `${n}-visual`, altText: "Full-screen red verdict: SCAM. Do not click." });
      }
      T(s, st.n, { x: x + pad, y: cy + 1.7, w: 1, h: 0.52, fontFace: HEAD, fontSize: 28, color: P.red, valign: "middle", objectName: `${n}-num` });
      T(s, st.title, { x: x + pad, y: cy + 2.24, w: vw, h: 0.6, fontSize: 16, bold: true, color: P.ink, valign: "top", objectName: `${n}-title` });
      T(s, st.sub, { x: x + pad, y: cy + 2.9, w: vw, h: 0.66, fontSize: 12, color: HEX.inkSoft, valign: "top", objectName: `${n}-sub` });
    });

    const by = 5.76, bh = 0.74;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: MX, y: by, w: CW, h: bh, rectRadius: 0.18, fill: { color: P.ink }, objectName: "s4-alert" });
    s.addShape(pres.shapes.OVAL, { x: MX + 0.2, y: by + 0.14, w: 0.46, h: 0.46, fill: { color: P.red }, objectName: "s4-alert-dot" });
    s.addImage({ data: I.bellCream, x: MX + 0.31, y: by + 0.25, w: 0.24, h: 0.24, objectName: "s4-alert-icon" });
    T(s, [
      { text: "And if it was a scam, you get:  ", options: { color: P.muted } },
      { text: "“Mom was sent a parcel scam. She did not click. Handled.”", options: { bold: true, color: P.cream } },
    ], { x: MX + 0.86, y: by, w: CW - 1.1, h: bh, fontSize: 17, valign: "middle", objectName: "s4-alert-text" });

    s.addNotes(
      "Four steps. Mom forwards it. A throwaway browser in the cloud opens the link and watches what the page asks for. In parallel, we check the claims. Then one giant sentence comes back. And if it was a scam, you get this: Mom was sent a parcel scam. She did not click. Handled."
    );
    plan.slides[4] = {
      transition: { type: "push", dir: "l" },
      steps: [
        { match: ["s4-step1-*"], effect: "rise", dur: 450, delay: 300 },
        { match: ["s4-step2-*"], effect: "rise", dur: 450, delay: 450 },
        { match: ["s4-step3-*"], effect: "rise", dur: 450, delay: 450 },
        { match: ["s4-step4-*"], effect: "rise", dur: 450, delay: 450 },
        { match: ["s4-alert", "s4-alert-*"], effect: "fade", dur: 500, delay: 600 },
      ],
    };
  }

  // =============================================================== 5 LIVE DEMO
  {
    const s = pres.addSlide({ masterName: "DEMO_NIGHT", sectionTitle: "Product" });
    const vw = 10.84, vh = (vw * 9) / 16, vx = (W - vw) / 2, vy = 0.68;
    // Order matters: pptxgenjs gives the video the shape id (its rel id + 2) = 3, so it has to be the
    // second object on the slide or it shares an id with whatever is.
    s.addShape(pres.shapes.RECTANGLE, { x: vx - 0.015, y: vy - 0.015, w: vw + 0.03, h: vh + 0.03, fill: { color: P.ink }, line: { color: HEX.darkLine, width: 1 }, objectName: "s5-video-frame" });
    s.addMedia({ type: "video", path: A.video, cover: A.poster, x: vx, y: vy, w: vw, h: vh, objectName: "s5-video" });
    s.addShape(pres.shapes.OVAL, { x: vx + 0.02, y: 0.35, w: 0.12, h: 0.12, fill: { color: P.red }, objectName: "s5-live-dot" });
    s.addText("LIVE: THE WALL", { placeholder: "title", charSpacing: 3, objectName: "s5-title" });
    T(s, "A real browser walks into the page so nobody else has to.", { x: vx, y: vy + vh + 0.1, w: vw, h: 0.42, fontSize: 16, color: P.cream, valign: "middle", objectName: "s5-caption" });
    s.addNotes(
      "This is the wall, running live. Here is what my mom forwarded this morning: your parcel is being held. She never opens it. A throwaway browser does. Watch the left. It walks into the fake carrier page and types obviously fake details, which it only does on our own training pages. Step two demands a card number. That gets boxed in red, and it stops. On the right, the evidence lands chip by chip. Then the whole screen answers."
    );
    plan.slides[5] = { transition: { type: "fade", thruBlk: true }, video: { match: "s5-video", durMs: 33000 } };
  }

  // =============================================================== 6 VERDICT
  {
    const s = pres.addSlide({ masterName: "VERDICT_RED", sectionTitle: "Product" });
    s.addImage({ data: I.mailCream, x: MX, y: 0.46, w: 0.26, h: 0.26, objectName: "s6-mail-icon" });
    T(s, [
      { text: "MOM FORWARDED:  ", options: { fontFace: MONO, bold: true, fontSize: 12, charSpacing: 3 } },
      { text: "Your parcel is being held - action required", options: { bold: true, fontSize: 16 } },
    ], { x: MX + 0.4, y: 0.42, w: 10, h: 0.34, color: P.cream, valign: "middle", objectName: "s6-forwarded" });
    s.addText("SCAM", { placeholder: "title", charSpacing: -8, objectName: "s6-title" });
    T(s, "Do not click. Carriers never ask for a card number by email.", { x: MX, y: 3.72, w: CW, h: 0.6, fontFace: HEAD, fontSize: 24, color: P.cream, valign: "middle", objectName: "s6-sentence" });

    const rw = 3.75, rgap = (CW - 3 * rw) / 2, ry = 4.8;
    ["The page asks for your password", "Step 2 asks for your card number", "No real company called ParcelFast exists"].forEach((t, i) => {
      const x = MX + i * (rw + rgap);
      label(s, `0${i + 1}`, { x, y: ry + 0.04, w: 0.4, h: 0.3, charSpacing: 1, color: P.cream, objectName: `s6-reason${i + 1}-num` });
      T(s, t, { x: x + 0.45, y: ry, w: rw - 0.45, h: 0.8, fontSize: 20, bold: true, color: P.cream, valign: "top", objectName: `s6-reason${i + 1}-text` });
    });

    const pyy = 6.42, phh = 0.44;
    label(s, "THREE ANSWERS. NEVER THE WORD SAFE.", { x: MX, y: pyy, w: 5.4, h: phh, charSpacing: 2, color: P.cream, objectName: "s6-vocab-label" });
    const pills = [
      ["SCAM", 1.15, P.ink, P.cream],
      ["TREAT AS A SCAM", 2.3, P.amber, P.ink],
      ["NO RED FLAGS FOUND", 2.7, P.slate, P.cream],
    ];
    let pxx = W - MX - (1.15 + 2.3 + 2.7 + 0.3);
    pills.forEach(([t, pw, fill, color], i) => {
      s.addText(t, {
        shape: pres.shapes.ROUNDED_RECTANGLE, rectRadius: phh / 2, x: pxx, y: pyy, w: pw, h: phh, fill: { color: fill }, margin: 0,
        fontFace: MONO, bold: true, fontSize: 12, charSpacing: 2, color, align: "center", valign: "middle", objectName: `s6-pill${i + 1}`,
      });
      pxx += pw + 0.15;
    });

    s.addNotes(
      "Scam. Do not click. Carriers never ask for a card number by email. One sentence a seventy-five-year-old can act on, plus three reasons. It only ever gives three answers: scam, treat as a scam, or no red flags found. It never says safe."
    );
    plan.slides[6] = {
      transition: { type: "cover", dir: "d", spd: "fast" },
      steps: [
        { match: ["@title"], effect: "zoom", dur: 450, delay: 250 },
        { match: ["s6-sentence"], effect: "fade", dur: 400, delay: 250 },
        { match: ["s6-reason1-*"], effect: "fade", dur: 350, delay: 250 },
        { match: ["s6-reason2-*"], effect: "fade", dur: 350, delay: 200 },
        { match: ["s6-reason3-*"], effect: "fade", dur: 350, delay: 200 },
        { match: ["s6-vocab-label", "s6-pill1", "s6-pill2", "s6-pill3"], effect: "fade", dur: 400, delay: 500 },
      ],
    };
  }

  // =============================================================== 7 UNDER THE HOOD
  pres.addSection({ title: "How it is built" });
  {
    const s = pres.addSlide({ masterName: "CONTENT_NIGHT", sectionTitle: "How it is built" });
    label(s, "UNDER THE HOOD", { x: MX, y: 0.42, w: 6, color: P.dim, objectName: "s7-eyebrow" });
    s.addText("One workflow, three branches in parallel", { placeholder: "title", charSpacing: -0.75, objectName: "s7-title" });

    const nw = 1.9, nh = 1.1, gw = 2.6, ag = 0.45;
    const x1 = (W - (4 * nw + gw + 4 * ag)) / 2, x2 = x1 + nw + ag, xg = x2 + nw + ag, x4 = xg + gw + ag, x5 = x4 + nw + ag;
    const gy = 2.45, gh = 3.14, mid = 4.14;
    const ny = mid - nh / 2;

    const node = (name, x, y, w, h, title, sub, opts = {}) => {
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
        x, y, w, h, rectRadius: 0.14, fill: { color: opts.fill || P.night3 }, line: { color: opts.line || HEX.darkLine, width: 1 }, objectName: `${name}-box`,
      });
      T(s, [
        { text: title, options: { bold: true, fontSize: 15, color: P.cream, breakLine: true } },
        { text: sub, options: { fontSize: 12, color: opts.subColor || P.muted } },
      ], { x: x + 0.15, y, w: w - 0.25, h, valign: "middle", objectName: `${name}-text` });
    };
    const tool = (name, x, w, text, y = ny + nh + 0.1) =>
      label(s, text, { x: x - 0.2, y, w: w + 0.4, h: 0.28, charSpacing: 1, align: "center", color: P.muted, objectName: `${name}-tool` });
    const arrow = (name, xa, xb) =>
      s.addShape(pres.shapes.LINE, { x: xa + 0.06, y: mid, w: xb - xa - 0.12, h: 0, line: { color: P.cream, width: 1.5, endArrowType: "triangle" }, objectName: name });

    node("s7-read", x1, ny, nw, nh, "read-message", "link, brand, pressure");
    tool("s7-read", x1, nw, "NEON AI GATEWAY");
    arrow("s7-arrow1", x1 + nw, x2);
    node("s7-recall", x2, ny, nw, nh, "recall", "seen before?");
    tool("s7-recall", x2, nw, "NEON POSTGRES");
    arrow("s7-arrow2", x2 + nw, xg);

    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: xg, y: gy, w: gw, h: gh, rectRadius: 0.2, line: { color: P.amber, width: 1.25, dashType: "dash" }, objectName: "s7-par-group" });
    label(s, "IN PARALLEL", { x: xg, y: gy + 0.08, w: gw, h: 0.26, align: "center", color: P.amber, objectName: "s7-par-label" });
    const pw = gw - 0.4, pnh = 0.8, pgap = 0.13, py0 = mid - pnh / 2 - pnh - pgap;
    node("s7-par-open", xg + 0.2, py0, pw, pnh, "open-link", "throwaway browser", { fill: P.red, line: P.red, subColor: P.cream });
    node("s7-par-claims", xg + 0.2, py0 + pnh + pgap, pw, pnh, "check-claims", "official site, scam reports");
    node("s7-par-address", xg + 0.2, py0 + 2 * (pnh + pgap), pw, pnh, "check-address", "age, lookalike tricks");
    tool("s7-par", xg, gw, "KERNEL · EXA · RDAP", gy + gh + 0.1);

    arrow("s7-arrow3", xg + gw, x4);
    node("s7-decide", x4, ny, nw, nh, "decide", "rules set the level");
    tool("s7-decide", x4, nw, "RULES + MODEL");
    arrow("s7-arrow4", x4 + nw, x5);
    node("s7-respond", x5, ny, nw, nh, "respond", "reply, alert, store");
    tool("s7-respond", x5, nw, "AGENTMAIL");

    // the "seen before" shortcut: recall -> respond, over the top
    const ax = x2 + nw / 2, bx = x5 + nw / 2, ay = 1.96, r = 0.3, k = 0.166;
    const aw = bx - ax, ah = ny - 0.08 - ay;
    s.addShape(pres.shapes.CUSTOM_GEOMETRY, {
      x: ax, y: ay, w: aw, h: ah,
      points: [
        { x: 0, y: ah, moveTo: true },
        { x: 0, y: r },
        { x: r, y: 0, curve: { type: "cubic", x1: 0, y1: r - k, x2: r - k, y2: 0 } },
        { x: aw - r, y: 0 },
        { x: aw, y: r, curve: { type: "cubic", x1: aw - r + k, y1: 0, x2: aw, y2: r - k } },
        { x: aw, y: ah },
      ],
      line: { color: P.amber, width: 1.5, dashType: "dash", endArrowType: "triangle" },
      objectName: "s7-arc",
    });
    const lw = 5.0;
    s.addText("SEEN BEFORE: ANSWERED FROM MEMORY", {
      shape: pres.shapes.ROUNDED_RECTANGLE, rectRadius: 0.18, x: ax + (aw - lw) / 2, y: ay - 0.18, w: lw, h: 0.36,
      fill: { color: P.night }, line: { color: P.amber, width: 1 }, margin: 0, fontFace: MONO, bold: true, fontSize: 12, charSpacing: 2, color: P.amber, align: "center", valign: "middle", objectName: "s7-arc-label",
    });

    T(s, [
      { text: "Rules decide the level. ", options: { color: P.cream } },
      { text: "The model only writes the sentence.", options: { color: P.muted } },
    ], { x: MX, y: 6.12, w: CW, h: 0.5, fontSize: 20, bold: true, valign: "middle", objectName: "s7-caption" });

    s.addNotes(
      "Under the hood it is one Mastra workflow. Read the message. Check memory. Then three branches in parallel: open the link, check the claims, check the address. Rules decide the level. The model only writes the sentence. Seen it before? It is answered straight from memory."
    );
    plan.slides[7] = {
      transition: { type: "fade" },
      steps: [
        { match: ["s7-read-*"], effect: "fade", dur: 300, delay: 300 },
        { match: ["s7-arrow1", "s7-recall-*"], effect: "fade", dur: 300, delay: 150 },
        { match: ["s7-arrow2", "s7-par-*"], effect: "fade", dur: 400, delay: 150 },
        { match: ["s7-arrow3", "s7-decide-*"], effect: "fade", dur: 300, delay: 250 },
        { match: ["s7-arrow4", "s7-respond-*"], effect: "fade", dur: 300, delay: 150 },
        { match: ["s7-arc", "s7-arc-label"], effect: "wipe", dur: 700, delay: 300 },
        { match: ["s7-caption"], effect: "fade", dur: 400, delay: 200 },
      ],
    };
  }

  // =============================================================== 8 STACK
  {
    const s = pres.addSlide({ masterName: "CONTENT_PAPER", sectionTitle: "How it is built" });
    label(s, "THE STACK", { x: MX, y: 0.42, w: 6, color: HEX.inkSoft, objectName: "s8-eyebrow" });
    s.addText("Remove any one tool and it stops working", { placeholder: "title", charSpacing: -0.75, objectName: "s8-title" });

    const cw = 2.86, gap = (CW - 4 * cw) / 3, ch = 2.3, y0 = 1.8;
    const tools = [
      ["AgentMail", "The forwardable address. Replies, alerts, follow-ups.", I.mailCream],
      ["Kernel", "The throwaway browser\nthat clicks so mom\nnever does.", I.browser],
      ["Exa", "Finds the brand's real site and existing scam reports.", I.search],
      ["Mastra", "The parallel workflow, with every step traced.", I.workflow],
      ["Neon", "Case memory in Postgres.\nAI Gateway for every\nmodel call.", I.database],
      ["Fly.io", "One always-on machine:\napp, inbox poller,\nlive stream.", I.server],
      ["assistant-ui", "The follow-up conversation on every case.", I.chat],
    ];
    const names = [];
    tools.forEach(([name, job, icon], i) => {
      const x = MX + (i % 4) * (cw + gap), y = y0 + Math.floor(i / 4) * (ch + gap);
      const n = `s8-card${i + 1}`;
      names.push(n);
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: cw, h: ch, rectRadius: 0.18, fill: { color: HEX.card }, line: { color: P.line, width: 1 }, objectName: `${n}-bg` });
      s.addShape(pres.shapes.OVAL, { x: x + 0.22, y: y + 0.22, w: 0.5, h: 0.5, fill: { color: P.ink }, objectName: `${n}-dot` });
      s.addImage({ data: icon, x: x + 0.35, y: y + 0.35, w: 0.24, h: 0.24, objectName: `${n}-icon` });
      T(s, name, { x: x + 0.22, y: y + 0.86, w: cw - 0.44, h: 0.4, fontFace: HEAD, fontSize: 17, color: P.ink, valign: "middle", objectName: `${n}-name` });
      T(s, job, { x: x + 0.22, y: y + 1.3, w: cw - 0.44, h: 0.85, fontSize: 14, color: HEX.inkSoft, valign: "top", objectName: `${n}-job` });
    });
    {
      const i = 7, x = MX + 3 * (cw + gap), y = y0 + ch + gap, n = "s8-card8";
      names.push(n);
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: cw, h: ch, rectRadius: 0.18, fill: { color: P.ink }, objectName: `${n}-bg` });
      s.addShape(pres.shapes.OVAL, { x: x + 0.22, y: y + 0.22, w: 0.5, h: 0.5, fill: { color: P.red }, objectName: `${n}-dot` });
      s.addImage({ data: I.key, x: x + 0.35, y: y + 0.35, w: 0.24, h: 0.24, objectName: `${n}-icon` });
      T(s, [{ text: "Runs with", options: { breakLine: true } }, { text: "zero keys" }], { x: x + 0.22, y: y + 0.84, w: cw - 0.44, h: 0.7, fontFace: HEAD, fontSize: 17, color: P.cream, valign: "top", objectName: `${n}-name` });
      T(s, "Every tier has a local fallback.", { x: x + 0.22, y: y + 1.6, w: cw - 0.44, h: 0.6, fontSize: 14, color: P.muted, valign: "top", objectName: `${n}-job` });
    }

    s.addNotes(
      "Every tool here does a real job. AgentMail is the address. Kernel is the browser. Exa finds the real site. Mastra runs the workflow. Neon is the memory. Fly keeps it on. assistant-ui answers follow-ups. Remove any one and it stops. And it still runs with zero keys."
    );
    plan.slides[8] = {
      transition: { type: "push", dir: "l" },
      steps: names.map((n, i) => ({ match: [`${n}-*`], effect: "fade", dur: 250, delay: i === 0 ? 300 : i === 7 ? 300 : 60 })),
    };
  }

  // =============================================================== 9 TRUST
  {
    const s = pres.addSlide({ masterName: "CONTENT_NIGHT", sectionTitle: "How it is built" });
    label(s, "WHY YOU CAN TRUST IT", { x: MX, y: 0.42, w: 6, color: P.dim, objectName: "s9-eyebrow" });
    s.addText("Built to fail in one direction", { placeholder: "title", charSpacing: -0.75, objectName: "s9-title" });

    const cw = 3.72, gap = 0.23, ch = 2.3, y0 = 1.8;
    const cards = [
      ["Rules decide,\nthe model writes", "A scam email cannot talk the verdict down.", I.scale],
      ["It looks. It never types.", "Fake details go into one place only: our own training pages.", I.eye],
      ["A dead link is evidence", "Hidden, blocked or taken down means treat as a scam.", I.unlink],
      ["Shared screens get less", "Only a cleaned-up subject line reaches the wall.", I.eyeOff],
    ];
    cards.forEach(([title, desc, icon], i) => {
      const x = MX + (i % 2) * (cw + gap), y = y0 + Math.floor(i / 2) * (ch + gap);
      const n = `s9-card${i + 1}`;
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: cw, h: ch, rectRadius: 0.18, fill: { color: P.ink }, line: { color: HEX.darkLine, width: 1 }, objectName: `${n}-bg` });
      s.addShape(pres.shapes.OVAL, { x: x + 0.25, y: y + 0.27, w: 0.54, h: 0.54, fill: { color: P.night3 }, line: { color: HEX.darkLine, width: 1 }, objectName: `${n}-dot` });
      s.addImage({ data: icon, x: x + 0.39, y: y + 0.41, w: 0.26, h: 0.26, objectName: `${n}-icon` });
      T(s, title, { x: x + 0.25, y: y + 0.9, w: cw - 0.5, h: 0.6, fontSize: 16, bold: true, color: P.cream, valign: "bottom", objectName: `${n}-title` });
      T(s, desc, { x: x + 0.25, y: y + 1.58, w: cw - 0.5, h: 0.6, fontSize: 14, color: P.muted, valign: "top", objectName: `${n}-desc` });
    });

    const sx = MX + 2 * cw + gap + 0.37, sw = W - MX - sx, sy = y0, sh = 2 * ch + gap;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: sx, y: sy, w: sw, h: sh, rectRadius: 0.18, fill: { color: P.cream }, objectName: "!!frame" });
    label(s, "THE HONEST SCORE", { x: sx + 0.35, y: sy + 0.62, w: sw - 0.7, color: HEX.inkSoft, objectName: "s9-stat-label" });
    T(s, [
      { text: "12", options: { fontSize: 96, color: P.ink } },
      { text: " / 12", options: { fontSize: 44, color: P.dim } },
    ], { x: sx + 0.3, y: sy + 1.07, w: sw - 0.5, h: 1.6, fontFace: HEAD, charSpacing: -2, valign: "middle", objectName: "s9-stat-num" });
    T(s, "labelled messages judged correctly (8 scams, 4 genuine)", { x: sx + 0.35, y: sy + 2.87, w: sw - 0.7, h: 0.7, fontSize: 16, bold: true, color: P.ink, valign: "top", objectName: "s9-stat-text" });
    label(s, [{ text: "A REGRESSION CHECK,", options: { breakLine: true } }, { text: "NOT A BENCHMARK" }], { x: sx + 0.35, y: sy + 3.8, w: sw - 0.7, h: 0.56, charSpacing: 2, color: HEX.inkSoft, valign: "top", objectName: "s9-stat-note" });

    s.addNotes(
      "It is built to fail in one direction. Rules decide, so a scam email cannot talk the verdict down. The browser looks. It never types. A dead link is evidence. On our labelled set it scores twelve of twelve. That is a regression check, not a benchmark."
    );
    plan.slides[9] = {
      transition: { type: "fade" },
      steps: [
        { match: ["s9-card1-*"], effect: "rise", dur: 350, delay: 300 },
        { match: ["s9-card2-*"], effect: "rise", dur: 350, delay: 200 },
        { match: ["s9-card3-*"], effect: "rise", dur: 350, delay: 200 },
        { match: ["s9-card4-*"], effect: "rise", dur: 350, delay: 200 },
        { match: ["!!frame", "s9-stat-*"], effect: "fade", dur: 500, delay: 350 },
      ],
    };
  }

  // =============================================================== 10 CLOSE
  pres.addSection({ title: "Close" });
  {
    const s = pres.addSlide({ masterName: "STATEMENT_NIGHT", sectionTitle: "Close" });
    const lw = 9.0;
    s.addText("Mom forwards.", { placeholder: "title", charSpacing: -1, objectName: "s10-title" });
    T(s, "It clicks.", { x: MX, y: 1.72, w: lw, h: 0.85, fontFace: HEAD, fontSize: 40, charSpacing: -1, color: P.cream, valign: "middle", objectName: "s10-line2" });
    T(s, "You only hear about it", { x: MX, y: 2.54, w: lw, h: 0.85, fontFace: HEAD, fontSize: 40, charSpacing: -1, color: P.red, valign: "middle", objectName: "s10-line3a" });
    T(s, "when it matters.", { x: MX, y: 3.36, w: lw, h: 0.85, fontFace: HEAD, fontSize: 40, charSpacing: -1, color: P.red, valign: "middle", objectName: "s10-line3b" });

    label(s, "WHO PAYS", { x: MX, y: 4.62, w: 1.5, color: P.amber, objectName: "s10-pays-label" });
    T(s, "The adult child, a few dollars a month per parent.", { x: MX + 1.5, y: 4.55, w: 7.4, h: 0.4, fontSize: 18, color: P.cream, valign: "middle", objectName: "s10-pays-text" });

    label(s, "NEXT", { x: MX, y: 5.39, w: 1.5, color: P.amber, objectName: "s10-next-label" });
    const chips = [
      ["A phone number for texts", 2.95, I.phone],
      ["A family dashboard", 2.45, I.dashboard],
      ["Shared memory across families", 3.5, I.users],
    ];
    {
      // two rows so the chips stay clear of the phone
      const ch = 0.46;
      let cx = MX + 1.5, cy = 5.29;
      chips.forEach(([t, w, icon], i) => {
        if (i === 2) { cx = MX + 1.5; cy += ch + 0.12; }
        const n = `s10-next${i + 1}`;
        s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: cx, y: cy, w, h: ch, rectRadius: 0.1, fill: { color: P.night3 }, line: { color: HEX.darkLine, width: 1 }, objectName: `${n}-bg` });
        s.addImage({ data: icon, x: cx + 0.14, y: cy + (ch - 0.2) / 2, w: 0.2, h: 0.2, objectName: `${n}-icon` });
        T(s, t, { x: cx + 0.44, y: cy, w: w - 0.5, h: ch, fontSize: 13, bold: true, color: P.cream, valign: "middle", objectName: `${n}-text` });
        cx += w + 0.14;
      });
    }

    const gy = 6.6;
    s.addImage({ data: I.github, x: MX, y: gy + 0.04, w: 0.3, h: 0.3, objectName: "s10-github-icon" });
    T(s, "github.com/vnmoorthy/mom-dont-click", { x: MX + 0.45, y: gy, w: 7, h: 0.38, fontFace: MONO, bold: true, fontSize: 16, color: P.cream, valign: "middle", objectName: "s10-github" });

    // phone
    const iw = 2.5, ih = (iw * A.phoneSize.h) / A.phoneSize.w, bz = 0.09;
    const bx = W - MX - iw - 2 * bz, by = (7.5 - ih - 2 * bz) / 2;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: bx, y: by, w: iw + 2 * bz, h: ih + 2 * bz, rectRadius: 0.3, fill: { color: P.night3 }, line: { color: HEX.darkLine, width: 1 }, objectName: "!!frame" });
    s.addImage({ path: A.phone, x: bx + bz, y: by + bz, w: iw, h: ih, objectName: "s10-phone-shot", altText: "The guardian sign-up on a phone: Be the first to know. Without being the help desk." });

    s.addNotes(
      "Mom forwards. It clicks. You only hear about it when it matters. The adult child pays, a few dollars a month per parent. Next: a phone number for texts, a family dashboard, and shared memory across families. The code is on GitHub. Thank you."
    );
    plan.slides[10] = {
      transition: { type: "morph" },
      steps: [
        { match: ["@title"], effect: "rise", dur: 450, delay: 500 },
        { match: ["s10-line2"], effect: "rise", dur: 450, delay: 500 },
        { match: ["s10-line3a", "s10-line3b"], effect: "rise", dur: 600, delay: 500 },
        { match: ["s10-pays-*"], effect: "fade", dur: 400, delay: 600 },
        { match: ["s10-next-label", "s10-next1-*", "s10-next2-*", "s10-next3-*"], effect: "fade", dur: 400, delay: 250 },
        { match: ["s10-github", "s10-github-icon"], effect: "fade", dur: 400, delay: 250 },
      ],
    };
  }

  await pres.writeFile({ fileName: OUT_RAW });
  fs.writeFileSync(OUT_PLAN, JSON.stringify(plan, null, 2));
  console.log(`Wrote ${OUT_RAW}`);
  console.log(`Wrote ${OUT_PLAN}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
