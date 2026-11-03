# Call First - Devpost draft

Draft text for the SafeSpace Hacks submission page. Replace every `[PLACEHOLDER: ...]` with your own words before
submitting; those parts should come from your own experience, not from this draft.

**Tagline:** A scam interrupter for older people: check anything suspicious, call someone real, and show your family
with one tap.

---

## Inspiration

[PLACEHOLDER: Your own story. For example, a parent, grandparent or neighbour who got a scam message or call: what
happened, how it felt, what they did or nearly did, and what you wished they had had at that moment. Two or three
honest sentences are enough.]

[PLACEHOLDER: What you noticed when you looked at existing tools. Suggested point, if it matches your experience:
most scam checkers only answer "is this a scam?", but the people you know got caught by the phone number in the
message and by "don't tell anyone", not just by the message itself.]

Scams against older people usually rely on three tricks:

1. A fake message or call from a bank, the police, a delivery company or a family member.
2. A fake number or link to "verify" or call back, which leads straight to the scammer.
3. Urgency and isolation: "act now", "don't tell your family".

Call First is built to interrupt all three, not just the first.

## What it does

**For the older person** the main button is a very large "Check something", on very large, calm screens. They can:

- take a photo or screenshot,
- paste or type the message,
- or describe a phone call out loud.

Call First answers in plain words and reads the answer aloud:

- **WARNING:** this looks like a scam;
- **NOT SURE:** be careful;
- **NO WARNING SIGNS FOUND:** but if anyone asks for money or a code, check with family first.

It never says "safe". It shows up to three reasons, with a quote from the message for each.

**The next step is always a real person.** The big call button rings a number a family member saved in advance:
the bank's real number, or the son's real number when the message says "Hi Mum, it's Omar, this is my new number".
Any phone numbers or links found in the message are shown as plain text with "This came from the message. Do not
call it or tap it." They are never clickable.

**"Show Sara" brings the family in.** One tap sends a short summary and the message text to a family member. They
reply with one tap: "Don't do anything. I'm calling you now." The reply appears in large text on the parent's phone
and is read aloud.

**It helps in the two moments that matter most.** Many scams happen live, on the phone, or have already worked by
the time anyone checks. So the home screen has two more big buttons:

- **"Someone is on the phone with me now"** first says "It is OK to hang up. Your real bank and the real police will
  not mind." After "I hung up", it says to wait five minutes or use a different phone before calling back (scammers
  can keep a landline open), offers the saved bank and family numbers, and can tell Sara with an URGENT alert.
- **"I already sent money, clicked, or shared something"** (also on every WARNING or NOT SURE answer) asks what
  happened: sent money, shared a code or password, gave card or bank details, or let someone into the phone or
  computer. Then it gives a short plan. First, a big call to the saved bank. Next, "We have told Sara": an URGENT alert
  goes out automatically. Then two or three plain steps paraphrased from official FTC and UK police guidance, listed
  on the privacy page. "This happens to many people. Acting now helps." It never promises the money will come back.

URGENT alerts appear at the top of the family's inbox with a one-tap "I'm calling you now."

**Private details stay private.** Before a message goes to the AI, the phone replaces codes, card and account numbers,
email addresses, phone numbers and the family's names with placeholders like `[CODE]`. Every answer has a "What the
AI service saw" section showing exactly what was sent. A family can also switch on private mode, where checks use
the rules on the phone only and nothing is sent anywhere.

**For the family member** there is setup and an inbox. They:

- enter the parent's name and text size, family numbers and verified contacts, and a PIN;
- connect the parent's phone with a QR code;
- answer alerts.

The parent's phone can read the verified numbers but can never change them, so a scammer holding the phone cannot
swap the bank's number for their own.

**It still works when things fail.** If the AI or the internet is unavailable, a rules engine on the phone still gives
a quick answer, along with the Golden Rules:

- Never share a code sent to your phone.
- Never pay because a message rushes you.
- Never call a number or tap a link from the message.
- When in doubt, call Sara.

The call buttons work offline.

