// A small built-in map of brands scammers love and their official domains.
// Exa is the primary source for "what is the real site"; this map is the
// offline fallback and a fast path for the most-impersonated names.

import { sharedHostOf } from "./urls";

export interface Brand {
  name: string;
  /** lower-case phrases that identify the brand in a message */
  match: string[];
  domains: string[];
  category?: string;
}

export const BRANDS: Brand[] = [
  { name: "USPS", match: ["usps", "u.s. postal", "us postal service", "postal service"], domains: ["usps.com"], category: "parcel" },
  { name: "UPS", match: ["ups delivery", "ups package", "united parcel"], domains: ["ups.com"], category: "parcel" },
  { name: "FedEx", match: ["fedex", "fed ex"], domains: ["fedex.com"], category: "parcel" },
  { name: "DHL", match: ["dhl"], domains: ["dhl.com"], category: "parcel" },
  { name: "FasTrak", match: ["fastrak", "fas trak", "the toll roads", "bay area toll"], domains: ["bayareafastrak.org", "thetollroads.com", "fastrak.org"], category: "toll" },
  { name: "E-ZPass", match: ["e-zpass", "ezpass", "ez pass"], domains: ["e-zpassny.com", "ezpassnj.com", "e-zpassiag.com"], category: "toll" },
  { name: "SunPass", match: ["sunpass"], domains: ["sunpass.com"], category: "toll" },
  { name: "Medicare", match: ["medicare"], domains: ["medicare.gov", "cms.gov"], category: "government" },
  { name: "Social Security", match: ["social security administration", "ssa.gov", "social security number has been"], domains: ["ssa.gov"], category: "government" },
  { name: "IRS", match: ["irs", "internal revenue"], domains: ["irs.gov"], category: "government" },
  { name: "DMV", match: ["dmv", "department of motor vehicles"], domains: ["dmv.ca.gov", "dmv.org"], category: "government" },
  { name: "PayPal", match: ["paypal"], domains: ["paypal.com"], category: "account" },
  { name: "Venmo", match: ["venmo"], domains: ["venmo.com"], category: "account" },
  { name: "Zelle", match: ["zelle"], domains: ["zellepay.com", "zelle.com"], category: "account" },
  { name: "Cash App", match: ["cash app", "cashapp"], domains: ["cash.app"], category: "account" },
  { name: "Amazon", match: ["amazon"], domains: ["amazon.com", "amazon.co.uk", "a.co"], category: "account" },
  { name: "Apple", match: ["apple id", "icloud", "apple pay", "apple support"], domains: ["apple.com", "icloud.com"], category: "account" },
  { name: "Microsoft", match: ["microsoft", "outlook account", "office 365", "windows defender"], domains: ["microsoft.com", "live.com", "office.com", "outlook.com"], category: "account" },
  { name: "Google", match: ["google account", "gmail account", "google security"], domains: ["google.com", "gmail.com"], category: "account" },
  { name: "Netflix", match: ["netflix"], domains: ["netflix.com"], category: "account" },
  { name: "Facebook", match: ["facebook", "meta business"], domains: ["facebook.com", "meta.com"], category: "account" },
  { name: "Instagram", match: ["instagram"], domains: ["instagram.com"], category: "account" },
  { name: "Coinbase", match: ["coinbase"], domains: ["coinbase.com"], category: "account" },
  { name: "Chase", match: ["chase bank", "jpmorgan chase", "chase account", "chase online"], domains: ["chase.com"], category: "bank" },
  { name: "Bank of America", match: ["bank of america", "bofa"], domains: ["bankofamerica.com"], category: "bank" },
  { name: "Wells Fargo", match: ["wells fargo"], domains: ["wellsfargo.com"], category: "bank" },
  { name: "Citi", match: ["citibank", "citi card"], domains: ["citi.com"], category: "bank" },
  { name: "Capital One", match: ["capital one"], domains: ["capitalone.com"], category: "bank" },
  { name: "Geek Squad", match: ["geek squad"], domains: ["bestbuy.com", "geeksquad.com"], category: "tech-support" },
  { name: "Norton", match: ["norton", "lifelock"], domains: ["norton.com", "lifelock.com"], category: "tech-support" },
  { name: "McAfee", match: ["mcafee"], domains: ["mcafee.com"], category: "tech-support" },
  { name: "GitHub", match: ["github"], domains: ["github.com"], category: "account" },
  { name: "Luma", match: ["luma", "lu.ma"], domains: ["lu.ma", "luma.com"], category: "account" },
  { name: "LinkedIn", match: ["linkedin"], domains: ["linkedin.com"], category: "account" },
  { name: "Walmart", match: ["walmart"], domains: ["walmart.com"], category: "account" },
  { name: "Costco", match: ["costco"], domains: ["costco.com"], category: "prize" },
  { name: "AT&T", match: ["at&t", "att wireless"], domains: ["att.com"], category: "account" },
  { name: "Verizon", match: ["verizon"], domains: ["verizon.com"], category: "account" },
  { name: "Xfinity", match: ["xfinity", "comcast"], domains: ["xfinity.com", "comcast.com"], category: "account" },
  { name: "Delta", match: ["delta air", "delta flight"], domains: ["delta.com"], category: "account" },
  { name: "United Airlines", match: ["united airlines"], domains: ["united.com"], category: "account" },
  { name: "Stripe", match: ["stripe"], domains: ["stripe.com"], category: "account" },
  { name: "DocuSign", match: ["docusign"], domains: ["docusign.com", "docusign.net"], category: "account" },
  { name: "American Express", match: ["american express", "amex"], domains: ["americanexpress.com"], category: "bank" },
  { name: "U.S. Bank", match: ["u.s. bank", "us bank"], domains: ["usbank.com"], category: "bank" },
  { name: "Fidelity", match: ["fidelity investments"], domains: ["fidelity.com"], category: "bank" },
  { name: "Robinhood", match: ["robinhood"], domains: ["robinhood.com"], category: "account" },
  { name: "eBay", match: ["ebay"], domains: ["ebay.com"], category: "account" },
  { name: "Best Buy", match: ["best buy", "bestbuy"], domains: ["bestbuy.com"], category: "account" },
  { name: "DoorDash", match: ["doordash"], domains: ["doordash.com"], category: "account" },
  { name: "Airbnb", match: ["airbnb"], domains: ["airbnb.com"], category: "account" },
  { name: "Spotify", match: ["spotify"], domains: ["spotify.com"], category: "account" },
  { name: "Dropbox", match: ["dropbox"], domains: ["dropbox.com"], category: "account" },
  { name: "WhatsApp", match: ["whatsapp"], domains: ["whatsapp.com"], category: "account" },
  { name: "YouTube", match: ["youtube"], domains: ["youtube.com", "youtu.be"], category: "account" },
  { name: "TurboTax", match: ["turbotax", "intuit"], domains: ["intuit.com", "turbotax.com"], category: "account" },
  { name: "Southwest Airlines", match: ["southwest airlines"], domains: ["southwest.com"], category: "account" },
  { name: "American Airlines", match: ["american airlines"], domains: ["aa.com"], category: "account" },
  { name: "Databricks", match: ["databricks"], domains: ["databricks.com"], category: "account" },
  { name: "CodeRabbit", match: ["coderabbit"], domains: ["coderabbit.ai"], category: "account" },
  { name: "AgentMail", match: ["agentmail"], domains: ["agentmail.to"], category: "account" },
  { name: "Mastra", match: ["mastra"], domains: ["mastra.ai"], category: "account" },
  { name: "Anthropic", match: ["anthropic"], domains: ["anthropic.com", "claude.ai", "claude.com"], category: "account" },
  { name: "OpenAI", match: ["openai", "chatgpt"], domains: ["openai.com", "chatgpt.com"], category: "account" },
  { name: "Wikipedia", match: ["wikipedia"], domains: ["wikipedia.org"], category: "other" },
  // Well-known sites whose names are ordinary words: recognised by address only, never "claimed" from text.
  { name: "Fly.io", match: [], domains: ["fly.io"], category: "account" },
  { name: "Neon", match: [], domains: ["neon.com", "neon.tech"], category: "account" },
  { name: "Exa", match: [], domains: ["exa.ai"], category: "account" },
  { name: "Kernel", match: [], domains: ["kernel.sh", "onkernel.com"], category: "account" },
  { name: "assistant-ui", match: [], domains: ["assistant-ui.com"], category: "account" },
  { name: "Andreessen Horowitz", match: [], domains: ["a16z.com"], category: "other" },
  { name: "Y Combinator", match: [], domains: ["ycombinator.com"], category: "other" },
  { name: "X", match: [], domains: ["x.com", "twitter.com"], category: "account" },
  { name: "Target", match: [], domains: ["target.com"], category: "account" },
  { name: "Discover", match: [], domains: ["discover.com"], category: "bank" },
  { name: "Zoom", match: [], domains: ["zoom.us", "zoom.com"], category: "account" },
  { name: "Slack", match: [], domains: ["slack.com"], category: "account" },
  { name: "Notion", match: [], domains: ["notion.so", "notion.com"], category: "account" },
  { name: "Figma", match: [], domains: ["figma.com"], category: "account" },
  { name: "Vercel", match: [], domains: ["vercel.com"], category: "account" },
  { name: "Uber", match: [], domains: ["uber.com"], category: "account" },
  { name: "Lyft", match: [], domains: ["lyft.com"], category: "account" },
  { name: "Schwab", match: [], domains: ["schwab.com"], category: "bank" },
  // Fictional brands used by our own training pages. No official site exists, by design.
  { name: "ParcelFast", match: ["parcelfast", "parcel fast"], domains: [], category: "parcel" },
  { name: "Northbank", match: ["northbank", "north bank online"], domains: [], category: "bank" },
];

