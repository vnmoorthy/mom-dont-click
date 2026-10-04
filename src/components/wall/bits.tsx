"use client";

import { ClipboardPaste, Image as ImageIcon, Mail } from "lucide-react";
import { timeAgo, useNow } from "@/lib/client";
import type { CaseChannel } from "@/lib/types";

/** How it arrived: forwarded mail, a pasted link or a screenshot. */
export function ChannelIcon({ channel, className }: { channel: CaseChannel; className?: string }) {
  const Icon = channel === "paste" ? ClipboardPaste : channel === "screenshot" ? ImageIcon : Mail;
  return <Icon className={className} aria-hidden />;
}

/** Relative time that keeps itself fresh without re-rendering its parent. */
export function Ago({ ts, className }: { ts: number; className?: string }) {
  const now = useNow(10_000);
  return <span className={className}>{timeAgo(ts, now)}</span>;
}

export const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];
export const EASE_IN_OUT: [number, number, number, number] = [0.65, 0, 0.35, 1];
