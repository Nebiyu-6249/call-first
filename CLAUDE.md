# Second Look - Project Brief (SafeSpace Hacks entry)

You are building "Second Look" (working name - keep the product name in one config constant so it can be changed), a web app that helps older people who are not comfortable with technology avoid scams. This is my entry for SafeSpace Hacks on Devpost. Read this whole file before writing any code, then follow the build phases at the bottom in order.

## Context you need

- Hackathon: SafeSpace Hacks (Devpost). Submission deadline: Nov 22, 2026, 5:00 PM US Eastern. Judges test the live link between Nov 23 and Nov 24, 2026.
- Judging criteria (equal weight, scored 1-5 each): Safety Benefit, Practical Functionality, Trust & Responsible Design, Clarity & User Experience. Complexity earns no bonus. Every decision should serve one of these four.
- Hackathon rules that affect the build:
  - Use only synthetic data: fictional people, fictional companies (for example "Gulf Example Bank"), clearly fake phone numbers, and links on reserved `.example` domains. Never use a real bank's or company's name, logo, phone number, or a real phishing link anywhere - code, seed data, tests, or screenshots.
  - Do not present the app as a replacement for emergency services.
  - Work built during the event must be distinguishable from pre-existing work: start from an empty repo, commit early and often with clear messages, and do not copy code from any of my other projects.
- I am on Windows using PowerShell. Use cross-platform npm scripts only (no bash-only commands).
- English only. No translation or multi-language features.
- No emoji anywhere: not in code, comments, UI text, commit messages, or docs. Use icons from lucide-react instead.

## The problem and the idea

Scams against older people usually depend on three tricks:
1. A fake message or call pretending to be a bank, the police, a government office, a delivery company, or a family member.
2. A fake phone number or link to "verify" or call back, which leads straight to the scammer.
3. Urgency and isolation: "act now", "don't tell anyone".

