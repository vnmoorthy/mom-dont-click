"use client";

// Keyboard hints for whoever is driving the wall. Every hint is also a button.
import type { ReactNode } from "react";
import { cx } from "@/components/ui/kit";

function Hint({
  keys,
  children,
  onClick,
  disabled,
  focusable,
}: {
  keys: string;
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  focusable: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      tabIndex={focusable ? 0 : -1}
      onClick={(e) => {
        // do not keep focus, or Space would press this button instead of dismissing a verdict
        e.currentTarget.blur();
        onClick();
      }}
      className="flex cursor-pointer items-center gap-2 rounded-full px-3 py-1 outline-none transition-colors hover:bg-cream/10 focus-visible:bg-cream/15 disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent"
    >
      <kbd className="rounded-md border border-cream/25 bg-night px-1.5 py-0.5 font-mono text-xs text-cream">
        {keys}
      </kbd>
      <span>{children}</span>
    </button>
  );
}

export function HintBar({
  visible,
  fullscreen,
  gridOnly,
  canReplay,
  slamming,
  onFullscreen,
  onGrid,
  onReplay,
  onDismiss,
}: {
  visible: boolean;
  fullscreen: boolean;
  gridOnly: boolean;
  canReplay: boolean;
  slamming: boolean;
  onFullscreen: () => void;
  onGrid: () => void;
  onReplay: () => void;
  onDismiss: () => void;
}) {
  return (
    <div
      aria-hidden={!visible}
      className={cx(
        "pointer-events-none fixed inset-x-0 bottom-2 z-[55] hidden justify-center px-4 transition-opacity duration-500 lg:flex",
        visible ? "opacity-100" : "opacity-0",
      )}
    >
      <div
        className={cx(
          "flex max-w-full flex-wrap items-center justify-center gap-1 rounded-full border border-cream/15 bg-night-3/90 p-1 text-sm text-cream-2 shadow-2xl backdrop-blur",
          visible && "pointer-events-auto",
        )}
      >
        <Hint keys="F" onClick={onFullscreen} focusable={visible}>
          {fullscreen ? "Leave full screen" : "Full screen"}
        </Hint>
        <Hint keys="G" onClick={onGrid} focusable={visible}>
          {gridOnly ? "Show the invitation" : "Grid only"}
        </Hint>
        <Hint keys="R" onClick={onReplay} disabled={!canReplay || slamming} focusable={visible}>
          Replay last verdict
        </Hint>
        <Hint keys="Space" onClick={onDismiss} disabled={!slamming} focusable={visible}>
          Dismiss verdict
        </Hint>
      </div>
    </div>
  );
}
