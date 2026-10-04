"use client";

// The fixed vocabulary. Three answers, and never the word "safe".
import { VerdictBadge, cx } from "@/components/ui/kit";
import type { VerdictLevel } from "@/lib/types";
import { Reveal, SectionHeading } from "./bits";

const ANSWERS: Array<{
  verdict: VerdictLevel;
  word: string;
  when: string;
  line: string;
  example: string;
  card: string;
  wordColor: string;
  rule: string;
}> = [
  {
    verdict: "SCAM",
    word: "SCAM",
    when: "We found proof.",
    line: "The page asked for something no honest company asks for by email, or other people have already reported it.",
    example: "Do not click. Carriers never ask for a card by email.",
    card: "bg-scam-soft border-scam/35",
    wordColor: "text-scam",
    rule: "bg-scam/30",
  },
  {
    verdict: "TREAT_AS_SCAM",
    word: "TREAT AS A SCAM",
    when: "We could not prove it. Something is off.",
    line: "The page was gone, or the story does not add up. Act as if it is a scam until you check another way.",
    example: "The link is dead and the sender is not your bank. Call the number on your card.",
    card: "bg-warn-soft border-warn/45",
    wordColor: "text-warn-deep",
    rule: "bg-warn/40",
  },
  {
    verdict: "NO_RED_FLAGS",
    word: "NO RED FLAGS FOUND",
    when: "We looked and found nothing wrong.",
    line: "That is all it means. It is not a promise. If money is involved, go to the official site yourself.",
    example: "The sender and the site match the company. Nothing here asks for more than it should.",
    card: "bg-calm-soft border-calm/35",
    wordColor: "text-calm-deep",
    rule: "bg-calm/30",
  },
];

export function Vocabulary() {
  return (
    <section id="answers" className="border-y border-line bg-paper-2/45">
      <div className="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 sm:py-28">
        <Reveal>
          <SectionHeading
            eyebrow="What it says"
            title={
              <>
                Three answers.
                <br />
                Never the word &ldquo;safe&rdquo;.
              </>
            }
            lede="Nobody can promise an email is safe, so it never does. It uses the same three phrases every time, so she always knows what she is looking at. That is also why you will not find any green here."
          />
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-5 lg:grid-cols-3">
          {ANSWERS.map((a, i) => (
            <Reveal key={a.verdict} delay={i * 0.08} className="h-full">
              <article className={cx("flex h-full flex-col rounded-[22px] border p-6 sm:p-8", a.card)}>
                <VerdictBadge verdict={a.verdict} size="sm" className="self-start" />
                <h3
                  className={cx(
                    "mt-6 font-display font-extrabold leading-[0.88] tracking-[-0.045em]",
                    a.verdict === "SCAM" ? "text-[clamp(4.5rem,9vw,7rem)]" : "text-[clamp(2.6rem,5.2vw,3.9rem)]",
                    a.wordColor,
                  )}
                >
                  {a.word}
                </h3>
                <p className="mt-6 font-display text-xl font-extrabold leading-tight tracking-tight text-ink">{a.when}</p>
                <p className="mt-2 text-[17px] leading-relaxed text-ink-2">{a.line}</p>
                <div className="mt-auto pt-7">
                  <i className={cx("block h-px w-full", a.rule)} />
                  <div className="mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-3">Sounds like</div>
                  <p className="mt-1.5 text-[15px] italic leading-snug text-ink-2">&ldquo;{a.example}&rdquo;</p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
