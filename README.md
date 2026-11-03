# Second Look

A scam interrupter for older people who are not comfortable with technology, and the family members who look out for them.

Built during SafeSpace Hacks (Oct 17 - Nov 22, 2026).

> Second Look gives a second opinion, not a guarantee. It is not an emergency service.

**Live demo:** _link added at deploy time_

## What it does

Most scams rely on three tricks: a fake message pretending to be someone trusted, a fake number or link to "verify", and pressure to act fast and tell no one. Second Look handles all three:

1. **Check it.** Show the app a screenshot, a photo, pasted text, or describe a phone call out loud. It gives a plain-language answer and reads it aloud.
2. **Call someone real.** The next step always points to a contact a family member saved in advance, never to a number or link from the message.
3. **Show my family.** One button sends the message and the result to a trusted family member, who replies with one tap.

## Try the demo in three steps

_To be written in Phase 5._

## Local setup

Requirements: Node.js 22 or newer, npm.

```bash
npm install
```

```bash
copy .env.example .env.local
```

Fill in `.env.local` (each variable is described in `.env.example`), then:

```bash
npm run dev
```

Open http://localhost:3000.

### Supabase

The family circle (contacts, paired phones, alerts) is stored in Supabase Postgres. Only the server talks to it,
using the service role key; every table has row-level security on with no policies.

1. Create a free project at https://supabase.com.
2. In the SQL editor, run `supabase/migrations/0001_family_circle.sql` (safe to run more than once).
3. Copy the project URL and the service role key (Project Settings > API) into `SUPABASE_URL` and
   `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`, and set `SESSION_SECRET` to a long random string.

Without `SUPABASE_URL`, `npm run dev` uses an in-memory store so you can try the family loop locally
(data is lost on restart). Production refuses to start the family features without Supabase.

### Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |
| `npm test` | Unit tests (Vitest) |
| `npm run eval` | Run the 48 test messages in `eval/messages.json` through the real pipeline (rules, live AI, verdict) and write `EVALUATION.md`. Uses `OPENAI_*` from `.env.local`; without a key it measures the rules only and says so. |

## Project structure

```
app/            Next.js App Router pages and route handlers
  p/            Parent screens
  f/            Family screens
  demo/         Demo mode for judges
  privacy/      Privacy notes
  api/          Server route handlers (AI, family circle)
components/     Shared UI components
lib/            Pure logic (rules engine, verdict, config)
eval/           Evaluation messages and script
supabase/       SQL migration (tested in-process with PGlite)
```

## Deploy

_To be written in Phase 7 (Netlify)._

## Limitations

- It cannot listen to live phone calls.
- It cannot catch every scam.
- Full checks depend on an AI service and an internet connection.
- The family loop needs a family member who responds.
- English only.

## Credits

- [Next.js](https://nextjs.org), [React](https://react.dev), [Tailwind CSS](https://tailwindcss.com), [Vitest](https://vitest.dev)
- Icons: [Lucide](https://lucide.dev)
- Font: [Atkinson Hyperlegible Next](https://www.brailleinstitute.org/freefont/) by the Braille Institute
- AI: [OpenAI API](https://platform.openai.com)
- Database: [Supabase](https://supabase.com)
- AI coding assistance: Claude Code (Anthropic)
