// Background work that starts with the server: the inbox poller and a warm browser.
import { env, runtime } from "./config";
import { q } from "./db";
import { addMessage, findCaseByThread, kvGet, listMessages, markMailSeen } from "./repo";
import * as mail from "./mail";
import { probeLocalChromium, warmKernel } from "./browser";
import { startCase } from "./pipeline";
import { answerFollowUp } from "./followup";
import { parseAddress } from "./urls";
import { emit } from "./bus";
import { publicConfig } from "./config";

const g = globalThis as unknown as { __mdcBooted?: boolean };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function handleInbound(m: mail.InboundMail): Promise<void> {
  const sender = parseAddress(m.from);
  const own = runtime.inboxEmail?.toLowerCase();
  if (!sender.email || sender.email === own) return;
  if (/mailer-daemon|postmaster|no-?reply@agentmail/i.test(sender.email)) return;
  await mail.loadBody(m);

  // a reply inside a thread we already answered is a follow-up question
  const existing = await findCaseByThread(m.threadId);
  if (existing && existing.status === "done") {
    const question = m.text.split(/\n>|\nOn .* wrote:/)[0].trim().slice(0, 1200);
    if (!question) return;
    const history = await listMessages(existing.id);
    await addMessage({ caseId: existing.id, role: "user", text: question, via: "email" });
    const answer = await answerFollowUp(existing, question, history);
    await addMessage({ caseId: existing.id, role: "assistant", text: answer, via: "email" });
    await mail.reply(m.inboxId, m.messageId, mail.answerEmail(answer, existing));
    return;
  }
  if (existing) return; // still being checked; the verdict reply is on its way

  const mom = await kvGet<{ inboxId: string; email: string }>("inbox:mom");
  startCase({
    channel: "email",
    subject: m.subject,
    text: m.text,
    html: m.html,
    imageDataUrl: m.imageDataUrl,
    senderEmail: sender.email,
    senderName: sender.name,
    mail: { inboxId: m.inboxId, messageId: m.messageId, threadId: m.threadId },
    demoMom: !!mom && mom.email.toLowerCase() === sender.email,
  });
}

async function pollLoop(): Promise<void> {
  let first = true;
  for (;;) {
    try {
      const items = await mail.fetchInbound();
      for (const m of items) {
        if (!(await markMailSeen(m.messageId))) continue;
        // on the first pass, anything older than a few minutes is backlog: remember it, skip it
        if (first && m.timestamp < runtime.bootedAt - 180_000) continue;
        handleInbound(m).catch((err) => console.error("[mail] handle failed", err?.message ?? err));
      }
      runtime.lastMailError = null;
      first = false;
    } catch (err) {
      runtime.lastMailError = ((err as Error)?.message ?? String(err)).slice(0, 200);
    }
    await sleep(2500);
  }
}

/** Idempotent. Called from instrumentation and lazily from the stream route. */
export function boot(): void {
  if (g.__mdcBooted) return;
  g.__mdcBooted = true;
  runtime.bootedAt = Date.now();
  q("select 1").catch((err) => console.error("[boot] database:", err?.message ?? err));
  if (env.kernelKey) warmKernel();
  else void probeLocalChromium().then(() => emit({ type: "config", config: publicConfig() }));
  if (mail.mailConfigured()) {
    mail
      .ensureInbox()
      .then((inbox) => {
        if (inbox) console.log(`[boot] forward anything sketchy to ${inbox.email}`);
        emit({ type: "config", config: publicConfig() });
        void pollLoop();
      })
      .catch((err) => {
        runtime.lastMailError = ((err as Error)?.message ?? String(err)).slice(0, 200);
        console.error("[boot] AgentMail:", runtime.lastMailError);
      });
  }
}
