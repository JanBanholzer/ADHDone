-- Scheduled briefings: template + cron schedule for each briefing type.
-- OpenClaw reads these to know when to fire and what format to follow.

CREATE TABLE public.scheduled_briefings (
  id            text        PRIMARY KEY,
  title         text        NOT NULL,
  template      text        NOT NULL,
  cron_expression text      NOT NULL,
  timezone      text        NOT NULL DEFAULT 'Europe/Berlin',
  enabled       boolean     NOT NULL DEFAULT true,
  description   text        NOT NULL DEFAULT '',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_scheduled_briefings_enabled
  ON public.scheduled_briefings (enabled);

CREATE TRIGGER trg_scheduled_briefings_set_updated_at
  BEFORE UPDATE ON public.scheduled_briefings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.scheduled_briefings IS
  'Briefing definitions with instructional templates and cron schedules. OpenClaw reads these at runtime — never relies on memory.';

-- Combination rules: which briefings get merged on specific weekdays.
-- weekday uses JS/ISO convention: 0=Sunday … 6=Saturday.

CREATE TABLE public.briefing_combination_rules (
  id                   serial  PRIMARY KEY,
  base_briefing_id     text    NOT NULL REFERENCES public.scheduled_briefings(id),
  include_briefing_id  text    NOT NULL REFERENCES public.scheduled_briefings(id),
  on_weekday           smallint NOT NULL CHECK (on_weekday BETWEEN 0 AND 6),
  UNIQUE (base_briefing_id, include_briefing_id)
);

COMMENT ON TABLE public.briefing_combination_rules IS
  'On the given weekday the base briefing absorbs the include briefing into a single combined delivery.';

-- =============================================================
--  Seed: 7 briefing types
-- =============================================================

INSERT INTO public.scheduled_briefings (id, title, template, cron_expression, description) VALUES

-- ── Daily Briefing ── 05:15 Europe/Berlin every day ──────────
('daily_briefing', 'Daily Briefing', $tmpl$Daily Briefing

- - - - - - - - - - - - - -

(weekday), mm-dd-yyyy

- - - - - - - - - - - - - -

If applicable: todays Church calendar event (Feast day etc.) including a brief theological explanation and important things to know

Otherwise: skip section

- - - - - - - - - - - - - -

"Saint of the Day:"

(Present the short saint bio from evangelizo, choose the most important one.)

- - - - - - - - - - - - - -

Tasks scheduled for today:

(Bullet points)

OR "No Tasks scheduled for today"

- - - - - - - - - - - - - -

Errands scheduled for today:

(Bullet points)

OR "No errands scheduled for today"

- - - - - - - - - - - - - -

Active quests:

(Bullet points)

OR

"No active quests"

- - - - - - - - - - - - - -

Active projects:

(Bullet points)

OR

"No active projects"

- - - - - - - - - - - - - -

Your missions:

(Bullet points)

- - - - - - - - - - - - - -

"Do you wish to add or amend elements, schedule reminders or require assistance?"

- - - - - - - - - - - - - -$tmpl$,
'15 5 * * *',
'Morning briefing at 05:15 Berlin time. On Sundays, automatically includes weekly briefing.'),

-- ── Daily Exam ── 18:15 Europe/Berlin every day ──────────────
('daily_exam', 'Daily Exam', $tmpl$Daily Exam

- - - - - - - - - - - - - -

(weekday), mm-dd-yyyy

- - - - - - - - - - - - - -

Today, you:

Bullet point list of tasks and errands finished or aborted.

- - - - - - - - - - - - - -

"Are there any updates on the status of today's tasks and errands or active quests, projects and missions?"

-> AI amends status if so$tmpl$,
'15 18 * * *',
'Evening exam at 18:15 Berlin time. Quick status check of the day.'),

-- ── Daily Debrief ── 19:00 Europe/Berlin every day ───────────
('daily_debrief', 'Daily Debrief', $tmpl$Daily Debrief

- - - - - - - - - - - - - -

(weekday), mm-dd-yyyy

- - - - - - - - - - - - - -

Tasks scheduled for today:

Bullet point list with tasks and status (done, aborted, pending)

OR "No tasks scheduled for today"

- - - - - - - - - - - - - -

Errands scheduled for today:

Bullet point list with errands and status (done, aborted, pending)

OR "No errands scheduled for today"

- - - - - - - - - - - - - -

Scheduled for tomorrow: bullet point list of all tasks and errands scheduled for tomorrow. Non-aborted, unfinished tasks and errands become scheduled and due the next day and will be included.

- - - - - - - - - - - - - -

"What else do you want to plan?"

- - - - - - - - - - - - - -

-> add elements according to user feedback$tmpl$,
'0 19 * * *',
'Evening debrief at 19:00 Berlin time. On Saturdays, automatically includes weekly debrief.'),

-- ── Weekly Briefing ── Sunday 08:00 Europe/Berlin ────────────
('weekly_briefing', 'Weekly Briefing', $tmpl$Weekly Briefing

- - - - - - - - - - - - - -

Sunday, mm-dd-yyyy, first day of week n in yyyy

- - - - - - - - - - - - - -

If applicable: upcoming Church calendar events for this week

- Bullet points with Church calendar event (Feast day etc.) plus a brief theological explanation and important things to know

OR: "No church calendar events coming up this week"

- - - - - - - - - - - - - -

Tasks scheduled this week:

(Bullet points)

OR "No Tasks scheduled this week"

- - - - - - - - - - - - - -

Errands scheduled for this week:

(Bullet points)

OR "No errands scheduled this week"

- - - - - - - - - - - - - -

Active quests:

(Bullet points)

OR

"No active quests"

- - - - - - - - - - - - - -

Active projects:

(Bullet points)

OR

"No active projects"

- - - - - - - - - - - - - -

Your missions:

(Bullet points)

- - - - - - - - - - - - - -

"Do you wish to add or amend elements, schedule reminders or require assistance?"

- - - - - - - - - - - - - -$tmpl$,
'0 8 * * 0',
'Sunday morning briefing at 08:00 Berlin time. Absorbed into daily briefing on Sundays — standalone schedule kept for reference.'),

-- ── Weekly Debrief ── Saturday 19:30 Europe/Berlin ───────────
('weekly_debrief', 'Weekly Debrief', $tmpl$Weekly Debrief

(weekday), mm-dd-yyyy

- - - - - - - - - - - - - -

Tasks scheduled for this week:

Bullet point list with past tasks and status this week (done, aborted, pending)

OR "No tasks scheduled this week"

- - - - - - - - - - - - - -

Errands scheduled for this week:

Bullet point list with past errands this week and status (done, aborted, pending)

OR "No errands scheduled this week"

- - - - - - - - - - - - - -

Term Update

Bullet point list showing active quests, projects and missions

- - - - - - - - - - - - - -

Scheduled next week: bullet point list of all tasks and errands scheduled for next week. Non-aborted, unfinished tasks and errands become scheduled and due the next day and will be included.

- - - - - - - - - - - - - -

"What else do you want to plan?"

- - - - - - - - - - - - - -

-> add elements according to user feedback$tmpl$,
'30 19 * * 6',
'Saturday evening debrief at 19:30 Berlin time. Absorbed into daily debrief on Saturdays — standalone schedule kept for reference.'),

-- ── Monthly Briefing ── 1st of month 05:00 Europe/Berlin ────
('monthly_briefing', 'Monthly Briefing', $tmpl$Monthly Briefing

- - - - - - - - - - - - - -

weekday, mm-01-yyyy

- - - - - - - - - - - - - -

If applicable: upcoming Church calendar events for this month

- Bullet points with Church calendar events coming up this month (Feast day etc.) plus a brief theological explanation and important things to know

- - - - - - - - - - - - - -

Active quests:

(Bullet points)

OR

"No active quests"

- - - - - - - - - - - - - -

Active projects:

(Bullet points)

OR

"No active projects"

- - - - - - - - - - - - - -

Your missions:

(Bullet points)

For every bullet point/mission, AI should synthesise what was accomplished last month and can be built on, and suggest resources to enhance productivity in the upcoming months.

- - - - - - - - - - - - - -

"Your focus this month is..." (AI synthesis).

- - - - - - - - - - - - - -

"Do you wish to add or amend elements, schedule reminders or require assistance?"

- - - - - - - - - - - - - -$tmpl$,
'0 5 1 * *',
'First-of-month briefing at 05:00 Berlin time.'),

-- ── Monthly Debrief ── last day of month 20:00 Europe/Berlin ─
('monthly_debrief', 'Monthly Debrief', $tmpl$Monthly Debrief

- - - - - - - - - - - - - -

weekday, mm-dd-yyyy (last day of month x)

- - - - - - - - - - - - - -

(AI section recapping the significance of the liturgical season this month, which feasts were celebrated and which important saints days. Also add if there were any magisterial documents or other significant news from the papacy, Rome or in the archdiocese Salzburg)

- - - - - - - - - - - - - -

Completed quests:

(Bullet points with quests completed this month)

OR

"No quests completed"

- - - - - - - - - - - - - -

Completed projects:

(Bullet points with projects completed this month)

OR

"No projects completed"

- - - - - - - - - - - - - -

Your missions:

(Bullet points)

For every bullet point/mission, AI should synthesise what was accomplished this month, which quests and projects were active relating to the mission, what could improve and whats going well.

Summary: AI Synthesises what was prioritised in the past month and which missions may have been neglected.

- - - - - - - - - - - - - -

Upcoming next month:

Tasks:

- Bullet points

Errands:

- Bullet points

Quests:

- Bullet points

Projects:

- Bullet points

Missions:

- Bullet points

- - - - - - - - - - - - - -

"Advise on further intentions and priorities for next month."

- - - - - - - - - - - - - -$tmpl$,
'0 20 28-31 * *',
'Last-day-of-month debrief at 20:00 Berlin time. Cron fires 28-31; worker must verify tomorrow is the 1st before delivering.');

-- =============================================================
--  Seed: combination rules
-- =============================================================

INSERT INTO public.briefing_combination_rules
  (base_briefing_id, include_briefing_id, on_weekday) VALUES
  ('daily_briefing', 'weekly_briefing', 0),   -- Sunday: daily briefing includes weekly briefing
  ('daily_debrief',  'weekly_debrief',  6);   -- Saturday: daily debrief includes weekly debrief
