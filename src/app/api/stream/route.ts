import { guardianWatching, subscribe } from "@/lib/bus";
import { boot } from "@/lib/boot";
import { publicConfig } from "@/lib/config";
import { listCases, publicCase } from "@/lib/repo";
import type { LiveEvent } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  boot();
  const enc = new TextEncoder();
  let cleanup = () => {};
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let ready = false;
      const backlog: LiveEvent[] = [];
      const write = (ev: LiveEvent) => {
        try {
          controller.enqueue(enc.encode(`data: ${JSON.stringify(ev)}\n\n`));
        } catch {
          cleanup();
        }
      };
      const unsub = subscribe((ev) => (ready ? write(ev) : backlog.push(ev)));
      // a guardian keeping /guard open gets the heads-up on screen as well as by email
      const guardianId = new URL(req.url).searchParams.get("guardian");
      const unwatch = guardianId && /^[\w-]{6,24}$/.test(guardianId) ? guardianWatching(guardianId) : () => {};
      const hb = setInterval(() => {
        try {
          controller.enqueue(enc.encode(`: keep-alive\n\n`));
        } catch {
          cleanup();
        }
      }, 15_000);
      cleanup = () => {
        unsub();
        unwatch();
        clearInterval(hb);
        try {
          controller.close();
        } catch {}
      };
      req.signal.addEventListener("abort", cleanup);
      const cases = await listCases(60).catch(() => []);
      write({ type: "hello", cases: cases.map(publicCase), config: publicConfig() });
      ready = true;
      for (const ev of backlog) write(ev);
    },
    cancel() {
      cleanup();
    },
  });
  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}
