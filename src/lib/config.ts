import fs from "node:fs";
import { timingSafeEqual } from "node:crypto";
import type { BrowserTier, Capabilities, PublicConfig } from "./types";

const e = (k: string) => (process.env[k] ?? "").trim();

export const env = {
  get publicUrl() {
    return (e("PUBLIC_URL") || "http://localhost:3000").replace(/\/+$/, "");
  },
  get databaseUrl() {
    return e("DATABASE_URL");
  },
  get neonGwBase() {
    return e("NEON_AI_GATEWAY_BASE_URL").replace(/\/+$/, "");
  },
  get neonGwToken() {
    return e("NEON_AI_GATEWAY_TOKEN");
  },
  get llmModel() {
    return e("LLM_MODEL");
  },
  get llmVisionModel() {
    return e("LLM_VISION_MODEL");
  },
  get openaiKey() {
    return e("OPENAI_API_KEY");
  },
  get openaiBase() {
    return (e("OPENAI_BASE_URL") || "https://api.openai.com/v1").replace(/\/+$/, "");
  },
  get anthropicKey() {
    return e("ANTHROPIC_API_KEY");
  },
  get agentmailKey() {
    return e("AGENTMAIL_API_KEY");
  },
  get agentmailUsername() {
    return e("AGENTMAIL_USERNAME") || "momdontclick";
  },
  get agentmailDisplayName() {
    return e("AGENTMAIL_DISPLAY_NAME") || "Mom, Don't Click";
  },
  get kernelKey() {
    return e("KERNEL_API_KEY");
  },
  get exaKey() {
    return e("EXA_API_KEY");
  },
  get consoleKey() {
    return e("CONSOLE_KEY");
  },
};

export const DEMO_MOM = { name: "Mom", email: "mom@demo.momdontclick.app" };

// ── process-wide runtime state (survives Next dev hot reloads) ──────────────
interface Runtime {
  preferLiveView: boolean;
  inboxEmail: string | null;
  inboxId: string | null;
  momInboxId: string | null;
  lastPollAt: number | null;
  lastMailError: string | null;
  localChromium: boolean | null;
  mastraOk: boolean | null;
  warmBrowser: boolean;
  bootedAt: number;
}
const g = globalThis as unknown as { __mdcRuntime?: Runtime };
export const runtime: Runtime = (g.__mdcRuntime ??= {
  preferLiveView: true,
  inboxEmail: null,
  inboxId: null,
  momInboxId: null,
  lastPollAt: null,
  lastMailError: null,
  localChromium: null,
  mastraOk: null,
  warmBrowser: false,
  bootedAt: Date.now(),
});

export function llmProvider(): Capabilities["llm"] {
  if (env.neonGwBase && env.neonGwToken) return "neon-gateway";
  if (env.openaiKey) return "openai";
  if (env.anthropicKey) return "anthropic";
  return "rules";
}

/** Where Playwright can find a Chromium on this machine, or null. */
export function localChromiumPath(): string | null {
  const explicit = e("CHROMIUM_PATH");
  if (explicit && fs.existsSync(explicit)) return explicit;
  return null;
}

export function browserTier(): BrowserTier {
  if (env.kernelKey) return "kernel";
  if (runtime.localChromium === false) return "fetch";
  return "playwright";
}

export function capabilities(): Capabilities {
  return {
    llm: llmProvider(),
    browser: browserTier(),
    search: !!env.exaKey,
    email: !!env.agentmailKey && !!runtime.inboxEmail,
    db: env.databaseUrl ? "neon" : "pglite",
    workflow: runtime.mastraOk === false ? "direct" : "mastra",
  };
}

export function publicConfig(): PublicConfig {
  return {
    inboxEmail: runtime.inboxEmail,
    publicUrl: env.publicUrl,
    capabilities: capabilities(),
    preferLiveView: runtime.preferLiveView,
    demoMom: DEMO_MOM,
  };
}

const LOOPBACK = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i;

/**
 * Presenter-only endpoints. With CONSOLE_KEY set, the key is required. Without it they
 * are open only when the request was addressed to this machine (development); a public
 * deployment that forgot the key is closed, not open.
 */
export function consoleAllowed(req: Request): boolean {
  const key = env.consoleKey;
  if (!key) {
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
    return LOOPBACK.test(host) && !req.headers.get("fly-client-ip");
  }
  const got = req.headers.get("x-console-key") || new URL(req.url).searchParams.get("key") || "";
  const a = Buffer.from(got);
  const b = Buffer.from(key);
  return a.length === b.length && timingSafeEqual(a, b);
}
