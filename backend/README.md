# ADHDone Backend Structure

This backend is designed for a personal/mobile setup with one isolated database per user.

## Domain hierarchy

- `missions`: highest-order, long-running goals (`active`, `accomplished`, `aborted`)
- `projects`: medium-term work that serves a mission (`planned`, `active`, `completed`, `aborted`)
- `quests`: finite, plannable chunks that serve a project (`planned`, `active`, `completed`, `aborted`)
- `tasks`: day-level actionable chunks that serve a quest and always have a `due_date`

## Current implementation

- Supabase CLI config: `backend/supabase/config.toml` (from `supabase init`, run inside `backend/`)
- SQL migration: `backend/supabase/migrations/0001_initial_schema.sql`
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

In the Dashboard: **SQL** → **New query** → paste the contents of `supabase/migrations/0001_initial_schema.sql` → **Run**. Fine for a one-off personal DB; the CLI is better for repeatability.

### Cursor / “new plugin”

A Cursor Supabase extension or MCP can **help you browse schema, write queries, or generate SQL**, but **applying** changes to *your* cloud project still depends on that tool being **authenticated** and explicitly running migrations or SQL. Treat it as a convenience layer on top of the same two options above—not something chat alone can do without your credentials/session.

## Notes

- No auth / row-level security has been added yet (as requested).
- For production/multi-user usage, add Supabase auth and RLS policies before sharing beyond trusted devices.
