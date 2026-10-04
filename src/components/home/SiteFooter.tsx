import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Wordmark } from "@/components/ui/kit";
import { GITHUB_URL } from "./links";

/** The honest footer. Shared by the paper pages. */
export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto max-w-[1240px] px-5 py-12 sm:px-8 sm:py-16">
        <p className="max-w-4xl font-display text-[clamp(1.5rem,3.6vw,2.6rem)] font-extrabold leading-[1.08] tracking-[-0.025em] text-ink">
          A second opinion, not a guarantee.{" "}
          <span className="text-ink-3">
            When in doubt, go to the official site yourself or call the number on your card.
          </span>
        </p>

        <div className="mt-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" aria-label="Mom, Don't Click, home" className="w-fit rounded-xl">
            <Wordmark size="sm" />
          </Link>
          <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-6 gap-y-3 text-[15px] font-semibold text-ink-2">
            <Link href="/eval" className="underline decoration-line decoration-2 underline-offset-4 hover:decoration-ink">
              How accurate is it?
            </Link>
            <Link href="/fake" className="underline decoration-line decoration-2 underline-offset-4 hover:decoration-ink">
              Training pages
            </Link>
            <Link href="/console" className="underline decoration-line decoration-2 underline-offset-4 hover:decoration-ink">
              Console
            </Link>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 underline decoration-line decoration-2 underline-offset-4 hover:decoration-ink"
            >
              GitHub
              <ArrowUpRight size={14} />
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
