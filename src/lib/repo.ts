// Persistence for cases, follow-up messages, guardians and settings.
// Active cases are cached in memory so the wall updates instantly; writes to
// Postgres are queued per case so they land in order.
import { nanoid } from "nanoid";
import { asJson, q } from "./db";
import { dropFrames, emit } from "./bus";
import { maskEmail } from "./urls";
import type { CaseMessage, CaseRecord, GuardianPublic } from "./types";

interface Mem {
  cases: Map<string, CaseRecord>;
  writes: Map<string, Promise<unknown>>;
  /** cases created at or before this moment were wiped by a reset and must not come back */
  resetAt: number;
}
const g = globalThis as unknown as { __mdcMem?: Mem };
const mem: Mem = (g.__mdcMem ??= { cases: new Map(), writes: new Map(), resetAt: 0 });
mem.resetAt ??= 0;

/** What leaves the server on shared screens: no raw text, masked sender, no secrets. */
export function publicCase(c: CaseRecord): CaseRecord {
  return { ...c, rawText: "", viewToken: undefined, senderEmail: c.senderEmail ? maskEmail(c.senderEmail) : undefined };
}

export const PRIVATE_NOTE = "Only the person who sent this in can read the original message.";

/**
 * The case page. The verdict and evidence are for anyone with the link; the forwarded
 * text is only for whoever sent it in (`mine`), because case ids appear on shared screens.
 */
export function detailCase(c: CaseRecord, mine: boolean): CaseRecord {
  return {
    ...c,
    rawText: mine ? c.rawText : PRIVATE_NOTE,
    viewToken: undefined,
    senderEmail: c.senderEmail ? maskEmail(c.senderEmail) : undefined,
  };
}

function persist(c: CaseRecord, fp?: string | null): void {
  const snapshot = JSON.stringify(c);
  const prev = mem.writes.get(c.id) ?? Promise.resolve();
  const next = prev
    .catch(() => {})
    .then(() =>
      q(
        `insert into mdc_cases (id, created_at, domain, brand, verdict, thread_id, sender, fp, data)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)
         on conflict (id) do update set domain=excluded.domain, brand=excluded.brand, verdict=excluded.verdict,
           thread_id=excluded.thread_id, sender=excluded.sender, fp=excluded.fp, data=excluded.data`,
        [c.id, c.createdAt, c.domain ?? null, c.claimedBrand ?? null, c.verdict ?? null, c.mail?.threadId ?? null,
          c.senderEmail ?? null, fp ?? null, snapshot],
      ),
    )
    .catch((err) => console.error("[repo] persist failed", c.id, err?.message ?? err));
  mem.writes.set(c.id, next);
}

/** Save + broadcast. `quiet` cases (eval runs) are neither stored nor shown. */
export function saveCase(c: CaseRecord, opts: { fp?: string | null; quiet?: boolean } = {}): void {
  c.updatedAt = Date.now();
  if (opts.quiet) return;
  // a case that was still running when the wall was reset finishes quietly and leaves no trace
  if (c.createdAt <= mem.resetAt) return;
  mem.cases.set(c.id, c);
  emit({ type: "case", case: publicCase(c) });
  persist(c, opts.fp);
}

export async function flushCase(id: string): Promise<void> {
  await mem.writes.get(id);
}

export async function getCase(id: string): Promise<CaseRecord | null> {
  const hit = mem.cases.get(id);
  if (hit) return hit;
  const rows = await q(`select data from mdc_cases where id = $1`, [id]);
  return rows[0] ? asJson<CaseRecord>(rows[0].data) : null;
}

export async function listCases(limit = 60): Promise<CaseRecord[]> {
  const rows = await q(`select data from mdc_cases order by created_at desc limit $1`, [limit]);
  const byId = new Map<string, CaseRecord>();
  for (const r of rows) {
    const c = asJson<CaseRecord>(r.data);
    byId.set(c.id, c);
  }
  // in-memory copies are fresher than whatever has reached the database
  for (const c of mem.cases.values()) byId.set(c.id, c);
  return [...byId.values()].sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
}

export async function findCaseByThread(threadId: string): Promise<CaseRecord | null> {
  for (const c of mem.cases.values()) if (c.mail?.threadId === threadId) return c;
  const rows = await q(`select data from mdc_cases where thread_id = $1 order by created_at desc limit 1`, [threadId]);
  return rows[0] ? asJson<CaseRecord>(rows[0].data) : null;
}

/** "Seen before": the most recent scam verdict sharing a fingerprint (last 7 days). */
export async function findSeenBefore(fps: string[], notId: string): Promise<CaseRecord | null> {
  const list = fps.filter(Boolean).slice(0, 3);
  if (list.length === 0) return null;
  while (list.length < 3) list.push(list[0]);
  const since = Date.now() - 7 * 86400_000;
  const rows = await q(
    `select data from mdc_cases
     where fp in ($1,$2,$3) and verdict in ('SCAM','TREAT_AS_SCAM') and id <> $4 and created_at > $5
     order by created_at desc limit 1`,
    [...list, notId, since],
  );
  return rows[0] ? asJson<CaseRecord>(rows[0].data) : null;
}

export async function saveShot(caseId: string, jpeg: Buffer): Promise<void> {
  await q(
    `insert into mdc_shots (case_id, jpeg) values ($1,$2) on conflict (case_id) do update set jpeg = excluded.jpeg`,
    [caseId, jpeg.toString("base64")],
  ).catch((err) => console.error("[repo] saveShot failed", err?.message ?? err));
}

