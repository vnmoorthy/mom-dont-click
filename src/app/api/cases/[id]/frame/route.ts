import { latestFrame } from "@/lib/bus";
import { getCase, getShot } from "@/lib/repo";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const c = await getCase(id);
  // while the browser is open serve the newest live frame; afterwards the final annotated screenshot
  const live = c?.browser?.live ? latestFrame(id) : null;
  const buf = live ?? (await getShot(id).catch(() => null)) ?? latestFrame(id);
  if (!buf) return new Response("no frame", { status: 404 });
  return new Response(new Uint8Array(buf), {
    headers: { "content-type": "image/jpeg", "cache-control": "no-store" },
  });
}
