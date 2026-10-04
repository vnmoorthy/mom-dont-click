import { boot } from "@/lib/boot";
import { publicConfig, runtime } from "@/lib/config";
import { guardConsole, json } from "@/lib/http";
import { counts } from "@/lib/repo";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const denied = guardConsole(req);
  if (denied) return denied;
  boot();
  return json({
    config: publicConfig(),
    counts: await counts().catch(() => ({ cases: 0, guardians: 0 })),
    inbox: { email: runtime.inboxEmail, lastPollAt: runtime.lastPollAt, lastError: runtime.lastMailError },
    warmBrowser: runtime.warmBrowser,
  });
}
