import { answerFollowUp } from "@/lib/followup";
import { body, fail, json, ownsCase, rateLimited } from "@/lib/http";
import { addMessage, getCase, listMessages } from "@/lib/repo";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (rateLimited(req, "chat", 30)) return fail("Slow down a little and ask again in a minute.", 429);
  const { id } = await ctx.params;
  const c = await getCase(id);
  if (!c) return fail("We could not find that case", 404);
  if (!ownsCase(req, c)) return fail("Only the person who sent this in can ask about it. Check your own message and ask there.", 403);
  if (c.status !== "done") return fail("We are still checking this one. Ask again in a moment.", 409);
  const { question } = await body<{ question?: string }>(req);
  const text = String(question ?? "").trim().slice(0, 1200);
  if (!text) return fail("Ask a question first");
  const history = await listMessages(id);
  await addMessage({ caseId: id, role: "user", text, via: "web" });
  const answer = await answerFollowUp(c, text, history);
  const message = await addMessage({ caseId: id, role: "assistant", text: answer, via: "web" });
  return json({ answer, message });
}
