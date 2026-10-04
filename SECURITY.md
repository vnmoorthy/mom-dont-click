# Security

Mom, Don't Click opens links that other people supply. That is the product, and it is also the main risk. This is how it is contained.

## What the agent will and will not do

- It opens a suspicious link in a disposable browser, away from the person who received it.
- On third-party pages it only navigates, scrolls and reads. It never types, never clicks, never submits.
- It types obviously fake details in one place only: the two training pages this app hosts under `/fake/`, for fictional brands. Those pages make no network requests and store nothing.
- It never opens attachments.
- It never calls a message "safe". When it is unsure, the answer is "treat as a scam".

## Server-side request forgery

When the browser runs on the server itself (the local Chromium and plain-fetch tiers):

- the first address must resolve to a public IP (`assertPublicUrl` in `src/lib/urls.ts`);
- every redirect hop is checked again in the fetch tier;
- every sub-request a page makes to a private, loopback or link-local address is aborted.

With a Kernel key the browser runs in Kernel's cloud, outside the app's network entirely. That is the recommended setup for a public deployment.

## Prompt injection

Forwarded messages are untrusted input. The verdict level is decided by rules over the evidence (`decideLevel` in `src/lib/verdict.ts`); the language model only chooses the wording, must begin with the level it was given, and is discarded in favour of a template if it does not. Text inside a message cannot lower a verdict.

## Privacy

- The live stream and the case list never include the forwarded text, and always mask the sender's address.
- The wall shows a subject line with names, addresses, numbers and tracking codes removed.
- A case's full text is only available at its own address, which carries a random 12-character id.

## Deploying it publicly

- Set `CONSOLE_KEY`. Without it, `/console` and its API are open.
- Set `KERNEL_API_KEY` so link-opening happens off your server.
- Creating cases, follow-up questions and guardian sign-ups are rate limited per IP.

## Reporting a problem

Open a GitHub issue, or for anything sensitive use GitHub's private vulnerability reporting on this repository.
