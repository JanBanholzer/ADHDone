# ADHDone Backend Structure

This backend is designed for a personal/mobile setup with one isolated database per user.

## Domain hierarchy

- `missions`: highest-order, long-running goals (`active`, `accomplished`, `aborted`)
- `projects`: medium-term work that serves a mission (`planned`, `active`, `completed`, `aborted`)
- `quests`: finite, plannable chunks that serve a project (`planned`, `active`, `completed`, `aborted`)
- `tasks`: day-level actionable chunks that serve a quest and always have a `due_date`
- `errands`: task-like day actions not attached to quest/project/mission (`planned`, `done`, `skipped`, `aborted`)
- `resources`: persistent knowledge objects for long-term AI assistance (RAG-style memory)

## Current implementation

- Supabase CLI config: `backend/supabase/config.toml` (from `supabase init`, run inside `backend/`)
- SQL migrations: `backend/supabase/migrations/*.sql`
- Optional seed: `backend/supabase/seed.sql`
- Includes:
  - enum status types per entity
  - relational tables and foreign keys
  - timestamp fields (`created_at`, `updated_at`, terminal status timestamps)
  - integrity checks (e.g., completed items must have completion timestamps)
  - indexes for common query patterns
  - auto-update trigger for `updated_at`

## Supabase setup

### Can this chat apply migrations “automatically”?

**No.** Nothing in chat can log into your Supabase project or run SQL against your hosted database on its own. You (or a tool on your machine that you authenticate) have to apply migrations.

**You do not have to paste SQL by hand** if you use the Supabase CLI linked to your project (recommended).

### Option A — Supabase CLI → remote project (no Dashboard copy-paste)

