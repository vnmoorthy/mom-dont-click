// AgentMail: the forwardable address. One inbox for the agent, polled every
// couple of seconds (no public webhook needed, so it works on a laptop too),
// plus an optional second inbox that plays "Mom" for seeded demo emails.
import { env, runtime } from "./config";
import { kvGet, kvSet } from "./repo";
import { defang, maskEmail } from "./urls";
import type { CaseRecord } from "./types";
import { VERDICT_LABEL } from "./types";
import { scamNoun } from "./verdict";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = any;
const g = globalThis as unknown as { __mdcMail?: Promise<Client> };

export function mailConfigured(): boolean {
  return !!env.agentmailKey;
}

async function client(): Promise<Client> {
  g.__mdcMail ??= import("agentmail").then((m) => new m.AgentMailClient({ apiKey: env.agentmailKey }));
  return g.__mdcMail;
}

interface InboxRef {
  inboxId: string;
  email: string;
}

async function createInbox(c: Client, username: string, displayName: string, clientId: string): Promise<InboxRef> {
  const attempt = async (u?: string) => {
    const inbox = await c.inboxes.create({ ...(u ? { username: u } : {}), displayName, clientId: u ? `${clientId}-${u}` : clientId });
    return { inboxId: inbox.inboxId as string, email: ((inbox.email as string) ?? (inbox.inboxId as string)) as string };
  };
  try {
    return await attempt(username);
  } catch {
    try {
      return await attempt(`${username}-${Math.random().toString(36).slice(2, 6)}`);
    } catch {
      return attempt(undefined);
    }
  }
}

/** Find or create the agent's inbox. Remembered in Postgres so the address is stable. */
export async function ensureInbox(): Promise<InboxRef | null> {
  if (!mailConfigured()) return null;
  if (runtime.inboxId && runtime.inboxEmail) return { inboxId: runtime.inboxId, email: runtime.inboxEmail };
  const c = await client();
  const key = `inbox:${env.agentmailUsername}`;
  let ref = await kvGet<InboxRef>(key);
  if (ref) {
    // make sure it still exists on this account
    const ok = await c.inboxes.get(ref.inboxId).then(() => true).catch(() => false);
    if (!ok) ref = null;
  }
  if (!ref) {
    ref = await createInbox(c, env.agentmailUsername, env.agentmailDisplayName, "mdc-agent");
    await kvSet(key, ref);
  }
  runtime.inboxId = ref.inboxId;
  runtime.inboxEmail = ref.email;
  return ref;
}

/** The inbox that plays "Mom" when a seed is sent through real email. */
export async function ensureMomInbox(): Promise<InboxRef | null> {
  if (!mailConfigured()) return null;
  const c = await client();
  let ref = await kvGet<InboxRef>("inbox:mom");
  if (ref) {
    const ok = await c.inboxes.get(ref.inboxId).then(() => true).catch(() => false);
    if (!ok) ref = null;
  }
  if (!ref) {
    ref = await createInbox(c, `demo-mom-${Math.random().toString(36).slice(2, 6)}`, "Mom", "mdc-mom");
    await kvSet("inbox:mom", ref);
  }
  runtime.momInboxId = ref.inboxId;
  return ref;
}

export interface InboundMail {
  inboxId: string;
  messageId: string;
  threadId: string;
  from: string;
  subject: string;
  text: string;
  html?: string;
  timestamp: number;
  isReply: boolean;
  imageDataUrl?: string;
}

/** New inbound messages since the last poll, oldest first, fully loaded. */
export async function fetchInbound(): Promise<InboundMail[]> {
  const inbox = await ensureInbox();
  if (!inbox) return [];
  const c = await client();
  const res = await c.inboxes.messages.list(inbox.inboxId, { limit: 25 });
  runtime.lastPollAt = Date.now();
  const items = ((res.messages ?? []) as Array<Record<string, unknown>>).filter((m) => {
    const labels = (m.labels as string[] | undefined) ?? [];
    return labels.includes("received") || (!labels.includes("sent") && !labels.includes("draft"));
  });
  const out: InboundMail[] = [];
  for (const item of items.reverse()) {
    out.push({
      inboxId: inbox.inboxId,
      messageId: item.messageId as string,
      threadId: item.threadId as string,
      from: String(item.from ?? ""),
      subject: String(item.subject ?? ""),
      text: "",
      timestamp: new Date(item.timestamp as string).getTime() || Date.now(),
      isReply: !!item.inReplyTo,
    });
  }
  return out;
}

