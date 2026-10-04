"use client";

// The idle half of the wall: where to send the sketchy thing, as big as the screen allows.
import { useEffect, useState } from "react";
import { toDataURL } from "qrcode";
import { EyeOff } from "lucide-react";
import { FitText, type FitLine } from "./FitText";

function useQr(url: string): string | null {
  const [made, setMade] = useState<{ url: string; src: string } | null>(null);
  useEffect(() => {
    if (!url) return;
    let alive = true;
    // ink on cream; a small built-in margin plus the note's padding makes the quiet zone
    toDataURL(url, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 960,
      color: { dark: "#17130f", light: "#f6f0e4" },
    })
      .then((src) => alive && setMade({ url, src }))
      .catch(() => alive && setMade(null));
    return () => {
      alive = false;
    };
  }, [url]);
  return made && made.url === url ? made.src : null;
}

export function Invitation({
  inboxEmail,
  checkUrl,
  checkLabel,
}: {
  inboxEmail: string | null;
  /** full address of the paste page, e.g. https://momdontclick.fly.dev/check */
  checkUrl: string;
  /** the same without the protocol, for print */
  checkLabel: string;
}) {
  const qr = useQr(checkUrl);

  let lines: FitLine[];
  if (inboxEmail) {
    const at = inboxEmail.lastIndexOf("@");
    lines =
      at > 0
        ? [{ text: inboxEmail.slice(0, at) }, { text: inboxEmail.slice(at), className: "text-cream-2" }]
        : [{ text: inboxEmail }];
  } else {
    const slash = checkLabel.indexOf("/");
    lines =
      slash > 0
        ? [{ text: checkLabel.slice(0, slash) }, { text: checkLabel.slice(slash), className: "text-cream-2" }]
        : [{ text: checkLabel }];
  }

  return (
    <div className="flex h-full flex-col justify-center">
      <p className="text-[1.9rem] font-medium leading-tight text-cream-2">
        Got something sketchy? <span className="text-cream">{inboxEmail ? "Forward it to" : "Paste it at"}</span>
      </p>

      <FitText
        lines={lines}
        maxRem={9.5}
        className="mt-4 select-all font-display font-extrabold leading-[0.94] tracking-[-0.02em] text-cream [font-variant-ligatures:none]"
      />

      <div className="mt-11 flex flex-col items-start gap-8 sm:flex-row sm:items-center lg:gap-10">
        <a
          href={checkUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${checkLabel} in a new tab`}
          className="paper-grain relative block shrink-0 -rotate-2 rounded-[22px] bg-cream p-3.5 pb-4 text-ink shadow-[0_30px_80px_-30px_rgba(0,0,0,0.95)] outline-none transition-transform duration-300 ease-out hover:rotate-0 focus-visible:rotate-0 focus-visible:ring-4 focus-visible:ring-cream/50"
        >
          {/* a strip of masking tape: this is a note stuck on the wall */}
          <span
            aria-hidden
            className="absolute -top-3 left-1/2 h-7 w-28 -translate-x-1/2 rotate-2 rounded-[3px] bg-paper-3/90 shadow-sm"
          />
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qr}
              alt={`QR code that opens ${checkLabel}`}
              className="block size-[min(23rem,calc(100vw-5rem))] rounded-[10px]"
            />
          ) : (
            <span className="grid size-[min(23rem,calc(100vw-5rem))] place-items-center font-mono text-sm text-ink-4">
              Drawing the code
            </span>
          )}
          <span className="mt-2.5 block text-center font-mono text-sm text-ink-3">{checkLabel}</span>
        </a>

        <div className="min-w-0">
          <p className="text-balance font-display text-[2.7rem] font-extrabold leading-[0.98] tracking-[-0.015em] text-cream">
            or scan to paste a link
          </p>
          <p className="mt-3 text-xl text-cream-2">Links, texts and screenshots all work.</p>
          <p className="mt-7 flex items-start gap-3 text-pretty text-lg leading-snug text-cream-3">
            <EyeOff className="mt-0.5 size-5 shrink-0" aria-hidden />
            Only a cleaned-up subject and the verdict appear on this screen.
          </p>
        </div>
      </div>
    </div>
  );
}
