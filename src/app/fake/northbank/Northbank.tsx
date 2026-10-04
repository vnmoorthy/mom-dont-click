"use client";

// TRAINING PAGE. "Northbank Online" is a made-up bank.
// Purely local React state: no network requests, no form action, nothing stored.
import { useState } from "react";
import type { FormEvent } from "react";
import { Lock, ShieldAlert } from "lucide-react";
import { PhishField, TrainingReveal, TrainingStrip, useCountdown, useHydrated } from "../shared";

const BLUE = "#0b4a8f";
const DEEP = "#062c57";

type Step = 1 | 2 | 3;

export function Northbank() {
  const [step, setStep] = useState<Step>(1);
  const ready = useHydrated();
  const countdown = useCountdown(9 * 60 + 59);

  // The only thing a submit ever does: move to the next local step.
  const advance = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStep((s) => (s === 1 ? 2 : 3));
    window.scrollTo(0, 0);
  };

  return (
    <div className="min-h-dvh bg-[#eef2f7] pb-14 text-[#1c2530]" style={{ fontFamily: "Verdana, Geneva, Tahoma, sans-serif" }}>
      {step !== 3 && (
        <div className="flex items-start justify-center gap-2 border-b border-[#e0c060] bg-[#fff4ce] px-3 py-2 text-[12.5px] leading-snug text-[#5c4500]">
          <ShieldAlert size={15} className="mt-px shrink-0" />
          <span>
            <b>SECURITY ALERT:</b> unusual sign-in was detected on your account. Your online access will be suspended in{" "}
            <b className="tabular">{countdown}</b> unless you verify.
          </span>
        </div>
      )}

      <header className="border-b-4 bg-white" style={{ borderColor: BLUE }}>
        <div className="mx-auto flex max-w-[900px] items-center justify-between gap-4 px-4 py-3.5">
          <NorthbankLogo />
          <div className="flex items-center gap-1.5 text-[11px] font-bold" style={{ color: BLUE }}>
            <Lock size={13} /> Secure Sign In
          </div>
        </div>
      </header>

      {step === 3 ? (
        <TrainingReveal
          accent={BLUE}
          lead="A real scam would now have your bank password, your Social Security number and your card PIN."
          tells={[
            "Your bank already has your Social Security number. It will not ask you to type it in after an email.",
            "No bank asks for your card PIN on a web page. Not once, not ever.",
            "A countdown is pressure. A real bank gives you time and a phone number.",
            "When in doubt, close the page and call the number on the back of your card.",
          ]}
          onRestart={() => setStep(1)}
        />
      ) : (
        <main className="mx-auto grid max-w-[900px] grid-cols-1 gap-6 px-4 py-8 md:grid-cols-[minmax(0,400px)_1fr]">
          <div className="rounded border border-[#c5cfdc] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.1)]">
            <div className="rounded-t px-5 py-3 text-[13px] font-bold uppercase tracking-wide text-white" style={{ background: BLUE }}>
              {step === 1 ? "Online Banking" : "Identity Verification - Step 2 of 2"}
            </div>

            <div className="p-5 sm:p-6">
              {step === 1 && (
                <section data-step="1">
                  <h1 className="text-[22px] font-bold leading-tight" style={{ color: DEEP, fontFamily: "Georgia, 'Times New Roman', serif" }}>
                    Sign in to Northbank Online
                  </h1>
                  <p className="mt-2 text-[13px] leading-relaxed text-[#46505e]">
                    To restore your access please sign in and complete the verification. This take less than 2 minutes.
                  </p>

                  <form method="dialog" onSubmit={advance} noValidate className="mt-5 space-y-4">
                    <PhishField id="nb-username" label="Username" focusColor={BLUE}>
                      <input id="nb-username" name="username" type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} />
                    </PhishField>
                    <PhishField id="nb-password" label="Password" focusColor={BLUE}>
                      <input id="nb-password" name="password" type="password" autoComplete="current-password" />
                    </PhishField>
                    <button
                      type="submit"
                      disabled={!ready}
                      style={{ background: BLUE }}
                      className="h-11 w-full rounded-[3px] text-[15px] font-bold text-white disabled:opacity-70"
                    >
                      Sign in
                    </button>
                  </form>
                  <p className="mt-4 text-[11px] leading-snug text-[#6b7584]">
                    For your protection do not share this page. Session is monitored for the security purpose.
                  </p>
                </section>
              )}

              {step === 2 && (
                <section data-step="2">
                  <h1 className="text-[22px] font-bold leading-tight" style={{ color: DEEP, fontFamily: "Georgia, 'Times New Roman', serif" }}>
                    Verify it&rsquo;s you
                  </h1>
                  <p className="mt-2 text-[13px] leading-relaxed text-[#46505e]">
                    We need to confirm you are the account holder. Enter the informations below exactly as on your account.
                  </p>

                  <form method="dialog" onSubmit={advance} noValidate className="mt-5 space-y-4">
                    <PhishField id="nb-ssn" label="Social Security Number" focusColor={BLUE}>
                      <input id="nb-ssn" name="ssn" type="text" inputMode="numeric" autoComplete="off" placeholder="XXX-XX-XXXX" />
                    </PhishField>
                    <PhishField id="nb-pin" label="Card PIN" help="The PIN you use at the cash machine." focusColor={BLUE}>
                      <input id="nb-pin" name="pin" type="password" inputMode="numeric" autoComplete="off" />
                    </PhishField>
                    <PhishField id="nb-phone" label="Mobile phone number" focusColor={BLUE}>
                      <input id="nb-phone" name="phone" type="tel" autoComplete="tel" placeholder="(555) 000-0000" />
                    </PhishField>
                    <button
                      type="submit"
                      disabled={!ready}
                      style={{ background: BLUE }}
                      className="h-11 w-full rounded-[3px] text-[15px] font-bold text-white disabled:opacity-70"
                    >
                      Verify
                    </button>
                  </form>
                </section>
              )}
            </div>
          </div>

          <aside className="text-[13px] leading-relaxed text-[#46505e]">
            <div className="rounded p-5 text-white" style={{ background: DEEP }}>
              <div className="text-[17px] font-bold" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
                Protecting you is our first priority
              </div>
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-white/85">
                <li>We detected a sign-in from a device we do not recognise.</li>
                <li>Your card and online access is temporary limited.</li>
                <li>Verify now to avoid suspension of the account.</li>
              </ul>
            </div>
            <div className="mt-4 rounded border border-[#c5cfdc] bg-white p-4">
              <div className="font-bold" style={{ color: DEEP }}>
                Time remaining
              </div>
              <div className="mt-1 text-[30px] font-bold leading-none text-[#b3261e] tabular">{countdown}</div>
              <p className="mt-2 text-[12px]">After this time the account will be lock and you must visit a branch with two forms of ID.</p>
            </div>
          </aside>
        </main>
      )}

      {step !== 3 && (
        <footer className="mx-auto max-w-[900px] px-4 pb-6 text-[11px] leading-relaxed text-[#6b7584]">
          &copy; 2026 Northbank Online. Bank-grade encryption. Privacy &middot; Security &middot; Site map
        </footer>
      )}

      <TrainingStrip />
    </div>
  );
}

function NorthbankLogo() {
  return (
    <div className="flex items-center gap-2.5">
      <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden>
        <rect width="36" height="36" rx="4" fill={BLUE} />
        <path d="M18 5l3.200 9.800L31 18l-9.800 3.200L18 31l-3.200-9.800L5 18l9.800-3.200z" fill="#fff" opacity="0.22" />
        <path d="M11 26V10h3.400l7.200 10.400V10H25v16h-3.400l-7.200-10.400V26z" fill="#fff" />
      </svg>
      <div className="leading-none">
        <div className="text-[23px] font-bold tracking-tight" style={{ color: DEEP, fontFamily: "Georgia, 'Times New Roman', serif" }}>
          Northbank
        </div>
        <div className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.3em]" style={{ color: BLUE }}>
          Online
        </div>
      </div>
    </div>
  );
}
