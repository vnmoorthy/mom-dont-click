"use client";

// The try-it-now box in the hero: paste a link or a message, get a case.
import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { api } from "@/lib/client";
import type { SeedInfo } from "@/lib/types";
import { cx } from "@/components/ui/kit";
import { friendlyError, parseLink } from "./bits";
import { QUICK_CHECK_INPUT_ID } from "./links";

type Busy = null | { kind: "form" } | { kind: "seed"; id: string };

export function QuickCheck({ className }: { className?: string }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const [shaking, setShaking] = useState(false);
  const [seeds, setSeeds] = useState<SeedInfo[]>([]);
  const input = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let alive = true;
    api<{ seeds: SeedInfo[] }>("/api/seeds")
      .then((d) => alive && setSeeds(Array.isArray(d.seeds) ? d.seeds : []))
      .catch(() => {
        // The examples are a bonus. Without them the paste box still works.
      });
    return () => {
      alive = false;
    };
  }, []);

  const grow = useCallback(() => {
    const el = input.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 168)}px`;
  }, []);

  useEffect(() => {
    grow();
  }, [value, grow]);

  const trimmed = value.trim();
  const link = trimmed ? parseLink(trimmed) : null;

  const start = useCallback(
    async (body: Record<string, unknown>, marker: Busy) => {
      setBusy(marker);
      setError(null);
      try {
        const { id } = await api<{ id: string }>("/api/cases", { body });
        if (!id) throw new Error("");
        router.push(`/case/${id}`);
        // stay "busy" while the case page loads
      } catch (err) {
        setError(friendlyError(err));
        setBusy(null);
      }
    },
    [router],
  );

  const submit = useCallback(
    (e?: FormEvent) => {
      e?.preventDefault();
      if (busy) return;
      if (!trimmed) {
        setError("Paste the link or the message first.");
        setShaking(true);
        input.current?.focus();
        return;
      }
      void start(link ? { kind: "link", url: link } : { kind: "text", text: trimmed }, { kind: "form" });
    },
    [busy, trimmed, link, start],
  );

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  const formBusy = busy?.kind === "form";

  return (
    <div className={className}>
      <form onSubmit={submit} noValidate aria-busy={!!busy}>
        <label htmlFor={QUICK_CHECK_INPUT_ID} className="sr-only">
          Paste a sketchy link or message
        </label>
        <div
          onAnimationEnd={() => setShaking(false)}
          className={cx(
            "flex flex-col gap-2 rounded-[22px] border-2 bg-white p-2 shadow-[0_18px_40px_-24px_rgba(23,19,15,0.45)] transition-colors sm:flex-row sm:items-end",
            error ? "border-scam" : "border-ink focus-within:border-ink",
            shaking && "animate-shake",
          )}
        >
          <textarea
            id={QUICK_CHECK_INPUT_ID}
            ref={input}
            rows={1}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={onKeyDown}
            placeholder="Paste a sketchy link or message"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            disabled={!!busy}
            aria-invalid={!!error}
            aria-describedby="quick-check-hint"
            className="min-h-[52px] w-full flex-1 resize-none bg-transparent px-4 py-3.5 text-lg leading-snug text-ink placeholder:text-ink-4 focus:outline-none disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!!busy}
            className="inline-flex h-[52px] shrink-0 items-center justify-center gap-2 rounded-2xl bg-scam px-6 font-display text-lg font-extrabold tracking-tight text-cream transition-[transform,background-color] hover:bg-scam-deep active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-wait disabled:opacity-80"
          >
            {formBusy ? (
              <>
                <LoaderCircle size={20} className="animate-spin" />
                Opening it
              </>
            ) : (
              <>
                Check it
                <ArrowRight size={20} strokeWidth={2.6} />
              </>
            )}
          </button>
        </div>

        <p
          id="quick-check-hint"
          role={error ? "alert" : undefined}
          className={cx("mt-2.5 min-h-5 px-1 text-sm", error ? "font-semibold text-scam-deep" : "text-ink-3")}
        >
          {error
            ? error
            : !trimmed
              ? "Nothing to install. We open it somewhere far away from your computer."
              : link
                ? "That reads like a link. We will open it in a throwaway browser."
                : "That reads like a message. We will read it and open any link inside."}
        </p>
      </form>

      {seeds.length > 0 && (
        <div className="mt-4 animate-rise">
          <div className="px-1 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-3">
            Nothing sketchy to hand? Try one of ours
          </div>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {seeds.slice(0, 6).map((s) => {
              const mine = busy?.kind === "seed" && busy.id === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  disabled={!!busy}
                  onClick={() => void start({ kind: "seed", seedId: s.id }, { kind: "seed", id: s.id })}
                  title={s.subject}
                  className={cx(
                    "inline-flex items-center gap-2 rounded-full border border-line bg-white/70 px-4 py-2 text-[15px] font-semibold text-ink-2 transition-[transform,background-color,border-color] hover:border-ink hover:bg-white active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-scam disabled:cursor-wait",
                    busy && !mine && "opacity-50",
                  )}
                >
                  {mine && <LoaderCircle size={15} className="animate-spin" />}
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
