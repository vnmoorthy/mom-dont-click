"use client";

// /check — "Paste it here. We'll click it so you don't have to."
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type DragEvent,
  type FormEvent,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  Camera,
  ClipboardPaste,
  EyeOff,
  HeartHandshake,
  ImagePlus,
  Link2,
  MessageSquareText,
  MousePointerClick,
  RefreshCw,
  X,
} from "lucide-react";
import { api, defang, useLive } from "@/lib/client";
import type { SeedInfo } from "@/lib/types";
import { cx } from "@/components/ui/kit";
import {
  Field,
  NavPill,
  Notice,
  PageShell,
  Spinner,
  btnPrimary,
  btnQuiet,
  cardClass,
  eyebrowClass,
  friendlyError,
  inputClass,
  isEmail,
  usePublicConfig,
} from "./bits";
import { InboxCard } from "./inbox-card";
import { fmtBytes, shrinkImage, type ShrunkImage } from "./screenshot";

type Mode = "link" | "text" | "image";

const MODES: { id: Mode; label: string; icon: typeof Link2 }[] = [
  { id: "link", label: "A link", icon: Link2 },
  { id: "text", label: "The whole message", icon: MessageSquareText },
  { id: "image", label: "A screenshot", icon: ImagePlus },
];

type CaseBody =
  | { kind: "link"; url: string; notifyEmail?: string }
  | { kind: "text"; text: string; notifyEmail?: string }
  | { kind: "image"; imageDataUrl: string; notifyEmail?: string };

