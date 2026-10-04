"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Wordmark, cx } from "@/components/ui/kit";
import { GITHUB_URL } from "./links";

const LINKS = [
  { href: "/check", label: "Check something", primary: true },
  { href: "/guard", label: "Guard someone", primary: false },
  { href: "/wall", label: "The wall", primary: false },
] as const;

/** Top navigation for the paper pages (home, eval, console, training index). */
export function SiteNav({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className={cx("relative z-30", className)}>
      <nav
        aria-label="Main"
        className="mx-auto flex max-w-[1240px] items-center justify-between gap-4 px-5 py-4 sm:px-8 sm:py-6"
      >
        <Link
          href="/"
          aria-label="Mom, Don't Click, home"
          className="rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-scam"
        >
          <Wordmark />
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {LINKS.filter((l) => !l.primary).map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-full px-4 py-2 text-[15px] font-semibold text-ink-2 transition-colors hover:bg-paper-2 focus-visible:outline-2 focus-visible:outline-scam"
            >
              {l.label}
            </Link>
          ))}
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full px-4 py-2 text-[15px] font-semibold text-ink-2 transition-colors hover:bg-paper-2 focus-visible:outline-2 focus-visible:outline-scam"
          >
            GitHub
            <ArrowUpRight size={15} />
          </a>
          <Link
            href="/check"
            className="ml-2 rounded-full bg-ink px-5 py-2.5 text-[15px] font-semibold text-cream transition-[transform,background-color] hover:bg-ink-2 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-scam"
          >
            Check something
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="site-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          className="grid size-11 place-items-center rounded-full border border-line bg-white/70 text-ink active:scale-95 md:hidden"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            id="site-menu"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-x-4 top-full rounded-[22px] border border-line bg-paper p-2 shadow-[0_24px_48px_-20px_rgba(23,19,15,0.35)] md:hidden"
          >
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between rounded-2xl px-4 py-3.5 font-display text-xl font-bold text-ink active:bg-paper-2"
              >
                {l.label}
                <ArrowUpRight size={18} className="rotate-45 text-ink-4" />
              </Link>
            ))}
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between rounded-2xl px-4 py-3.5 font-display text-xl font-bold text-ink active:bg-paper-2"
            >
              GitHub
              <ArrowUpRight size={18} className="text-ink-4" />
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
