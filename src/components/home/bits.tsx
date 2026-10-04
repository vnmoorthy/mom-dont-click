"use client";

// Small shared pieces for the home, console and eval screens.
import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Check, Copy } from "lucide-react";
import { motion } from "motion/react";
import { cx } from "@/components/ui/kit";
import { timeAgo, useNow } from "@/lib/client";

/**
 * Decide whether what was pasted is a link (or bare domain) rather than a message.
 * Accepts already-defanged input too ("hxxps://evil[.]example").
 * Returns a URL with a scheme, or null when it reads like a message.
 */
export function parseLink(raw: string): string | null {
  const s = raw
    .trim()
    .replace(/^<|>$/g, "")
    .replace(/^hxxp/i, "http")
    .replace(/\[\.\]|\(\.\)/g, ".");
  if (!s || /\s/.test(s)) return null;
  const m = /^(https?:\/\/)?(localhost|(?:\d{1,3}\.){3}\d{1,3}|(?:[a-z0-9-]+\.)+[a-z]{2,})(:\d{1,5})?([/?#]\S*)?$/i.exec(s);
  if (!m) return null;
  if (m[1]) return s;
  const local = /^(localhost|(?:\d{1,3}\.){3}\d{1,3})$/i.test(m[2]);
  return `${local ? "http" : "https"}://${s}`;
}

/** Turn a thrown error into a sentence a parent could read. */
export function friendlyError(err: unknown, fallback = "We couldn't reach the checker just now. Please try again in a moment."): string {
  const msg = err instanceof Error ? err.message : "";
  if (!msg || /failed to fetch|networkerror|load failed|request failed \(5\d\d\)|request failed \(404\)/i.test(msg)) return fallback;
  return msg;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export function CopyButton({
  text,
  label = "Copy",
  className,
  tone = "ink",
}: {
  text: string;
  label?: string;
  className?: string;
  tone?: "ink" | "cream";
}) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const onClick = useCallback(async () => {
    const ok = await copyText(text);
    setState(ok ? "copied" : "failed");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 1800);
  }, [text]);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-live="polite"
      className={cx(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-[transform,background-color] duration-150 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-scam",
        tone === "ink" ? "bg-ink text-cream hover:bg-ink-2" : "bg-cream text-ink hover:bg-cream-2",
        className,
      )}
    >
      {state === "copied" ? <Check size={15} strokeWidth={3} /> : <Copy size={15} />}
      {state === "copied" ? "Copied" : state === "failed" ? "Select and copy" : label}
    </button>
  );
}

/** Accessible on/off switch. */
export function Switch({
  checked,
  onChange,
  disabled,
  label,
  hint,
  className,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label: string;
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx(
        "group flex items-start gap-3 text-left rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-scam disabled:cursor-not-allowed disabled:opacity-55",
        className,
      )}
    >
      <span
        className={cx(
          "relative mt-0.5 h-6 w-11 shrink-0 rounded-full border transition-colors duration-200",
          checked ? "border-ink bg-ink" : "border-line bg-paper-3",
        )}
      >
        <span
          className={cx(
            "absolute left-0.5 top-0.5 size-[18px] rounded-full shadow-sm transition-transform duration-200 ease-out",
            checked ? "translate-x-5 bg-cream" : "translate-x-0 bg-white",
          )}
        />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold leading-snug text-ink">{label}</span>
        {hint && <span className="mt-0.5 block text-xs leading-snug text-ink-3">{hint}</span>}
      </span>
    </button>
  );
}

/** Content that arrives once as it scrolls into view. */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -70px 0px" }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  lede,
  className,
}: {
  eyebrow: string;
  title: ReactNode;
  lede?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("max-w-3xl", className)}>
      <div className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-ink-3">{eyebrow}</div>
      <h2 className="mt-3 font-display text-[clamp(2.1rem,6vw,4rem)] font-extrabold leading-[0.95] tracking-[-0.035em] text-ink">
        {title}
      </h2>
      {lede && <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-3 sm:text-xl">{lede}</p>}
    </div>
  );
}

/** Relative time that keeps itself fresh without re-rendering its parent. */
export function Ago({ ts, className }: { ts: number; className?: string }) {
  const now = useNow(5000);
  return (
    <time dateTime={new Date(ts).toISOString()} className={className} suppressHydrationWarning>
      {timeAgo(ts, now)}
    </time>
  );
}

/** Seconds since `since`, ticking. */
export function Elapsed({ since, className }: { since: number; className?: string }) {
  const now = useNow(250);
  const s = Math.max(0, (now - since) / 1000);
  return <span className={cx("tabular", className)}>{s.toFixed(1)}s</span>;
}

export function formatMs(ms?: number): string {
  if (ms === undefined || ms === null || Number.isNaN(ms)) return "";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}
