// Step 2b — check the claims: who really owns this brand's website (Exa),
// has this wording been reported as a scam (Exa), and how does the address
// itself look (RDAP age, lookalike tricks, free hosting, risky endings).
import { env } from "./config";
import { type Brand, brandByName, isOfficialDomain, knownGoodDomain } from "./brands";
import { RISKY_TLDS, SHORTENERS, registrableDomain, safeParse, sharedHostOf, tldOf, isOwnTrainingPage } from "./urls";

export interface WebSource {
  title: string;
  url: string;
}

export interface Investigation {
  brand: Brand | null;
  /** official site of the claimed brand, when one could be found */
  official?: { domain: string; url: string; via: "Exa" | "built-in list" };
  /** searched and found no real company by that name */
  brandUnknown: boolean;
  /** the link's domain belongs to the claimed brand (or to a well-known brand when none is claimed) */
  linkIsOfficial: boolean;
  reports: WebSource[];
  searched: boolean;
}

interface ExaResult {
  title?: string;
  url: string;
  text?: string;
  highlights?: string[];
}

async function exaSearch(query: string, opts: { numResults?: number; text?: boolean } = {}): Promise<ExaResult[]> {
  if (!env.exaKey) return [];
  try {
    const res = await fetch("https://api.exa.ai/search", {
      method: "POST",
      signal: AbortSignal.timeout(9000),
      headers: { "content-type": "application/json", "x-api-key": env.exaKey },
      body: JSON.stringify({
        query,
        numResults: opts.numResults ?? 5,
        type: "auto",
        ...(opts.text ? { contents: { text: { maxCharacters: 500 }, highlights: { numSentences: 2, highlightsPerUrl: 1 } } } : {}),
      }),
    });
    if (!res.ok) {
      console.error("[exa]", res.status, (await res.text()).slice(0, 200));
      return [];
    }
    const data = (await res.json()) as { results?: ExaResult[] };
    return data.results ?? [];
  } catch (err) {
    console.error("[exa]", (err as Error)?.message ?? err);
    return [];
  }
}

const tokens = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").split(" ").filter((t) => t.length > 2);

export async function investigate(input: {
  claimedBrand?: string;
  category: string;
  primaryUrl?: string;
  pressure: string[];
  phones: string[];
  quiet?: boolean;
}): Promise<Investigation> {
  const brand = brandByName(input.claimedBrand);
  const linkDomain = input.primaryUrl ? registrableDomain(new URL(input.primaryUrl).hostname) : undefined;
  const out: Investigation = { brand, brandUnknown: false, linkIsOfficial: false, reports: [], searched: false };

  // 1. Who really owns the brand's website?
  if (brand && brand.domains.length) {
    out.official = { domain: brand.domains[0], url: `https://www.${brand.domains[0]}`, via: "built-in list" };
  }
  const useExa = !!env.exaKey && !input.quiet;
  const jobs: Promise<void>[] = [];
  if (useExa && input.claimedBrand && !out.official) {
    jobs.push(
      exaSearch(`${input.claimedBrand} official website`, { numResults: 5 }).then((results) => {
        out.searched = true;
        const want = tokens(input.claimedBrand!);
        const hit = results.find((r) => {
          const u = safeParse(r.url);
          if (!u) return false;
          const d = registrableDomain(u.hostname).replace(/[^a-z0-9]/g, "");
          return want.some((t) => d.includes(t)) || want.join("").includes(d.split(".")[0]);
        });
        if (hit) {
          const u = new URL(hit.url);
          out.official = { domain: registrableDomain(u.hostname), url: `${u.protocol}//${u.hostname}`, via: "Exa" };
        } else if (results.length) {
          out.brandUnknown = true;
        }
      }),
    );
  }
  // 2. Has this been reported?
  if (useExa) {
    const who = input.claimedBrand ?? "";
    const phone = input.phones[0] ? ` ${input.phones[0]}` : "";
    const topic = input.category === "other" ? "" : input.category.replace("-", " ");
    const query = `${who} ${topic} scam warning ${input.pressure[0] ?? ""}${phone}`.replace(/\s+/g, " ").trim();
    jobs.push(
      exaSearch(query, { numResults: 6, text: true }).then((results) => {
        out.searched = true;
        out.reports = results
          .filter((r) => /scam|phish|fraud|fake|smish|impersonat|warning|beware/i.test(`${r.title} ${r.text ?? ""} ${(r.highlights ?? []).join(" ")}`))
          .slice(0, 3)
          .map((r) => ({ title: (r.title ?? new URL(r.url).hostname).slice(0, 110), url: r.url }));
      }),
    );
  }
  await Promise.all(jobs);

  if (!out.official && brand && brand.domains.length === 0) out.brandUnknown = true;
  if (linkDomain) {
    if (brand && isOfficialDomain(brand, linkDomain)) out.linkIsOfficial = true;
    else if (out.official && (linkDomain === out.official.domain || linkDomain.endsWith("." + out.official.domain))) out.linkIsOfficial = true;
    else if (!input.claimedBrand) {
      // a bare link: name the well-known site it belongs to, if it is one
      const known = knownGoodDomain(linkDomain);
      if (known) {
        out.linkIsOfficial = true;
        out.brand = known;
        out.official = { domain: linkDomain, url: `https://${linkDomain}`, via: "built-in list" };
      }
    }
  }
  return out;
}

