# Three-minute storyboard

For presenting [`deck/mom-dont-click.pptx`](deck/mom-dont-click.pptx). Ten slides, 180 seconds. Every build plays on its own, so you only press the arrow key once per slide. The same words are in the speaker notes.

If you get the 2-minute stage slot instead, skip the deck and run the live demo in [`DEMO.md`](DEMO.md). The product is the better pitch.

| Time | Slide | On screen | Say |
| --- | --- | --- | --- |
| 0:00 to 0:12 | **1 · Title** | "Mom, don't click." fades in, then the red line "We'll click it for you." The wall screenshot floats in from the right. | "This is Mom, Don't Click. It is one email address. My mom forwards anything sketchy to it, and an agent clicks the link so she never has to." |
| 0:12 to 0:32 | **2 · The problem** | Mom's text bubble pops in: *is this real?? it says my account is suspended*. Your reply appears three hours later. Then the two numbers. | "Everyone in this room is their family's fraud desk. Mine texts me 'is this real' while I'm in a meeting, and I answer three hours later. Sometimes that is after the click. Americans over sixty reported losing 4.88 billion dollars to fraud in 2024." |
| 0:32 to 0:47 | **3 · The insight** | "Parents won't install an app." Beat. Then in red: "They already know how to forward." The address pill slides up. | "Every product in this space asks a seventy-year-old to install something. They won't. But they already know how to forward an email. So the whole product is an address. No app, no account, no setup." |
| 0:47 to 1:07 | **4 · How it works** | The four steps appear one after another, left to right. | "Mom forwards it. A throwaway browser in the cloud opens the link and watches what the page asks for. At the same time it checks the claims: who actually owns this brand's website, has this wording been reported, how old is the address. Then one giant sentence goes back to her. And if it was a scam, I get a heads-up." |
| 1:07 to 1:42 | **5 · Live demo** | The recording plays: the wall invites the room, a forwarded email lands, the browser walks into a fake carrier page, the card fields get boxed in red, the screen floods red. | Talk over it, slowly. "This is the real thing running. Here is what she forwarded. That is a real browser, far away from her computer. It types fake details to see what the page wants next. Step two: a card number. And there is the answer." Stop talking when the screen turns red. |
| 1:42 to 1:57 | **6 · The verdict** | Full red. "SCAM" zooms in. The sentence, then three reasons, one at a time. | "Scam. Do not click. Carriers never ask for a card number by email. Three reasons, in words she can act on. There are only three possible answers, and none of them is the word safe." |
| 1:57 to 2:15 | **7 · Under the hood** | The workflow draws left to right. The three parallel branches light up together. The amber arc for "seen before" draws last. | "Underneath it is one Mastra workflow. Read the message, check memory, then three branches in parallel: Kernel opens the link, Exa checks the claims, and we check the address itself. Rules decide the level. The model only writes the sentence, so a scam email cannot talk its way down." |
| 2:15 to 2:30 | **8 · The stack** | The eight cards deal in. | "Take any one of these away and it stops being a product. AgentMail is the address. Kernel is the browser. Exa is the evidence. Mastra is the workflow. Neon is the memory. Fly keeps it awake. assistant-ui is where the follow-up questions go." |
| 2:30 to 2:45 | **9 · Trust** | Four principle cards, then "12 / 12". | "It is built to fail in one direction. It looks, it never types. A dead link counts as evidence. When it is unsure it says treat as a scam. And it gets all twelve of our labelled messages right, which is a regression check, not a benchmark." |
| 2:45 to 3:00 | **10 · Close** | Three lines, one at a time. The last one in red. | "Mom forwards. It clicks. You only hear about it when it matters. The adult child pays a few dollars a month per parent. It is open source, and it is live right now. Forward it something." |

## Delivery notes

- **Slide 5 is the pitch.** If you are short on time, cut slides 8 and 9, never 5.
- **Let the red slide land.** Say "Scam." and pause for a full second before reading the sentence.
- **One number only.** The 4.88 billion figure is the one people repeat. Leave the 12.5 billion on the slide.
- **If the video does not autoplay**, click it once. If it will not play at all, switch to the browser tab with `/wall` and press `1` in the console. It is the same thing, live.
- **Likely questions** and short answers are at the bottom of [`DEMO.md`](DEMO.md).
