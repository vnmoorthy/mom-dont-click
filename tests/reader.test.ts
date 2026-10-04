import { describe, expect, it } from "vitest";
import { fingerprints, readMessage, sanitise } from "@/lib/reader";
import { findBrand, isOfficialDomain, knownGoodDomain } from "@/lib/brands";
import { seeds } from "@/lib/seeds";

describe("sanitise: what reaches a shared screen", () => {
  it("removes emails, phone numbers and tracking codes", () => {
    const s = sanitise("Dear Jane Doe, parcel PF-88217-US for jane@x.com, call 415-555-0199");
    expect(s).not.toMatch(/jane@x\.com|88217|555-0199|Jane Doe/);
  });
});

describe("readMessage (rules only, no model configured)", () => {
  it("finds the link the sender wants clicked, not the unsubscribe link", async () => {
    const parcel = seeds().find((s) => s.id === "parcel")!;
    const r = await readMessage({ subject: parcel.subject, text: parcel.text, html: parcel.html });
    expect(r.primaryUrl).toMatch(/\/fake\/parcelfast/);
    expect(r.claimedBrand).toBe("ParcelFast");
    expect(r.category).toBe("parcel");
    expect(r.pressure.length).toBeGreaterThan(0);
    expect(r.subject).toBe("Your parcel is being held - action required");
  });
  it("uses the forwarded Subject line of a pasted message", async () => {
    const r = await readMessage({
      text: "---------- Forwarded message ---------\nFrom: Chase <a@chase-verify.top>\nSubject: Your Chase account is locked\n\nVerify within 24 hours: https://chase-verify.top/login",
    });
    expect(r.subject).toBe("Your Chase account is locked");
    expect(r.claimedBrand).toBe("Chase");
  });
  it("handles a message with no link at all", async () => {
    const g = seeds().find((s) => s.id === "grandchild")!;
    const r = await readMessage({ subject: g.subject, text: g.text });
    expect(r.primaryUrl).toBeUndefined();
    expect(r.category).toBe("family-emergency");
  });
});

describe("decoy links", () => {
  it("opens the unknown link even when a well-known one comes first", async () => {
    const r = await readMessage({
      text: "PayPal: confirm your account at https://www.paypal.com/signin or use the secure portal https://paypal-resolve.top/login",
    });
    expect(r.primaryUrl).toBe("https://paypal-resolve.top/login");
  });
  it("keeps a well-known link when it is the only one", async () => {
    const r = await readMessage({ text: "Track your package: https://www.amazon.com/gp/css/order-history" });
    expect(r.primaryUrl).toBe("https://www.amazon.com/gp/css/order-history");
  });
});

describe("fingerprints: seen before", () => {
  it("keys an address by who the message claims to be, so one bad message cannot poison a site", () => {
    const scam = fingerprints({ primaryUrl: "https://acme.example/login", phones: [], text: "x", claimedBrand: "PayPal" });
    const genuine = fingerprints({ primaryUrl: "https://acme.example/login", phones: [], text: "y", claimedBrand: "Acme" });
    expect(scam[0]).not.toBe(genuine[0]);
  });
  it("is stable for the same address and differs across addresses", () => {
    const a = fingerprints({ primaryUrl: "https://toll-pay.top/i/1", phones: [], text: "x" });
    const b = fingerprints({ primaryUrl: "https://toll-pay.top/i/2", phones: [], text: "y" });
    const c = fingerprints({ primaryUrl: "https://other.top/i/1", phones: [], text: "x" });
    expect(a[0]).toBe(b[0]);
    expect(a[0]).not.toBe(c[0]);
  });
  it("falls back to the phone number when there is no link", () => {
    expect(fingerprints({ phones: ["18885550142"], text: "call us" })[0]).toBe("p:18885550142");
  });
});

describe("brands", () => {
  it("recognises a claimed brand and its own domains", () => {
    const b = findBrand("USPS: your package could not be delivered");
    expect(b?.name).toBe("USPS");
    expect(isOfficialDomain(b!, "usps.com")).toBe(true);
    expect(isOfficialDomain(b!, "usps-redelivery.info")).toBe(false);
  });
  it("never 'claims' a brand whose name is an ordinary word", () => {
    expect(findBrand("we will fly to the target and zoom in")).toBeNull();
    expect(knownGoodDomain("fly.io")?.name).toBe("Fly.io");
  });
});