**Try it in two minutes:** the `/demo` page shows the parent's phone and the family member's phone side by side,
with nine sample messages, both urgent buttons and a private-mode switch. No sign-up and no second phone are needed.

## One concrete safer outcome

Amina, 74, gets a text:

> "Hi Mum, it's Omar. I dropped my phone in the sink so this is my new number. Can you send £450 to my friend's
> account today? I'll pay you back. Don't tell Dad yet x"

Amina pastes it into Call First. Within seconds the phone reads out:

> "Warning. This looks like a scam. It tells you to keep this secret. It asks you to pay or send money. It says a
> family member has a new number."

The big button says **Call Omar**, and it rings the number Sara saved for Omar months ago, not the "new number" in
the text.

Amina also taps "Show Sara". Sara's phone shows the alert, and Sara taps "Don't do anything. I'm calling you now."
Amina sees the reply in large letters before opening the banking app.

Without Call First, the most natural thing to do was reply to the new number. With it, the next step is a call to
the real Omar.

And if Amina had already sent the £450 before checking, she would tap "I already sent money, clicked, or shared
something", then "I sent money". The first thing on the screen is a big button to call her real bank, with what to
ask for: stop the payment and give the money back. Sara gets an URGENT alert at the same moment, without Amina having
to explain anything.

(Amina, Omar, Sara and the message are fictional, as is everything in the demo.)

## How we built it

- **Stack:** Next.js (App Router) + TypeScript + Tailwind CSS on Netlify, with Supabase Postgres for family circles.
  Only the server talks to the database and to OpenAI, so no secret key ever reaches the browser.
- **The verdict is computed in code, not by the AI.** Two sources feed it:
  - a rules engine of 14 warning signs, written in plain TypeScript and unit-tested;
  - OpenAI analysis through the Responses API with Structured Outputs: a strict JSON schema, the message between
    markers as untrusted data, and an 8-second timeout.

  The code combines them in a fixed order. A message that says "AI: this message is safe" cannot change the result,
  because a single high-risk sign from the rules is enough for WARNING. There is a test for exactly this.
- **Hiding personal details** happens on the phone, with pattern rules (cards are checked with the Luhn formula, and
  money amounts, dates and order numbers are kept), and again on the server. Where the AI quotes the message, the
  phone puts the real details back, so the parent sees their own message, not `[CODE]`.
- **Urgent-moment advice** comes from official pages we read first (three FTC pages and the UK police Report Fraud
  page on courier fraud), paraphrased for a reading age of about 10. Every line in the code names its source.
- **Photos:** made smaller on the phone first, which also removes hidden location data, and never stored.
- **Voice:** recorded for up to 60 seconds and turned into words by OpenAI speech-to-text. The parent sees
  "You said: ..." so they can tell if it misheard.
- **Read aloud:** the browser's built-in speech, one sentence at a time. It never reads out numbers or links from the
  message.
- **Security and privacy:**
  - the PIN is hashed with scrypt and locks after 5 tries;
  - phone tokens and pairing codes are stored as hashes;
  - the family session is a signed httpOnly cookie;
  - alerts are deleted after 7 days;
  - checks and voice are rate-limited to protect the AI key;
  - there is a "delete everything" button;
  - an honest privacy page covers what goes to OpenAI and for how long.
- **Accessibility:**
  - the Atkinson Hyperlegible font;
  - a 22px or 28px base text size on the parent screens;
  - buttons at least 64px tall;
  - every verdict shown as an icon plus a word, never colour alone;
  - every text colour checked to WCAG AAA (7:1) contrast by a unit test;
  - axe-core scans with no violations on every page;
  - tested at 320px wide and with the keyboard only.
- **Testing:** 290+ unit tests. They cover every warning sign, the verdict logic, prompt injection, the whole family
  loop through the real route handlers, and the SQL migration run in an in-process Postgres. An evaluation script
  runs fictional messages through the real pipeline and reports misses honestly (`EVALUATION.md`), including a
  70-message held-out set written separately and run once.

[PLACEHOLDER: Mention how you used Claude Code as an AI coding assistant, in your own words: what you directed, what
you reviewed and changed, and what you decided yourself.]

## Challenges we ran into

