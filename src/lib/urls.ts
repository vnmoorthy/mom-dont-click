// URL hygiene: extraction, normalisation, defanging and the SSRF guard.
import dns from "node:dns/promises";
import net from "node:net";
import { env } from "./config";

const TWO_LEVEL_TLDS = new Set([
  "co.uk", "org.uk", "gov.uk", "ac.uk", "com.au", "net.au", "org.au", "gov.au", "co.nz", "co.jp", "co.in", "co.za",
  "com.br", "com.mx", "com.cn", "com.sg", "com.hk", "com.tr", "co.kr", "com.ar", "com.co",
]);

/** Free hosting where anyone can publish under a subdomain: the subdomain is the "owner". */
export const SHARED_HOSTS = [
  "fly.dev", "vercel.app", "netlify.app", "pages.dev", "workers.dev", "web.app", "firebaseapp.com", "github.io",
  "herokuapp.com", "onrender.com", "glitch.me", "replit.app", "repl.co", "weebly.com", "wixsite.com", "blogspot.com",
  "r2.dev", "webflow.io", "square.site", "godaddysites.com", "azurewebsites.net", "appspot.com", "ngrok-free.app",
  "ngrok.app", "trycloudflare.com", "surge.sh", "framer.app", "carrd.co", "notion.site", "sites.google.com",
];

export const SHORTENERS = new Set([
  "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "buff.ly", "rebrand.ly", "cutt.ly", "shorturl.at",
  "rb.gy", "t.ly", "tiny.cc", "lnkd.in", "s.id", "qrco.de", "v.gd", "bl.ink",
]);

export const RISKY_TLDS = new Set([
  "top", "xyz", "icu", "cfd", "sbs", "click", "buzz", "rest", "cyou", "quest", "monster", "shop", "live", "vip",
  "work", "support", "help", "loan", "win", "bid", "zip", "mov", "country", "gq", "tk", "ml", "cf", "ga",
]);

export function safeParse(url: string): URL | null {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:" ? u : null;
  } catch {
    return null;
  }
}

/** "login.secure.example.co.uk" -> "example.co.uk"; shared hosts keep their subdomain. */
export function registrableDomain(host: string): string {
  const h = host.toLowerCase().replace(/\.$/, "").replace(/^www\./, "");
  if (net.isIP(h) || h === "localhost") return h;
  for (const shared of SHARED_HOSTS) {
    if (h === shared) return h;
    if (h.endsWith("." + shared)) {
      const sub = h.slice(0, -(shared.length + 1)).split(".").pop();
      return `${sub}.${shared}`;
    }
  }
  const parts = h.split(".");
  if (parts.length <= 2) return h;
  const last2 = parts.slice(-2).join(".");
  if (TWO_LEVEL_TLDS.has(last2)) return parts.slice(-3).join(".");
  return last2;
}

export function domainOf(url: string): string | undefined {
  const u = safeParse(url);
  return u ? registrableDomain(u.hostname) : undefined;
}

export function tldOf(host: string): string {
  return host.toLowerCase().split(".").pop() ?? "";
}

export function sharedHostOf(host: string): string | null {
  const h = host.toLowerCase();
  return SHARED_HOSTS.find((s) => h === s || h.endsWith("." + s)) ?? null;
}

/** hxxps://evil[.]example/path — safe to print or email. */
export function defang(url?: string | null): string {
  if (!url) return "";
  return url.replace(/^http/i, "hxxp").replace(/\./g, "[.]");
}

