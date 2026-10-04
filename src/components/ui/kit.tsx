"use client";

// Shared visual atoms. Every screen uses these so the product reads as one system.
import { useEffect, useState } from "react";
import {
  Globe,
  Search,
  ScanSearch,
  MessageSquareWarning,
  History,
  Image as ImageIcon,
  ShieldAlert,
  TriangleAlert,
  CircleHelp,
} from "lucide-react";
import type { CaseRecord, Evidence, EvidenceKind, EvidenceTone, VerdictLevel } from "@/lib/types";
import { VERDICT_LABEL } from "@/lib/types";

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/** The mark: a cursor arrow stopped by a raised hand-drawn bar. */
export function Mark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} aria-hidden>
      <rect x="2" y="2" width="60" height="60" rx="17" fill="var(--color-scam)" />
      <path
        d="M21 14.5v31.2c0 1.3 1.6 2 2.5 1l7.4-8 5.3 11.6c.4.9 1.4 1.3 2.3.9l3.4-1.6c.9-.4 1.3-1.4.9-2.3L37.500 36h10.300c1.300 0 2-1.600 1-2.500L23.500 13.400c-.900-.900-2.500-.200-2.500 1.100Z"
        fill="var(--color-cream)"
      />
      <path d="M11 53 53 11" stroke="var(--color-ink)" strokeWidth="7" strokeLinecap="round" />
    </svg>
  );
}

export function Wordmark({
  tone = "ink",
  size = "md",
  className,
}: {
  tone?: "ink" | "cream";
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const text = size === "lg" ? "text-3xl" : size === "sm" ? "text-base" : "text-xl";
  const mark = size === "lg" ? 40 : size === "sm" ? 22 : 28;
  return (
    <span className={cx("inline-flex items-center gap-2.5 select-none", className)}>
      <Mark size={mark} />
      <span
        className={cx(
          "font-display font-extrabold tracking-tight leading-none",
          text,
          tone === "cream" ? "text-cream" : "text-ink",
        )}
      >
        Mom, Don&rsquo;t Click
      </span>
    </span>
  );
}

export const TONE: Record<
  EvidenceTone,
  { text: string; bg: string; border: string; dot: string; nightText: string; nightBg: string; nightBorder: string }
> = {
  red: {
    text: "text-scam-deep",
    bg: "bg-scam-soft",
    border: "border-scam/40",
    dot: "bg-scam",
    nightText: "text-[#ffb3a3]",
    nightBg: "bg-scam/15",
    nightBorder: "border-scam/50",
  },
  amber: {
    text: "text-warn-deep",
    bg: "bg-warn-soft",
    border: "border-warn/50",
    dot: "bg-warn",
    nightText: "text-[#ffd98a]",
    nightBg: "bg-warn/12",
    nightBorder: "border-warn/45",
  },
  neutral: {
    text: "text-ink-2",
    bg: "bg-paper-2",
    border: "border-line",
    dot: "bg-ink-4",
    nightText: "text-cream-2",
    nightBg: "bg-cream/6",
    nightBorder: "border-cream/15",
  },
  calm: {
    text: "text-calm-deep",
    bg: "bg-calm-soft",
    border: "border-calm/40",
    dot: "bg-calm",
    nightText: "text-[#b9cbdb]",
    nightBg: "bg-calm/20",
    nightBorder: "border-calm/50",
  },
};

export function verdictTone(v?: VerdictLevel): EvidenceTone {
  return v === "SCAM" ? "red" : v === "TREAT_AS_SCAM" ? "amber" : v === "NO_RED_FLAGS" ? "calm" : "neutral";
}

export function VerdictIcon({ verdict, size = 18 }: { verdict?: VerdictLevel; size?: number }) {
  if (verdict === "SCAM") return <ShieldAlert size={size} />;
  if (verdict === "TREAT_AS_SCAM") return <TriangleAlert size={size} />;
  return <CircleHelp size={size} />;
}

/** Solid pill with the fixed-vocabulary verdict. */
export function VerdictBadge({
  verdict,
  size = "md",
  className,
}: {
  verdict?: VerdictLevel;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const pad = size === "lg" ? "px-5 py-2 text-lg" : size === "sm" ? "px-2.5 py-0.5 text-[11px]" : "px-3.5 py-1 text-sm";
  const color =
    verdict === "SCAM"
      ? "bg-scam text-cream"
      : verdict === "TREAT_AS_SCAM"
        ? "bg-warn text-ink"
        : verdict === "NO_RED_FLAGS"
          ? "bg-calm text-cream"
          : "bg-ink-4 text-cream";
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full font-display font-extrabold uppercase tracking-wide whitespace-nowrap",
        pad,
        color,
        className,
      )}
    >
      <VerdictIcon verdict={verdict} size={size === "lg" ? 20 : size === "sm" ? 12 : 15} />
      {verdict ? VERDICT_LABEL[verdict] : "CHECKING"}
    </span>
  );
}

const KIND_ICON: Record<EvidenceKind, typeof Globe> = {
  browser: Globe,
  search: Search,
  domain: ScanSearch,
  language: MessageSquareWarning,
  memory: History,
  vision: ImageIcon,
};

