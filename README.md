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

Supabase migration steps are added in Phase 4.

### Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |
| `npm test` | Unit tests (Vitest) |

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
supabase/       SQL migrations
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
