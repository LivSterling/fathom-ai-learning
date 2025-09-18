# (Name TBD) — AI Learning Platform (MVP)

A simple, fast way to learn any concept: type your goal, get a small plan, talk to an AI tutor, and lock it in with spaced‑repetition. Works great in **Guest Mode** so anyone can try it instantly.

## Why this exists
Most people learn faster with a tutor and short, focused practice. This MVP gives you both: a lightweight plan from trusted free resources + a coach that checks your understanding and turns moments into flashcards.

---

## What’s in the MVP
- **Guest Mode (no login)** → Start immediately. Upgrade later without losing progress.
- **Concept‑first onboarding** → “What do you want to learn?” + timebox (mins/day, weeks) and level.
- **Curriculum Builder Lite** → 3–5 modules from **whitelisted** docs/videos; clear objectives, quick checks, citations. Fully editable.
- **Lesson Player + AI Tutor (text/voice)** → Socratic chat, resource cards, one‑tap “add to flashcards.”
- **Quick Check gate** → Short quiz to confirm mastery; auto‑remediation if you miss it.
- **Spaced Repetition (Anki‑style)** → Due‑today queue; Again/Hard/Good/Easy; optional **voice review** with manual override.
- **Uploads + Search** → Drop PDFs/notes, get proposed cards, and search them later.
- **Dashboard** → Cards due, streak, study minutes, weakest tags, next lesson CTA.

> Out of scope: social/leaderboards, heavy web crawling, native mobile, OCR for scanned docs.

---

## How it works (in 5 steps)
1) Tell us what you want to learn (or paste a link/upload a PDF).
2) We draft a small plan from vetted sources; you tweak and **Publish**.
3) Open a lesson → chat with the tutor (text/voice) → get quick checks.
4) Accept/edit the suggested flashcards.
5) Clear your daily reviews; watch your weak spots shrink.

---

## Tech stack (MVP)
- **Frontend:** Next.js (App Router), React, Tailwind + DaisyUI (**lemonade** theme).
- **Backend:** Next.js API routes.
- **Auth/DB/Storage:** Supabase (Postgres, RLS, Storage).
- **Vectors:** `pgvector`.
- **AI:** cost‑friendly tutor model (HF) + small embeddings; Web Speech API for voice.

---

## Data model (short version)
`profiles (is_guest)` · `curricula/modules/lessons/resources` · `sessions/messages` · `flashcards/srs_state/reviews` · `sources` · `embeddings`

RLS: all user data is owner‑scoped (`auth.uid()`). Guests are real users with `is_guest=true` and can upgrade in place.

---

## Getting started
```bash
pnpm install
cp .env.example .env.local   # add Supabase URL + anon key (service role key only on server)
pnpm dev                     # http://localhost:3000
```

**Env**
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # server only
EMBEDDINGS_MODEL=e5-small
TUTOR_MODEL=tutor-instruct-small
```

**Supabase**
- Enable `pgvector`.
- Apply migrations (`/supabase/migrations`) and RLS policies.

---

## Demo tips
- Use **Guest Mode** for quick demos.
- Seed plans for: **React Hooks**, **Cardiac Physiology**, **Spanish A2 Verbs** (put sample JSON in `/seed/`).
- Component gallery at `/lemonade-preview` to check UI styles.

---

## Roadmap (next)
- Acceleration mode (high‑leverage sequencing)
- Metacognition dashboard (study efficiency + coaching)
- Better voice (Whisper STT / premium TTS)
- OCR & highlight‑to‑card
- Integrations (Anki, Notion, Obsidian)

---

## License
MIT (change as needed).

