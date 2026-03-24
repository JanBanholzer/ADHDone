# ADHDone — OpenClaw Worker

Telegram bot + scheduled briefing engine for ADHDone.  
Reads all configuration and templates from the Supabase database — nothing is hardcoded.

## What it does

- **Sends briefings on schedule** (daily at 05:15, exam at 18:15, debrief at 19:00, weekly on Sundays/Saturdays, monthly on 1st/last day) — schedule is read from the `scheduled_briefings` table at startup
- **Polls reminders every minute** and delivers them via Telegram; advances recurring ones automatically
- **Responds to natural language messages** via OpenAI function-calling — creates tasks, marks items done, schedules reminders, saves resources, and more
- **Never relies on memory** — every state change is written to the database immediately

## Setup

### 1. Install dependencies

```bash
cd openclaw
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in `.env`:

| Variable | Where to find it |
|---|---|
| `SUPABASE_URL` | Supabase Dashboard → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Project Settings → API → service_role key |
| `TELEGRAM_BOT_TOKEN` | @BotFather on Telegram → `/newbot` |
| `TELEGRAM_CHAT_ID` | Message @userinfobot — it replies with your chat ID |
| `OPENAI_API_KEY` | platform.openai.com |
| `OPENAI_MODEL` | Optional, defaults to `gpt-4o` |

### 3. Run

```bash
# Production
npm start

# Development (auto-restarts on file changes)
npm run dev
```

## Telegram commands

| Command | Description |
|---|---|
| `/start` | Welcome message, clears conversation history |
| `/status` | Quick overview: tasks today, overdue, due reminders, calendar events |
| `/clear` | Reset conversation history |
| `/help` | Show available commands |

Or just write naturally — the bot understands context:

> "I finished the reading task"  
> "Remind me to call Jan tomorrow at 9"  
> "Add an errand: buy milk, today"  
> "What do I have on for this week?"

## Briefing schedule (Europe/Berlin)

| Briefing | Cron | Notes |
|---|---|---|
| Daily Briefing | 05:15 every day | Sundays include Weekly Briefing |
| Daily Exam | 18:15 every day | Quick status check |
| Daily Debrief | 19:00 every day | Saturdays include Weekly Debrief |
| Weekly Briefing | 08:00 Sundays | Standalone |
| Weekly Debrief | 19:30 Saturdays | Standalone |
| Monthly Briefing | 05:00 on 1st of month | |
| Monthly Debrief | 20:00 on last day of month | Cron fires 28-31, guarded in code |

Schedules are read from the `scheduled_briefings` table — edit them in Supabase to change timing without redeploying.

## Calendar events

Calendar events are synced from the mobile app (via `expo-calendar`) to the `calendar_events` table. OpenClaw reads these during briefings and checks `calendar_event_task_matches` before suggesting to convert any event to a task, so duplicates are never created.

## Deployment

For always-on operation, run on any server with Node.js 20+:

```bash
# With PM2
npm install -g pm2
pm2 start "npm start" --name adhdone-openclaw
pm2 save
pm2 startup
```

Or with systemd, Docker, fly.io, Railway, etc. No special ports needed — uses Telegram long-polling.
