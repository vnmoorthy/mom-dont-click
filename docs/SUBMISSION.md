# Submission text

Copy and paste into the hackathon portal. Fill in the live URL once it is deployed.

**Before you submit:** the "how each tool is used" section describes what the code does when its key is present. Open `/console` and check the capability panel. Any row shown in amber is running on its local fallback, so add that key first or soften the matching line below.

## Name

Mom, Don't Click

## One line

One email address your mom forwards anything sketchy to. An agent clicks the link for her in a throwaway cloud browser and answers in one giant plain sentence.

## Links

- Repository: https://github.com/vnmoorthy/mom-dont-click
- Live: _add the deployed URL_
- Deck: https://github.com/vnmoorthy/mom-dont-click/blob/main/docs/deck/mom-dont-click.pptx
- Product film (2 min): https://github.com/vnmoorthy/mom-dont-click/blob/main/docs/video/demo.mp4
- 30-second wall recording: https://github.com/vnmoorthy/mom-dont-click/blob/main/docs/media/wall-demo.mp4

## What it does (short)

Everyone is their family's fraud desk. My mom texts "is this real??" while I'm in a meeting, and I answer three hours later.

Mom, Don't Click is a personal agent with its own email address. She forwards anything sketchy to it. The agent opens the link in a disposable browser far away from her computer, watches what the page asks for, checks who actually owns that brand's website and whether the wording has been reported, and replies in the same thread with one sentence a 75-year-old can act on: **SCAM**, **TREAT AS A SCAM**, or **NO RED FLAGS FOUND**. It never says "safe". If it was a scam, I get a heads-up: "Mom was sent a parcel scam. She did not click. Handled."

There is nothing to install. The address is the entire onboarding.

## How it works

A Mastra workflow runs per message: read it, check memory, then three branches in parallel (open the link, check the claims, check the address), then decide and respond. Rules decide the verdict level from the evidence. The model only writes the sentence, so a scam email cannot talk its way down. A repeat of the same scam is answered from memory in under two seconds.

## How each tool is used

- **AgentMail**: the agent's own inbox. Inbound forwards, threaded replies, guardian alerts, follow-up questions by reply.
- **Kernel**: the disposable cloud browser that clicks so mom never does, with a live view on the wall.
- **Exa**: finds the claimed brand's own website and existing scam reports.
- **Mastra**: the workflow, with three steps in parallel and every step traced.
- **Neon**: Postgres for cases, guardians and "seen before" memory; AI Gateway for the model calls.
- **Fly.io**: one always-on machine for the app, the inbox poller and the live event stream.
- **assistant-ui**: the follow-up conversation on every case ("but it has my name on it?").

Every tier has a local fallback, so the whole thing also runs with zero keys.

## What to try

1. Open the wall on the big screen and the console on a laptop.
2. Press `1` in the console. Watch a real browser walk into a fake carrier page, type fake details, and get asked for a card number.
3. Press `1` again. "Seen before", answered in under two seconds.
4. Scan the QR code and paste your own sketchiest link.
5. Open any case and ask it a question.

## Side quests

- **Best UI**: the wall (live browser, evidence chips, the verdict slam), the case page and its assistant-ui conversation, the guardian's lock-screen alert.
- **Best Open Source**: MIT licence, tests and CI, an architecture write-up, a security model, and a one-command deploy.
