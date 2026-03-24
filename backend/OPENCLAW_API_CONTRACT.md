# OpenClaw API Contract

This file defines the HTTP contract OpenClaw should use when interacting with the Supabase Edge Functions.

Base URL:

- Hosted: `https://qvbnkblzytedxueunaem.supabase.co/functions/v1`
- Local: `http://127.0.0.1:54321/functions/v1`

Headers:

- `apikey: <SUPABASE_ANON_KEY>`
- `Authorization: Bearer <SUPABASE_ANON_KEY>`
- `Content-Type: application/json` (for `POST`/`PATCH`)

All error responses use:

```json
{ "error": "message" }
```

## 1) Dashboard snapshot

### `GET /dashboard`

Purpose: single-call status overview for daily briefings.

Example:

```bash
curl -s "$BASE/dashboard" -H "apikey: $SUPABASE_ANON_KEY"
```

Returns:

- `missions_summary`
- `active_missions`
- `today_tasks`, `today_errands`
- `overdue_tasks`, `overdue_errands`
- `due_reminders`
- `week_ahead_tasks`
- `completed_today`
- `liturgical_today`

## 2) Hierarchy CRUD

## Missions

### `GET /missions?status=active`
### `GET /missions?id=<mission_uuid>`
### `POST /missions`

```json
{
  "title": "Build discipline",
  "description": "Daily consistency mission",
  "status": "active",
  "sort_order": 1
}
```

### `PATCH /missions`

```json
{
  "id": "mission-uuid",
  "status": "accomplished"
}
```

### `DELETE /missions?id=<mission_uuid>`

---

## Projects

### `GET /projects?mission_id=<mission_uuid>&status=active`
### `GET /projects?id=<project_uuid>`
### `POST /projects`

```json
{
  "mission_id": "mission-uuid",
  "title": "Prayer rule",
  "description": "Stabilize prayer times",
  "target_date": "2026-04-30"
}
```

### `PATCH /projects`

```json
{
  "id": "project-uuid",
  "status": "completed"
}
```

### `DELETE /projects?id=<project_uuid>`

---

## Quests

### `GET /quests?project_id=<project_uuid>&status=active`
### `GET /quests?id=<quest_uuid>`
### `POST /quests`

```json
{
  "project_id": "project-uuid",
  "title": "Morning block week 1",
  "target_date": "2026-03-31"
}
```

### `PATCH /quests`

```json
{
  "id": "quest-uuid",
  "status": "completed"
}
```

### `DELETE /quests?id=<quest_uuid>`

## 3) Action items CRUD

## Tasks (linked to quests)

### `GET /tasks?...`

Supported query params:

- `id`
- `quest_id`
- `status`
- `due_date` (`YYYY-MM-DD`)
- `today=true`
- `overdue=true`
- `upcoming_days=<N>`
- `limit=<N>`

Examples:

```bash
curl -s "$BASE/tasks?today=true"
curl -s "$BASE/tasks?overdue=true"
curl -s "$BASE/tasks?quest_id=$QUEST_ID&status=planned"
```

### `POST /tasks`

```json
{
  "quest_id": "quest-uuid",
  "title": "Read chapter 1",
  "due_date": "2026-03-24",
  "notes": "",
  "estimate_minutes": 30,
  "sort_order": 1
}
```

### `PATCH /tasks`

```json
{
  "id": "task-uuid",
  "status": "done"
}
```

### `DELETE /tasks?id=<task_uuid>`

---

## Errands (standalone)

### `GET /errands?...`

Same filter params as tasks (`today`, `overdue`, `upcoming_days`, etc.).

### `POST /errands`

```json
{
  "title": "Buy groceries",
  "due_date": "2026-03-24",
  "estimate_minutes": 20
}
```

### `PATCH /errands`

```json
{
  "id": "errand-uuid",
  "status": "skipped"
}
```

### `DELETE /errands?id=<errand_uuid>`

## 4) Resources (memory store)

### `GET /resources?search=<query>&tag=<tag>&archived=false&limit=20`
### `GET /resources?id=<resource_uuid>`

### `POST /resources`

```json
{
  "title": "User preference",
  "content": "Prefers evening debriefing at 20:30",
  "summary": "Evening briefing preference",
  "source": "telegram",
  "tags": ["preferences", "briefing"],
  "metadata": { "confidence": "high" }
}
```

### `PATCH /resources`

```json
{
  "id": "resource-uuid",
  "touch": true
}
```

`touch: true` sets `last_used_at` to now.

### `DELETE /resources?id=<resource_uuid>`

## 5) Reminders (cron scheduler source)

### `GET /reminders?due=true`

Primary poll endpoint for OpenClaw workers.

Additional filters:

- `within_hours=<N>`
- `recurring=true|false`
- `limit=<N>`

### `POST /reminders`

```json
{
  "name": "Evening examen",
  "remind_at": "2026-03-24T20:30:00Z",
  "recurring_interval_days": 1
}
```

### `PATCH /reminders`

Advance recurring reminder to next fire time:

```json
{
  "id": "reminder-uuid",
  "advance_recurring": true
}
```

General update:

```json
{
  "id": "reminder-uuid",
  "remind_at": "2026-03-25T20:30:00Z"
}
```

### `DELETE /reminders?id=<reminder_uuid>`

## 6) Liturgical data

### `GET /liturgical`

Defaults to today.

### `GET /liturgical?date=2026-03-24`
### `GET /liturgical?from=2026-03-24&to=2026-03-31`
### `GET /liturgical?year=2026`
### `GET /liturgical?event_id=st-francis-assisi`

