# Upgrade batch - SafeSpace Hacks

New product name: Call First
(Change the line above before starting if you want a different name. Everything below says "the app".)

Read CLAUDE.md first. This file adds a second batch of work on top of it. Where the two disagree, this file wins. Everything in CLAUDE.md about synthetic data, no emoji, Windows/PowerShell, privacy and accessibility still applies.

## Why this batch exists

I reviewed the other public SafeSpace Hacks entries. At least seven are scam-message checkers, several of them polished. Compared with them:

- Our strengths, which nobody else has: the two-way family loop (the family member replies and the parent sees it), verified contacts that only the family can change with a PIN, and checking a phone call described out loud.
- Our weaknesses: another entry uses our current name; our evaluation set was written by the same session that wrote the rules; we send messages to an AI service while rivals run fully on the device; and three rivals have an "I already paid or clicked" mode that we lack.

This batch fixes the weaknesses without adding anything else. Judges award no points for complexity, so keep every change small, finished and tested.

## Ground rules for this batch

- Work one step at a time. At the end of each step: run lint, typecheck, tests and the build; commit with a clear message; update PROGRESS.md; give me a short summary; wait for my go-ahead.
- **Do not open, read, print or search `eval/heldout.json` before Step 5.** It is an independent test set written in a separate session that never saw our rules. Reading it while changing rules or prompts would ruin it. You may check that it exists and is committed using `git log -- eval/heldout.json` only.
- Ask me before anything that cannot be undone or that changes a public address: renaming the GitHub repository, renaming the Netlify site, deleting data, or force-pushing.
- Do not invent phone numbers, statistics or quotes. Use only numbers from the circle's saved contacts and its emergency number setting. Any advice you add must come from official public guidance pages you have actually opened in this session, paraphrased, with the page listed as a source.

## Step 0 - Check the starting point

- `git status` is clean and `main` is up to date with GitHub.
- `eval/heldout.json` exists and has its own earlier commit (`git log -- eval/heldout.json`). If it is missing, stop and tell me; I will create it first.
- All tests pass.

## Step 1 - Demo fixes

- Bug: after "Paste your own" or "Upload a screenshot", the "The message Amina got" panel still shows the previous sample, and that sample's button stays highlighted. Fix it so the panel always shows what was actually checked (the pasted text, or "A screenshot Amina uploaded"), and clear the sample highlight when the input is not a sample. Add a test.
- Put "Hi Mum, new number" first in the sample list. It shows what only we have: the call goes to Omar's saved number and Sara can reply.
- After any result on the parent phone, if Sara has not been shown yet, show a short hint in the demo panel (not on the parent phone): "Next: tap Show Sara, then reply on Sara's phone."

## Step 2 - Rename

- Change `APP_NAME` in `lib/config.ts` to the new name, then find every other user-facing or document mention of the old name (page titles, metadata, manifest, service worker cache names, AI prompt text, README, DEVPOST.md, EVALUATION.md heading, privacy page, eval file "about" text, comments) and update it. Keep "Second Look" only where history requires it (old commit messages).
- Do not rename the GitHub repository or the Netlify site yourself. Tell me the exact commands for both and what will change (the old Netlify address stops working; GitHub redirects the old repo address), and wait for my answer.

## Step 3 - Privacy: hide personal details before the AI sees them

Goal: the AI service never receives card numbers, account numbers, codes, email addresses, phone numbers or the family's names, and the person can see exactly what was sent.

- Add `lib/privacy/mask.ts`, pure TypeScript, run on the device before any text is sent to `/api/check`. Replace:
  - card numbers (13-19 digits, with or without spaces or dashes) with `[CARD NUMBER]`;
  - IBANs and long account numbers with `[ACCOUNT NUMBER]`;
  - standalone 4-8 digit codes with `[CODE]` (keep money amounts, dates and times as they are);
  - email addresses with `[EMAIL]`;
  - phone numbers with `[PHONE NUMBER]`;
  - the circle's own names (parent and family members) with `[PARENT]` and `[FAMILY MEMBER]`;
  - in links, keep the scheme and host (the AI needs the host to spot lookalike addresses) and replace everything after the host with `/[rest of link removed]`.
- The rules engine keeps running on the original text on the device, so local detection does not get worse. Phone numbers and links shown as "This came from the message" still come from the original text.
- The AI no longer needs to extract phone numbers or links; take those from the device-side extraction. Update the prompt and schema so the masked tokens are explained to the AI (for example, `[CODE]` means a code appeared in the message).
- Transcripts: mask the transcript before analysis. Be honest that the audio itself goes to the speech-to-text service.
- Photos: the image is sent as it is, because masking needs text recognition on the device. On the photo screen add one plain line: "The picture is sent to an AI service to read it. If it shows a card number, cover it first." Say the same on the privacy page.
- Alerts to family: mask codes, card numbers and account numbers in the shared excerpt too. Keep phone numbers and links visible to the family, still non-clickable.
- On the parent result screen, add a small "What the AI service saw" disclosure that shows the masked text. Keep it collapsed by default.
- Private mode (rules only, nothing leaves the phone): a family setting, off by default, behind the PIN like other settings. When on, the parent's checks never call `/api/check` or `/api/transcribe`; the photo and voice tiles are hidden and only "Type or paste" remains; results say "Quick check on this phone only". In the demo, add a "Private mode" switch in the demo panel so judges can try it.
- Update the privacy page: what is masked, what is still sent (photos, audio), what private mode does.
- Tests: every mask rule, including the tricky cases (a money amount and a date must survive; a sign-in code inside "Your code is 482913" must be masked; a lookalike host must survive in a link), the verdict in private mode, and a check that no request is made to `/api/check` when private mode is on.