1. Install the [Supabase CLI](https://supabase.com/docs/guides/cli) (you already have it if `supabase --version` works).
2. In the [Supabase Dashboard](https://supabase.com/dashboard), create a project (or pick an existing one).
3. From this repo, link and push migrations:

   ```bash
   cd backend
   supabase login
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```

   `project-ref` is the id in your project URL: `https://supabase.com/dashboard/project/<project-ref>`.

4. For local dev with Docker:

   ```bash
   cd backend
   supabase start
   ```

   Migrations apply automatically on first start / reset. Use `supabase db reset` to re-apply migrations and run `supabase/seed.sql`.

### Option B — SQL Editor (manual paste)

In the Dashboard: **SQL** → **New query** → paste each migration from `supabase/migrations/*.sql` in filename order (`0001`, `0002`, ...) → **Run**. Fine for a one-off personal DB; the CLI is better for repeatability.

### Cursor / “new plugin”

A Cursor Supabase extension or MCP can **help you browse schema, write queries, or generate SQL**, but **applying** changes to *your* cloud project still depends on that tool being **authenticated** and explicitly running migrations or SQL. Treat it as a convenience layer on top of the same two options above—not something chat alone can do without your credentials/session.

## Liturgical calendar (Roman Rite)

The database includes **canonical liturgical events** (General Roman Calendar plus Franciscan-family extensions) and **materialized observance dates** from **2000 through 2200**.

- **Schema:** `backend/supabase/migrations/0002_liturgical_calendar.sql`  
  - `liturgical_events`: stable `id` (slug), `name`, `summary`, `description`, `rank`, `liturgical_color`, `is_universal`, `is_franciscan_specific`, `role_titles`  
  - `liturgical_observances`: `event_id`, `observance_date`, generated `civil_year`
- **Source data & algorithms:** `backend/scripts/liturgical/event-definitions.mjs` (event objects) and `backend/scripts/liturgical/computus.mjs` (Easter, Baptism of the Lord, Christ the King, Holy Family, Easter-offset feasts).
- **Generated seed:** `backend/scripts/liturgical/generate-seed.mjs` writes `backend/supabase/seeds/liturgical_calendar.sql`, which is loaded after `seed.sql` (see `supabase/config.toml`).

Regenerate the seed after editing definitions or year range:

```bash
cd backend
node scripts/liturgical/generate-seed.mjs
# optional: LITURGICAL_YEAR_START=1990 LITURGICAL_YEAR_END=2200 node scripts/liturgical/generate-seed.mjs
```

Example query for “what is celebrated today”:

```sql
select e.id, e.name, e.rank, e.summary, e.is_franciscan_specific
from public.liturgical_observances o
join public.liturgical_events e on e.id = o.event_id
where o.observance_date = current_date
order by e.rank::text, e.name;
```

The calendar encodes the **universal General Roman Calendar** (fixed dates and principal moveable solemnities). It is **not** the full Roman Martyrology (not every blessed/saint for every day). Franciscan rows add institute feasts such as the Transitus, Paschal Baylon, Colette, Portiuncula, and others marked with `is_franciscan_specific = true`.

### Daily saints: Evangelizo API (not in the database)

Saint-of-the-day lists and short biographies come from the **Evangelizo Reader** over HTTP — same source as the Evangelizo app. **Do not mirror that content in Postgres**; call the API from the client (or a small backend proxy if you need to hide user-agent / add caching).

- **Reader (manual):** [`https://feed.evangelizo.org/v2/reader.php`](https://feed.evangelizo.org/v2/reader.php)  
  - `date=YYYYMMDD` (must be within ~**30 days** of today)  
  - `lang=AM` — US English, Roman Ordinary Form (other codes: `FR`, `IT`, `SP`, …)  
  - `type=saint` — HTML links to each saint  
  - `type=feast` — optional feast title for the day  
  - `type=xml` — structured bundle (readings + `<litugic_t>` liturgical day title + `<saint>` name)  
  - `type=reading` + `content=FR|PS|SR|GSP` — lectionary text  
- **Saint biography page:** `https://feed.evangelizo.org/v2/display_saint.php?id=<uuid>&language=AM`  
- **Helper (Node / copy logic to RN):** `backend/lib/evangelizo-reader.mjs` — `formatReaderDate`, `readerUrl`, `fetchReader`, `saintDetailUrl`.

**Product split:** Supabase holds **`liturgical_events` / `liturgical_observances`** for stable feast dates and ranks; the app loads **saints and bios** from Evangelizo for “today” and the next couple of weeks (respecting the 30-day rule). Content is **© Evangelizo.org** — confirm terms for your use case.

If you previously applied the removed migration `0003_evangelizo_saints.sql`, run migrations through **`0004_drop_evangelizo_tables.sql`** to drop the old tables.

## Edge Functions (OpenClaw API)

Supabase Edge Functions live in `backend/supabase/functions/`. Each function is a Deno endpoint that OpenClaw (or any HTTP client) calls to read/write the database.

**Base URL:** `https://<project-ref>.supabase.co/functions/v1` (hosted) or `http://127.0.0.1:54321/functions/v1` (local).

**Authentication:** Pass the anon key as `apikey` header or `Authorization: Bearer <anon_key>`.

### Deploying locally

```bash
cd backend
supabase start          # starts Postgres + Edge Runtime
supabase functions serve # hot-reloads all functions
```

### Deploying to hosted Supabase

```bash
cd backend
supabase functions deploy   # deploys all functions
```

---

### Endpoint reference

All endpoints return JSON. Errors return `{ "error": "message" }` with an appropriate HTTP status.

#### `GET /dashboard`

Single-call overview of the user's current state. Designed for daily briefings and status checks.

Returns: `generated_at`, `today`, `missions_summary` (counts by status), `active_missions` (with project counts), `today_tasks`, `today_errands`, `overdue_tasks`, `overdue_errands`, `due_reminders`, `week_ahead_tasks`, `completed_today`, `liturgical_today`.

---

#### `/missions`

| Method | Params | Description |
|--------|--------|-------------|
| GET | `?status=active` | List missions, optional status filter |
| GET | `?id=<uuid>` | Single mission with its projects |
| POST | body: `{ title, description?, status?, sort_order? }` | Create mission |
| PATCH | body: `{ id, ...fields }` | Update mission (auto-sets `accomplished_at`/`aborted_at` on status change) |
| DELETE | `?id=<uuid>` | Delete mission (cascades to projects → quests → tasks) |

#### `/projects`

| Method | Params | Description |
|--------|--------|-------------|
| GET | `?mission_id=<uuid>&status=active` | List projects, optional filters |
| GET | `?id=<uuid>` | Single project with parent mission + child quests |
| POST | body: `{ mission_id, title, description?, status?, target_date?, sort_order? }` | Create project |
| PATCH | body: `{ id, ...fields }` | Update project (auto-sets `completed_at`/`aborted_at`) |
| DELETE | `?id=<uuid>` | Delete project (cascades) |

#### `/quests`

| Method | Params | Description |
|--------|--------|-------------|
| GET | `?project_id=<uuid>&status=active` | List quests, optional filters |
| GET | `?id=<uuid>` | Single quest with parent chain + child tasks |
| POST | body: `{ project_id, title, description?, status?, target_date?, sort_order? }` | Create quest |
| PATCH | body: `{ id, ...fields }` | Update quest (auto-sets `completed_at`/`aborted_at`) |
| DELETE | `?id=<uuid>` | Delete quest (cascades) |

#### `/tasks`

| Method | Params | Description |
|--------|--------|-------------|
| GET | `?quest_id=<uuid>&status=planned&today=true&overdue=true&upcoming_days=7&due_date=YYYY-MM-DD&limit=N` | List tasks with rich filtering |
| GET | `?id=<uuid>` | Single task with full parent chain (quest → project → mission) |
| POST | body: `{ quest_id, title, due_date, notes?, status?, estimate_minutes?, sort_order? }` | Create task |
| PATCH | body: `{ id, ...fields }` | Update task (auto-sets `done_at`/`skipped_at`/`aborted_at`) |
| DELETE | `?id=<uuid>` | Delete task |

#### `/errands`

| Method | Params | Description |
|--------|--------|-------------|
| GET | `?status=planned&today=true&overdue=true&upcoming_days=7&due_date=YYYY-MM-DD&limit=N` | List errands (same filters as tasks) |
| GET | `?id=<uuid>` | Single errand |
| POST | body: `{ title, due_date, notes?, status?, estimate_minutes?, sort_order? }` | Create errand |
| PATCH | body: `{ id, ...fields }` | Update errand (auto-sets terminal timestamps) |
| DELETE | `?id=<uuid>` | Delete errand |

#### `/resources`

| Method | Params | Description |
|--------|--------|-------------|
| GET | `?search=<query>&tag=<tag>&archived=false&limit=N` | List/search resources (websearch-style full-text) |
| GET | `?id=<uuid>` | Single resource (full content) |
| POST | body: `{ title, content, summary?, source?, tags?, metadata? }` | Create resource |
| PATCH | body: `{ id, ...fields, touch? }` | Update resource (`touch: true` sets `last_used_at`) |
| DELETE | `?id=<uuid>` | Delete resource |

#### `/reminders`

| Method | Params | Description |
|--------|--------|-------------|
| GET | `?due=true&within_hours=24&recurring=true&limit=N` | List reminders (`due=true` returns fired/overdue reminders for cron polling) |
| GET | `?id=<uuid>` | Single reminder |
| POST | body: `{ name, remind_at, recurring_interval_days? }` | Create reminder |
| PATCH | body: `{ id, ...fields, advance_recurring? }` | Update reminder (`advance_recurring: true` bumps `remind_at` by the interval) |
| DELETE | `?id=<uuid>` | Delete reminder |

#### `GET /liturgical`

| Params | Description |
|--------|-------------|
| *(none)* | Today's observances |
| `?date=YYYY-MM-DD` | Specific date |
| `?from=YYYY-MM-DD&to=YYYY-MM-DD` | Date range |
| `?year=2026` | Full civil year |
| `?event_id=<slug>` | Single event with all its observance dates |

---

### Status transition logic

When a PATCH sets a terminal status, the corresponding timestamp is auto-populated if not explicitly provided:

| Entity | Terminal statuses | Auto-set timestamps |
|--------|-------------------|---------------------|
| Mission | `accomplished`, `aborted` | `accomplished_at`, `aborted_at` |
| Project / Quest | `completed`, `aborted` | `completed_at`, `aborted_at` |
| Task / Errand | `done`, `skipped`, `aborted` | `done_at`, `skipped_at`, `aborted_at` |

Reverting to a non-terminal status (`active`, `planned`) clears all terminal timestamps.

---

### OpenClaw integration pattern

1. **Polling reminders:** Call `GET /reminders?due=true` on a schedule (e.g. every minute). For each due reminder, send the notification via Telegram, then either `PATCH { advance_recurring: true }` (recurring) or `DELETE` (one-shot).
2. **Daily briefing:** Call `GET /dashboard` to get the full status overview — today's tasks, overdue items, active missions, liturgical observances.
3. **Task management:** Use `/tasks` and `/errands` CRUD to create, complete, reschedule, or skip items based on user conversation.
4. **Knowledge base:** Use `/resources` to store and retrieve persistent context (notes, reference material, user preferences) for long-term memory.

## Notes

- No auth / row-level security has been added yet (as requested).
- For production/multi-user usage, add Supabase auth and RLS policies before sharing beyond trusted devices.
