import { body, fail, isEmail, json, rateLimited } from "@/lib/http";
import { addGuardian, listGuardians, publicGuardian } from "@/lib/repo";

export const dynamic = "force-dynamic";

export async function GET() {
  const all = await listGuardians();
  return json({ guardians: all.slice(0, 50).map(publicGuardian), count: all.length });
}

export async function POST(req: Request) {
  if (rateLimited(req, "guard", 10)) return fail("Too many sign-ups from here. Try again in a minute.", 429);
  const b = await body<{ guardianEmail?: string; parentName?: string; parentEmail?: string }>(req);
  if (!isEmail(b.guardianEmail)) return fail("Enter your email address");
  const parentEmail = b.parentEmail?.trim();
  if (parentEmail && !isEmail(parentEmail)) return fail("That does not look like their email address");
  const parentName = (b.parentName ?? "").trim().slice(0, 40) || "Mom";
  const gd = await addGuardian(b.guardianEmail.trim().toLowerCase(), parentName, parentEmail ? parentEmail.toLowerCase() : null);
  return json({ guardian: publicGuardian(gd) });
}
