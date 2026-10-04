"use client";

// Poster type that always fits its column: every line is set at one size, as large as the
// widest line allows, capped at `maxRem`. Measured before paint, re-measured on resize.
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { cx } from "@/components/ui/kit";

export interface FitLine {
  text: string;
  className?: string;
}

const PROBE_PX = 200;

export function FitText({
  lines,
  maxRem,
  minRem = 1.5,
  className,
  innerClassName,
  innerStyle,
}: {
  lines: FitLine[];
  /** Largest size allowed, in rem (the wall scales rem with the screen). */
  maxRem: number;
  minRem?: number;
  /** Font, weight, tracking and leading go here so the measurement inherits them. */
  className?: string;
  /** Applied to the shrink-wrapped block of lines (so a transform pivots on the words). */
  innerClassName?: string;
  innerStyle?: CSSProperties;
}) {
  const box = useRef<HTMLDivElement>(null);
  const probe = useRef<HTMLDivElement>(null);
  const [px, setPx] = useState<number | null>(null);
  const signature = lines.map((l) => l.text).join("\n");

  const fit = useCallback(() => {
    const b = box.current;
    const p = probe.current;
    if (!b || !p) return;
    const available = b.clientWidth;
    const natural = p.offsetWidth; // layout width, so ancestor transforms cannot skew it
    if (available <= 0 || natural <= 0) return;
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const fitted = (available / natural) * PROBE_PX * 0.985;
    const next = Math.max(minRem * rem, Math.min(maxRem * rem, fitted));
    setPx((prev) => (prev !== null && Math.abs(prev - next) < 0.5 ? prev : next));
  }, [maxRem, minRem]);

  useLayoutEffect(() => {
    fit();
  }, [fit, signature]);

  useEffect(() => {
    const b = box.current;
    if (!b) return;
    let alive = true;
    const observer = new ResizeObserver(() => fit());
    observer.observe(b);
    window.addEventListener("resize", fit);
    // the display face may land after the first measurement
    document.fonts?.ready.then(() => alive && fit()).catch(() => {});
    return () => {
      alive = false;
      observer.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, [fit]);

  return (
    <div
      ref={box}
      className={cx("relative w-full", className)}
      style={{ fontSize: px ?? undefined, visibility: px === null ? "hidden" : undefined }}
    >
      <div aria-hidden className="pointer-events-none absolute left-0 top-0 size-0 overflow-hidden">
        <div ref={probe} className="absolute left-0 top-0 w-max whitespace-nowrap" style={{ fontSize: PROBE_PX }}>
          {lines.map((l, i) => (
            <div key={i} className={l.className}>
              {l.text}
            </div>
          ))}
        </div>
      </div>
      <div className={cx("w-fit", innerClassName)} style={innerStyle}>
        {lines.map((l, i) => (
          <div key={i} className={cx("whitespace-nowrap", l.className)}>
            {l.text}
          </div>
        ))}
      </div>
    </div>
  );
}
