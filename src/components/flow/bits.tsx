"use client";

// Shared pieces for the three phone screens: /check, /case/[id] and /guard.
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { MotionConfig } from "motion/react";
import { Check, CircleAlert, Copy, LoaderCircle } from "lucide-react";
import { api } from "@/lib/client";
import type { PublicConfig } from "@/lib/types";
import { Wordmark, cx } from "@/components/ui/kit";

/* ------------------------------------------------------------------ */
/* Class recipes                                                       */
/* ------------------------------------------------------------------ */

const focusRing =
  "outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink";

export const btnPrimary = cx(
  "inline-flex items-center justify-center gap-2.5 rounded-full bg-ink px-7 text-cream",
  "font-display font-extrabold tracking-tight",
  "transition duration-200 hover:bg-ink-2 active:scale-[0.98]",
  "disabled:pointer-events-none disabled:opacity-55",
  focusRing,
);

export const btnQuiet = cx(
  "inline-flex items-center justify-center gap-2 rounded-full border border-line bg-white/70 px-5 text-ink",
  "font-semibold transition duration-200 hover:border-ink-4 hover:bg-white active:scale-[0.98]",
  "disabled:pointer-events-none disabled:opacity-55",
  focusRing,
);

export const cardClass = "rounded-[22px] border border-line bg-white/75 shadow-[0_1px_0_rgba(23,19,15,0.04),0_18px_40px_-28px_rgba(23,19,15,0.35)]";

export const inputClass = cx(
  "w-full rounded-2xl border border-line bg-white px-4 py-3.5 text-lg text-ink placeholder:text-ink-4",
  "outline-none transition duration-150 focus:border-ink focus:ring-4 focus:ring-ink/10",
);

export const eyebrowClass = "font-mono text-[11px] uppercase tracking-[0.18em] text-ink-3";

/* ------------------------------------------------------------------ */
/* Page shell                                                          */
/* ------------------------------------------------------------------ */

const WIDTH = { narrow: "max-w-2xl", medium: "max-w-5xl", wide: "max-w-6xl" } as const;

export function PageShell({
  children,
  width = "medium",
  nav,
}: {
  children: ReactNode;
  width?: keyof typeof WIDTH;
  nav?: ReactNode;
}) {
  return (
    <MotionConfig reducedMotion="user">
      <div className="paper-grain min-h-dvh bg-paper text-ink">
        <header className={cx("mx-auto flex items-center justify-between gap-3 px-5 pt-5 sm:px-8 sm:pt-7", WIDTH[width])}>
          <Link href="/" aria-label="Mom, Don't Click. Go to the home page" className={cx("rounded-xl", focusRing)}>
            <Wordmark className="whitespace-nowrap" />
          </Link>
          {nav}
        </header>
        <main className={cx("mx-auto px-5 pb-14 pt-8 sm:px-8 sm:pt-12", WIDTH[width])}>{children}</main>
        <footer className={cx("mx-auto px-5 pb-10 sm:px-8", WIDTH[width])}>
          <div className="flex flex-col gap-3 border-t border-line pt-5 text-sm text-ink-3 sm:flex-row sm:items-center sm:justify-between">
            <p>We never call anything safe. We only tell you what we found.</p>
            <nav className="flex gap-5 font-semibold text-ink-2">
              <Link href="/check" className={cx("rounded underline-offset-4 hover:underline", focusRing)}>
                Check something
              </Link>
              <Link href="/guard" className={cx("rounded underline-offset-4 hover:underline", focusRing)}>
                Guard someone
              </Link>
              <Link href="/" className={cx("rounded underline-offset-4 hover:underline", focusRing)}>
                Home
              </Link>
            </nav>
          </div>
        </footer>
      </div>
    </MotionConfig>
  );
}

