// One small LLM client. Preferred route is the Neon AI Gateway (OpenAI-compatible
// chat completions); OpenAI and Anthropic keys work as alternatives. With no key
// at all every caller falls back to deterministic rules, so the product still works.
import { env, llmProvider } from "./config";

export interface ChatInput {
  system: string;
  user: string;
  /** data: URLs (image/jpeg|png) for the vision path */
  images?: string[];
  maxTokens?: number;
  timeoutMs?: number;
  json?: boolean;
}

function gatewayBase(): string {
  const b = env.neonGwBase;
  return /\/v1$/.test(b) ? b : `${b}/v1`;
}

function model(vision: boolean): string {
  const p = llmProvider();
  if (vision && env.llmVisionModel) return env.llmVisionModel;
  if (env.llmModel) return env.llmModel;
  if (p === "anthropic") return "claude-haiku-4-5-20251001";
  if (p === "openai") return "gpt-4.1-mini";
  return "gpt-5-mini";
}

async function openAiCompatible(base: string, key: string, input: ChatInput, signal: AbortSignal): Promise<string> {
  const content: unknown = input.images?.length
    ? [{ type: "text", text: input.user }, ...input.images.map((url) => ({ type: "image_url", image_url: { url } }))]
    : input.user;
  const call = (tokenParam: "max_completion_tokens" | "max_tokens") =>
    fetch(`${base}/chat/completions`, {
      method: "POST",
      signal,
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: model(!!input.images?.length),
        messages: [
          { role: "system", content: input.system },
          { role: "user", content },
        ],
        // reasoning models spend part of this budget thinking, so leave headroom
        [tokenParam]: Math.max(input.maxTokens ?? 900, 1500),
      }),
    });
  let res = await call("max_completion_tokens");
  // some gateways and older models only know the classic parameter name
  if (res.status === 400) res = await call("max_tokens");
  if (!res.ok) throw new Error(`LLM ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string | { text?: string }[] } }[] };
  const c = data.choices?.[0]?.message?.content;
  return typeof c === "string" ? c : (c ?? []).map((p) => p.text ?? "").join("");
}

async function anthropic(input: ChatInput, signal: AbortSignal): Promise<string> {
  const blocks: unknown[] = [];
  for (const img of input.images ?? []) {
    const m = img.match(/^data:(image\/[a-z+]+);base64,(.+)$/);
    if (m) blocks.push({ type: "image", source: { type: "base64", media_type: m[1], data: m[2] } });
  }
  blocks.push({ type: "text", text: input.user });
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    signal,
    headers: {
      "content-type": "application/json",
      "x-api-key": env.anthropicKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: model(!!input.images?.length),
      max_tokens: input.maxTokens ?? 900,
      system: input.system,
      messages: [{ role: "user", content: blocks }],
    }),
  });
  if (!res.ok) throw new Error(`LLM ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  return (data.content ?? []).filter((b) => b.type === "text").map((b) => b.text ?? "").join("");
}

export function llmAvailable(): boolean {
  return llmProvider() !== "rules";
}

/** Plain text completion. Returns null when no model is configured or the call fails. */
export async function chatText(input: ChatInput): Promise<string | null> {
  const p = llmProvider();
  if (p === "rules") return null;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), input.timeoutMs ?? 14_000);
  try {
    if (p === "neon-gateway") return await openAiCompatible(gatewayBase(), env.neonGwToken, input, ctl.signal);
    if (p === "openai") return await openAiCompatible(env.openaiBase, env.openaiKey, input, ctl.signal);
    return await anthropic(input, ctl.signal);
  } catch (err) {
    console.error("[llm]", (err as Error)?.message ?? err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Ask for a single JSON object and parse it. Returns null on any failure. */
export async function chatJSON<T>(input: ChatInput): Promise<T | null> {
  const text = await chatText({
    ...input,
    system: `${input.system}\n\nReply with one JSON object only. No prose, no code fences.`,
  });
  if (!text) return null;
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

/** Live check used by the console: does the configured model actually answer? */
export async function llmPing(): Promise<{ ok: boolean; provider: string; model: string; error?: string }> {
  const p = llmProvider();
  if (p === "rules") return { ok: false, provider: p, model: "-", error: "no model configured" };
  const out = await chatText({ system: "You are a health check.", user: "Reply with the single word: ok", maxTokens: 200, timeoutMs: 12_000 });
  return { ok: !!out, provider: p, model: model(false), error: out ? undefined : "no answer (see server log)" };
}
