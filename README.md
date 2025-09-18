# (Name TBD) — AI Learning Platform (MVP)

Mastery-based, AI‑assisted learning for lifelong learners and professionals. Concept‑first onboarding, Curriculum Builder Lite, an adaptive AI Tutor (text + voice), Anki‑style Spaced Repetition, uploads + RAG, and zero‑friction **Guest Mode** so anyone can try it instantly.

> Target users: software engineers, nurses upskilling/respecializing, and language learners — but open‑topic by design.

---

## ✨ Core Value
- **Learn anything, faster**: Concept‑first intake → a small, credible plan → micro‑lessons with Socratic guidance → daily SRS for retention.
- **No barriers**: Start in **Guest Mode**; upgrade later without losing data.
- **Own your materials**: Upload PDFs/notes and turn them into cards + tutoring context.

---

## 🧩 MVP Features

1. **Guest Mode & Seamless Upgrade**  
   Start instantly; full feature access. Progress persists on the same device. Upgrade (email/password or OAuth) keeps the same user id; no data migration. *(Optional: one‑time guest sync link for demos.)*

2. **Onboarding — Concept‑First Intake**  
   Big input: *“What do you want to learn?”* (free text) + example chips. Timebox (minutes/day, weeks), level (intro/intermediate), preferred format (video/docs). Paste a URL or upload a PDF to build from your material.

3. **Curriculum Builder Lite**  
   Creates a small plan (3–5 modules; 2–4 lessons each) from **whitelisted free sources** (docs/videos/MOOCs). Ranks + dedupes; clusters resources; generates lesson objectives, quick checks, citations. Editable before publish.

4. **Plan Editor & Publish**  
   Reorder modules/lessons, swap resources, tweak estimates/outcomes. Publish → status `active` and dashboard CTA appears.

5. **Lesson Player & AI Tutor (Text + Voice)**  
   Lesson header + objective, chat with tutor, **voice toggle** (Web Speech API), resource cards, and a **Flashcard Suggestions** drawer.

6. **Quick Check & Remediation Gate**  
   1–2 question gate per micro‑topic. Pass → mark complete; fail → remediation turn + extra cards.

7. **Spaced Repetition Review (Anki‑style) + Voice**  
   SM‑2‑lite scheduling (Again/Hard/Good/Easy). Voice answering with transcript + “Accept as Correct” override.

8. **Uploads, Parsing & RAG Search**  
   Drop PDFs/Docs/Text → extract key points and propose cards; chunk + embed for later search and lesson context.

9. **Dashboard & Progress Tracking**  
   Progress ring, cards due, streak, weakest tags, “behind schedule” nudge, and next‑step CTA.

10. **Settings & Preferences**  
   Daily review target, minutes/day; **Upgrade** from Guest.

11. **Whitelisted Resource Catalog**  
   Small, curated domain list (e.g., official docs, reputable edu sites, select YouTube channels) with metadata + license notes.

> Out of scope for MVP: social/leaderboards, heavy web crawling, native mobile, mastery graph auto‑mining, OCR for scans, marketplace decks.

---

## 🏗️ Architecture

**Frontend**: Next.js (App Router) + React, TailwindCSS + DaisyUI (theme: **lemonade**).  
**Backend**: Next.js API routes.  
**Auth/DB/Storage**: Supabase (Postgres, Auth, Storage, RLS, Edge Functions).  
**Vectors**: `pgvector`.  
**AI**:
- Tutor/LLM: cost‑friendly instruct model (Hugging Face) with optional API fallback.
- Embeddings: small e5‑family or similar.
- Voice: Web Speech API (STT+TTS) for MVP.

### High‑Level Flow
1) Concept input → Plan draft (CB Lite) from whitelisted sources (rank + cluster).  
2) Edit plan → Publish.  
3) Lesson → Tutor (text/voice) → Quick Check → Card suggestions.  
4) Review due cards daily (voice optional).  
5) Uploads feed both tutoring context and card generation.

---

## 🗃️ Data Model (Supabase)
*(Minimal — see `/supabase/migrations` for final DDL.)*

- `profiles (id, is_guest, upgraded_at, guest_origin_device_id)`
- `concepts (id, user_id, title, description, tags[])`
- `curricula (id, user_id, title, goal, timebox_weeks, minutes_per_day, level, preferences, status)`
- `curriculum_modules (id, curriculum_id, index, title, outcomes[], est_minutes)`
- `curriculum_lessons (id, module_id, index, title, objective, est_minutes, quick_check_prompt, status)`
- `lesson_resources (id, lesson_id, type, title, url, source_domain, length_minutes, difficulty, license, added_by, metadata, embedding)`
- `sessions (id, user_id, concept_id, curriculum_id?, lesson_id?, created_at)`
- `messages (id, session_id, role, content, created_at)`
- `flashcards (id, user_id, concept_id?, lesson_id?, front, back, metadata, created_at)`
- `srs_state (card_id, ease, interval, repetitions, due_date, last_reviewed)`
- `reviews (id, card_id, rating, elapsed_ms, created_at)`
- `sources (id, concept_id, type, title, url, storage_path, created_at)`
- `embeddings (id, owner_type, owner_id, vector)`

**RLS**: owner‑based policies on all user data via `auth.uid()`.

---

## 🔌 API Route Map (UI stubs first)

**Auth / Guest**
- `POST /api/auth/guest` — create guest user (service role), sign in, create `profiles` row.
- `POST /api/auth/upgrade` — set email/password (or handle OAuth callback), flip `is_guest=false`.