const URL_RE = /\bhttps?:\/\/[^\s<>"'`)\]]+/gi;
const BARE_RE = /\b(?:[a-z0-9-]+\.)+(?:com|net|org|info|top|xyz|io|co|us|app|dev|help|support|click|icu|shop|live|gov|edu|uk|ca|me|ly|invalid)(?:\/[^\s<>"'`)\]]*)?/gi;

/** All URLs in a blob of text, in order, de-duplicated. Bare domains get https://. */
export function extractUrls(text: string): string[] {
  const out: string[] = [];
  const push = (u: string) => {
    const cleaned = u.replace(/[.,;:!?>)\]]+$/, "");
    if (safeParse(cleaned) && !out.includes(cleaned)) out.push(cleaned);
  };
  for (const m of text.match(URL_RE) ?? []) push(m);
  const stripped = text.replace(URL_RE, " ").replace(/\S+@\S+/g, " ");
  for (const m of stripped.match(BARE_RE) ?? []) push("https://" + m);
  return out;
}

/** Unwrap common click-tracking wrappers so we open the real destination. */
export function unwrapRedirector(url: string): string {
  const u = safeParse(url);
  if (!u) return url;
  const h = u.hostname.toLowerCase();
  const pick = (k: string) => {
    const v = u.searchParams.get(k);
    return v && safeParse(v) ? v : null;
  };
  if (h.endsWith("safelinks.protection.outlook.com")) return pick("url") ?? url;
  if ((h === "www.google.com" || h === "google.com") && u.pathname === "/url") return pick("q") ?? pick("url") ?? url;
  if (h.endsWith("urldefense.com") || h.endsWith("urldefense.proofpoint.com")) {
    const m = url.match(/__(https?:\/\/.+?)__;/);
    if (m) return m[1];
    return pick("u") ?? url;
  }
  if (h === "l.facebook.com" || h === "lm.facebook.com") return pick("u") ?? url;
  return url;
}

export function ownHost(): string {
  return new URL(env.publicUrl).host.toLowerCase();
}

/** True for our own training pages (/fake/*) — the only place the canary walk may type. */
export function isOwnTrainingPage(url: string): boolean {
  const u = safeParse(url);
  if (!u) return false;
  const host = u.host.toLowerCase();
  const local = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
  return (host === ownHost() || (local && /^(localhost|127\.0\.0\.1)/.test(ownHost()))) && u.pathname.startsWith("/fake/");
}

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 10 || a === 127 || a === 0 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
      (a === 169 && b === 254) || (a === 100 && b >= 64 && b <= 127) || a >= 224
    );
  }
  const v6 = ip.toLowerCase();
  return v6 === "::1" || v6 === "::" || v6.startsWith("fc") || v6.startsWith("fd") || v6.startsWith("fe80") || v6.startsWith("::ffff:");
}

/** Cheap literal check, used on every sub-request the local browser makes. */
export function looksInternal(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".internal") || h.endsWith(".local")) return true;
  if (net.isIP(h)) return isPrivateIp(h);
  return false;
}

/**
 * SSRF guard for anything fetched from this machine (local browser and safe-fetch tiers).
 * Our own training pages are allowed; everything else must resolve to a public address.
 */
export async function assertPublicUrl(url: string): Promise<void> {
  const u = safeParse(url);
  if (!u) throw new Error("Not a web address");
  if (isOwnTrainingPage(url)) return;
  if (looksInternal(u.hostname)) throw new Error("That address points inside a private network");
  if (u.port && !["80", "443", "8080", "8443"].includes(u.port)) throw new Error("Unusual port");
  const addrs = await dns.lookup(u.hostname, { all: true }).catch(() => []);
  if (addrs.length === 0) throw new Error("DNS_NOT_FOUND");
  if (addrs.some((a) => isPrivateIp(a.address))) throw new Error("That address points inside a private network");
}

export function maskEmail(email?: string | null): string {
  if (!email) return "";
  const [user, host] = email.split("@");
  if (!host) return email;
  return `${user.slice(0, 2)}${"•".repeat(Math.max(2, Math.min(5, user.length - 2)))}@${host}`;
}

export function parseAddress(from?: string | null): { name?: string; email?: string } {
  if (!from) return {};
  const m = from.match(/^\s*"?([^"<]*)"?\s*<([^>]+)>\s*$/);
  if (m) return { name: m[1].trim() || undefined, email: m[2].trim().toLowerCase() };
  const e = from.match(/[^\s<>]+@[^\s<>]+/);
  return { email: e?.[0].toLowerCase() };
}