/** One piece of evidence. `night` for the wall, default for paper surfaces. */
export function EvidenceChip({
  evidence,
  night = false,
  big = false,
  className,
}: {
  evidence: Evidence;
  night?: boolean;
  big?: boolean;
  className?: string;
}) {
  const t = TONE[evidence.tone];
  const Icon = KIND_ICON[evidence.kind] ?? Globe;
  return (
    <div
      className={cx(
        "flex items-start gap-3 rounded-2xl border animate-rise",
        big ? "px-5 py-3.5" : "px-3.5 py-2.5",
        night ? cx(t.nightBg, t.nightBorder, t.nightText) : cx(t.bg, t.border, t.text),
        className,
      )}
    >
      <Icon size={big ? 24 : 17} className="mt-0.5 shrink-0" />
      <div className="min-w-0">
        <div className={cx("font-semibold leading-snug", big ? "text-xl" : "text-sm")}>{evidence.title}</div>
        <div
          className={cx(
            "font-mono uppercase tracking-widest opacity-70",
            big ? "text-xs mt-1" : "text-[10px] mt-0.5",
          )}
        >
          {evidence.source}
        </div>
      </div>
    </div>
  );
}

/** Pulsing "live" dot. */
export function LiveDot({ className }: { className?: string }) {
  return <span className={cx("inline-block size-2 rounded-full bg-scam animate-pulse-dot", className)} />;
}

/**
 * The throwaway browser, as a picture. Shows Kernel's live view when one is running
 * (and `preferLiveView` is on), otherwise the screenshot stream, otherwise the final screenshot.
 * `frame` is the live frame counter from useLive().frames[case.id] / useCase().frame.
 */
export function LiveBrowser({
  item,
  frame,
  preferLiveView = true,
  night = true,
  className,
}: {
  item: CaseRecord;
  frame: number;
  preferLiveView?: boolean;
  night?: boolean;
  className?: string;
}) {
  const b = item.browser;
  const live = !!b?.live;
  const useIframe = live && preferLiveView && !!b?.liveViewUrl;
  const [bust, setBust] = useState(0);
  useEffect(() => {
    // when the session ends, reload once to pick up the final annotated screenshot
    if (!live) setBust((n) => n + 1);
  }, [live]);
  const hasPicture = live ? frame > 0 : !!b?.hasScreenshot;
  const src = `/api/cases/${item.id}/frame?n=${live ? frame : `final-${bust}`}`;
  const lastStep = b?.steps?.[b.steps.length - 1]?.label;
  const address = b?.finalUrl ?? item.primaryUrl ?? "";

  return (
    <div
      className={cx(
        "relative flex flex-col overflow-hidden rounded-[22px] border shadow-2xl",
        night ? "border-cream/15 bg-night-2" : "border-line bg-white",
        className,
      )}
    >
      <div
        className={cx(
          "flex items-center gap-3 px-4 py-2.5 border-b",
          night ? "border-cream/10 bg-night-3" : "border-line bg-paper-2",
        )}
      >
        <span className="flex gap-1.5">
          <i className="size-3 rounded-full bg-scam/80" />
          <i className="size-3 rounded-full bg-warn/80" />
          <i className={cx("size-3 rounded-full", night ? "bg-cream/25" : "bg-ink-4/40")} />
        </span>
        <div
          className={cx(
            "flex-1 truncate rounded-full px-3.5 py-1 font-mono text-xs",
            night ? "bg-night text-cream-2" : "bg-white text-ink-3 border border-line",
          )}
        >
          {address ? address.replace(/^http/i, "hxxp").replace(/\./g, "[.]") : "about:blank"}
        </div>
        <span
          className={cx(
            "hidden sm:flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest",
            night ? "text-cream-3" : "text-ink-4",
          )}
        >
          {live ? (
            <>
              <LiveDot /> live · throwaway browser
            </>
          ) : b?.tier && b.tier !== "none" ? (
            "session destroyed"
          ) : (
            "no browser"
          )}
        </span>
      </div>
      <div className={cx("relative flex-1 min-h-0", night ? "bg-night" : "bg-paper")}>
        {useIframe ? (
          <iframe
            src={`${b!.liveViewUrl}${b!.liveViewUrl!.includes("?") ? "&" : "?"}readOnly=true`}
            className="absolute inset-0 size-full border-0 bg-white"
            title="Live view of the throwaway cloud browser"
            allow="clipboard-read; clipboard-write"
          />
        ) : hasPicture ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="What the throwaway browser sees" className="absolute inset-0 size-full object-cover object-top" />
        ) : (
          <div
            className={cx(
              "absolute inset-0 grid place-items-center text-center px-6",
              night ? "text-cream-3" : "text-ink-4",
            )}
          >
            <div>
              <Globe size={40} className="mx-auto mb-3 opacity-60" />
              <div className="font-display text-xl font-bold">
                {b?.unreachable ? "The page would not load" : live ? "Opening the link…" : "No page to show"}
              </div>
              {b?.unreachable && <div className="mt-1 text-sm opacity-80">{b.unreachable}</div>}
            </div>
          </div>
        )}
        {live && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute inset-x-0 h-1/3 animate-scan bg-gradient-to-b from-transparent via-scam/10 to-transparent" />
          </div>
        )}
      </div>
      {lastStep && (
        <div
          className={cx(
            "flex items-center gap-2 px-4 py-2 border-t font-mono text-xs",
            night ? "border-cream/10 text-cream-2 bg-night-3" : "border-line text-ink-3 bg-paper-2",
          )}
        >
          {live && <LiveDot />}
          <span className="truncate">{lastStep}</span>
        </div>
      )}
    </div>
  );
}
