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

**For the older person** there is one big button, "Check something", and very large, calm screens. They can:

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
with nine sample messages. No sign-up and no second phone are needed.

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
- **Testing:** 220+ unit tests. They cover every warning sign, the verdict logic, prompt injection, the whole family
  loop through the real route handlers, and the SQL migration run in an in-process Postgres. An evaluation script
  runs 48 fictional messages through the real pipeline and reports misses honestly (`EVALUATION.md`).

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
- [PLACEHOLDER: A challenge you personally hit, such as a bug, a design decision you went back and forth on, or
  something you tested with a real person.]

## Accomplishments that we're proud of

- The parent never configures anything, and every screen has at most two main choices.
- The verified-contact design: even a perfect-looking scam leads to a real call.
- [PLACEHOLDER: Anything from testing with a real older person or family member, if you did. Their reaction is worth
  more than any number here.]

## What we learned

- [PLACEHOLDER: Your own learning, for example about how scams target older people, accessibility, or designing for
  someone who is not comfortable with technology.]
- Small honest numbers are more useful than big claims. On our 48-message set, rules plus AI gave WARNING for 31 of
  32 scams and NOT SURE for the last one, so no scam got NO WARNING SIGNS. Of 16 normal messages, 8 got NO WARNING
  SIGNS, 7 got NOT SURE, and 1 was a false alarm: a genuine-looking bank "Reply YES or NO" check. The set is 48
  fictional messages written by us,
  and we report the misses and false alarms exactly as they come out.

## What's next

- Test with real older people and their families. Big buttons are a start, not proof.
- A larger, independent evaluation set, built with scam-awareness organisations.
- More languages. The app is English only for now.
- Alerts by text message or push notification, so family members do not need the app open.
- Optional help for the most common moment: a "Hang up and call back on the real number" screen during a call.

## One honest limitation

Call First cannot listen to a live phone call, and phone calls are where many of the most damaging scams happen.
The person can only describe a call afterwards, out loud or in writing. If the scammer has already persuaded them to
stay on the line or move money, Call First will not know. The Golden Rules and the "Call [family name]" button are
the best it can offer in that moment.

Other limits:

- It cannot catch every scam.
- Full checks need the internet and an AI service.
- The family loop needs a family member who answers.
- It is not an emergency service.

## Built with

Next.js, React, TypeScript, Tailwind CSS, OpenAI API (Responses API with Structured Outputs, speech-to-text),
Supabase (Postgres), Netlify, Vitest, PGlite, lucide-react, Atkinson Hyperlegible Next, Web Speech API, MediaRecorder.

## Try it

- Live demo: https://second-look-safespace.netlify.app/demo
- Code: https://github.com/Nebiyu-6249/second-look
