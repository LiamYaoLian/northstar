# Northstar

AI-driven todo app focused on **strategic alignment** and **automatic prioritization**.

## Features (Phase 1)

- Strategy onboarding with life-balance template (工作 / 健康 / 关系 / 娱乐 / 琐事 / 缓冲)
- Work `focus_tracks` (进大厂 / 探索方向 / 投资)
- Brain dump critique (dual-path detection, work track choice)
- Automatic priority engine with factor breakdown
- Today queue (Top 5)
- Alignment dashboard with pillar drift + procrastination radar
- Task CRUD with **LLM auto-classification** (rules fallback) + time logging
- **Subtasks with AI breakdown** — auto on complex tasks; rule templates + optional OpenAI

## Quick start

```bash
npm install
cp .env.example .env.local   # add Turso + optional OpenAI keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be guided through onboarding.

## Turso (cloud database)

Data is stored in [Turso](https://turso.tech) (SQLite-compatible). Without `TURSO_*` env vars, the app falls back to local `data/northstar.db`.

```bash
# One-time setup
brew install tursodatabase/tap/turso
turso auth login
cp data/northstar.db data/northstar.db.bak
turso db import ./data/northstar.db
turso db show northstar --url
turso db tokens create northstar
npm run db:sync-turso  # if cloud DB is empty, copy local data/northstar.db
```

Add to `.env.local`:

```
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...
```

If Turso was created empty (no import), sync existing local data:

```bash
npm run db:sync-turso
```

## Scripts

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run test     # Run unit tests
npm run db:push  # Push Drizzle schema to Turso / local file
```

## Stack

- Next.js 15 (App Router)
- Turso / libSQL + Drizzle ORM + `@libsql/client`
- Tailwind CSS 4
- Vitest

## AI (OpenAI)

Set `OPENAI_API_KEY` in `.env.local` (optional `OPENAI_MODEL`, default `gpt-4o-mini`):

- **Task classify** — LLM first when creating tasks or live preview on Tasks page; falls back to keyword rules without a key
- **Subtask breakdown** — LLM when key is set; otherwise rule-based templates (LC、deck、投资、面试等)

```
POST /api/tasks/{id}/breakdown   # 手动重新拆解
PATCH /api/subtasks/{id}         # { "isDone": true }
```

## Data

- **Production / recommended:** Turso cloud (1-day PITR on free tier)
- **Offline fallback:** `data/northstar.db` (auto-created when `TURSO_*` is unset)

See [design.md](./design.md) for full product spec.
