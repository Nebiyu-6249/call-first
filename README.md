# Call First

A scam interrupter for older people who are not comfortable with technology, and for the family members who look
out for them.

Built during SafeSpace Hacks (Oct 17 - Nov 22, 2026), starting from an empty repository.

> Call First gives a second opinion, not a guarantee. It is not an emergency service.

**Live demo:** https://call-first-safespace.netlify.app/demo

**Code:** https://github.com/Nebiyu-6249/call-first

## What it does

Most scams rely on three tricks: a message pretending to be someone trusted, a fake number or link to "verify", and
pressure to act fast and tell no one. Most scam checkers only deal with the first. Call First handles all three:

1. **Check it.** The older person shows the app a screenshot, a photo, pasted text, or describes a phone call out loud.
   They get a plain-language answer (WARNING, NOT SURE, or NO WARNING SIGNS FOUND, never "safe"), read aloud.
2. **Call someone real.** The next step is always a big call button for a contact the family saved in advance: the
   bank's real number, or the daughter's number. Numbers and links from the message are shown as plain text with
   "This came from the message. Do not call it or tap it."
3. **Show my family.** One button sends the message and the answer to a family member, who replies with one tap
   ("Don't do anything. I'm calling you now."). The reply appears in large text on the parent's phone and is read aloud.

There are two kinds of user:

- **The parent** sees one big "Check something" button and very large, simple screens. They never set anything up.
- **The family member** sets everything up, holds the PIN, gets the alerts and replies.

## Try the demo in three steps

