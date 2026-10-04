import { consoleAllowed } from "./config";

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
  const ip = (req.headers.get("fly-client-ip") || req.headers.get("x-forwarded-for") || "local").split(",")[0].trim();
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

export const isEmail = (s: unknown): s is string => typeof s === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim()) && s.length < 200;
