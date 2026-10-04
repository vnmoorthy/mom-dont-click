import { DEMO_MOM, capabilities } from "@/lib/config";
import { body, fail, guardConsole, json } from "@/lib/http";
import * as mail from "@/lib/mail";
import { startCase } from "@/lib/pipeline";
import { seedById } from "@/lib/seeds";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const denied = guardConsole(req);
  if (denied) return denied;
  const b = await body<{ seedId?: string; viaEmail?: boolean }>(req);
  const seed = seedById(String(b.seedId ?? ""));
  if (!seed) return fail("Unknown seed");

  if (b.viaEmail && capabilities().email) {
    // a real email, from the "Mom" inbox to the agent's inbox, picked up by the poller
    const [inbox, mom] = await Promise.all([mail.ensureInbox(), mail.ensureMomInbox()]);
    if (!inbox || !mom) return fail("Email is not configured", 409);
    try {
      await mail.send(inbox.email, seed.subject, { text: seed.text, html: seed.html ?? `<pre style="font:inherit;white-space:pre-wrap">${seed.text.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</pre>` }, mom.inboxId);
    } catch (err) {
      return fail(`The email could not be sent: ${((err as Error)?.message ?? "unknown error").slice(0, 120)}`, 502);
    }
    return json({ id: null, viaEmail: true });
  }
  const c = startCase({
    channel: "seed",
    subject: seed.subject,
    text: seed.text,
    html: seed.html,
    senderEmail: DEMO_MOM.email,
    senderName: DEMO_MOM.name,
    demoMom: true,
    priority: true,
  });
  return json({ id: c.id });
}
