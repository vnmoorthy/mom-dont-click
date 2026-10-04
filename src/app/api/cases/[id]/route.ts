import { fail, json, ownsCase } from "@/lib/http";
import { detailCase, getCase, listMessages } from "@/lib/repo";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const c = await getCase(id);
  if (!c) return fail("We could not find that case", 404);
  // verdict and evidence for anyone with the link; the original message and the conversation for the sender
  const mine = ownsCase(req, c);
  const messages = mine ? await listMessages(id) : [];
  return json({ case: detailCase(c, mine), messages });
}
