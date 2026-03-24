-- Add calendar event sections to all briefing templates.
-- OpenClaw will use these sections to surface device calendar events and suggest converting them to tasks/errands.

-- ── Daily Briefing ────────────────────────────────────────────
UPDATE public.scheduled_briefings
SET template = $tmpl$Daily Briefing

- - - - - - - - - - - - - -

(weekday), mm-dd-yyyy

- - - - - - - - - - - - - -

If applicable: todays Church calendar event (Feast day etc.) including a brief theological explanation and important things to know

Otherwise: skip section

- - - - - - - - - - - - - -

"Saint of the Day:"

(Present the short saint bio from evangelizo, choose the most important one.)

- - - - - - - - - - - - - -

Calendar events today:

(Bullet points with event title, time, and location. If an event looks like it should be tracked as a task or errand, suggest creating one.)

OR "No calendar events today"

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

- - - - - - - - - - - - - -$tmpl$
WHERE id = 'daily_briefing';

-- ── Daily Debrief ─────────────────────────────────────────────
UPDATE public.scheduled_briefings
SET template = $tmpl$Daily Debrief

- - - - - - - - - - - - - -

(weekday), mm-dd-yyyy

- - - - - - - - - - - - - -

Calendar events today:

(Recap events that occurred today with title, time, location)

OR "No calendar events today"

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

-> add elements according to user feedback$tmpl$
WHERE id = 'daily_debrief';

-- ── Weekly Briefing ────────────────────────────────────────────
UPDATE public.scheduled_briefings
SET template = $tmpl$Weekly Briefing

- - - - - - - - - - - - - -

Sunday, mm-dd-yyyy, first day of week n in yyyy

- - - - - - - - - - - - - -

If applicable: upcoming Church calendar events for this week

- Bullet points with Church calendar event (Feast day etc.) plus a brief theological explanation and important things to know

OR: "No church calendar events coming up this week"

- - - - - - - - - - - - - -

Calendar events this week:

(Bullet points with event title, day, time, and location. Suggest converting relevant ones to tasks or errands.)

OR "No calendar events this week"

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

- - - - - - - - - - - - - -$tmpl$
WHERE id = 'weekly_briefing';

-- ── Weekly Debrief ────────────────────────────────────────────
UPDATE public.scheduled_briefings
SET template = $tmpl$Weekly Debrief

(weekday), mm-dd-yyyy

- - - - - - - - - - - - - -

Calendar events this week:

(Recap events from the past week with day, title, time)

OR "No calendar events this week"

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

-> add elements according to user feedback$tmpl$
WHERE id = 'weekly_debrief';

-- ── Monthly Briefing ───────────────────────────────────────────
UPDATE public.scheduled_briefings
SET template = $tmpl$Monthly Briefing

- - - - - - - - - - - - - -

weekday, mm-01-yyyy

- - - - - - - - - - - - - -

If applicable: upcoming Church calendar events for this month

- Bullet points with Church calendar events coming up this month (Feast day etc.) plus a brief theological explanation and important things to know

- - - - - - - - - - - - - -

Calendar events this month:

(Bullet points with significant events this month: day, title, time, location. Suggest converting important ones to tasks.)

OR "No calendar events this month"

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

- - - - - - - - - - - - - -$tmpl$
WHERE id = 'monthly_briefing';

-- ── Monthly Debrief ────────────────────────────────────────────
UPDATE public.scheduled_briefings
SET template = $tmpl$Monthly Debrief

- - - - - - - - - - - - - -

weekday, mm-dd-yyyy (last day of month x)

- - - - - - - - - - - - - -

(AI section recapping the significance of the liturgical season this month, which feasts were celebrated and which important saints days. Also add if there were any magisterial documents or other significant news from the papacy, Rome or in the archdiocese Salzburg)

- - - - - - - - - - - - - -

Calendar events this month:

(Recap significant calendar events that occurred this month: day, title, time)

OR "No calendar events this month"

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

- - - - - - - - - - - - - -$tmpl$
WHERE id = 'monthly_debrief';
