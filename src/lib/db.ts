// One tiny query function over two engines:
//   DATABASE_URL set  -> Neon serverless Postgres (HTTP driver)
//   otherwise         -> PGlite, real Postgres compiled to WASM, running in-process
// The SQL is identical for both, so what works on a laptop works on Neon.
import path from "node:path";
import fs from "node:fs";
import { env } from "./config";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = Record<string, any>;
type QueryFn = (text: string, params?: unknown[]) => Promise<Row[]>;

const g = globalThis as unknown as { __mdcDb?: Promise<QueryFn> };

const SCHEMA = [
  `create table if not exists mdc_cases (
     id text primary key,
     created_at bigint not null,
     domain text,
     brand text,
     verdict text,
     thread_id text,
     sender text,
     fp text,
     data jsonb not null
   )`,
  `create index if not exists mdc_cases_created on mdc_cases (created_at desc)`,
  `create index if not exists mdc_cases_fp on mdc_cases (fp)`,
  `create index if not exists mdc_cases_thread on mdc_cases (thread_id)`,
  `create table if not exists mdc_shots (case_id text primary key, jpeg text not null)`,
  `create table if not exists mdc_messages (id text primary key, case_id text not null, at bigint not null, data jsonb not null)`,
  `create index if not exists mdc_messages_case on mdc_messages (case_id, at)`,
  `create table if not exists mdc_guardians (
     id text primary key,
     created_at bigint not null,
     guardian_email text not null,
     parent_email text,
     parent_name text not null
   )`,
  `create table if not exists mdc_mail_seen (message_id text primary key, at bigint not null)`,
  `create table if not exists mdc_kv (key text primary key, value jsonb not null)`,
];

async function connect(): Promise<QueryFn> {
  let q: QueryFn;
  if (env.databaseUrl) {
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(env.databaseUrl);
    q = async (text, params = []) => (await sql.query(text, params)) as Row[];
  } else {
    const { PGlite } = await import("@electric-sql/pglite");
    const dir = process.env.PGLITE_DIR || path.join(process.cwd(), ".data", "pglite");
    fs.mkdirSync(dir, { recursive: true });
    const db = new PGlite(dir);
    q = async (text, params = []) => (await db.query(text, params as unknown[])).rows as Row[];
  }
  for (const stmt of SCHEMA) await q(stmt);
  return q;
}

/** Run one SQL statement. Connects and migrates on first use. */
export async function q(text: string, params: unknown[] = []): Promise<Row[]> {
  g.__mdcDb ??= connect().catch((err) => {
    g.__mdcDb = undefined;
    throw err;
  });
  const run = await g.__mdcDb;
  return run(text, params);
}

/** jsonb comes back parsed from both drivers, but be defensive. */
export function asJson<T>(v: unknown): T {
  return (typeof v === "string" ? JSON.parse(v) : v) as T;
}