## 7) Briefings (scheduled deliveries)

Templates and cron schedules are stored in the `scheduled_briefings` table. OpenClaw reads them at runtime — never from memory.

### `GET /briefings?schedule=true`

Returns all enabled briefing schedules plus combination rules. Call this at startup to populate cron jobs.

```json
{
  "briefings": [
    { "id": "daily_briefing", "title": "Daily Briefing", "cron_expression": "15 5 * * *", "timezone": "Europe/Berlin", ... },
    ...
  ],
  "combination_rules": [
    { "on_weekday": 0, "base": "daily_briefing", "includes": "weekly_briefing" },
    { "on_weekday": 6, "base": "daily_debrief", "includes": "weekly_debrief" }
  ]
}
```

### `GET /briefings?type=daily_briefing`

Generates a complete briefing payload: stored template + live data from the database. On combination days the `combined_with` field is populated automatically.

Optional: `&date=YYYY-MM-DD` to generate for a specific date (defaults to today in Europe/Berlin).

Response shape:

```json
{
  "type": "daily_briefing",
  "title": "Daily Briefing",
  "template": "...(instructional template text)...",
  "data": {
    "date": "2026-03-24",
    "evangelizo_saint_url": "https://feed.evangelizo.org/v2/reader.php?date=20260324&lang=AM&type=saint",
    "liturgical_events": [...],
    "tasks_today": [...],
    "errands_today": [...],
    "active_quests": [...],
    "active_projects": [...],
    "missions": [...]
  },
  "combined_with": null,
  "generated_at": "2026-03-24T03:15:00Z"
}
```

On a Sunday the same call returns `combined_with` populated with the weekly briefing template and data.

### Briefing types

| Type | Cron (Europe/Berlin) | Description |
|------|----------------------|-------------|
| `daily_briefing` | `15 5 * * *` | Morning briefing. On Sundays includes weekly briefing. |
| `daily_exam` | `15 18 * * *` | Evening status check. |
| `daily_debrief` | `0 19 * * *` | Evening wrap-up + tomorrow plan. On Saturdays includes weekly debrief. |
| `weekly_briefing` | `0 8 * * 0` | Sunday outlook (absorbed into daily briefing on Sundays). |
| `weekly_debrief` | `30 19 * * 6` | Saturday review (absorbed into daily debrief on Saturdays). |
| `monthly_briefing` | `0 5 1 * *` | First-of-month outlook with AI synthesis. |
| `monthly_debrief` | `0 20 28-31 * *` | Last-day-of-month review. Worker checks tomorrow is the 1st before delivering. |

### Data included per type

| Type | Data fields |
|------|-------------|
| `daily_briefing` | liturgical events, evangelizo URLs, tasks/errands today, active quests/projects, missions |
| `daily_exam` | tasks/errands today (all statuses), active quests/projects, missions |
| `daily_debrief` | tasks/errands today (all statuses), tomorrow items, overdue rollover |
| `weekly_briefing` | liturgical events this week, tasks/errands this week, active quests/projects, missions |
| `weekly_debrief` | tasks/errands this week (all statuses), active quests/projects/missions, next week items, overdue rollover |
| `monthly_briefing` | liturgical events this month, active quests/projects, missions, last month completions |
| `monthly_debrief` | liturgical events this month, completed quests/projects, missions, this month tasks, next month items |

## 8) OpenClaw worker loop (recommended)

### Startup

1. Call `GET /briefings?schedule=true` to read all cron schedules and combination rules.
2. Register cron jobs for each enabled briefing.
3. Register a 1-minute poll for reminders.

### Every minute: reminder poll

1. `GET /reminders?due=true`
2. For each due reminder:
   - Send Telegram notification.
   - If recurring: `PATCH /reminders { "id": "...", "advance_recurring": true }`
   - If one-shot: `DELETE /reminders?id=...`

### On cron fire: briefing delivery

1. Call `GET /briefings?type=<type>`.
2. Read the `template` field — these are the formatting instructions.
3. Read the `data` field — this is the live database content.
4. If `combined_with` is not null, also present the combined briefing.
5. Compose a Telegram message following the template, populating with data.
6. For templates that reference Evangelizo saints, fetch the `evangelizo_saint_url` from `data`.
7. Send the composed message.
8. If the template ends with a user prompt (e.g., "What else do you want to plan?"), enter interactive mode and apply user requests via CRUD endpoints.

### Monthly debrief guard

The `monthly_debrief` cron fires on days 28–31. Before delivering, check:

```
tomorrow = today + 1 day
if (tomorrow.getDate() !== 1) skip delivery
```

### Interactive follow-up after briefings

Several templates end with prompts like "Do you wish to add or amend elements?" When the user responds:

- Create/update items via `/tasks`, `/errands`, `/quests`, `/projects`, `/missions`.
- Create reminders via `/reminders`.
- Store notes via `/resources`.
- Always update the database — never store state only in conversation memory.

## 9) Status timestamp behavior

Server-side auto-timestamps on status transitions:

- Mission:
  - `accomplished` => sets `accomplished_at`
  - `aborted` => sets `aborted_at`
- Project / Quest:
  - `completed` => sets `completed_at`
  - `aborted` => sets `aborted_at`
- Task / Errand:
  - `done` => sets `done_at`
  - `skipped` => sets `skipped_at`
  - `aborted` => sets `aborted_at`

If status moves back to non-terminal (`active`/`planned`), terminal timestamps are cleared.
