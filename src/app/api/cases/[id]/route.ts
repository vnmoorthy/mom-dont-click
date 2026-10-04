import { fail, json } from "@/lib/http";
import { detailCase, getCase, listMessages } from "@/lib/repo";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const c = await getCase(id);
  if (!c) return fail("We could not find that case", 404);
  const messages = await listMessages(id);
  return json({ case: detailCase(c), messages });
}