/** Load the body (and a first image attachment, for screenshots of texts). */
export async function loadBody(m: InboundMail): Promise<InboundMail> {
  const c = await client();
  const full = await c.inboxes.messages.get(m.inboxId, m.messageId);
  m.text = String(full.text ?? full.extractedText ?? full.preview ?? "");
  m.html = full.html ? String(full.html) : undefined;
  m.isReply = m.isReply || !!full.inReplyTo;
  // the newest text of a reply, without the quoted thread, when AgentMail extracted it
  if (m.isReply && full.extractedText) m.text = String(full.extractedText);
  const image = ((full.attachments ?? []) as Array<Record<string, unknown>>).find((a) => String(a.contentType ?? "").startsWith("image/") && Number(a.size ?? 0) < 6_000_000 && Number(a.size ?? 0) > 15_000);
  if (image && m.text.replace(/\s+/g, "").length < 400) {
    try {
      const att = await c.inboxes.messages.getAttachment(m.inboxId, m.messageId, image.attachmentId);
      const bin = await fetch(att.downloadUrl, { signal: AbortSignal.timeout(10_000) });
      if (bin.ok) {
        const buf = Buffer.from(await bin.arrayBuffer());
        m.imageDataUrl = `data:${String(image.contentType)};base64,${buf.toString("base64")}`;
      }
    } catch (err) {
      console.error("[mail] attachment", (err as Error)?.message ?? err);
    }
  }
  return m;
}

export async function reply(inboxId: string, messageId: string, body: { text: string; html: string }): Promise<void> {
  const c = await client();
  await c.inboxes.messages.reply(inboxId, messageId, body);
}

export async function send(to: string, subject: string, body: { text: string; html: string }, fromInboxId?: string): Promise<void> {
  const inbox = await ensureInbox();
  if (!inbox) throw new Error("Email is not configured");
  const c = await client();
  await c.inboxes.messages.send(fromInboxId ?? inbox.inboxId, { to: [to], subject, ...body });
}

// ── what the emails look like: big type, plain words ─────────────────────────
const COLOR = { SCAM: "#e8391c", TREAT_AS_SCAM: "#f2a417", NO_RED_FLAGS: "#5d7186" } as const;
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function shell(inner: string): string {
  return `<div style="background:#f6f0e4;padding:28px 16px;font-family:Georgia,'Times New Roman',serif;color:#17130f">
  <div style="max-width:560px;margin:0 auto;background:#fffdf8;border:1px solid #d6cab3;border-radius:18px;overflow:hidden">${inner}
    <div style="padding:16px 26px;border-top:1px solid #e2d8c3;font:13px/1.5 -apple-system,Segoe UI,Arial,sans-serif;color:#62574a">
      Mom, Don't Click is an automated second opinion, not a guarantee. When in doubt, go to the official website yourself or call the number on your card.
    </div>
  </div></div>`;
}

