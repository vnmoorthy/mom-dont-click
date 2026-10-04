"use client";

// /guard — "Be the first to know, without being the help desk."
import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, BellRing, Check, Forward, Link2, MousePointerClick, Plus } from "lucide-react";
import { api, useGuardianAlert, useLive } from "@/lib/client";
import type { GuardianPublic } from "@/lib/types";
import { cx } from "@/components/ui/kit";
import {
  CopyButton,
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
import { LockScreen } from "./lock-screen";

const QUICK_NAMES = ["Mom", "Dad", "Grandma", "Grandpa"];

const HOW = [
  { icon: Forward, lead: "They forward", rest: "anything that feels off. One address, nothing to install." },
  { icon: MousePointerClick, lead: "It clicks", rest: "the link in a throwaway browser, so they never have to." },
  { icon: BellRing, lead: "You only hear when it matters", rest: "One short note when a scam turns up. No daily digest." },
];

export function GuardScreen() {
  const live = useLive();
  const config = usePublicConfig(live.config);

  const [guardianEmail, setGuardianEmail] = useState("");
  const [parentName, setParentName] = useState("Mom");
  const [parentEmail, setParentEmail] = useState("");
  const [errors, setErrors] = useState<{ guardianEmail?: string; parentName?: string; parentEmail?: string }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [guardian, setGuardian] = useState<GuardianPublic | null>(null);
  const [arrived, setArrived] = useState(0);

  /* on duty: while this page is open, a real heads-up lands right here as well as by email */
  const alert = useGuardianAlert(guardian?.id);
  useEffect(() => {
    if (!alert) return;
    setArrived((n) => n + 1);
    try {
      navigator.vibrate?.([120, 60, 120]);
    } catch {}
  }, [alert]);

  /* live counter */
  const [count, setCount] = useState<number | null>(null);
  const loadCount = useCallback(() => {
    api<{ guardians?: GuardianPublic[]; count?: number }>("/api/guard")
      .then((d) => setCount(typeof d.count === "number" ? d.count : (d.guardians?.length ?? 0)))
      .catch(() => {});
  }, []);
  useEffect(() => {
    loadCount();
  }, [loadCount, live.lastGuardian, live.resetCount]);

  const name = parentName.trim();
  const shownName = guardian?.parentName || name || "Mom";

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const next: typeof errors = {};
    const gEmail = guardianEmail.trim();
    const pEmail = parentEmail.trim();
    if (!gEmail) next.guardianEmail = "We need your email so we know where to send the note.";
    else if (!isEmail(gEmail)) next.guardianEmail = "That email address looks unfinished.";
    if (!name) next.parentName = "Tell us what you call them, like Mom or Aunt Rosa.";
    else if (name.length > 40) next.parentName = "Keep it short, like Mom or Aunt Rosa.";
    if (pEmail && !isEmail(pEmail)) next.parentEmail = "That email address looks unfinished.";
    else if (pEmail && pEmail.toLowerCase() === gEmail.toLowerCase())
      next.parentEmail = "That is your own address. Leave this empty to try it with our demo Mom.";
    setErrors(next);
    setSubmitError(null);
    if (Object.keys(next).length > 0) return;

    setBusy(true);
    try {
      const body: { guardianEmail: string; parentName: string; parentEmail?: string } = {
        guardianEmail: gEmail,
        parentName: name,
      };
      if (pEmail) body.parentEmail = pEmail;
      const res = await api<{ guardian: GuardianPublic }>("/api/guard", { body });
      if (!res.guardian) throw new Error("We did not get a confirmation back");
      setGuardian(res.guardian);
      setArrived((n) => n + 1);
      loadCount();
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setSubmitError(friendlyError(err, "We could not sign you up just now. Give it a moment and try again."));
    } finally {
      setBusy(false);
    }
  };

  const startOver = () => {
    setGuardian(null);
    setParentName("Mom");
    setParentEmail("");
    setErrors({});
    setSubmitError(null);
  };

  return (
    <PageShell
      width="medium"
      nav={
        <NavPill href="/check" icon={<Link2 size={16} aria-hidden />} label="Check a link" short="Check" />
      }
    >
      <div className="flex flex-col gap-9 lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-start lg:gap-14">
        <div className="contents lg:flex lg:flex-col lg:gap-9">
          {/* headline */}
          <div className="order-1">
            <AnimatePresence mode="wait" initial={false}>
              {guardian ? (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                >
                  <p className={cx(eyebrowClass, "flex items-center gap-2")}>
                    <span className="grid size-5 place-items-center rounded-full bg-ink text-cream">
                      <Check size={12} strokeWidth={3.2} aria-hidden />
                    </span>
                    You are set
                  </p>
                  <h1 className="mt-3 text-balance break-words font-display text-[clamp(2.4rem,10vw,4rem)] font-extrabold leading-[0.97] tracking-tight">
                    You are guarding {shownName}.
                  </h1>
                  <p className="mt-5 max-w-lg text-lg text-ink-2">
                    {config && !config.capabilities.email ? (
                      <>Email is switched off on this server, so the heads-up will land on this page while you keep it open.{" "}</>
                    ) : (
                      <>
                        We will write to{" "}
                        <span className="font-mono text-base font-semibold text-ink">{guardian.guardianEmailMasked}</span>,
                        and only when a scam turns up.{" "}
                      </>
                    )}
                    {guardian.parentEmailMasked ? (
                      <>
                        We are watching for anything forwarded from{" "}
                        <span className="font-mono text-base font-semibold text-ink">{guardian.parentEmailMasked}</span>.
                      </>
                    ) : (
                      <>
                        You left their address empty, so for now this is hooked up to our demo inbox. Send in one of
                        our example scams and you will see the note arrive.
                      </>
                    )}
                  </p>
                </motion.div>
              ) : (
                <motion.div key="intro" exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.16 }}>
                  <p className={cx(eyebrowClass, "animate-rise")}>For the grown-up kids</p>
                  <h1 className="mt-3 font-display text-[clamp(2.5rem,10.5vw,4.2rem)] font-extrabold leading-[0.95] tracking-tight animate-rise">
                    Be the first to know.
                  </h1>
                  <p
                    className="mt-3 font-display text-[clamp(1.45rem,6vw,2.1rem)] font-bold leading-[1.08] tracking-tight text-ink-3 animate-rise"
                    style={{ animationDelay: "70ms" }}
                  >
                    Without being the help desk.
                  </p>
                  <p className="mt-5 max-w-lg text-lg text-ink-2 animate-rise" style={{ animationDelay: "140ms" }}>
                    When a scam reaches someone you love, we check it for them and send you one short note. That is
                    all.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* form, or next steps */}
          <div className={guardian ? "order-3" : "order-2"}>
            {guardian ? (
              <div className="space-y-6 animate-rise">
                <div>
                  <h2 className="font-display text-2xl font-extrabold leading-tight tracking-tight">
                    One thing left to do
                  </h2>
                  {config?.inboxEmail ? (
                    <InboxCard
                      email={config.inboxEmail}
                      lead={`Now have ${shownName} forward anything sketchy to`}
                      note="Save it in their contacts as “Is this a scam?” so it is easy to find."
                      className="mt-6"
                    />
                  ) : (
                    <div className={cx(cardClass, "mt-4 p-5")}>
                      <p className="text-lg text-ink-2">
                        Now have {shownName} paste anything sketchy at{" "}
                        <Link
                          href="/check"
                          className="rounded font-mono font-semibold text-ink underline decoration-ink-4 underline-offset-4 outline-none hover:decoration-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                        >
                          /check
                        </Link>
                        . It works on any phone, with nothing to install.
                      </p>
                      <CopyButton
                        text={() => `${window.location.origin}/check`}
                        label="Copy the link to send them"
                        copiedLabel="Link copied"
                        className={cx(btnQuiet, "mt-4 h-11 text-sm")}
                      />
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <Link href="/check" className={cx(btnPrimary, "min-h-14 text-lg")}>
                    See it catch one now
                    <ArrowRight size={20} aria-hidden />
                  </Link>
                  <button type="button" onClick={startOver} className={cx(btnQuiet, "min-h-14 text-base")}>
                    <Plus size={18} aria-hidden />
                    Guard someone else
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={onSubmit} noValidate className={cx(cardClass, "space-y-5 p-4 animate-rise sm:p-6")}>
                <Field label="Your email" error={errors.guardianEmail}>
                  {({ id, describedBy, invalid }) => (
                    <input
                      id={id}
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      autoCapitalize="none"
                      spellCheck={false}
                      required
                      placeholder="you@example.com"
                      value={guardianEmail}
                      onChange={(e) => {
                        setGuardianEmail(e.target.value);
                        if (errors.guardianEmail) setErrors((p) => ({ ...p, guardianEmail: undefined }));
                      }}
                      aria-invalid={invalid}
                      aria-describedby={describedBy}
                      className={cx(inputClass, invalid && "border-scam focus:border-scam focus:ring-scam/15")}
                    />
                  )}
                </Field>

                <Field label="What do you call them?" error={errors.parentName}>
                  {({ id, describedBy, invalid }) => (
                    <div>
                      <div className="mb-2.5 flex flex-wrap gap-2" role="group" aria-label="Quick picks">
                        {QUICK_NAMES.map((q) => {
                          const on = name.toLowerCase() === q.toLowerCase();
                          return (
                            <button
                              key={q}
                              type="button"
                              aria-pressed={on}
                              onClick={() => {
                                setParentName(q);
                                if (errors.parentName) setErrors((p) => ({ ...p, parentName: undefined }));
                              }}
                              className={cx(
                                "h-11 rounded-full border px-4 text-base font-semibold transition duration-150 active:scale-[0.97]",
                                "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
                                on
                                  ? "border-ink bg-ink text-cream"
                                  : "border-line bg-white text-ink hover:border-ink-4",
                              )}
                            >
                              {q}
                            </button>
                          );
                        })}
                      </div>
                      <input
                        id={id}
                        type="text"
                        autoComplete="off"
                        maxLength={40}
                        placeholder="Or type a name, like Aunt Rosa"
                        value={parentName}
                        onChange={(e) => {
                          setParentName(e.target.value);
                          if (errors.parentName) setErrors((p) => ({ ...p, parentName: undefined }));
                        }}
                        aria-invalid={invalid}
                        aria-describedby={describedBy}
                        className={cx(inputClass, invalid && "border-scam focus:border-scam focus:ring-scam/15")}
                      />
                    </div>
                  )}
                </Field>

                <Field
                  label="Their email address"
                  optional
                  error={errors.parentEmail}
                  hint="Leave this empty to try it with our demo Mom."
                >
                  {({ id, describedBy, invalid }) => (
                    <input
                      id={id}
                      type="email"
                      inputMode="email"
                      autoComplete="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      placeholder="mom@example.com"
                      value={parentEmail}
                      onChange={(e) => {
                        setParentEmail(e.target.value);
                        if (errors.parentEmail) setErrors((p) => ({ ...p, parentEmail: undefined }));
                      }}
                      aria-invalid={invalid}
                      aria-describedby={describedBy}
                      className={cx(inputClass, invalid && "border-scam focus:border-scam focus:ring-scam/15")}
                    />
                  )}
                </Field>

                <button type="submit" disabled={busy} className={cx(btnPrimary, "h-16 w-full text-xl")}>
                  {busy ? (
                    <>
                      <Spinner size={22} />
                      Setting it up…
                    </>
                  ) : (
                    <>
                      <span className="min-w-0 truncate">Start guarding {name || "them"}</span>
                      <ArrowRight size={22} className="shrink-0" aria-hidden />
                    </>
                  )}
                </button>

                {submitError && (
                  <Notice tone="red" role="alert" className="animate-rise">
                    {submitError}
                  </Notice>
                )}
              </form>
            )}
          </div>

          {/* how it works + counter */}
          <div className="order-4">
            <ol className="space-y-4">
              {HOW.map((h, i) => {
                const Icon = h.icon;
                return (
                  <li key={h.lead} className="flex items-start gap-4">
                    <span className="grid size-11 shrink-0 place-items-center rounded-full border border-line bg-white/75 text-ink">
                      <Icon size={19} aria-hidden />
                    </span>
                    <p className="pt-1.5 text-lg leading-snug text-ink-2">
                      <span className="font-mono text-xs text-ink-4 tabular">{i + 1} </span>
                      <span className="font-semibold text-ink">{h.lead}</span> {h.rest}
                    </p>
                  </li>
                );
              })}
            </ol>

            {count !== null && (
              <p className="mt-7 flex items-center gap-2.5 border-t border-line pt-5 text-base text-ink-2" aria-live="polite">
                <span className="size-2 shrink-0 rounded-full bg-ink" aria-hidden />
                {count === 0 ? (
                  "Nobody is guarding anyone yet. Be the first."
                ) : (
                  <span>
                    <span key={count} className="inline-block font-display text-xl font-extrabold text-ink tabular animate-rise">
                      {count.toLocaleString()}
                    </span>{" "}
                    {count === 1 ? "person is" : "people are"} guarding someone
                  </span>
                )}
              </p>
            )}
          </div>
        </div>

        {/* the note they will get */}
        <div className={cx(guardian ? "order-2" : "order-3", "lg:sticky lg:top-6")}>
          <LockScreen parentName={shownName} arrived={arrived} line={alert?.line} />
          {alert ? (
            <p className="mx-auto mt-4 max-w-[19.5rem] text-center text-sm font-semibold text-scam-deep" role="status">
              That one was real. It just happened.{" "}
              <a href={`/case/${alert.caseId}`} className="underline underline-offset-2">
                See what we found
              </a>
            </p>
          ) : (
            <p className="mx-auto mt-4 max-w-[19.5rem] text-center text-sm text-ink-3">
              {guardian
                ? "You are on duty. Keep this page open and the next heads-up lands right here."
                : "This is the only kind of note you will ever get from us."}
            </p>
          )}
        </div>
      </div>
    </PageShell>
  );
}