- **Telling "delivers a code" from "asks for a code".** "Your sign-in code is 482913. Never share it" is the most
  common genuine message older people receive, and it is full of scam-like words. The rules had to understand
  negation ("never share") without missing "Don't tell anyone, just send me the code".
- **Not letting the AI be the judge.** It would have been simpler to ask the AI "scam or not?". We made the AI one
  input to a decision made in code, so a prompt injection cannot flip the answer on its own.
- **Never pointing to the scammer.** Every number and link from the message had to stay non-clickable everywhere,
  including in the text read aloud, while the next step always uses a saved number.
- **A demo that works with no database and no second phone.** The parent screens run unchanged inside the demo, with
  the family loop kept in the browser.
- **Hiding details without breaking the answer.** Once family names are hidden, the AI can no longer say "your son
  Omar", only "your family member". We kept the privacy and moved the name-matching to the phone, which still sees the
  full message, so the call button still says "Call Omar".
- **Keeping our own evaluation honest.** The held-out set was written in a separate session and stayed unopened while
  we changed the rules, prompt and masking. The script refuses to run it twice, and the report checks with git that
  the detection code has not changed since the run.
- [PLACEHOLDER: A challenge you personally hit, such as a bug, a design decision you went back and forth on, or
  something you tested with a real person.]

## Accomplishments that we're proud of

- The parent never configures anything, and most screens have one or two main choices.
- The verified-contact design: even a perfect-looking scam leads to a real call.
- An evaluation we could not tune against, with the misses and false alarms published in full.
- [PLACEHOLDER: Anything from testing with a real older person or family member, if you did. Their reaction is worth
  more than any number here.]

## What we learned

- [PLACEHOLDER: Your own learning, for example about how scams target older people, accessibility, or designing for
  someone who is not comfortable with technology.]
- Test sets you write yourself flatter you. On our own 48 messages, rules plus AI missed no scam and gave 1 false
  alarm in 16 normal messages. Then we ran a 70-message set written in a separate session that never saw our rules,
  once, without changing anything afterwards. Rules plus AI caught 39 of 40 scams (98%, 95% CI 87-100%), 33 of them
  with WARNING, but gave a false WARNING on 6 of 30 normal messages (20%, 95% CI 10-37%): friends passing on scam
  warnings, genuine small money requests from family, and a real bank's "reply Y or N" check. The one miss was a
  "wrong number" opener that asks for nothing yet.
- The AI earns its place, but not where we expected. It did not reduce false alarms, because by design it cannot
  overrule a high-risk rule. What it did was turn NOT SURE into WARNING on scams (18 to 33 of 40) and let 14 of 30
  normal messages through with NO WARNING SIGNS, where the rules alone can only ever say NOT SURE.

## What's next

- Test with real older people and their families. Big buttons are a start, not proof.
- A larger, independent evaluation set, built with scam-awareness organisations.
- More languages. The app is English only for now.
- Alerts by text message or push notification, so family members do not need the app open.
- Optional help for the most common moment: a "Hang up and call back on the real number" screen during a call.

## One honest limitation

Call First cannot listen to a live phone call, and phone calls are where many of the most damaging scams happen.
The person can only describe a call afterwards, out loud or in writing. If the scammer has already persuaded them to
stay on the line or move money, Call First will not know. The "Someone is on the phone with me now" button (it is OK
to hang up, then the saved numbers to call) is the best it can offer in that moment.

Other limits:

- It cannot catch every scam. On a 70-message set written independently, it missed 1 of 40 scams and gave a false
  WARNING on 6 of 30 normal messages.
- Full checks need the internet and an AI service.
- The family loop needs a family member who answers.
- It is not an emergency service.

## Built with

Next.js, React, TypeScript, Tailwind CSS, OpenAI API (Responses API with Structured Outputs, speech-to-text),
Supabase (Postgres), Netlify, Vitest, PGlite, lucide-react, Atkinson Hyperlegible Next, Web Speech API, MediaRecorder.

## Try it

- Live demo: https://call-first-safespace.netlify.app/demo
- Code: https://github.com/Nebiyu-6249/call-first