export function verdictEmail(c: CaseRecord): { subject: string; text: string; html: string } {
  const level = c.verdict ?? "TREAT_AS_SCAM";
  const label = VERDICT_LABEL[level];
  const caseUrl = `${env.publicUrl}/case/${c.id}`;
  const reasons = c.reasons.slice(0, 3);
  const text = [
    c.headline ?? label,
    "",
    "Why:",
    ...reasons.map((r, i) => `${i + 1}. ${r}`),
    "",
    c.advice ? `What to do instead: ${c.advice}` : "",
    c.officialUrl ? `Official site: ${c.officialUrl}` : "",
    c.primaryUrl ? `The link we opened for you (do not click): ${defang(c.primaryUrl)}` : "",
    "",
    `See what we found: ${caseUrl}`,
    "You can reply to this email with a question.",
  ].filter((l) => l !== "").join("\n");
  const html = shell(`
    <div style="background:${COLOR[level]};color:${level === "TREAT_AS_SCAM" ? "#17130f" : "#fffdf8"};padding:14px 26px;font:800 15px/1 -apple-system,Segoe UI,Arial,sans-serif;letter-spacing:.08em">${label}</div>
    <div style="padding:26px">
      <div style="font:700 30px/1.2 Georgia,serif">${esc(c.headline ?? label)}</div>
      <div style="margin-top:22px;font:700 13px/1 -apple-system,Segoe UI,Arial,sans-serif;letter-spacing:.08em;color:#62574a">WHY</div>
      <ol style="margin:10px 0 0;padding-left:24px;font:20px/1.45 Georgia,serif">${reasons.map((r) => `<li style="margin-bottom:8px">${esc(r)}</li>`).join("")}</ol>
      ${c.advice ? `<div style="margin-top:20px;padding:16px 18px;background:#f6f0e4;border-radius:12px;font:19px/1.45 Georgia,serif"><b>What to do instead.</b> ${esc(c.advice)}</div>` : ""}
      ${c.officialUrl ? `<div style="margin-top:14px;font:17px/1.4 Georgia,serif">The official site is <a href="${esc(c.officialUrl)}" style="color:#3c4c5c">${esc(c.officialUrl.replace(/^https?:\/\//, ""))}</a></div>` : ""}
      ${c.primaryUrl ? `<div style="margin-top:18px;font:13px/1.5 ui-monospace,Menlo,monospace;color:#62574a;word-break:break-all">We opened this for you, so you do not have to: ${esc(defang(c.primaryUrl))}</div>` : ""}
      <div style="margin-top:22px;font:16px/1.4 -apple-system,Segoe UI,Arial,sans-serif"><a href="${caseUrl}" style="color:#17130f;font-weight:700">See everything we found</a> &nbsp;·&nbsp; Reply to this email with any question.</div>
    </div>`);
  return { subject: `${label}: ${c.subject}`, text, html };
}

function pronoun(name: string): string {
  const n = name.toLowerCase();
  if (/(mom|mum|mother|grandma|nana|aunt|wife)/.test(n)) return "She";
  if (/(dad|father|grandpa|uncle|husband)/.test(n)) return "He";
  return "They";
}

export function guardianLine(c: CaseRecord, parentName: string): string {
  return `${parentName} was sent ${scamNoun(c.category)}. ${pronoun(parentName)} did not click. Handled.`;
}

export function guardianEmail(c: CaseRecord, parentName: string): { subject: string; text: string; html: string } {
  const line = guardianLine(c, parentName);
  const caseUrl = `${env.publicUrl}/case/${c.id}`;
  const text = `${line}\n\nWhat it was: ${c.subject}\nOur answer to ${parentName}: ${c.headline ?? ""}\n\nNothing for you to do. Details: ${caseUrl}`;
  const html = shell(`
    <div style="background:#17130f;color:#f6f0e4;padding:14px 26px;font:800 15px/1 -apple-system,Segoe UI,Arial,sans-serif;letter-spacing:.08em">HEADS-UP</div>
    <div style="padding:26px">
      <div style="font:700 28px/1.25 Georgia,serif">${esc(line)}</div>
      <div style="margin-top:18px;font:18px/1.5 Georgia,serif"><b>What it was:</b> ${esc(c.subject)}<br><b>What we told ${esc(parentName)}:</b> ${esc(c.headline ?? "")}</div>
      <div style="margin-top:18px;font:16px/1.4 -apple-system,Segoe UI,Arial,sans-serif">Nothing for you to do. <a href="${caseUrl}" style="color:#17130f;font-weight:700">See what we found</a></div>
    </div>`);
  return { subject: `Heads-up: ${line}`, text, html };
}

export function answerEmail(answer: string, c: CaseRecord): { text: string; html: string } {
  const caseUrl = `${env.publicUrl}/case/${c.id}`;
  return {
    text: `${answer}\n\n${caseUrl}`,
    html: shell(`<div style="padding:26px"><div style="font:21px/1.5 Georgia,serif">${esc(answer).replace(/\n/g, "<br>")}</div>
      <div style="margin-top:20px;font:15px/1.4 -apple-system,Segoe UI,Arial,sans-serif"><a href="${caseUrl}" style="color:#17130f;font-weight:700">Back to what we found</a></div></div>`),
  };
}

export { maskEmail };
