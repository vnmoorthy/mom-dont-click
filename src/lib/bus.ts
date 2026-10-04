// In-process pub/sub that feeds the SSE stream, plus the live browser frames.
import type { LiveEvent } from "./types";

type Listener = (ev: LiveEvent) => void;

interface Hub {
  listeners: Set<Listener>;
  frames: Map<string, { buf: Buffer; n: number; at: number }>;
  /** guardian id -> how many of their /guard pages are open right now */
  watching: Map<string, number>;
}
const g = globalThis as unknown as { __mdcHub?: Hub };
const hub: Hub = (g.__mdcHub ??= { listeners: new Set(), frames: new Map(), watching: new Map() });
hub.watching ??= new Map();

/** A guardian's page is open and listening. Returns the function that says it closed. */
export function guardianWatching(id: string): () => void {
  hub.watching.set(id, (hub.watching.get(id) ?? 0) + 1);
  let done = false;
  return () => {
    if (done) return;
    done = true;
    const n = (hub.watching.get(id) ?? 1) - 1;
    if (n <= 0) hub.watching.delete(id);
    else hub.watching.set(id, n);
  };
}

export function guardianOnline(id: string): boolean {
  return (hub.watching.get(id) ?? 0) > 0;
}

export function emit(ev: LiveEvent): void {
  for (const l of hub.listeners) {
    try {
      l(ev);
    } catch {
      // a broken subscriber must never break the pipeline
    }
  }
}

export function subscribe(l: Listener): () => void {
  hub.listeners.add(l);
  return () => hub.listeners.delete(l);
}

export function subscriberCount(): number {
  return hub.listeners.size;
}

/** Store the newest live frame for a case and tell the screens about it. */
export function pushFrame(caseId: string, buf: Buffer): void {
  const prev = hub.frames.get(caseId);
  const n = (prev?.n ?? 0) + 1;
  hub.frames.set(caseId, { buf, n, at: Date.now() });
  emit({ type: "frame", caseId, n });
}

export function latestFrame(caseId: string): Buffer | null {
  return hub.frames.get(caseId)?.buf ?? null;
}

export function dropFrames(caseId?: string): void {
  if (caseId) hub.frames.delete(caseId);
  else hub.frames.clear();
}
