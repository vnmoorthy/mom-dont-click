import { boot } from "@/lib/boot";
import { publicConfig } from "@/lib/config";
import { json } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  boot();
  return json(publicConfig());
}