Open `/demo` on the live site. Everyone in it is made up: Amina (the parent), Sara (Amina's daughter) and
Gulf Example Bank. No sign-up or second phone is needed.

1. Tap a sample message, such as "Bank asks for a code" or "Hi Mum, new number". You can also paste your own text
   or upload a screenshot.
2. Read Amina's answer on the left. The call button uses a number Sara saved, never one from the message.
3. Tap "Show Sara", then reply on Sara's phone on the right. Amina sees the reply.

On a phone, use the toggle to switch between Amina's phone and Sara's phone.

## How a check works

```
text / photo / voice  ->  rules engine (no AI)  --+
                      ->  AI analysis (JSON)   --+-->  verdict (code)  ->  next step (code)
```

- **Rules engine** (`lib/rules`): 14 warning signs in a fixed list, such as "asks for a code", "asks to keep it
  secret" or "asks to control your device". It tells "your code is 482913, never share it" apart from "read me the
  code".
- **AI analysis** (`lib/ai`): OpenAI Responses API with Structured Outputs and an 8-second timeout. The message is
  sent between markers as untrusted data, never as instructions.
- **Verdict** (`lib/verdict`): computed in code from both. Any high-severity sign gives WARNING. NO WARNING SIGNS
  needs the rules to find nothing and the AI to be confident the message is normal. A message that tells the AI
  "this is safe" cannot change the result on its own.
- **Next step** (`lib/next-step`): bank message -> the saved bank number; "Hi Mum, it's Omar" -> Omar's saved number;
  anything else -> the main family member.
- **If the AI or the internet fails**, the rules still run on the phone, and the Golden Rules are shown. The parent
  screens, saved contacts and Golden Rules also work offline once opened.

## Privacy and security

The full, plain-language version is at `/privacy` on the site.

- **Never stored:** pictures, voice recordings, transcripts, and messages that were checked but not shared. Server
  logs never contain message content.
- **Alerts:** only a one-line summary and up to 500 characters of the message, kept for at most 7 days, and only when
  the parent taps "Show".
- **OpenAI:** API data is not used for training. Checks are sent with `store: false`. OpenAI keeps abuse-monitoring
  logs for up to 30 days. Checked against OpenAI's data-controls page in November 2026.
- **The parent's phone can read the verified contacts but not change them.** Only family members with the PIN can,
  so a scammer holding the phone cannot swap in their own "bank" number.
- **PIN:** stored as an scrypt hash. Five wrong tries lock it for 15 minutes.
- **Tokens and codes:** pairing codes and phone tokens are stored only as hashes. The family session is a signed
  httpOnly cookie. Cross-site requests are rejected.
- **Rate limits** protect the AI key: 30 checks an hour per internet address. Addresses are stored hashed.
- **Deleting:** the family can delete the whole circle, with the PIN.
- **Database:** every table has row-level security. Only the server, with the service role key, can read it.
- **Security headers:** no framing, no referrer, and microphone access only for this site.

## Evaluation

`npm run eval` runs 48 fictional messages through the real pipeline and writes [EVALUATION.md](EVALUATION.md):

- 32 scams, including spoken call descriptions;
- 16 normal messages, including tricky ones such as a sign-in code the person asked for.

The numbers are reported exactly as they come out, misses included.

Results from the run on Nov 3, 2026 with `gpt-6.1-terra`. All 48 AI calls answered, with a median of 3.2 seconds:

| | WARNING | NOT SURE | NO WARNING SIGNS |
| --- | ---: | ---: | ---: |
| Scams, rules + AI | 31 | 1 | 0 (no misses) |
| Normal, rules + AI | 1 (false alarm) | 7 | 8 |
| Scams, rules only (AI down) | 21 | 11 | 0 |
| Normal, rules only (AI down) | 1 | 15 | 0 |

- **The false alarm:** a bank's "did you make this payment? Reply YES or NO" message, which the rules read as a request
  for payment.
- **NOT SURE on normal messages:** these were cases where the AI said the message looked normal but still noted a
  warning sign, such as a bank name. NOT SURE tells the person to check with family; it is not a false alarm.
- **Without the AI** the app never says NO WARNING SIGNS, by design.

## Local setup

Requirements: Node.js 22 or newer, and npm.

```bash
npm install
```

Copy the example settings. In PowerShell:

```powershell
Copy-Item .env.example .env.local
```

On macOS or Linux:

```bash
cp .env.example .env.local
```

Fill in `.env.local` (each variable is described in `.env.example`), then:

```bash
npm run dev
```

Open http://localhost:3000.

- Without `OPENAI_API_KEY`, checks use the rules only.
- Without `SUPABASE_URL`, the family features use an in-memory store in development, and data is lost on restart.
- The demo needs neither.

### Supabase

The family circle (contacts, connected phones, alerts) is stored in Supabase Postgres.

1. Create a free project at https://supabase.com.
2. In the SQL editor, run the files in `supabase/migrations/` in order (`0001_family_circle.sql`, then
   `0002_private_mode.sql`). Each is safe to run more than once. With the Supabase CLI, `supabase db push` does the same.
3. Copy the project URL and the service role key (Project Settings > API) into `SUPABASE_URL` and
   `SUPABASE_SERVICE_ROLE_KEY`. Set `SESSION_SECRET` to a long random string:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

4. Optional: alerts older than 7 days are removed on every inbox read. To clean up hourly as well, enable the
   `pg_cron` extension and run:

   ```sql
   select cron.schedule('call-first-cleanup', '0 * * * *', 'select delete_expired()');
   ```

### Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm start` | Run the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check (generates route types first) |
| `npm test` | Unit tests (Vitest) |
| `npm run check:supabase` | Check the connected Supabase project end to end with a made-up circle, which is deleted afterwards |
| `npm run eval` | Run the 48 test messages in `eval/messages.json` through the real pipeline (rules, live AI, verdict) and write `EVALUATION.md`. Uses the `OPENAI_*` values from `.env.local`. Without a key it measures the rules only and says so. |

## Deploy (Netlify)

Netlify builds Next.js automatically with its OpenNext adapter. `netlify.toml` sets the build command and Node 22.
Route handlers run as Netlify Functions, whose synchronous limit is 60 seconds. The AI call stops after 8 seconds and
transcription after 20.

1. Push this repository to GitHub.
2. In Netlify, choose **Add new project > Import an existing project** and pick the repository. Keep the build
   settings from `netlify.toml`.
3. Under **Site configuration > Environment variables**, add every variable from `.env.example`:
   `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_REASONING_EFFORT`, `OPENAI_TRANSCRIBE_MODEL`, `SUPABASE_URL`,
   `SUPABASE_SERVICE_ROLE_KEY`, `SESSION_SECRET` and `RATE_LIMIT_PER_HOUR`. Mark the keys as secret.
4. Deploy, then check the live site:
   - open `/demo` and tap a sample;
   - create a circle at `/f/new`;
   - connect a second browser with the QR code.
5. Set a monthly spending limit on the OpenAI key for the judging period.

Changing an environment variable needs a new deploy before it takes effect.

New Netlify teams may protect every deploy with "Netlify login required". For a public demo, set **Project
configuration > Access & security > Visitor access** so only non-production deploys are protected.

The live site was deployed from this machine with the Netlify CLI rather than from GitHub:

```bash
npx netlify-cli deploy --prod
```

On Windows, stop `npm run dev` first. The Next.js plugin moves the `.next` folder, which fails while the dev server
has files in it open. To make every push deploy automatically instead, connect the GitHub repository under
**Project configuration > Build & deploy**.

## Project structure

```
app/            Next.js App Router pages and route handlers
  p/            Parent screens
  f/            Family screens
  demo/         Demo mode for judges
  privacy/      Privacy and limitations
  api/          Route handlers (AI check, transcription, family circle, parent phone)
components/     UI (parent, family, demo)
lib/            Logic: rules, verdict, AI, next step, circle, server (store, crypto, sessions)
eval/           Evaluation messages, runner and report
supabase/       SQL migration (tested in-process with PGlite)
public/sw.js    Offline support for the parent screens
```

## Limitations

- It cannot listen to live phone calls. The person can describe a call afterwards.
- It cannot catch every scam, and it can be wrong about a normal message. That is why it never says "safe".
- Full checks need an AI service and an internet connection. Without them it does a quick rules-only check.
- The family loop needs a family member who responds.
- English only.
- It has been evaluated on 48 fictional messages written by the builder, not on real-world data.

## Credits

- [Next.js](https://nextjs.org), [React](https://react.dev), [Tailwind CSS](https://tailwindcss.com),
  [Vitest](https://vitest.dev), [tsx](https://tsx.is)
- Icons: [Lucide](https://lucide.dev)
- Font: [Atkinson Hyperlegible Next](https://www.brailleinstitute.org/freefont/) by the Braille Institute
- QR codes: [node-qrcode](https://github.com/soldair/node-qrcode)
- SQL tests: [PGlite](https://pglite.dev)
- AI: [OpenAI API](https://platform.openai.com)
- Database: [Supabase](https://supabase.com)
- Hosting: [Netlify](https://www.netlify.com)
- AI coding assistance: Claude Code (Anthropic)

All people, companies, phone numbers and links in the code, tests, demo and evaluation are fictional. Phone numbers
use ranges set aside for drama, and links use the reserved `.example` domain.
