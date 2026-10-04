"use client";

// TRAINING PAGE. "ParcelFast Delivery" is a made-up courier.
// Purely local React state: no network requests, no form action, nothing stored.
import { useState } from "react";
import type { FormEvent } from "react";
import { Lock, TriangleAlert } from "lucide-react";
import { PhishField, TrainingReveal, TrainingStrip, useCountdown, useHydrated } from "../shared";

const NAVY = "#0f2a52";
const ORANGE = "#f26a1b";

type Step = 1 | 2 | 3;

export function ParcelFast({ tracking }: { tracking: string }) {
  const [step, setStep] = useState<Step>(1);
  const ready = useHydrated();
  const countdown = useCountdown(14 * 60 + 59);

  // The only thing a submit ever does: move to the next local step.
  const advance = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStep((s) => (s === 1 ? 2 : 3));
    window.scrollTo(0, 0);
  };

  return (
    <div className="min-h-dvh bg-[#e9edf3] pb-14 text-[#1a2233]" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
      {step !== 3 && (
        <div className="flex items-center justify-center gap-2 bg-[#c8102e] px-3 py-2 text-center text-[13px] font-bold uppercase tracking-wide text-white">
          <TriangleAlert size={15} className="shrink-0" />
          <span>
            Final notice: parcel {tracking} will be returned to sender in <span className="tabular">{countdown}</span>
          </span>
        </div>
      )}

      <header style={{ background: NAVY }} className="text-white">
        <div className="mx-auto flex max-w-[940px] items-center justify-between gap-4 px-4 py-3">
          <ParcelFastLogo />
          <div aria-hidden className="hidden gap-6 text-[13px] text-white/75 md:flex">
            <span>Track</span>
            <span>Ship</span>
            <span>Locations</span>
            <span>Customer Support</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-white/85">
            <Lock size={12} /> Secure Server
          </div>
        </div>
        <div style={{ background: ORANGE }} className="h-1.5" />
      </header>

      {step === 3 ? (
        <TrainingReveal
          accent={ORANGE}
          lead="A real scam would now have your password and your card."
          tells={[
            "A courier does not need your email password to hand over a parcel.",
            "The countdown is there to rush you. A real delivery does not expire in fifteen minutes.",
            "A tiny fee like $1.99 is bait. The card number is what they are after.",
            "The address in the browser bar is not a courier's own website.",
          ]}
          onRestart={() => setStep(1)}
        />
      ) : (
        <main className="mx-auto grid max-w-[940px] grid-cols-1 gap-5 px-4 py-6 md:grid-cols-[minmax(0,1fr)_270px]">
          <div className="rounded-md border border-[#c9d1de] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.12)] sm:p-7">
            <ol aria-hidden className="mb-5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-[#8a94a6]">
              <li className="rounded-sm px-2 py-1" style={step === 1 ? { background: NAVY, color: "#fff" } : undefined}>
                1. Identity
              </li>
              <li>&rsaquo;</li>
              <li className="rounded-sm px-2 py-1" style={step === 2 ? { background: NAVY, color: "#fff" } : undefined}>
                2. Payment
              </li>
              <li>&rsaquo;</li>
              <li className="px-2 py-1">3. Release</li>
            </ol>

            {step === 1 && (
              <section data-step="1">
                <h1 className="text-[24px] font-bold leading-tight sm:text-[27px]" style={{ color: NAVY }}>
                  Your parcel is being held - confirm your identity
                </h1>
                <p className="mt-2 text-[14px] leading-relaxed text-[#3b4558]">
                  Dear Customer, your parcel could not be deliver because the recipient details is not confirmed. Please
                  sign in with your email to confirm you are the right recipient.
                </p>

                <form method="dialog" onSubmit={advance} noValidate className="mt-5 space-y-4">
                  <PhishField id="pf-tracking" label="Tracking number" focusColor={ORANGE}>
                    <input id="pf-tracking" name="tracking" type="text" defaultValue={tracking} autoComplete="off" />
                  </PhishField>
                  <PhishField id="pf-email" label="Email address" focusColor={ORANGE}>
                    <input id="pf-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" />
                  </PhishField>
                  <PhishField
                    id="pf-password"
                    label="Email password"
                    help="Required to verify the recipient. Your details is protected by 256-bit encryption."
                    focusColor={ORANGE}
                  >
                    <input id="pf-password" name="password" type="password" autoComplete="current-password" />
                  </PhishField>
                  <button
                    type="submit"
                    disabled={!ready}
                    style={{ background: ORANGE }}
                    className="h-12 w-full rounded-[3px] text-[16px] font-bold uppercase tracking-wide text-white disabled:opacity-70 sm:w-auto sm:px-10"
                  >
                    Continue
                  </button>
                </form>
              </section>
            )}

            {step === 2 && (
              <section data-step="2">
                <h1 className="text-[24px] font-bold leading-tight sm:text-[27px]" style={{ color: NAVY }}>
                  Pay the $1.99 redelivery fee
                </h1>
                <p className="mt-2 text-[14px] leading-relaxed text-[#3b4558]">
                  Identity confirmed. A small redelivery fee is require to release your parcel for delivery tomorrow.
                </p>

                <div className="mt-4 flex items-center justify-between rounded-[3px] border border-[#f3c9ad] bg-[#fff4ec] px-4 py-3 text-[14px]">
                  <span>
                    Redelivery fee for <b>{tracking}</b>
                  </span>
                  <b className="text-[18px]" style={{ color: NAVY }}>
                    $1.99
                  </b>
                </div>

                <form method="dialog" onSubmit={advance} noValidate className="mt-5 space-y-4">
                  <PhishField id="pf-cardname" label="Name on card" focusColor={ORANGE}>
                    <input id="pf-cardname" name="cardname" type="text" autoComplete="cc-name" />
                  </PhishField>
                  <PhishField id="pf-cardnumber" label="Card number" focusColor={ORANGE}>
                    <input
                      id="pf-cardnumber"
                      name="cardnumber"
                      type="text"
                      inputMode="numeric"
                      autoComplete="cc-number"
                      placeholder="0000 0000 0000 0000"
                    />
                  </PhishField>
                  <div className="grid grid-cols-2 gap-4">
                    <PhishField id="pf-expiry" label="Expiry date" focusColor={ORANGE}>
                      <input id="pf-expiry" name="expiry" type="text" autoComplete="cc-exp" placeholder="MM/YY" />
                    </PhishField>
                    <PhishField id="pf-cvv" label="Security code (CVV)" focusColor={ORANGE}>
                      <input id="pf-cvv" name="cvv" type="text" inputMode="numeric" autoComplete="cc-csc" placeholder="123" />
                    </PhishField>
                  </div>
                  <button
                    type="submit"
                    disabled={!ready}
                    style={{ background: ORANGE }}
                    className="h-12 w-full rounded-[3px] text-[16px] font-bold uppercase tracking-wide text-white disabled:opacity-70 sm:w-auto sm:px-10"
                  >
                    Pay $1.99
                  </button>
                </form>
              </section>
            )}
          </div>

          <aside className="space-y-4 text-[13px]">
            <div className="rounded-md border border-[#c9d1de] bg-white p-4">
              <div className="text-[11px] font-bold uppercase tracking-wide text-[#8a94a6]">Parcel status</div>
              <div className="mt-2 text-[15px] font-bold" style={{ color: NAVY }}>
                {tracking}
              </div>
              <div className="mt-2 inline-block rounded-sm bg-[#c8102e] px-2 py-0.5 text-[11px] font-bold uppercase text-white">
                On hold
              </div>
              <dl className="mt-3 space-y-1.5 text-[#3b4558]">
                <div className="flex justify-between gap-3">
                  <dt>Delivery attempt</dt>
                  <dd className="font-bold">Today 09:12</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Reason</dt>
                  <dd className="text-right font-bold">Fee unpaid</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Return to sender in</dt>
                  <dd className="font-bold text-[#c8102e] tabular">{countdown}</dd>
                </div>
              </dl>
            </div>
            <div className="rounded-md border border-[#c9d1de] bg-white p-4 text-[#3b4558]">
              <div className="flex items-center gap-2 font-bold" style={{ color: NAVY }}>
                <Lock size={14} /> 100% Secure Payment
              </div>
              <p className="mt-1.5 leading-snug">Your informations are encrypted and never shared with third party.</p>
              <div aria-hidden className="mt-3 flex gap-2">
                <span className="rounded-sm border border-[#c9d1de] px-2 py-1 text-[10px] font-bold">SSL 256</span>
                <span className="rounded-sm border border-[#c9d1de] px-2 py-1 text-[10px] font-bold">VERIFIED</span>
                <span className="rounded-sm border border-[#c9d1de] px-2 py-1 text-[10px] font-bold">SAFE PAY</span>
              </div>
            </div>
          </aside>
        </main>
      )}

      {step !== 3 && (
        <footer className="mx-auto max-w-[940px] px-4 pb-6 text-center text-[11px] text-[#7a8394]">
          &copy; 2019-2026 ParcelFast Delivery Inc. All right reserved. Privacy &middot; Terms &middot; Cookie
        </footer>
      )}

      <TrainingStrip />
    </div>
  );
}

function ParcelFastLogo() {
  return (
    <div className="flex items-center gap-2">
      <svg width="38" height="30" viewBox="0 0 38 30" aria-hidden>
        <path d="M1 9h9M0 15h7M3 21h6" stroke={ORANGE} strokeWidth="2.4" strokeLinecap="round" />
        <path d="M14 8.500 25.500 3 37 8.500v13L25.500 27 14 21.500z" fill={ORANGE} />
        <path d="M14 8.500 25.500 14 37 8.500M25.500 14v13" stroke={NAVY} strokeWidth="1.6" fill="none" />
        <path d="M19.700 5.800 31.200 11.300" stroke="#fff" strokeWidth="1.6" />
      </svg>
      <div className="leading-none">
        <div className="text-[22px] font-black italic tracking-tight">
          Parcel<span style={{ color: ORANGE }}>Fast</span>
        </div>
        <div className="mt-0.5 text-[9px] uppercase tracking-[0.24em] text-white/70">Delivery</div>
      </div>
    </div>
  );
}
