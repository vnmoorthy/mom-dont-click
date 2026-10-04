import { describe, expect, it } from "vitest";
import { defang, extractUrls, looksInternal, registrableDomain, unwrapRedirector, isOwnTrainingPage, maskEmail, parseAddress } from "@/lib/urls";

describe("registrableDomain", () => {
  it("strips sub-names", () => {
    expect(registrableDomain("login.secure.example.com")).toBe("example.com");
    expect(registrableDomain("www.usps.com")).toBe("usps.com");
  });
  it("knows two-level endings", () => {
    expect(registrableDomain("pay.hmrc.gov.uk")).toBe("hmrc.gov.uk");
  });
  it("treats the sub-name on free hosting as the owner", () => {
    expect(registrableDomain("parcel-fix.pages.dev")).toBe("parcel-fix.pages.dev");
    expect(registrableDomain("a.b.vercel.app")).toBe("b.vercel.app");
  });
  it("sees through a brand used as decoration", () => {
    expect(registrableDomain("paypal.com.account-resolution.top")).toBe("account-resolution.top");
  });
});

describe("defang", () => {
  it("makes a link impossible to tap", () => {
    expect(defang("https://evil.example/path")).toBe("hxxps://evil[.]example/path");
  });
});

describe("extractUrls", () => {
  it("finds full and bare addresses, without trailing punctuation", () => {
    const urls = extractUrls("Pay here: https://toll-pay.top/i/7Q2K. Or visit parcel-help.info/track!");
    expect(urls).toEqual(["https://toll-pay.top/i/7Q2K", "https://parcel-help.info/track"]);
  });
  it("does not mistake an email address for a link", () => {
    expect(extractUrls("write to billing@gmail.com today")).toEqual([]);
  });
});

describe("unwrapRedirector", () => {
  it("opens the destination, not the wrapper", () => {
    expect(unwrapRedirector("https://www.google.com/url?q=https://evil.example/x&sa=D")).toBe("https://evil.example/x");
    expect(unwrapRedirector("https://nam01.safelinks.protection.outlook.com/?url=https%3A%2F%2Fevil.example%2Fy&data=1")).toBe("https://evil.example/y");
  });
});

describe("the SSRF guard's literal check", () => {
  it.each(["localhost", "127.0.0.1", "10.1.2.3", "192.168.1.1", "169.254.169.254", "172.16.0.9", "0.0.0.0", "app.internal", "[::1]", "fd00::1"])(
    "blocks %s",
    (host) => expect(looksInternal(host)).toBe(true),
  );
  it.each(["example.com", "8.8.8.8", "usps.com"])("allows %s", (host) => expect(looksInternal(host)).toBe(false));
});

describe("training pages", () => {
  it("only our own /fake/ pages qualify for the canary walk", () => {
    expect(isOwnTrainingPage("http://localhost:3000/fake/parcelfast")).toBe(true);
    expect(isOwnTrainingPage("http://localhost:3000/console")).toBe(false);
    expect(isOwnTrainingPage("https://evil.example/fake/parcelfast")).toBe(false);
  });
});

describe("privacy helpers", () => {
  it("masks addresses for shared screens", () => {
    expect(maskEmail("jane.doe@gmail.com")).toBe("ja•••••@gmail.com");
  });
  it("parses a From header", () => {
    expect(parseAddress('"Jane Doe" <Jane@Example.com>')).toEqual({ name: "Jane Doe", email: "jane@example.com" });
  });
});