// ── the address itself ───────────────────────────────────────────────────────
export interface DomainIntel {
  domain?: string;
  ageDays?: number;
  registeredOn?: string;
  /** red: strong tells. amber: weaker tells. */
  red: string[];
  amber: string[];
  notRegistered?: boolean;
}

async function rdapAge(domain: string): Promise<{ ageDays?: number; registeredOn?: string; notRegistered?: boolean }> {
  try {
    const res = await fetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`, {
      signal: AbortSignal.timeout(4500),
      headers: { accept: "application/rdap+json" },
    });
    if (res.status === 404) return { notRegistered: true };
    if (!res.ok) return {};
    const data = (await res.json()) as { events?: { eventAction: string; eventDate: string }[] };
    const reg = data.events?.find((e) => e.eventAction === "registration")?.eventDate;
    if (!reg) return {};
    const t = Date.parse(reg);
    if (Number.isNaN(t)) return {};
    return { ageDays: Math.floor((Date.now() - t) / 86400_000), registeredOn: reg.slice(0, 10) };
  } catch {
    return {};
  }
}

export async function domainIntel(input: {
  primaryUrl?: string;
  claimedBrand?: string;
  quiet?: boolean;
}): Promise<DomainIntel> {
  const out: DomainIntel = { red: [], amber: [] };
  const u = input.primaryUrl ? safeParse(input.primaryUrl) : null;
  if (!u) return out;
  const host = u.hostname.toLowerCase();
  const domain = registrableDomain(host);
  out.domain = domain;
  const brand = brandByName(input.claimedBrand);
  const official = isOfficialDomain(brand, domain) || !!knownGoodDomain(domain);
  const own = isOwnTrainingPage(input.primaryUrl!);

  if (/^\d+\.\d+\.\d+\.\d+$/.test(host) && !own) out.red.push("The link is a bare number address, not a company's name");
  if (host.includes("xn--")) out.red.push("The address uses look-alike letters");
  if (SHORTENERS.has(host)) out.amber.push("The link is shortened, which hides where it really goes");
  if (u.protocol === "http:" && !own) out.amber.push("The page is not encrypted");
  const tld = tldOf(host);
  if (tld === "invalid" || tld === "test" || tld === "example") out.notRegistered = true;
  else if (RISKY_TLDS.has(tld)) out.amber.push(`Ends in .${tld}, an ending scammers buy in bulk`);
  const shared = sharedHostOf(host);
  if (shared && !official) out.amber.push(`Hosted on free web space (${shared}), not on a company's own site`);

  // brand name used as decoration: "paypal.com.account-fix.top" or "usps-redelivery.info"
  if (brand && !official) {
    const flat = host.replace(/[^a-z0-9]/g, "");
    const names = [brand.name.toLowerCase().replace(/[^a-z0-9]/g, ""), ...brand.domains.map((d) => d.split(".")[0])];
    if (names.some((n) => n.length > 2 && flat.includes(n))) {
      out.red.push(`Uses the name "${brand.name}" in the address but is not ${brand.name}'s site`);
    }
  }
  if ((host.match(/-/g) ?? []).length >= 3) out.amber.push("The address is stuffed with hyphens");
  if (host.split(".").length >= 5) out.amber.push("The address is buried under many sub-names");

  if (!input.quiet && !own && !shared && !official && !out.notRegistered && !/^\d/.test(host)) {
    const age = await rdapAge(domain);
    Object.assign(out, age);
    if (age.ageDays !== undefined) {
      if (age.ageDays <= 30) out.red.push(`The website was created ${age.ageDays} day${age.ageDays === 1 ? "" : "s"} ago`);
      else if (age.ageDays <= 180) out.amber.push(`The website is only ${Math.round(age.ageDays / 30)} months old`);
    }
  }
  return out;
}
