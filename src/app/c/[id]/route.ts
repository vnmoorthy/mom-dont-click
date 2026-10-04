import { ownerCookie, ownsCase } from "@/lib/http";
import { getCase } from "@/lib/repo";

export const dynamic = "force-dynamic";

/** The link in the verdict email: /c/<id>?t=<token>. Trades the token for a cookie, then shows the case. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const c = await getCase(id);
  const headers = new Headers({ location: `/case/${encodeURIComponent(id)}`, "referrer-policy": "no-referrer" });
  if (c && c.channel !== "seed" && c.viewToken && ownsCase(req, c)) headers.append("set-cookie", ownerCookie(c));
  return new Response(null, { status: 303, headers });
}