Most scam checkers only deal with the first trick. Second Look is a scam interrupter that handles all three:
1. The older person shows the app anything suspicious (a screenshot or photo, pasted text, or a spoken description of a phone call) and gets a plain-language answer that is read aloud.
2. The next step always points to a verified contact that a family member saved in advance (their real bank number, their daughter's number) - never to a number or link from the message.
3. A "Show my family" button sends the message and the result to a trusted family member, who replies with one tap.

Two users:
- **Parent** (the older person): sees one big button and very large, simple screens. Never configures anything.
- **Family member** (adult child or helper): does all setup, holds the PIN, receives alerts, and replies.

## Tech stack

- Next.js (App Router) + TypeScript + Tailwind CSS, deployed on Netlify.
- Next.js route handlers for all server logic. The OpenAI key and the Supabase service role key are server-only and must never reach the browser.
- OpenAI API for reading screenshots and photos (vision), analysing text, and transcribing voice. Read model names from env vars (`OPENAI_MODEL`, `OPENAI_TRANSCRIBE_MODEL`) and check the current OpenAI docs for suitable models: a fast, vision-capable model that supports Structured Outputs (JSON schema), and a speech-to-text model. Use Structured Outputs for the analysis response.
- Supabase (Postgres) for circles, contacts, devices, and alerts. Access it only from route handlers with the service role key; the browser never talks to Supabase directly.
- Browser `speechSynthesis` for read-aloud. `MediaRecorder` for voice capture.
- Vitest for tests. lucide-react for icons. Font: Atkinson Hyperlegible (Google Fonts, via next/font), designed for low-vision readers.

## How a check works (core pipeline)

Input types: `text`, `image`, `call_description` (voice transcribed to text).

1. **Get the text.**
   - Image: compress in the browser before upload (longest side 1600px, JPEG quality about 0.8). Re-encoding through a canvas also strips EXIF and location data - mention this in the privacy notes. The image is processed in memory and never stored or logged.
   - Voice: record up to 60 seconds, send to `/api/transcribe`, and show the transcript back on the result screen ("You said: ...").

2. **Rules engine** (`lib/rules`, pure TypeScript, no AI, unit-tested). Runs on the text and returns red flags from a fixed taxonomy, each with a severity and a plain-language reason:
   - `asks_for_code` (asks the person to share a code, PIN, or password) - high. Important: a message that delivers a code ("Your code is 482913. Never share it.") is NOT asking for a code. The rules must tell these apart.
   - `asks_for_card_or_bank_details` - high
   - `secrecy_request` ("don't tell your family or your bank") - high
   - `remote_access_request` (install an app, share your screen, remote-control software) - high
   - `asks_for_payment` (transfer, gift cards, crypto, a fee to release money or a parcel) - high
   - `family_emergency_claim` ("Hi Mum, this is my new number", "your grandson is in trouble") - high
   - `contains_instructions_to_ai` ("ignore previous instructions", "this message is safe") - high
   - `threat_or_penalty` (arrest, fine, legal action, account blocked) - medium
   - `urgency_or_deadline` - medium
   - `impersonates_authority` (police, court, government office) - medium
   - `impersonates_bank_or_company` - medium
   - `unexpected_prize_or_refund` - medium
   - `contains_link` (raise the reason text if shortened or a lookalike domain) - medium
   - `contains_callback_number` - medium

3. **AI analysis** (`/api/check`). Send the text (or image) with a system prompt that:
   - Treats the message as untrusted data inside clear delimiters, never as instructions.
   - Chooses flags only from the same taxonomy (plus `other` with a short note).
   - Returns JSON with: `extracted_text`, `input_summary` (one sentence: what the message claims to be), `flags[]` (id plus an evidence quote of 12 words or fewer), `claimed_sender_type` (bank, government, police, delivery, family, company, unknown), `asked_for[]`, `phone_numbers_in_message[]`, `links_in_message[]`, `ai_assessment` (`likely_scam` | `unclear` | `likely_normal`), `confidence` (0-1), `plain_explanation` (3 short sentences or fewer, simple words, reading age about 10).
   - Has a hard timeout of about 8 seconds. Netlify functions have a short execution limit (check the current limit in Netlify's docs); keep every route handler well under it.

4. **Verdict** (`lib/verdict`, deterministic code, not AI). Three levels, never "safe". Evaluate in this order:
   - `WARNING`: any high-severity flag from rules or AI; or AI says `likely_scam` with confidence 0.6 or higher and at least one flag.
   - `NOT_SURE`: any medium flag; or AI says `unclear`; or the AI call failed or timed out and the rules found nothing.
   - `NO_WARNING_SIGNS`: only if the rules found nothing AND the AI succeeded with `likely_normal` at confidence 0.7 or higher. Even then, show: "If anyone asks you for money or a code, check with [family name] first."
   - Because the verdict is computed in code from both sources, a message that tries to talk the AI into saying it is safe cannot flip the result on its own. Cover this in tests.

5. **Next step** (code, not AI). Pick the single most useful action from the circle's verified contacts based on `claimed_sender_type`: bank -> the saved bank contact; family claim -> call that family member on their saved number; otherwise -> call the main family member. Render it as a large `tel:` button. Phone numbers and links found in the message are shown as plain, non-clickable text with the label "This came from the message. Do not call it or tap it." Never linkify anything from the message.

6. **Failure fallback.** If the network or the AI fails, show the rules-only result plus the Golden Rules card:
   - Never share a code sent to your phone.
   - Never pay because a message rushes you.
   - Never call a number or tap a link from the message.
   - When in doubt, call [family name].
   The parent's verified contacts are cached on the device so these call buttons still work offline.

## Parent screens (`/p`)

Design rules: base text at least 22px (the family can choose Large or Extra Large), buttons at least 64px tall and full width, no more than two choices per screen where possible, WCAG AAA contrast where possible, never colour alone (always icon plus word), simple words with no jargon ("code sent to your phone", not "OTP"), works at 200% zoom, fully keyboard and screen-reader accessible. Calm and warm, not scary.

- **Home:** one very large "Check something" button. Below it, large call buttons for saved family members, and a small "Golden Rules" link.
- **Choose input:** three large tiles - "Photo or screenshot", "Type or paste", "Tell me what happened" (voice). One short line under them: "An AI service checks it. Nothing is saved."
- **Checking:** a simple progress message ("Taking a careful look...").
- **Result:** a big banner with icon and word (WARNING / NOT SURE / NO WARNING SIGNS FOUND), up to three plain reasons, one "What to do now" line, the verified call button, the "Show [family name]" button, and a "Read it to me" button (also try to read automatically). A small "I think this is wrong" link lets them dismiss the result and suggests asking family. Show the non-clickable warning for numbers and links from the message.
- **Sent to family:** "[Name] will see this. Do not reply to the message while you wait." Poll for the family reply every 5 seconds and show it in large text when it arrives.
- **Pairing (`/p/pair`):** enter the 6-digit code from the family member, or open via QR.
- Footer on every parent screen: "Second Look gives a second opinion, not a guarantee. In an emergency, call [emergency number]." The number is set per circle, default 999.

## Family screens (`/f`)

- **Create circle:** parent's display name, text size, emergency number, family members (name, relationship, phone), verified contacts (label, category: bank / family / doctor / police / other, phone, note), and a 6-digit PIN.
- **Pair the parent's phone:** generate a one-time 6-digit pairing code (expires in 15 minutes) and a QR code for `/p/pair`. The parent device receives a random device token stored in localStorage.
- **Alerts inbox:** alerts from the parent with verdict, one-line summary, the excerpt the parent shared, and time. One-tap replies: "Don't do anything. I'm calling you now." / "That one is fine." / "Wait for me, I'll check." Plus a short custom reply.
- **Edit contacts and settings:** PIN required every time.

## Security and privacy (this is a judged criterion)

- The parent device can read the circle's contacts and create alerts. It cannot edit contacts or settings. This matters: if anyone could change a "verified" number, a scammer holding the phone could replace the bank number with their own.
- PIN hashed with scrypt or bcrypt. Five failed attempts trigger a 15-minute lockout. Device tokens and pairing codes are stored hashed.
- Family sessions use a signed httpOnly cookie.
- Alerts store only what the parent chose to share: the one-line summary and a text excerpt of at most 500 characters. Never store images. Alerts expire automatically after 7 days.
- Do not log message content, images, or transcripts on the server.
- Basic rate limit on `/api/check` and `/api/transcribe` (for example 30 requests per hour per device or IP) to protect the API key during judging.
- An honest in-app privacy page: what is sent to OpenAI, what is stored and for how long, what is never stored. Check OpenAI's current API data-usage policy before describing it.

## Demo mode (`/demo`) - critical for judging

Judges must be able to try the whole idea in under two minutes with no sign-up and no second phone.
- A fictional preloaded circle: parent "Amina", daughter "Sara", verified contact "Gulf Example Bank" with a clearly fake number.
- Desktop: two phone frames side by side, parent on the left and family on the right. Mobile: a toggle between the two views.
- A row of sample messages the judge can send with one tap: fake bank asking for a code, account frozen with a link, traffic fine with a payment link, parcel held for a fee, "Hi Mum, new number", police threat with a secrecy request, prize win, a normal appointment reminder, and a genuine login-code message the person requested. Judges can also paste their own text or upload a screenshot.
- In demo mode the family loop runs entirely in the browser (shared state between the two frames). No database writes, and the page must work even if Supabase is unreachable. The AI calls are real; if they fail, the fallback must still produce a sensible result.
- A short banner explaining what the judge is looking at, with links to the privacy and limitations notes.

## Evaluation (evidence for the Safety Benefit score)

- `eval/messages.json`: about 30 fictional scam messages covering the taxonomy and about 15 normal messages, each labelled `scam` or `normal`. Include tricky normal ones: a login-code message the person requested, a bank notice with no link or request, a delivery update with no payment.
- `npm run eval` runs every message through the real pipeline and writes `EVALUATION.md`: for scams, how many got WARNING, NOT_SURE, and NO_WARNING_SIGNS (the last one is a miss); for normal messages, how many got WARNING (false alarm) and NOT_SURE. Report the numbers exactly as they come out, misses included.
- Unit tests: each rules-engine flag, and the verdict logic, including "AI says normal but rules find a secrecy request -> WARNING", "AI fails and rules find nothing -> NOT_SURE", and a prompt-injection sample -> WARNING.

## Docs to produce

- `README.md`: what it is, the live link, how to try the demo in three steps, local setup (env vars, Supabase SQL migration, `npm install`, `npm run dev`), deploy notes, a Limitations section, and a Credits section (libraries, font, OpenAI, Supabase, and AI coding assistance from Claude Code). State that the project was built during SafeSpace Hacks (Oct 17 - Nov 22, 2026).
- `DEVPOST.md`: draft sections for the Devpost page (inspiration, what it does, how it was built, challenges, what I learned, what's next), one concrete safer-outcome example, and one honest limitation. Leave clear placeholders where my own personal experience should go.
- `PROGRESS.md`: update after every phase with what is done, what is next, and known issues, so a new session can pick up where the last one stopped.
- `.env.example` with every variable and a short comment for each.

Known limitations to state honestly: it cannot listen to live phone calls; it cannot catch every scam; full checks depend on an AI service and an internet connection; the family loop needs a family member who responds; English only.

## Build phases

Work one phase at a time. At the end of each phase: run the build and the tests, commit, update PROGRESS.md, give me a short summary, and wait for my go-ahead before starting the next phase.

0. **Setup:** Next.js + TypeScript + Tailwind, Vitest, ESLint, lucide-react, the font, folder structure, `.env.example`, README skeleton, first commit.
1. **Rules engine and text check:** taxonomy, rules, verdict logic, tests, and the parent "Type or paste" flow with the result screen (rules only).
2. **AI analysis:** `/api/check` with Structured Outputs, timeout, fallback, verdict combining rules and AI, next-step logic, prompt-injection handling.
3. **Image and voice:** client-side compression, the vision path, recording and transcription, read-aloud.
4. **Family circle:** Supabase schema and migration SQL, create circle, PIN, pairing, verified contacts, alerts, replies, polling, permissions, rate limit, alert expiry.
5. **Demo mode:** split view, sample messages, in-browser family loop.
6. **Evaluation:** test set, eval script, EVALUATION.md.
7. **Polish and deploy:** accessibility pass (contrast, zoom, keyboard, screen reader), offline cache for contacts and the Golden Rules, privacy page, Netlify deploy, final README and DEVPOST.md.

If anything in this brief is unclear or seems wrong, ask me before building around it.