/** Accepts bare domains and already-defanged links. Returns a full https/http URL or null. */
export function normaliseUrl(raw: string): string | null {
  let s = raw.trim().replace(/^[<("'\s]+|[>)"'\s.,;!]+$/g, "");
  if (!s || /\s/.test(s)) return null;
  s = s.replace(/^hxxp/i, "http").replace(/\[\.\]/g, ".");
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) s = `https://${s}`;
  try {
    const u = new URL(s);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (!u.hostname || (!u.hostname.includes(".") && u.hostname !== "localhost")) return null;
    return u.toString();
  } catch {
    return null;
  }
}

function looksLikeWholeMessage(s: string): boolean {
  const t = s.trim();
  return /\n/.test(t) || t.split(/\s+/).length > 4;
}

export function CheckScreen() {
  const router = useRouter();
  const live = useLive();
  const config = usePublicConfig(live.config);

  const [mode, setMode] = useState<Mode>("link");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [image, setImage] = useState<ShrunkImage | null>(null);
  const [imageBusy, setImageBusy] = useState(false);
  const [notify, setNotify] = useState("");

  const [mainError, setMainError] = useState<string | null>(null);
  const [notifyError, setNotifyError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [canPaste, setCanPaste] = useState(false);

  const [seeds, setSeeds] = useState<SeedInfo[] | null>(null);
  const [seedsFailed, setSeedsFailed] = useState(false);

  useEffect(() => {
    setCanPaste(typeof navigator !== "undefined" && !!navigator.clipboard?.readText && window.isSecureContext);
  }, []);

  const loadSeeds = useCallback(() => {
    setSeedsFailed(false);
    api<{ seeds: SeedInfo[] }>("/api/seeds")
      .then((d) => setSeeds(Array.isArray(d.seeds) ? d.seeds : []))
      .catch(() => setSeedsFailed(true));
  }, []);
  useEffect(() => {
    loadSeeds();
  }, [loadSeeds]);

  const pickMode = (next: Mode) => {
    setMode(next);
    setMainError(null);
    setSubmitError(null);
    setHint(null);
  };

  /* ------------------------------ pasting ------------------------------ */

  const switchToMessage = (pasted: string) => {
    setMode("text");
    setText(pasted.trim());
    setMainError(null);
    setHint("That looked like a whole message, so we put it in the message box.");
  };

  const onLinkPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text");
    if (pasted && looksLikeWholeMessage(pasted)) {
      e.preventDefault();
      switchToMessage(pasted);
    }
  };

  const pasteFromClipboard = async (target: "link" | "text") => {
    setHint(null);
    try {
      const s = await navigator.clipboard.readText();
      if (!s.trim()) {
        setHint("There is nothing copied yet. Copy the link or message first, then come back.");
        return;
      }
      setMainError(null);
      if (target === "link") {
        if (looksLikeWholeMessage(s)) switchToMessage(s);
        else setUrl(s.trim());
      } else {
        setText(s.trim());
      }
    } catch {
      setHint("Your phone would not let us read what you copied. Press and hold in the box, then choose Paste.");
    }
  };

  /* ---------------------------- screenshots ---------------------------- */

  const takeFile = useCallback(async (file: File | undefined | null) => {
    if (!file) return;
    setMainError(null);
    setImageBusy(true);
    try {
      setImage(await shrinkImage(file));
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      setImage(null);
      setMainError(
        code === "not-image"
          ? "That file is not a picture. Choose a screenshot or a photo."
          : "We could not read that picture. Try taking a fresh screenshot.",
      );
    } finally {
      setImageBusy(false);
    }
  }, []);

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // so the same file can be picked again after removing it
    void takeFile(file);
  };

  const [dragging, setDragging] = useState(false);
  const onDrop = (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    setDragging(false);
    void takeFile(e.dataTransfer.files?.[0]);
  };

  // On a laptop: Cmd/Ctrl+V a screenshot straight onto the page while the screenshot tab is open.
  useEffect(() => {
    if (mode !== "image") return;
    const onPaste = (e: globalThis.ClipboardEvent) => {
      const file = Array.from(e.clipboardData?.files ?? []).find((f) => f.type.startsWith("image/"));
      if (file) {
        e.preventDefault();
        void takeFile(file);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [mode, takeFile]);

  /* ------------------------------ submit ------------------------------- */

  const start = async (key: string, body: CaseBody | { kind: "seed"; seedId: string }) => {
    setBusy(key);
    setSubmitError(null);
    try {
      const { id } = await api<{ id: string }>("/api/cases", { body });
      if (!id) throw new Error("The checker did not give us a case number");
      router.push(`/case/${encodeURIComponent(id)}`);
      // stay busy: the page is about to change
    } catch (err) {
      setSubmitError(
        friendlyError(err, "We could not reach the checker just now. Give it a moment and press the button again."),
      );
      setBusy(null);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setMainError(null);
    setNotifyError(null);
    setHint(null);

    const notifyEmail = notify.trim();
    let body: CaseBody;

    if (mode === "link") {
      if (!url.trim()) return setMainError("Paste or type the link first.");
      const full = normaliseUrl(url);
      if (!full) return setMainError("That does not look like a link. It usually has a dot in it, like example.com.");
      body = { kind: "link", url: full };
    } else if (mode === "text") {
      const t = text.trim();
      if (t.length < 8) return setMainError("Paste the whole message so we have something to read.");
      body = { kind: "text", text: t };
    } else {
      if (imageBusy) return setMainError("One moment, the picture is still getting ready.");
      if (!image) return setMainError("Add a screenshot first.");
      body = { kind: "image", imageDataUrl: image.dataUrl };
    }

    if (notifyEmail) {
      if (!isEmail(notifyEmail)) return setNotifyError("That email address looks unfinished.");
      body.notifyEmail = notifyEmail;
    }
    void start("submit", body);
  };

  const preview = mode === "link" && url.trim() ? normaliseUrl(url) : null;
  const submitting = busy === "submit";

  return (
    <PageShell
      width="medium"
      nav={
        <NavPill href="/guard" icon={<HeartHandshake size={16} aria-hidden />} label="Guard someone" short="Guard" />
      }
    >
      <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-start lg:gap-14">
        {/* left column on a laptop; interleaved on a phone */}
        <div className="contents lg:flex lg:flex-col lg:gap-9">
          <div className="order-1">
            <p className={cx(eyebrowClass, "animate-rise")}>Got something sketchy?</p>
            <h1 className="mt-3 font-display text-[clamp(2.6rem,11vw,4.4rem)] font-extrabold leading-[0.95] tracking-tight animate-rise">
              Paste it here.
            </h1>
            <p
              className="mt-3 font-display text-[clamp(1.5rem,6vw,2.1rem)] font-bold leading-[1.08] tracking-tight text-ink-3 animate-rise"
              style={{ animationDelay: "70ms" }}
            >
              We&rsquo;ll click it so you don&rsquo;t have to.
            </p>
            <p className="mt-5 max-w-md text-lg text-ink-2 animate-rise" style={{ animationDelay: "140ms" }}>
              A link, a text, an email or a screenshot. You get one plain answer and what to do next.
            </p>
          </div>

          {config?.inboxEmail && <InboxCard email={config.inboxEmail} className="order-3 animate-rise" />}

          <p className="order-5 flex items-start gap-3 text-base text-ink-3">
            <EyeOff size={20} className="mt-0.5 shrink-0 text-ink-4" aria-hidden />
            <span>
              We open the link in a throwaway browser, far away from your phone. Only a cleaned-up subject line shows
              on the big screen.
            </span>
          </p>
        </div>

        {/* right column on a laptop */}
        <div className="contents lg:flex lg:flex-col lg:gap-8">
          <form
            onSubmit={onSubmit}
            noValidate
            className={cx(cardClass, "order-2 p-4 animate-rise sm:p-6")}
            style={{ animationDelay: "120ms" }}
          >
            {/* segmented control */}
            <div
              role="radiogroup"
              aria-label="What do you want us to check?"
              className="grid grid-cols-3 gap-1 rounded-[20px] bg-paper-2 p-1 sm:grid-cols-[0.75fr_1.35fr_1.05fr]"
            >
              {MODES.map((m) => {
                const on = m.id === mode;
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => pickMode(m.id)}
                    className={cx(
                      "relative flex min-h-[4.25rem] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-center",
                      "text-[13px] font-semibold leading-tight transition-colors duration-200 sm:min-h-12 sm:flex-row sm:gap-2 sm:text-sm",
                      "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
                      on ? "text-cream" : "text-ink-3 hover:text-ink",
                    )}
                  >
                    {on && (
                      <motion.span
                        layoutId="check-mode-pill"
                        className="absolute inset-0 rounded-2xl bg-ink"
                        transition={{ type: "spring", stiffness: 520, damping: 40 }}
                      />
                    )}
                    <Icon size={18} className="relative shrink-0" aria-hidden />
                    <span className="relative">{m.label}</span>
                  </button>
                );
              })}
            </div>

            {/* the three inputs */}
            <div className="mt-5">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={mode}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                >
                  {mode === "link" && (
                    <Field label="Paste or type the link" error={mainError}>
                      {({ id, describedBy, invalid }) => (
                        <div className="relative">
                          <input
                            id={id}
                            type="text"
                            inputMode="url"
                            autoCapitalize="none"
                            autoCorrect="off"
                            autoComplete="off"
                            spellCheck={false}
                            enterKeyHint="go"
                            placeholder="example.com/track"
                            value={url}
                            onChange={(e) => {
                              setUrl(e.target.value);
                              if (mainError) setMainError(null);
                            }}
                            onPaste={onLinkPaste}
                            aria-invalid={invalid}
                            aria-describedby={describedBy}
                            className={cx(
                              inputClass,
                              "font-mono text-base",
                              canPaste && "pr-[5.5rem]",
                              invalid && "border-scam focus:border-scam focus:ring-scam/15",
                            )}
                          />
                          {canPaste && (
                            <button
                              type="button"
                              onClick={() => pasteFromClipboard("link")}
                              className="absolute right-2 top-1/2 inline-flex h-9 -translate-y-1/2 items-center gap-1.5 rounded-full bg-paper-2 px-3 text-sm font-semibold text-ink transition hover:bg-paper-3"
                            >
                              <ClipboardPaste size={15} aria-hidden />
                              Paste
                            </button>
                          )}
                        </div>
                      )}
                    </Field>
                  )}

                  {mode === "text" && (
                    <Field label="Paste the email or text message" error={mainError}>
                      {({ id, describedBy, invalid }) => (
                        <div>
                          <textarea
                            id={id}
                            rows={7}
                            placeholder="Paste everything they sent you, word for word."
                            value={text}
                            onChange={(e) => {
                              setText(e.target.value);
                              if (mainError) setMainError(null);
                            }}
                            aria-invalid={invalid}
                            aria-describedby={describedBy}
                            className={cx(
                              inputClass,
                              "min-h-44 resize-y leading-relaxed",
                              invalid && "border-scam focus:border-scam focus:ring-scam/15",
                            )}
                          />
                          <div className="mt-2 flex items-center justify-between gap-3">
                            <span className="font-mono text-xs text-ink-4 tabular">
                              {text.trim().length > 0 ? `${text.trim().length} characters` : "nothing pasted yet"}
                            </span>
                            <div className="flex gap-2">
                              {text.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setText("")}
                                  className={cx(btnQuiet, "h-9 px-3.5 text-sm")}
                                >
                                  <X size={15} aria-hidden />
                                  Clear
                                </button>
                              )}
                              {canPaste && (
                                <button
                                  type="button"
                                  onClick={() => pasteFromClipboard("text")}
                                  className={cx(btnQuiet, "h-9 px-3.5 text-sm")}
                                >
                                  <ClipboardPaste size={15} aria-hidden />
                                  Paste
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </Field>
                  )}

                  {mode === "image" && (
                    <div>
                      <div className="mb-2 text-base font-semibold text-ink">Add the screenshot</div>
                      {image ? (
                        <div className="overflow-hidden rounded-2xl border border-line bg-paper-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={image.dataUrl}
                            alt="The screenshot you chose"
                            className="mx-auto max-h-72 w-auto max-w-full object-contain"
                          />
                          <div className="flex items-center justify-between gap-3 border-t border-line bg-white px-3.5 py-2.5">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-ink">{image.name}</div>
                              <div className="font-mono text-xs text-ink-4 tabular">
                                {image.width} × {image.height} · {fmtBytes(image.bytes)}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setImage(null);
                                setMainError(null);
                              }}
                              className={cx(btnQuiet, "h-9 shrink-0 px-3.5 text-sm")}
                            >
                              <X size={15} aria-hidden />
                              Remove
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <label
                            onDragOver={(e) => {
                              e.preventDefault();
                              setDragging(true);
                            }}
                            onDragLeave={() => setDragging(false)}
                            onDrop={onDrop}
                            className={cx(
                              "flex min-h-44 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-5 py-8 text-center transition duration-150",
                              "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink",
                              dragging ? "border-ink bg-paper-2" : "border-line bg-white hover:border-ink-4",
                              mainError && "border-scam/60",
                            )}
                          >
                            <input type="file" accept="image/*" onChange={onFileChange} className="sr-only" />
                            {imageBusy ? (
                              <>
                                <Spinner size={26} className="text-ink-3" />
                                <span className="text-base font-semibold text-ink-2">Getting the picture ready…</span>
                              </>
                            ) : (
                              <>
                                <span className="grid size-12 place-items-center rounded-full bg-paper-2 text-ink">
                                  <ImagePlus size={22} aria-hidden />
                                </span>
                                <span className="text-lg font-semibold text-ink">Choose a screenshot</span>
                                <span className="text-sm text-ink-3">
                                  From your photos. On a computer you can also drop or paste one here.
                                </span>
                              </>
                            )}
                          </label>
                          <label
                            className={cx(
                              btnQuiet,
                              "mt-3 h-12 w-full cursor-pointer text-base has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink",
                            )}
                          >
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              onChange={onFileChange}
                              className="sr-only"
                            />
                            <Camera size={18} aria-hidden />
                            Take a photo of it instead
                          </label>
                        </div>
                      )}
                      {mainError && (
                        <p role="alert" className="mt-2 text-base text-scam-deep animate-rise">
                          {mainError}
                        </p>
                      )}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {preview && !mainError && (
                <p className="mt-2 text-sm text-ink-3">
                  We will open <span className="defanged text-ink-2">{defang(preview)}</span> for you.
                </p>
              )}
              {hint && (
                <p role="status" className="mt-2 text-sm text-ink-3 animate-rise">
                  {hint}
                </p>
              )}
            </div>

            {config?.capabilities.email && (
              <div className="mt-5 border-t border-line pt-5">
                <Field
                  label="Email me the verdict"
                  optional
                  error={notifyError}
                  hint="Only if you want a copy. You will see the answer on the next screen either way."
                >
                  {({ id, describedBy, invalid }) => (
                    <input
                      id={id}
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      autoCapitalize="none"
                      spellCheck={false}
                      placeholder="you@example.com"
                      value={notify}
                      onChange={(e) => {
                        setNotify(e.target.value);
                        if (notifyError) setNotifyError(null);
                      }}
                      aria-invalid={invalid}
                      aria-describedby={describedBy}
                      className={cx(inputClass, invalid && "border-scam focus:border-scam focus:ring-scam/15")}
                    />
                  )}
                </Field>
              </div>
            )}

            <button type="submit" disabled={!!busy} className={cx(btnPrimary, "mt-6 h-16 w-full text-xl")}>
              {submitting ? (
                <>
                  <Spinner size={22} />
                  Sending it in…
                </>
              ) : (
                <>
                  Check it for me
                  <ArrowRight size={22} aria-hidden />
                </>
              )}
            </button>

            {submitError && (
              <Notice tone="red" role="alert" className="mt-4 animate-rise">
                {submitError}
              </Notice>
            )}
          </form>

          {/* examples */}
          <section className="order-4">
            <h2 className="font-display text-xl font-extrabold tracking-tight">Nothing sketchy handy? Try one of ours.</h2>
            <p className="mt-1 text-sm text-ink-3">Messages we wrote ourselves, most of them scams. Tap one and watch it get checked.</p>
            <div className="mt-3.5 flex flex-wrap gap-2">
              {seedsFailed ? (
                <div className="flex w-full flex-wrap items-center gap-3 rounded-2xl border border-line bg-paper-2 px-4 py-3 text-base text-ink-2">
                  <span className="min-w-0 flex-1">Our examples would not load just now.</span>
                  <button type="button" onClick={loadSeeds} className={cx(btnQuiet, "h-9 px-3.5 text-sm")}>
                    <RefreshCw size={14} aria-hidden />
                    Try again
                  </button>
                </div>
              ) : seeds === null ? (
                [112, 148, 96, 132].map((w) => (
                  <span
                    key={w}
                    className="h-11 animate-pulse rounded-full bg-paper-2"
                    style={{ width: w }}
                    aria-hidden
                  />
                ))
              ) : seeds.length === 0 ? (
                <p className="text-base text-ink-3">No examples are loaded right now. Paste your own above.</p>
              ) : (
                seeds.map((s) => {
                  const key = `seed:${s.id}`;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      disabled={!!busy}
                      title={s.subject}
                      onClick={() => start(key, { kind: "seed", seedId: s.id })}
                      className={cx(btnQuiet, "h-11 px-4 text-[15px]")}
                    >
                      {busy === key ? (
                        <Spinner size={15} />
                      ) : s.hasPage ? (
                        <MousePointerClick size={15} className="text-ink-4" aria-hidden />
                      ) : null}
                      {s.label}
                    </button>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </div>
    </PageShell>
  );
}
