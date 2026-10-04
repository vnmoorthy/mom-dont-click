import { timingSafeEqual } from "node:crypto";
import { consoleAllowed } from "./config";
import type { CaseRecord } from "./types";

export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: { "cache-control": "no-store" } });
}

export function fail(error: string, status = 400): Response {
  return json({ error }, status);
}

export function guardConsole(req: Request): Response | null {
  return consoleAllowed(req) ? null : fail("Console key required", 401);
}

export async function body<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    return {} as T;
  }
}

// tiny fixed-window limiter so a public URL cannot burn through API credits
const g = globalThis as unknown as { __mdcHits?: Map<string, { n: number; reset: number }> };
const hits = (g.__mdcHits ??= new Map());

export function rateLimited(req: Request, bucket: string, max: number, windowMs = 60_000): boolean {
  // Fly sets fly-client-ip itself. Elsewhere take the LAST forwarded hop (the one our own proxy added), never the first, which the caller controls.
  const forwarded = (req.headers.get("x-forwarded-for") || "").split(",").map((s) => s.trim()).filter(Boolean);
  const ip = req.headers.get("fly-client-ip") || forwarded[forwarded.length - 1] || "local";
  if (hits.size > 5000) hits.clear();
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const h = hits.get(key);
  if (!h || h.reset < now) {
    hits.set(key, { n: 1, reset: now + windowMs });
    return false;
  }
  h.n++;
  return h.n > max;
}

const cookieName = (id: string) => `mdc_c_${id.replace(/[^\w-]/g, "")}`;

/** The cookie that proves "I sent this one in". HttpOnly, one per case. */
export function ownerCookie(c: CaseRecord): string {
  return `${cookieName(c.id)}=${c.viewToken ?? ""}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`;
}

/**
 * May this request read the forwarded text and the follow-up conversation?
 * Our own example messages are public. Otherwise: the sender (cookie or emailed link), or the presenter.
 */
export function ownsCase(req: Request, c: CaseRecord): boolean {
  if (c.channel === "seed") return true;
  if (consoleAllowed(req)) return true;
  const token = c.viewToken;
  if (!token) return false;
  const fromQuery = new URL(req.url).searchParams.get("t") ?? "";
  const fromCookie = (req.headers.get("cookie") ?? "")
    .split(/;\s*/)
    .find((p) => p.startsWith(`${cookieName(c.id)}=`))
    ?.split("=")[1] ?? "";
  return [fromQuery, fromCookie].some((got) => {
    const a = Buffer.from(got);
    const b = Buffer.from(token);
    return a.length === b.length && timingSafeEqual(a, b);
  });
}

export const isEmail = (s: unknown): s is string => typeof s === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim()) && s.length < 200;
