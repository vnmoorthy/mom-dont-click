import { json } from "@/lib/http";
import { seedInfos } from "@/lib/seeds";

export const dynamic = "force-dynamic";

export async function GET() {
  return json({ seeds: seedInfos() });
}
