import { guardConsole, json } from "@/lib/http";
import { resetCases } from "@/lib/repo";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const denied = guardConsole(req);
  if (denied) return denied;
  // ?guardians=1 also forgets who signed up to guard the demo Mom (use before a fresh audience)
  await resetCases({ guardians: new URL(req.url).searchParams.get("guardians") === "1" });
  return json({ ok: true });
}