/** Small pill link used in the header of each screen. `short` is the label on a narrow phone. */
export function NavPill({
  href,
  icon,
  label,
  short,
}: {
  href: string;
  icon?: ReactNode;
  label: string;
  short?: string;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={cx(
        "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-line bg-white/70 px-3.5 text-sm font-semibold text-ink sm:px-4",
        "transition duration-200 hover:border-ink-4 hover:bg-white",
        focusRing,
      )}
    >
      {icon}
      {short ? (
        <>
          <span className="sm:hidden">{short}</span>
          <span className="hidden sm:inline">{label}</span>
        </>
      ) : (
        label
      )}
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Small atoms                                                         */
/* ------------------------------------------------------------------ */

export function Spinner({ size = 20, className }: { size?: number; className?: string }) {
  return <LoaderCircle size={size} className={cx("animate-spin", className)} aria-hidden />;
}

/** Calm inline message. Never a crash screen. */
export function Notice({
  tone = "neutral",
  children,
  className,
  role,
}: {
  tone?: "neutral" | "red" | "amber";
  children: ReactNode;
  className?: string;
  role?: "alert" | "status";
}) {
  const colour =
    tone === "red"
      ? "border-scam/40 bg-scam-soft text-scam-deep"
      : tone === "amber"
        ? "border-warn/50 bg-warn-soft text-warn-deep"
        : "border-line bg-paper-2 text-ink-2";
  return (
    <div role={role} className={cx("flex items-start gap-2.5 rounded-2xl border px-4 py-3 text-base", colour, className)}>
      <CircleAlert size={18} className="mt-0.5 shrink-0" aria-hidden />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  aside,
  className,
}: {
  eyebrow?: string;
  title: string;
  aside?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("mb-4 flex items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        {eyebrow && <div className={cx(eyebrowClass, "mb-1.5")}>{eyebrow}</div>}
        <h2 className="font-display text-2xl font-extrabold leading-tight tracking-tight sm:text-[1.7rem]">{title}</h2>
      </div>
      {aside && <div className="shrink-0">{aside}</div>}
    </div>
  );
}

/** Label + control + helper / error line. */
export function Field({
  label,
  optional,
  hint,
  error,
  children,
}: {
  label: string;
  optional?: boolean;
  hint?: ReactNode;
  error?: string | null;
  children: (ids: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode;
}) {
  const id = useId();
  const noteId = `${id}-note`;
  const hasNote = !!error || !!hint;
  return (
    <div>
      <label htmlFor={id} className="mb-2 flex items-baseline gap-2 text-base font-semibold text-ink">
        {label}
        {optional && <span className="text-sm font-normal text-ink-4">optional</span>}
      </label>
      {children({ id, describedBy: hasNote ? noteId : undefined, invalid: !!error })}
      {error ? (
        <p id={noteId} role="alert" className="mt-2 flex items-start gap-1.5 text-base text-scam-deep animate-rise">
          <CircleAlert size={17} className="mt-[3px] shrink-0" aria-hidden />
          {error}
        </p>
      ) : hint ? (
        <p id={noteId} className="mt-2 text-sm text-ink-3">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Copying                                                             */
/* ------------------------------------------------------------------ */

/** Copy to the clipboard, with a fallback for pages opened over plain http on a phone. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the textarea trick
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "0";
    ta.style.left = "-9999px";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
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
  copiedLabel = "Copied",
  className,
  iconSize = 16,
}: {
  /** the text, or a function called at click time (for things like window.location) */
  text: string | (() => string);
  label?: string;
  copiedLabel?: string;
  className?: string;
  iconSize?: number;
}) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const onClick = useCallback(async () => {
    const value = typeof text === "function" ? text() : text;
    const ok = await copyText(value);
    setState(ok ? "copied" : "failed");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 2200);
  }, [text]);

  return (
    <button type="button" onClick={onClick} className={className ?? cx(btnQuiet, "h-11 text-sm")}>
      {state === "copied" ? <Check size={iconSize} aria-hidden /> : <Copy size={iconSize} aria-hidden />}
      <span aria-live="polite">
        {state === "copied" ? copiedLabel : state === "failed" ? "Could not copy" : label}
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Data helpers                                                        */
/* ------------------------------------------------------------------ */

/**
 * The public config. Prefers the live value from the event stream and
 * falls back to a plain GET so the page still works if the stream is slow.
 */
export function usePublicConfig(liveConfig: PublicConfig | null): PublicConfig | null {
  const [fetched, setFetched] = useState<PublicConfig | null>(null);
  useEffect(() => {
    let alive = true;
    api<PublicConfig | { config: PublicConfig }>("/api/config")
      .then((d) => {
        if (!alive || !d) return;
        const c = "config" in d ? d.config : d;
        if (c && typeof c === "object" && "capabilities" in c) setFetched(c);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return liveConfig ?? fetched;
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

/** Turn any thrown value into one calm sentence. */
export function friendlyError(err: unknown, fallback: string): string {
  const raw = err instanceof Error ? err.message : "";
  if (!raw || err instanceof TypeError || /failed to fetch|networkerror|load failed|request failed \(5\d\d\)/i.test(raw)) {
    return fallback;
  }
  return raw.endsWith(".") || raw.endsWith("!") || raw.endsWith("?") ? raw : `${raw}.`;
}

/** 820 ms / 4.2 s / 1 min 12 s */
export function fmtMs(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
  const m = Math.floor(ms / 60_000);
  const s = Math.round((ms % 60_000) / 1000);
  return `${m} min ${s} s`;
}

/** 0:07, 1:42 */
export function fmtClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Only http(s) addresses may ever become a real link. */
export function safeHttpUrl(url?: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

export function hostOf(url?: string | null): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
