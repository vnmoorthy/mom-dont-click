import { describe, expect, it } from "vitest";
import { decideLevel, ev, languageEvidence } from "@/lib/verdict";
import type { Evidence } from "@/lib/types";

const red = (t = "red") => ev("browser", "red", t, "test");
const amber = (t = "amber") => ev("language", "amber", t, "test");
const calm = (t = "calm") => ev("search", "calm", t, "test");
const link = { hasLink: true, linkIsOfficial: false, unreachable: false };

describe("decideLevel: rules pick the level", () => {
  it("two strong tells is a scam", () => {
    expect(decideLevel([red(), red()], link)).toBe("SCAM");
  });
  it("one strong tell plus pressure is a scam", () => {
    expect(decideLevel([red(), amber()], link)).toBe("SCAM");
  });
  it("one strong tell alone is treated as a scam", () => {
    expect(decideLevel([red()], link)).toBe("TREAT_AS_SCAM");
  });
  it("a dead link is itself a finding", () => {
    expect(decideLevel([], { ...link, unreachable: true })).toBe("TREAT_AS_SCAM");
  });
  it("an unknown site plus any weak tell is treated as a scam", () => {
    expect(decideLevel([amber()], link)).toBe("TREAT_AS_SCAM");
  });
  it("the brand's own site with nothing strong against it has no red flags", () => {
    expect(decideLevel([calm(), amber()], { ...link, linkIsOfficial: true })).toBe("NO_RED_FLAGS");
  });
  it("an official link does not excuse a strong tell", () => {
    const e: Evidence[] = [calm(), red(), red()];
    expect(decideLevel(e, { ...link, linkIsOfficial: true })).toBe("SCAM");
  });
  it("nothing found on a reachable page has no red flags", () => {
    expect(decideLevel([], link)).toBe("NO_RED_FLAGS");
  });
});

describe("languageEvidence", () => {
  const base = { pressure: [], links: [] as string[] };
  it("flags gift cards and secrecy as strong tells", () => {
    const e = languageEvidence(
      { ...base, category: "family-emergency", rawText: "Grandma it's me, please dont tell mom. I need Apple gift cards today." },
      [],
    );
    expect(e.filter((x) => x.tone === "red").length).toBeGreaterThanOrEqual(2);
  });
  it("flags a surprise invoice with a phone number and no link", () => {
    const e = languageEvidence(
      { ...base, category: "tech-support", rawText: "Your Geek Squad plan renewed for $399.99. Call +1 888 555 0142 to cancel." },
      ["18885550142"],
    );
    expect(e.some((x) => x.tone === "red" && /refund scam/.test(x.title))).toBe(true);
  });
  it("stays quiet on an ordinary receipt", () => {
    const e = languageEvidence({ ...base, category: "parcel", rawText: "Your order has shipped and arrives Thursday.", links: ["https://www.amazon.com/x"] }, []);
    expect(e).toEqual([]);
  });
});