export function findBrand(text: string): Brand | null {
  const t = text.toLowerCase();
  let best: { b: Brand; at: number } | null = null;
  for (const b of BRANDS) {
    for (const m of b.match) {
      const re = new RegExp(`(^|[^a-z0-9])${m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`, "i");
      const idx = t.search(re);
      if (idx >= 0 && (!best || idx < best.at)) best = { b, at: idx };
    }
  }
  return best?.b ?? null;
}

export function brandByName(name?: string | null): Brand | null {
  if (!name) return null;
  const n = name.toLowerCase().trim();
  return BRANDS.find((b) => b.name.toLowerCase() === n || b.match.includes(n)) ?? findBrand(name);
}

/** Does this registrable domain belong to the brand? */
export function isOfficialDomain(brand: Brand | null, domain?: string): boolean {
  if (!brand || !domain) return false;
  if (sharedHostOf(domain)) return false; // sites.google.com/whoever is whoever's page, not Google's
  return brand.domains.some((d) => domain === d || domain.endsWith("." + d));
}

/** Any well-known brand's own domain (used when a message claims no brand at all). */
export function knownGoodDomain(domain?: string): Brand | null {
  if (!domain) return null;
  if (sharedHostOf(domain)) return null;
  return BRANDS.find((b) => b.domains.some((d) => domain === d || domain.endsWith("." + d))) ?? null;
}
