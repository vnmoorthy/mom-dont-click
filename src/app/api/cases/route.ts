import { boot } from "@/lib/boot";
import { body, fail, isEmail, json, ownerCookie, rateLimited } from "@/lib/http";
import type { CaseRecord } from "@/lib/types";

/** `{ id }`, plus the cookie that lets this browser read back what it sent. */
function created(c: CaseRecord): Response {
  const res = json({ id: c.id });
  res.headers.append("set-cookie", ownerCookie(c));
  return res;
}
import { startCase } from "@/lib/pipeline";
import { listCases, publicCase } from "@/lib/repo";
import { seedById } from "@/lib/seeds";
import { extractUrls, safeParse } from "@/lib/urls";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const limit = Math.min(200, Math.max(1, Number(new URL(req.url).searchParams.get("limit")) || 60));
  const cases = await listCases(limit);
  return json({ cases: cases.map(publicCase) });
}

interface CreateBody {
  kind?: "link" | "text" | "image" | "seed";
  url?: string;
  text?: string;
  imageDataUrl?: string;
  seedId?: string;
  notifyEmail?: string;
}

export async function POST(req: Request) {
  boot();
  if (rateLimited(req, "cases", 120)) return fail("That is a lot of checks at once. Give it a minute and try again.", 429);
  const b = await body<CreateBody>(req);
  const notifyEmail = isEmail(b.notifyEmail) ? b.notifyEmail.trim() : undefined;

  if (b.kind === "seed") {
    const seed = seedById(String(b.seedId ?? ""));
    if (!seed) return fail("Unknown example");
    const c = startCase({ channel: "seed", subject: seed.subject, text: seed.text, html: seed.html, senderName: "Mom", notifyEmail });
    return created(c);
  }
  if (b.kind === "link") {
    let url = String(b.url ?? "").trim();
    if (!url) return fail("Paste a link first");
    if (!/^https?:\/\//i.test(url)) {
      // a bare address: https everywhere, except this machine in development
      url = /^(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(url) ? `http://${url}` : (extractUrls(url)[0] ?? `https://${url}`);
    }
    const parsed = safeParse(url);
    if (!parsed || !parsed.hostname.includes(".") && parsed.hostname !== "localhost") return fail("That does not look like a web address");
    if (url.length > 2000) return fail("That link is too long");
    const c = startCase({ channel: "paste", url: parsed.toString(), notifyEmail });
    return created(c);
  }
  if (b.kind === "text") {
    const text = String(b.text ?? "").trim();
    if (text.length < 8) return fail("Paste the message first");
    const c = startCase({ channel: "paste", text: text.slice(0, 12_000), notifyEmail });
    return created(c);
  }
  if (b.kind === "image") {
    const img = String(b.imageDataUrl ?? "");
    if (!/^data:image\/(jpeg|png|webp);base64,/.test(img)) return fail("Send a JPEG or PNG screenshot");
    if (img.length > 6_000_000) return fail("That screenshot is too large");
    const c = startCase({ channel: "screenshot", imageDataUrl: img, subject: "A screenshot of a message", notifyEmail });
    return created(c);
  }
  return fail("Nothing to check");
}
