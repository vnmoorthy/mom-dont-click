import { lastEval, startEval } from "@/lib/evals";
import { fail, json, rateLimited } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  return json({ report: lastEval() });
}

export async function POST(req: Request) {
  if (rateLimited(req, "eval", 6)) return fail("The eval was just run. Try again in a minute.", 429);
  startEval();
  return json({ started: true });
}