**Curricula**
- `POST /api/curricula` — generate plan draft from goal/timebox (CB Lite).
- `PUT /api/curricula/:id` — update metadata/preferences/status.
- `POST /api/curricula/:id/publish` — set `active`.

**Modules/Lessons/Resources**
- `PUT /api/modules/:id`  
- `PUT /api/lessons/:id`  
- `POST /api/lessons/:id/resources`  
- `DELETE /api/resources/:id`

**Tutor & Assessments**
- `POST /api/sessions` — start lesson session.  
- `POST /api/sessions/:id/message` — chat turn; may emit card suggestions.  
- `POST /api/quiz/quick-check` — grade gate; return pass/fail + remediation.

**Uploads & Search**
- `POST /api/uploads` — store file; parse → chunks → embeddings.  
- `GET /api/search` — semantic search over uploads + selected whitelist items.

**SRS**
- `GET /api/cards/due`  
- `POST /api/cards` — create/edit.  
- `POST /api/reviews` — save grade → update SM‑2‑lite.

---

## 🧠 Key Algorithms

**Curriculum Builder Lite**
- Input: goal, minutes/day, weeks, level, format.
- Retrieve 5–12 **whitelisted** candidates (title, domain, length, difficulty, license).  
- Rank (domain trust, recency, format/length fit, difficulty alignment); dedupe by title/URL/embedding.  
- Cluster to 3–5 modules → name modules → split into 2–4 lessons each → objectives + quick checks.  
- Present citations and allow edit before publish.

**Spaced Repetition (SM‑2‑lite)**
- Store `ease`, `interval`, `repetitions`, `due_date`, `last_reviewed`.  
- Grade (Again/Hard/Good/Easy) updates intervals; lapses decay ease.  
- Voice review: semantic similarity + manual override “Accept as Correct”.

**Quick Check**
- 1–2 questions; short answer or MCQ.  
- Pass marks lesson complete; fail → remediation + extra cards.

---

## 🎨 UI / Design System
- **DaisyUI** with **lemonade** theme (mobile‑first).  
- Component gallery demo at `/lemonade-preview` (see `/app/(demo)/lemonade-preview/page.tsx`).  
- Accessibility: keyboard, focus rings, aria labels, contrast ≥ 4.5:1.

**Bottom Tabs**: Home · Plan · Review · Tutor · Library · More  
**Global**: Header with Guest banner + Upgrade CTA; toast area; skeletons/empty states.

---

## 🧪 Demo Seeds (recommended)
Seed three sample plans so demos work without external calls:
- **React Hooks (2 weeks, 30 min/day)** — useEffect basics → pitfalls → data fetching.  
- **Cardiac Physiology Basics (2 weeks)** — cardiac cycle → ECG fundamentals → hemodynamics.  
- **Spanish A2 Verbs (2 weeks)** — present tense review → pretérito vs imperfecto → subjunctive intro.

Place seed JSON under `/seed/` and load for guest users on first run.

---

## 📦 Getting Started

### Prereqs
- Node 18+ (or 20+)
- PNPM/NPM/Yarn
- Supabase project (or Supabase CLI for local dev)

### Install & Run
```bash
# 1) install deps
pnpm install

# 2) env
cp .env.example .env.local
# fill in Supabase keys/URL (see below)

# 3) dev
pnpm dev
# app at http://localhost:3000
```

### Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
# Server only (do NOT expose to client):
SUPABASE_SERVICE_ROLE_KEY=
# Optional model settings
EMBEDDINGS_MODEL=e5-small
TUTOR_MODEL=tutor-instruct-small
```

> Never expose the service‑role key to the browser. Use it only in server routes/Edge Functions.

### Supabase & Database
- Enable `pgvector` extension.
- Apply migrations in `/supabase/migrations` (or run SQL from `/supabase/schema.sql`).
- RLS: owner policies on all user‑scoped tables (`user_id = auth.uid()`).

---

## 🔐 Security & Privacy
- RLS everywhere; `select/insert/update/delete` constrained to the owner.  
- Guest users are real auth users flagged `is_guest=true`. Upgrading flips the flag; same user id.
- Store only the minimum necessary text from uploads; consider truncation/redaction for PHI/PII in healthcare contexts.

---

## 🗺️ Roadmap (post‑MVP)
- **Acceleration Mode** (high‑leverage concepts sequencing).  
- **Metacognition Dashboard** (study efficiency, weak areas, coaching).  
- **Peer Study & Challenges** (AI‑facilitated groups).  
- **Better Voice** (Whisper STT, premium TTS).  
- **OCR & Highlight‑to‑Card** (for scans and images).  
- **Mastery Graph** (prerequisite mining & visualization).  
- **Integrations** (Anki, Notion, Obsidian; import/export).

---

## 🤝 Contributing
- Conventional commits (`feat:`, `fix:`, `docs:` …).  
- Small PRs; include screenshots for UI changes.  
- Add/extend component stories (if using Storybook) or the `/lemonade-preview` page.

---

## 📄 License
MIT (change as needed).

---

## 🙏 Acknowledgements
- DaisyUI team for the lemonade theme.  
- Supabase for an excellent developer experience.  
- Open‑source model authors and educators whose resources are referenced in plans.

---

### Quick Links
- `app/(demo)/lemonade-preview/page.tsx` — component gallery  
- `docs/` — PRDs & feature briefs (see “MVP Feature Briefs”)  
- `supabase/` — migrations & policies  
- `seed/` — demo plans/cards

