# Demo script

Two versions: the 2-minute stage cut and the 10-minute table demo. Both run from the presenter console.

## Where to run it from

- **Deployed (best):** `scripts/deploy.sh` puts it on Fly.io and prints the console address with its key. Open the wall from the deployed address so the QR code works for every phone.
- **From your laptop:** run `pnpm demo` (a production build, not the dev server). Open the console at `http://localhost:3000/console`, and open the wall at your laptop's network address, for example `http://192.168.1.20:3000/wall`. The QR code then points at that address, and any phone on the same network can paste a link. The console only answers on `localhost`, so nobody in the room can reset your wall.

## Setup (5 minutes before)

1. Open **`/console`** on your laptop. Every row in the capability panel should be coloured, not amber. Amber rows still work, on a local fallback.
2. Open **`/wall`** on the projector, press **F** for fullscreen.
3. In the console press **Reset the wall**.
4. Fire seed **1** once and reset again. This warms the browser so the first frame appears in about a second.
5. Ask one judge to scan the QR code, tap **Guard**, and enter their email. Leave "their email address" empty, and ask them to keep that page open. They are now guarding the demo Mom: the heads-up lands on that page the moment it happens, and by email when email is on.

Keys in the console: `1` parcel, `2` toll text, `3` bank alert, `4` tech-support invoice, `5` Medicare card, `6` grandchild, `7` a genuine order email.
Keys on the wall: `F` fullscreen, `Space` dismiss the verdict, `G` grid only, `R` replay the last verdict.

## The 2-minute stage cut

| Time | You do | You say | The room sees |
| --- | --- | --- | --- |
| 0:00 | Stand by the wall | "You are your family's fraud desk. Mine texts me *is this real??* while I'm in a meeting. So I gave her one email address. Forward the sketchiest thing in your inbox to it right now, or scan and paste a link." | The address and the QR code |
| 0:10 | Press **1** | "Here is what my mom forwarded this morning." | A card drops in: *Mom forwarded: Your parcel is being held* |
| 0:15 | Hands off | "She never opens it. A throwaway browser in the cloud does. Watch what the page asks for." | The live browser walks into the fake carrier page, types fake details, and step 2 demands a card number, boxed in red. Evidence chips land one by one. |
| 0:40 | Hands off | Read the verdict out loud. | Full-screen red: **SCAM. Do not click. Carriers never ask for a card number by email.** |
| 0:50 | Point at the guardian judge | "And look at your phone. Read it out?" | Their phone: *Mom was sent a parcel scam. She did not click. Handled.* The wall shows the same note as a toast. |
| 1:05 | Press **Space**, then **1** again | "Same scam, different day." | *SEEN BEFORE*, answered from memory in under two seconds |
| 1:20 | Press **Space** | "And that's the room's own inbox." Call out one amber tile: "Link already taken down. That is what scams do. Treat as a scam." | The grid of the audience's own forwards |
| 1:45 | Step forward | "Mom forwards. It clicks. You only hear about it when it matters." | The wall |

**If something breaks:** press `R` to replay the last verdict, or keep talking over the grid. Seeds 2, 4, 5 and 6 need no browser at all and resolve in about a second.

## The 10-minute table demo

**0:00 to 1:30 · The stage cut, slower.** Run the beats above. Every judge scans the QR code and pastes a link or a message. Each gets their own case page on their phone.

**1:30 to 3:00 · "Now try to fool it."** Press **7** (a genuine order email). The answer is *No red flags found. To be sure, use the official site instead of the link*, with the evidence that the link really goes to the brand's own site. Invite judges to forward a real receipt or their event confirmation. Point out that it never says "safe".

**3:00 to 4:00 · Ask it a question.** Open any case page. In the chat at the bottom tap *But it has my name on it?*, then *What if I already clicked?* With email on, a judge can also just reply to their verdict email.

**4:00 to 5:15 · The guardian loop.** A second judge opens `/guard` and signs up. Press **5** (the Medicare card). Their phone gets the heads-up while the wall shows what Mom received.

**5:15 to 6:30 · The other training page.** Press **3**. A fake bank login this time: password first, then Social Security number and card PIN. Say: "It types fake details in exactly one place, pages we host ourselves. On anything else it only looks."

**6:30 to 8:00 · Open one case.** On the case page scroll through: what the browser saw, the redirect chain, the evidence with its sources, and the workflow trace with the three parallel branches and their timings. Open `/eval` and press **Run the eval**.

**8:00 to 10:00 · Questions.** Answers worth having ready:

- *Is the model deciding?* No. Rules count the evidence and pick the level. The model only writes the sentence, and it cannot soften it.
- *What if the page hides from your browser?* That is evidence. A dead, cloaked or robot-checked page becomes "treat as a scam".
- *What if it is wrong?* It fails in one direction. Unsure means "treat as a scam", and "no red flags" always says to use the official site.
- *Who pays?* The adult child, a few dollars a month per parent. The address is the entire onboarding.
- *Why these tools?* Remove any one and the product stops: no inbox, no browser, no evidence, no parallel workflow, no memory.