## Step 4 - The two urgent moments

Before writing any advice, open and read current official public guidance on what to do after a scam and on phone scams (for example, the US FTC's "what to do if you were scammed" page and comparable official consumer or police guidance). Paraphrase in plain words for a reading age of about 10. List every page you used in a new "Where the advice comes from" section on the privacy page.

### "Someone is on the phone with me now"

- A large button on the parent home screen, below "Check something".
- Screen 1: "It is OK to hang up. Your real bank and the real police will not mind." One big button: "I hung up".
- Screen 2: call buttons for the saved bank contact and the main family member (verified numbers only), plus "Tell [family name]", which sends an URGENT alert ("Amina had a worrying phone call and hung up"). If the official guidance you read recommends calling back from a different phone or waiting a few minutes on a landline, include that as one short line; otherwise leave it out.
- Also offer "Tell me what happened" (the existing voice check) as a secondary option.

### "Something already happened"

- A large button on the parent home screen, and on every WARNING or NOT SURE result: "I already sent money, clicked, or shared something".
- Screen 1, "What happened?", four large choices: "I sent money", "I shared a code or password", "I gave card or bank details", "I let someone into my phone or computer".
- Screen 2: a short plan for that choice, based on the guidance you read. The first step is always a big call button to the saved bank contact (or the main family member if none is saved). Then: "We have told [family name]" (send an URGENT alert automatically, including which choice was picked and the masked excerpt if there was a check). Then two or three plain next steps from the guidance. Never promise money can be recovered.
- Calm tone: "This happens to many people. Acting now helps."

### Family side and demo

- Family inbox: URGENT alerts appear at the top with an icon plus the word URGENT, and a one-tap reply "I'm calling you now." Keep using polling; no new services.
- Demo: both buttons work in the demo, and Sara's phone shows the URGENT alert in the browser-only family loop. Add both to the demo instructions in one line.
- Tests: the urgent alert path through the real route handlers, the plan content for each choice, call buttons only ever using saved numbers, and the demo loop.

## Step 5 - Independent evaluation (run once)

Only now may you open `eval/heldout.json`.

1. Check its format. It has `id`, `label` (scam or normal), `type` (text or call_description), `scam_type` (free text) and `text`, but no `targets`. Make `targets` optional for this file and skip the coverage table for it. Do not edit the file. If it has a format problem you cannot handle in code, stop and tell me rather than changing it.
2. Make `npm run eval` accept a file (`npm run eval -- eval/heldout.json`), keeping `eval/messages.json` as the default.
3. Re-run the original 48 messages (masking changed what the AI sees).
4. Run the held-out set **once** through the real pipeline: rules only, and rules plus AI.
5. Write both into EVALUATION.md, clearly separated:
   - Held-out set first: who wrote it (a separate session that never saw the rules), the commit where it was frozen, and that the rules, prompt and masking were not changed after the run.
   - Then the original set, labelled as written alongside the rules.
   - Confidence intervals (Wilson, 95%) for the scam catch rate and the false-alarm rate on each set.
   - Every miss and false alarm listed with the message text.
6. Do not change rules, the prompt or masking after seeing the held-out results. If the run exposes a crash or a bug unrelated to detection quality, fix it, re-run, and say so in the report. Write down detection weaknesses as limitations and ideas for later.
7. Update README, DEVPOST.md and the privacy page with the held-out numbers, honestly, misses included. Use the gap between "rules only" and "rules plus AI" as the reason we use an AI service at all.

## Step 6 - Deploy and verify

- Stop `npm run dev`, deploy with the Netlify CLI as before, and check the live site: the demo bug fix, the new name, private mode, both urgent flows, the URGENT alert on Sara's phone, "What the AI service saw", and that no message content appears in function logs.
- Update README (what is new, the new name, the live link), DEVPOST.md (keep my `[PLACEHOLDER]` sections for me to write; add the new features and numbers), and PROGRESS.md.
- Give me a final list of anything I need to do myself.

## Optional, only if I say yes after Step 6

Run a seeded random sample of a public, openly licensed SMS spam dataset through the pipeline. Before downloading, open its page and confirm the licence allows this; credit it. Download to a git-ignored folder, never commit the data, and report only totals (no message text, since it contains real names and numbers). Say clearly that "spam" in that dataset is not the same as "scam".
