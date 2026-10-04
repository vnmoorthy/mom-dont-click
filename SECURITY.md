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
- every request a page makes is paused and resolved before it leaves the machine, and failed if it points at a private, loopback or link-local address. This is done twice: in Playwright's router, and over the DevTools protocol, because Playwright's router is not consulted for redirect hops;
- service workers are blocked;
- the fallback Chromium in the container does not run as root.

With a Kernel key the browser runs in Kernel's cloud, outside the app's network entirely. That is the recommended setup for a public deployment.

## Prompt injection

Forwarded messages are untrusted input. The verdict level is decided by rules over the evidence (`decideLevel` in `src/lib/verdict.ts`); the language model only chooses the wording, must begin with the level it was given, and is discarded in favour of a template if it does not. Text inside a message cannot lower a verdict.

A message with several links cannot hide behind the first one: if any link goes somewhere unrecognised, that is the link that gets opened and judged.

## Privacy

- The live stream and the case list never include the forwarded text or follow-up questions, and always mask the sender's address.
- The wall shows a subject line with names, addresses, numbers and tracking codes removed.
- Case ids appear on shared screens, so an id alone is not enough to read what was sent. The forwarded text and the follow-up conversation are returned only to the browser that submitted the case (an HttpOnly cookie), to the link in the sender's own verdict email, or to the presenter. Everyone else sees the verdict and the evidence.

## Memory

"Seen before" is keyed by the address together with the brand the message claimed, and an address is only remembered when the address itself was implicated, never a well-known site. One hostile message cannot make a legitimate site read as a scam for everyone after it.

## Outbound email

Verdict copies and guardian heads-ups are capped per recipient, per conversation and overall per hour, so the public forms cannot be used to mail strangers at volume.

## Deploying it publicly

- Set `CONSOLE_KEY` (`scripts/deploy.sh` generates one). Without a key the presenter console only answers on `localhost`; on a public address it is closed.
- Set `KERNEL_API_KEY` so link-opening happens off your server.
- Creating cases, follow-up questions and guardian sign-ups are rate limited per IP.

## Reporting a problem

Open a GitHub issue, or for anything sensitive use GitHub's private vulnerability reporting on this repository.
