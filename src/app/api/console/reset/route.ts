import { guardConsole, json } from "@/lib/http";
import { resetCases } from "@/lib/repo";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const denied = guardConsole(req);
  if (denied) return denied;
  await resetCases();
  return json({ ok: true });
}
