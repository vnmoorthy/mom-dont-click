// Seeded messages for the demo and the labelled eval set.
// Scam seeds only ever link to our own training pages (fictional brands) or to
// addresses under the reserved .invalid TLD, which can never resolve.
import { env } from "./config";
import type { SeedInfo, VerdictLevel } from "./types";

export interface Seed {
  id: string;
  label: string;
  from: string;
  subject: string;
  text: string;
  html?: string;
  expected: VerdictLevel;
  hasPage: boolean;
  /** shown in the console and on /check */
  demo: boolean;
}

const fwd = (from: string, subject: string, body: string) =>
  `---------- Forwarded message ---------\nFrom: ${from}\nSubject: ${subject}\n\n${body}`;

export function seeds(): Seed[] {
  const base = env.publicUrl;
  const parcel = `${base}/fake/parcelfast?t=PF-88217-US`;
  const bank = `${base}/fake/northbank`;
  return [
    {
      id: "parcel",
      label: "Parcel held, pay $1.99",
      from: "ParcelFast Delivery <notice@parcelfast-redelivery.invalid>",
      subject: "Fwd: Your parcel is being held - action required",
      text: fwd(
        "ParcelFast Delivery <notice@parcelfast-redelivery.invalid>",
        "Your parcel is being held - action required",
        `Dear Customer,\n\nYour parcel PF-88217-US could not be delivered because of an incomplete address. It is being held at our depot.\n\nTo schedule redelivery you must confirm your details and pay a $1.99 redelivery fee within 24 hours or the parcel will be returned to sender.\n\nSchedule redelivery now: ${parcel}\n\nParcelFast Delivery Team`,
      ),
      html: `<p>Dear Customer,</p><p>Your parcel <b>PF-88217-US</b> could not be delivered because of an incomplete address. It is being held at our depot.</p><p>To schedule redelivery you must confirm your details and pay a <b>$1.99 redelivery fee within 24 hours</b> or the parcel will be returned to sender.</p><p><a href="${parcel}">Schedule redelivery now</a></p><p>ParcelFast Delivery Team</p><p><a href="https://parcelfast-redelivery.invalid/unsubscribe">Unsubscribe</a></p>`,
      expected: "SCAM",
      hasPage: true,
      demo: true,
    },
    {
      id: "toll",
      label: "Unpaid toll text",
      from: "+1 (628) 555-0117",
      subject: "Fwd: FasTrak final notice",
      text: `FasTrak: Our records show an unpaid toll of $6.99 on your vehicle. To avoid a late fee of $50.00 and a report to the DMV, pay by tomorrow: https://fastrak-bayarea.pay-toll.invalid/i/7Q2K\n\n(Reply Y then exit and reopen the message to activate the link.)`,
      expected: "SCAM",
      hasPage: false,
      demo: true,
    },
    {
      id: "bank",
      label: "Bank sign-in alert",
      from: "Northbank Online Security <alerts@northbank-secure.invalid>",
      subject: "Fwd: Unusual sign-in to your account - verify now",
      text: fwd(
        "Northbank Online Security <alerts@northbank-secure.invalid>",
        "Unusual sign-in to your account - verify now",
        `We detected an unusual sign-in to your Northbank Online account from a new device.\n\nFor your protection your account has been temporarily suspended. Verify your identity immediately to restore access:\n\n${bank}\n\nIf you do not verify within 12 hours your account will be permanently locked.\n\nNorthbank Online Security`,
      ),
      expected: "SCAM",
      hasPage: true,
      demo: true,
    },
    {
      id: "techsupport",
      label: "Tech-support renewal invoice",
      from: "Billing Dept <billing.renewal.dept881@gmail.com>",
      subject: "Fwd: Invoice #GS-204418 - your subscription has been renewed",
      text: fwd(
        "Billing Dept <billing.renewal.dept881@gmail.com>",
        "Invoice #GS-204418 - your subscription has been renewed",
        `Dear Customer,\n\nThank you for renewing your Geek Squad Total Protection plan. $399.99 has been charged to your card on file and will appear on your statement within 24 hours.\n\nIf you did not authorize this charge, call our cancellation desk immediately at +1 (888) 555-0142 to request a refund. Refunds are only possible within 24 hours.\n\nInvoice: GS-204418\nPlan: Total Protection (3 years)\nAmount: $399.99`,
      ),
      expected: "SCAM",
      hasPage: false,
      demo: true,
    },
    {
      id: "medicare",
      label: "New Medicare card",
      from: "Medicare Benefits Center <cards@medicare-benefits-center.invalid>",
      subject: "Fwd: Your new Medicare card is ready - confirm to receive it",
      text: fwd(
        "Medicare Benefits Center <cards@medicare-benefits-center.invalid>",
        "Your new Medicare card is ready - confirm to receive it",
        `Medicare is issuing new plastic cards with a chip to all members. Your current card will stop working on the 30th.\n\nTo receive your new card at no cost, confirm your Medicare number and date of birth here:\nhttps://medicare-newcard.benefits-center.invalid/confirm\n\nFailure to confirm will result in suspension of your benefits.`,
      ),
      expected: "SCAM",
      hasPage: false,
      demo: true,
    },
    {
      id: "grandchild",
      label: "Grandchild in trouble",
      from: "+1 (415) 555-0199",
      subject: "Fwd: grandma please dont tell mom",
      text: `Grandma its me. I got in an accident and Im in real trouble. They are holding me and I need $2,000 for bail today. Please dont tell mom and dad, I'm so embarrassed. The lawyer says the fastest way is gift cards, can you get Apple gift cards and send me photos of the codes? Please hurry, I only get one message.`,
      expected: "SCAM",
      hasPage: false,
      demo: true,
    },
    {
      id: "genuine-order",
      label: "Genuine: order shipped",
      from: "Amazon.com <shipment-tracking@amazon.com>",
      subject: "Fwd: Your Amazon.com order has shipped",
      text: fwd(
        "Amazon.com <shipment-tracking@amazon.com>",
        "Your Amazon.com order has shipped",
        `Hello,\n\nYour package with 1 item is on the way and will arrive Thursday.\n\nTrack your package: https://www.amazon.com/gp/css/order-history\n\nThank you for shopping with us.\nAmazon.com`,
      ),
      expected: "NO_RED_FLAGS",
      hasPage: false,
      demo: true,
    },
    // ── eval-only rows below ────────────────────────────────────────────────
    {
      id: "eval-paypal",
      label: "PayPal account limited",
      from: "PayPal Support <service@paypa1-resolution.invalid>",
      subject: "Your account has been limited",
      text: `We noticed unusual activity and your PayPal account has been limited. Confirm your identity within 48 hours to avoid permanent suspension: https://paypal.com.account-resolution.invalid/login`,
      expected: "SCAM",
      hasPage: false,
      demo: false,
    },
    {
      id: "eval-prize",
      label: "You won a gift card",
      from: "Rewards Team <winner@costco-rewards.invalid>",
      subject: "Congratulations! You have been selected",
      text: `Congratulations! You have been selected to receive a $500 Costco gift card. You are today's winner. Claim your prize now before it expires at midnight: https://costco-rewards.claim-now.invalid/win`,
      expected: "SCAM",
      hasPage: false,
      demo: false,
    },
    {
      id: "eval-github",
      label: "Genuine: GitHub sign-in",
      from: "GitHub <noreply@github.com>",
      subject: "[GitHub] A new sign-in to your account",
      text: `Hey there,\n\nWe noticed a new sign-in to your GitHub account from a new device. If this was you, you can ignore this message. If not, review your sessions: https://github.com/settings/sessions\n\nThanks,\nThe GitHub Team`,
      expected: "NO_RED_FLAGS",
      hasPage: false,
      demo: false,
    },
    {
      id: "eval-luma",
      label: "Genuine: event confirmation",
      from: "Luma <no-reply@lu.ma>",
      subject: "You're going to Build Personal Agents Hack",
      text: `You're in! Your registration for Build Personal Agents Hack is confirmed. See the event page for details: https://lu.ma/build-agents`,
      expected: "NO_RED_FLAGS",
      hasPage: false,
      demo: false,
    },
    {
      id: "eval-usps",
      label: "Genuine: USPS tracking",
      from: "USPS Informed Delivery <USPSInformeddelivery@email.informeddelivery.usps.com>",
      subject: "Your Daily Digest from USPS",
      text: `Here is what is arriving in your mailbox soon. View your dashboard: https://informeddelivery.usps.com/box/pages/secure/DashboardAction_input.action`,
      expected: "NO_RED_FLAGS",
      hasPage: false,
      demo: false,
    },
  ];
}

export function seedById(id: string): Seed | undefined {
  return seeds().find((s) => s.id === id);
}

export function seedInfos(): SeedInfo[] {
  return seeds()
    .filter((s) => s.demo)
    .map((s) => ({
      id: s.id,
      label: s.label,
      subject: s.subject.replace(/^Fwd:\s*/i, ""),
      preview: s.text.replace(/-{5,}[\s\S]*?\n\n/, "").replace(/\s+/g, " ").slice(0, 150),
      from: s.from,
      expected: s.expected,
      hasPage: s.hasPage,
    }));
}

export const EVAL_IDS = [
  "parcel", "toll", "bank", "techsupport", "medicare", "grandchild", "eval-paypal", "eval-prize",
  "genuine-order", "eval-github", "eval-luma", "eval-usps",
];
