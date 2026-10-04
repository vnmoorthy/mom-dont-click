import { emit } from "@/lib/bus";
import { publicConfig, runtime } from "@/lib/config";
import { body, guardConsole, json } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const denied = guardConsole(req);
  if (denied) return denied;
  const b = await body<{ preferLiveView?: boolean }>(req);
  if (typeof b.preferLiveView === "boolean") runtime.preferLiveView = b.preferLiveView;
  const config = publicConfig();
  emit({ type: "config", config });
  return json({ config });
}