export async function getShot(caseId: string): Promise<Buffer | null> {
  const rows = await q(`select jpeg from mdc_shots where case_id = $1`, [caseId]);
  return rows[0] ? Buffer.from(rows[0].jpeg as string, "base64") : null;
}

export async function addMessage(m: Omit<CaseMessage, "id" | "at"> & { at?: number }): Promise<CaseMessage> {
  const msg: CaseMessage = { id: nanoid(12), at: m.at ?? Date.now(), ...m };
  await q(`insert into mdc_messages (id, case_id, at, data) values ($1,$2,$3,$4::jsonb)`, [
    msg.id, msg.caseId, msg.at, JSON.stringify(msg),
  ]);
  // the shared stream only says that something was added; the page that may read it fetches it
  emit({ type: "message", message: { ...msg, text: "" } });
  return msg;
}

export async function listMessages(caseId: string): Promise<CaseMessage[]> {
  const rows = await q(`select data from mdc_messages where case_id = $1 order by at asc`, [caseId]);
  return rows.map((r) => asJson<CaseMessage>(r.data));
}

// ── guardians ────────────────────────────────────────────────────────────────
export interface Guardian {
  id: string;
  createdAt: number;
  guardianEmail: string;
  parentEmail: string | null;
  parentName: string;
}

export function publicGuardian(gd: Guardian): GuardianPublic {
  return {
    id: gd.id,
    guardianEmailMasked: maskEmail(gd.guardianEmail),
    parentName: gd.parentName,
    parentEmailMasked: gd.parentEmail ? maskEmail(gd.parentEmail) : null,
    createdAt: gd.createdAt,
  };
}

const toGuardian = (r: Record<string, unknown>): Guardian => ({
  id: r.id as string,
  createdAt: Number(r.created_at),
  guardianEmail: r.guardian_email as string,
  parentEmail: (r.parent_email as string) ?? null,
  parentName: r.parent_name as string,
});

export async function addGuardian(guardianEmail: string, parentName: string, parentEmail: string | null): Promise<Guardian> {
  const existing = await q(
    `select * from mdc_guardians where guardian_email = $1 and coalesce(parent_email,'') = $2 limit 1`,
    [guardianEmail, parentEmail ?? ""],
  );
  if (existing[0]) {
    await q(`update mdc_guardians set parent_name = $1 where id = $2`, [parentName, existing[0].id]);
    return { ...toGuardian(existing[0]), parentName };
  }
  const gd: Guardian = { id: nanoid(10), createdAt: Date.now(), guardianEmail, parentEmail, parentName };
  await q(
    `insert into mdc_guardians (id, created_at, guardian_email, parent_email, parent_name) values ($1,$2,$3,$4,$5)`,
    [gd.id, gd.createdAt, gd.guardianEmail, gd.parentEmail, gd.parentName],
  );
  emit({ type: "guardian", guardian: publicGuardian(gd) });
  return gd;
}

export async function listGuardians(): Promise<Guardian[]> {
  const rows = await q(`select * from mdc_guardians order by created_at desc limit 200`);
  return rows.map(toGuardian);
}

/** Guardians watching this sender, newest first. `null` sender = the demo Mom persona. */
export async function guardiansFor(senderEmail: string | null): Promise<Guardian[]> {
  const rows = senderEmail
    ? await q(`select * from mdc_guardians where lower(parent_email) = $1 order by created_at desc limit 50`, [senderEmail.toLowerCase()])
    : await q(`select * from mdc_guardians where parent_email is null order by created_at desc limit 200`);
  return rows.map(toGuardian);
}

// ── mail bookkeeping + settings ──────────────────────────────────────────────
export async function markMailSeen(messageId: string): Promise<boolean> {
  const rows = await q(
    `insert into mdc_mail_seen (message_id, at) values ($1,$2) on conflict (message_id) do nothing returning message_id`,
    [messageId, Date.now()],
  );
  return rows.length > 0;
}

export async function kvGet<T>(key: string): Promise<T | null> {
  const rows = await q(`select value from mdc_kv where key = $1`, [key]);
  return rows[0] ? asJson<T>(rows[0].value) : null;
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  await q(
    `insert into mdc_kv (key, value) values ($1,$2::jsonb) on conflict (key) do update set value = excluded.value`,
    [key, JSON.stringify(value)],
  );
}

export async function counts(): Promise<{ cases: number; guardians: number }> {
  const [c] = await q(`select count(*)::int as n from mdc_cases`);
  const [gd] = await q(`select count(*)::int as n from mdc_guardians`);
  return { cases: Number(c?.n ?? 0), guardians: Number(gd?.n ?? 0) };
}

/** Clear the wall: cases, screenshots and follow-ups. Guardians and settings stay. */
export async function resetCases(opts: { guardians?: boolean } = {}): Promise<void> {
  mem.resetAt = Date.now();
  await Promise.all([...mem.writes.values()]).catch(() => {});
  mem.cases.clear();
  mem.writes.clear();
  dropFrames();
  await q(`delete from mdc_cases`);
  await q(`delete from mdc_shots`);
  await q(`delete from mdc_messages`);
  if (opts.guardians) await q(`delete from mdc_guardians`);
  emit({ type: "reset" });
}
