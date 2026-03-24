import { createServiceClient } from "../_shared/supabase.ts";
import { json, error, preflight } from "../_shared/response.ts";

// deno-lint-ignore no-explicit-any
type DB = any;

const TZ = "Europe/Berlin";

// ── Date helpers (all Berlin-aware) ─────────────────────────

function berlinDate(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
}

function berlinWeekdayNum(): number {
  const s = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    weekday: "short",
  }).format(new Date());
  return (
    { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[s] ?? 0
  );
}

function addDays(date: string, n: number): string {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function weekRange(today: string) {
  const d = new Date(today + "T12:00:00Z");
  const dow = d.getUTCDay();
  return {
    start: addDays(today, -dow),
    end: addDays(today, 6 - dow),
  };
}

function nextWeekRange(today: string) {
  const d = new Date(today + "T12:00:00Z");
  const dow = d.getUTCDay();
  const start = addDays(today, 7 - dow);
  return { start, end: addDays(start, 6) };
}

function monthRange(today: string) {
  const d = new Date(today + "T12:00:00Z");
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const start = new Date(Date.UTC(y, m, 1));
  const end = new Date(Date.UTC(y, m + 1, 0));
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

function lastMonthRange(today: string) {
  const d = new Date(today + "T12:00:00Z");
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 0));
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

function nextMonthRange(today: string) {
  const d = new Date(today + "T12:00:00Z");
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const start = new Date(Date.UTC(y, m + 1, 1));
  const end = new Date(Date.UTC(y, m + 2, 0));
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

function evangelizoSaintUrl(date: string): string {
  return `https://feed.evangelizo.org/v2/reader.php?date=${date.replace(/-/g, "")}&lang=AM&type=saint`;
}

function evangelizoFeastUrl(date: string): string {
  return `https://feed.evangelizo.org/v2/reader.php?date=${date.replace(/-/g, "")}&lang=AM&type=feast`;
}

// deno-lint-ignore no-explicit-any
function flattenObservances(rows: any[]) {
  return rows.map((o) => ({
    observance_date: o.observance_date,
    sort_order: o.sort_order,
    ...o.liturgical_events,
  }));
}

function normalizeTitle(v: string): string {
  return v.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

function isSameDay(aIso: string, bDate: string): boolean {
  return aIso.slice(0, 10) === bDate;
}

function titlesLikelyMatch(a: string, b: string): boolean {
  const na = normalizeTitle(a);
  const nb = normalizeTitle(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}

// OpenClaw should never rely on memory for conversion checks.
// This annotates calendar events with whether corresponding tasks/errands already exist.
function addCalendarTaskMatches(payload: Record<string, unknown>): Record<string, unknown> {
  const calendarEvents = (payload.calendar_events as Array<Record<string, unknown>> | undefined) ?? [];
  if (calendarEvents.length === 0) return payload;

  const taskArrays = [
    (payload.tasks_today as Array<Record<string, unknown>> | undefined) ?? [],
    (payload.tasks_this_week as Array<Record<string, unknown>> | undefined) ?? [],
    (payload.tasks_this_month as Array<Record<string, unknown>> | undefined) ?? [],
    (payload.tasks_tomorrow as Array<Record<string, unknown>> | undefined) ?? [],
    (payload.tasks_next_week as Array<Record<string, unknown>> | undefined) ?? [],
    (payload.tasks_next_month as Array<Record<string, unknown>> | undefined) ?? [],
  ].flat();
  const errandArrays = [
    (payload.errands_today as Array<Record<string, unknown>> | undefined) ?? [],
    (payload.errands_this_week as Array<Record<string, unknown>> | undefined) ?? [],
    (payload.errands_next_week as Array<Record<string, unknown>> | undefined) ?? [],
    (payload.errands_next_month as Array<Record<string, unknown>> | undefined) ?? [],
  ].flat();

  const matches = calendarEvents.map((ev) => {
    const eventTitle = String(ev.title ?? "");
    const eventDate = String(ev.start_at ?? "").slice(0, 10);

    const matchedTasks = taskArrays.filter((t) =>
      isSameDay(String(t.due_date ?? ""), eventDate) &&
      titlesLikelyMatch(String(t.title ?? ""), eventTitle)
    );
    const matchedErrands = errandArrays.filter((e) =>
      isSameDay(String(e.due_date ?? ""), eventDate) &&
      titlesLikelyMatch(String(e.title ?? ""), eventTitle)
    );

    return {
      calendar_event_id: ev.id,
      calendar_event_title: eventTitle,
      calendar_event_start_at: ev.start_at,
      has_corresponding_task_or_errand:
        matchedTasks.length > 0 || matchedErrands.length > 0,
      matching_tasks: matchedTasks.map((t) => ({
        id: t.id,
        title: t.title,
        due_date: t.due_date,
        status: t.status,
      })),
      matching_errands: matchedErrands.map((e) => ({
        id: e.id,
        title: e.title,
        due_date: e.due_date,
        status: e.status,
      })),
    };
  });

  return {
    ...payload,
    calendar_event_task_matches: matches,
  };
}

// ── Data fetchers ───────────────────────────────────────────

async function fetchDailyBriefingData(db: DB, today: string) {
  const dayStart = today + "T00:00:00Z";
  const dayEnd = today + "T23:59:59Z";
  
  const [liturgical, tasks, errands, quests, projects, missions, calendarEvents] =
    await Promise.all([
      db
        .from("liturgical_observances")
        .select("*, liturgical_events(*)")
        .eq("observance_date", today)
        .order("sort_order"),
      db
        .from("tasks")
        .select("*, quests(id, title, project_id)")
        .eq("due_date", today)
        .in("status", ["planned"])
        .order("sort_order"),
      db
        .from("errands")
        .select("*")
        .eq("due_date", today)
        .in("status", ["planned"])
        .order("sort_order"),
      db
        .from("quests")
        .select("*, projects(id, title, mission_id)")
        .in("status", ["active"])
        .order("sort_order"),
      db
        .from("projects")
        .select("*, missions(id, title)")
        .in("status", ["active"])
        .order("sort_order"),
      db.from("missions").select("*").order("sort_order"),
      db
        .from("calendar_events")
        .select("*")
        .or(`and(start_at.gte.${dayStart},start_at.lte.${dayEnd}),and(end_at.gte.${dayStart},end_at.lte.${dayEnd}),and(start_at.lte.${dayStart},end_at.gte.${dayEnd})`)
        .order("start_at"),
    ]);

  return {
    date: today,
    evangelizo_saint_url: evangelizoSaintUrl(today),
    evangelizo_feast_url: evangelizoFeastUrl(today),
    liturgical_events: flattenObservances(liturgical.data ?? []),
    calendar_events: calendarEvents.data ?? [],
    tasks_today: tasks.data ?? [],
    errands_today: errands.data ?? [],
    active_quests: quests.data ?? [],
    active_projects: projects.data ?? [],
    missions: missions.data ?? [],
  };
}

async function fetchDailyExamData(db: DB, today: string) {
  const dayStart = today + "T00:00:00Z";
  const dayEnd = today + "T23:59:59Z";
  
  const [tasks, errands, quests, projects, missions, calendarEvents] = await Promise.all([
    db
      .from("tasks")
      .select("*, quests(id, title)")
      .eq("due_date", today)
      .order("sort_order"),
    db.from("errands").select("*").eq("due_date", today).order("sort_order"),
    db
      .from("quests")
      .select("*, projects(id, title, mission_id)")
      .in("status", ["active"])
      .order("sort_order"),
    db
      .from("projects")
      .select("*, missions(id, title)")
      .in("status", ["active"])
      .order("sort_order"),
    db.from("missions").select("*").order("sort_order"),
    db
      .from("calendar_events")
      .select("*")
      .or(`and(start_at.gte.${dayStart},start_at.lte.${dayEnd}),and(end_at.gte.${dayStart},end_at.lte.${dayEnd}),and(start_at.lte.${dayStart},end_at.gte.${dayEnd})`)
      .order("start_at"),
  ]);

  return {
    date: today,
    calendar_events: calendarEvents.data ?? [],
    tasks_today: tasks.data ?? [],
    errands_today: errands.data ?? [],
    active_quests: quests.data ?? [],
    active_projects: projects.data ?? [],
    missions: missions.data ?? [],
  };
}

async function fetchDailyDebriefData(db: DB, today: string) {
  const tomorrow = addDays(today, 1);
  const dayStart = today + "T00:00:00Z";
  const dayEnd = today + "T23:59:59Z";
  
  const [tasks, errands, tmrwTasks, tmrwErrands, overdueTasks, overdueErrands, calendarEvents] =
    await Promise.all([
      db
        .from("tasks")
        .select("*, quests(id, title)")
        .eq("due_date", today)
        .order("sort_order"),
      db.from("errands").select("*").eq("due_date", today).order("sort_order"),
      db
        .from("tasks")
        .select("*, quests(id, title)")
        .eq("due_date", tomorrow)
        .in("status", ["planned"])
        .order("sort_order"),
      db
        .from("errands")
        .select("*")
        .eq("due_date", tomorrow)
        .in("status", ["planned"])
        .order("sort_order"),
      db
        .from("tasks")
        .select("*, quests(id, title)")
        .lt("due_date", today)
        .eq("status", "planned")
        .order("due_date"),
      db
        .from("errands")
        .select("*")
        .lt("due_date", today)
        .eq("status", "planned")
        .order("due_date"),
      db
        .from("calendar_events")
        .select("*")
        .or(`and(start_at.gte.${dayStart},start_at.lte.${dayEnd}),and(end_at.gte.${dayStart},end_at.lte.${dayEnd}),and(start_at.lte.${dayStart},end_at.gte.${dayEnd})`)
        .order("start_at"),
    ]);

  return {
    date: today,
    tomorrow,
    calendar_events: calendarEvents.data ?? [],
    tasks_today: tasks.data ?? [],
    errands_today: errands.data ?? [],
    tasks_tomorrow: tmrwTasks.data ?? [],
    errands_tomorrow: tmrwErrands.data ?? [],
    overdue_tasks: overdueTasks.data ?? [],
    overdue_errands: overdueErrands.data ?? [],
  };
}

async function fetchWeeklyBriefingData(db: DB, today: string) {
  const { start, end } = weekRange(today);
  const weekStart = start + "T00:00:00Z";
  const weekEnd = end + "T23:59:59Z";
  
  const [liturgical, tasks, errands, quests, projects, missions, calendarEvents] =
    await Promise.all([
      db
        .from("liturgical_observances")
        .select("*, liturgical_events(*)")
        .gte("observance_date", start)
        .lte("observance_date", end)
        .order("observance_date")
        .order("sort_order"),
      db
        .from("tasks")
        .select("*, quests(id, title, project_id)")
        .gte("due_date", start)
        .lte("due_date", end)
        .in("status", ["planned"])
        .order("due_date")
        .order("sort_order"),
      db
        .from("errands")
        .select("*")
        .gte("due_date", start)
        .lte("due_date", end)
        .in("status", ["planned"])
        .order("due_date")
        .order("sort_order"),
      db
        .from("quests")
        .select("*, projects(id, title, mission_id)")
        .in("status", ["active"])
        .order("sort_order"),
      db
        .from("projects")
        .select("*, missions(id, title)")
        .in("status", ["active"])
        .order("sort_order"),
      db.from("missions").select("*").order("sort_order"),
      db
        .from("calendar_events")
        .select("*")
        .gte("start_at", weekStart)
        .lte("start_at", weekEnd)
        .order("start_at"),
    ]);

  return {
    date: today,
    week_start: start,
    week_end: end,
    liturgical_events: flattenObservances(liturgical.data ?? []),
    calendar_events: calendarEvents.data ?? [],
    tasks_this_week: tasks.data ?? [],
    errands_this_week: errands.data ?? [],
    active_quests: quests.data ?? [],
    active_projects: projects.data ?? [],
    missions: missions.data ?? [],
  };
}

async function fetchWeeklyDebriefData(db: DB, today: string) {
  const { start, end } = weekRange(today);
  const next = nextWeekRange(today);
  const weekStart = start + "T00:00:00Z";
  const weekEnd = end + "T23:59:59Z";
  
  const [
    tasks,
    errands,
    quests,
    projects,
    missions,
    nextTasks,
    nextErrands,
    overdueTasks,
    overdueErrands,
    calendarEvents,
  ] = await Promise.all([
    db
      .from("tasks")
      .select("*, quests(id, title)")
      .gte("due_date", start)
      .lte("due_date", end)
      .order("due_date")
      .order("sort_order"),
    db
      .from("errands")
      .select("*")
      .gte("due_date", start)
      .lte("due_date", end)
      .order("due_date")
      .order("sort_order"),
    db
      .from("quests")
      .select("*, projects(id, title, mission_id)")
      .in("status", ["active"])
      .order("sort_order"),
    db
      .from("projects")
      .select("*, missions(id, title)")
      .in("status", ["active"])
      .order("sort_order"),
    db.from("missions").select("*").order("sort_order"),
    db
      .from("tasks")
      .select("*, quests(id, title)")
      .gte("due_date", next.start)
      .lte("due_date", next.end)
      .in("status", ["planned"])
      .order("due_date")
      .order("sort_order"),
    db
      .from("errands")
      .select("*")
      .gte("due_date", next.start)
      .lte("due_date", next.end)
      .in("status", ["planned"])
      .order("due_date")
      .order("sort_order"),
    db
      .from("tasks")
      .select("*, quests(id, title)")
      .lt("due_date", start)
      .eq("status", "planned")
      .order("due_date"),
    db
      .from("errands")
      .select("*")
      .lt("due_date", start)
      .eq("status", "planned")
      .order("due_date"),
    db
      .from("calendar_events")
      .select("*")
      .gte("start_at", weekStart)
      .lte("start_at", weekEnd)
      .order("start_at"),
  ]);

  return {
    date: today,
    week_start: start,
    week_end: end,
    next_week_start: next.start,
    next_week_end: next.end,
    calendar_events: calendarEvents.data ?? [],
    tasks_this_week: tasks.data ?? [],
    errands_this_week: errands.data ?? [],
    active_quests: quests.data ?? [],
    active_projects: projects.data ?? [],
    missions: missions.data ?? [],
    tasks_next_week: nextTasks.data ?? [],
    errands_next_week: nextErrands.data ?? [],
    overdue_tasks: overdueTasks.data ?? [],
    overdue_errands: overdueErrands.data ?? [],
  };
}

async function fetchMonthlyBriefingData(db: DB, today: string) {
  const { start, end } = monthRange(today);
  const last = lastMonthRange(today);
  const monthStart = start + "T00:00:00Z";
  const monthEnd = end + "T23:59:59Z";
  
  const [liturgical, quests, projects, missions, lastCompletedTasks, lastCompletedQuests, calendarEvents] =
    await Promise.all([
      db
        .from("liturgical_observances")
        .select("*, liturgical_events(*)")
        .gte("observance_date", start)
        .lte("observance_date", end)
        .order("observance_date")
        .order("sort_order"),
      db
        .from("quests")
        .select("*, projects(id, title, mission_id)")
        .in("status", ["active"])
        .order("sort_order"),
      db
        .from("projects")
        .select("*, missions(id, title)")
        .in("status", ["active"])
        .order("sort_order"),
      db.from("missions").select("*").order("sort_order"),
      db
        .from("tasks")
        .select("*, quests(id, title)")
        .eq("status", "done")
        .gte("done_at", last.start + "T00:00:00Z")
        .lte("done_at", last.end + "T23:59:59Z")
        .order("done_at", { ascending: false }),
      db
        .from("quests")
        .select("*, projects(id, title, mission_id)")
        .eq("status", "completed")
        .gte("completed_at", last.start + "T00:00:00Z")
        .lte("completed_at", last.end + "T23:59:59Z"),
      db
        .from("calendar_events")
        .select("*")
        .gte("start_at", monthStart)
        .lte("start_at", monthEnd)
        .order("start_at"),
    ]);

  return {
    date: today,
    month_start: start,
    month_end: end,
    last_month_start: last.start,
    last_month_end: last.end,
    liturgical_events: flattenObservances(liturgical.data ?? []),
    calendar_events: calendarEvents.data ?? [],
    active_quests: quests.data ?? [],
    active_projects: projects.data ?? [],
    missions: missions.data ?? [],
    last_month_completed_tasks: lastCompletedTasks.data ?? [],
    last_month_completed_quests: lastCompletedQuests.data ?? [],
  };
}

async function fetchMonthlyDebriefData(db: DB, today: string) {
  const { start, end } = monthRange(today);
  const next = nextMonthRange(today);
  const monthStart = start + "T00:00:00Z";
  const monthEnd = end + "T23:59:59Z";
  
  const [
    liturgical,
    completedQuests,
    completedProjects,
    missions,
    activeQuests,
    activeProjects,
    monthTasks,
    nextTasks,
    nextErrands,
    calendarEvents,
  ] = await Promise.all([
    db
      .from("liturgical_observances")
      .select("*, liturgical_events(*)")
      .gte("observance_date", start)
      .lte("observance_date", end)
      .order("observance_date")
      .order("sort_order"),
    db
      .from("quests")
      .select("*, projects(id, title, mission_id)")
      .eq("status", "completed")
      .gte("completed_at", start + "T00:00:00Z")
      .lte("completed_at", end + "T23:59:59Z"),
    db
      .from("projects")
      .select("*, missions(id, title)")
      .eq("status", "completed")
      .gte("completed_at", start + "T00:00:00Z")
      .lte("completed_at", end + "T23:59:59Z"),
    db.from("missions").select("*").order("sort_order"),
    db
      .from("quests")
      .select("*, projects(id, title, mission_id)")
      .in("status", ["active"])
      .order("sort_order"),
    db
      .from("projects")
      .select("*, missions(id, title)")
      .in("status", ["active"])
      .order("sort_order"),
    db
      .from("tasks")
      .select("id, title, status, done_at, quest_id, quests(id, title)")
      .gte("due_date", start)
      .lte("due_date", end)
      .order("due_date"),
    db
      .from("tasks")
      .select("*, quests(id, title)")
      .gte("due_date", next.start)
      .lte("due_date", next.end)
      .in("status", ["planned"])
      .order("due_date"),
    db
      .from("errands")
      .select("*")
      .gte("due_date", next.start)
      .lte("due_date", next.end)
      .in("status", ["planned"])
      .order("due_date"),
    db
      .from("calendar_events")
      .select("*")
      .gte("start_at", monthStart)
      .lte("start_at", monthEnd)
      .order("start_at"),
  ]);

  return {
    date: today,
    month_start: start,
    month_end: end,
    next_month_start: next.start,
    next_month_end: next.end,
    liturgical_events: flattenObservances(liturgical.data ?? []),
    calendar_events: calendarEvents.data ?? [],
    completed_quests_this_month: completedQuests.data ?? [],
    completed_projects_this_month: completedProjects.data ?? [],
    missions: missions.data ?? [],
    active_quests: activeQuests.data ?? [],
    active_projects: activeProjects.data ?? [],
    tasks_this_month: monthTasks.data ?? [],
    tasks_next_month: nextTasks.data ?? [],
    errands_next_month: nextErrands.data ?? [],
  };
}

// ── Dispatcher ──────────────────────────────────────────────

const FETCHERS: Record<
  string,
  (db: DB, today: string) => Promise<unknown>
> = {
  daily_briefing: fetchDailyBriefingData,
  daily_exam: fetchDailyExamData,
  daily_debrief: fetchDailyDebriefData,
  weekly_briefing: fetchWeeklyBriefingData,
  weekly_debrief: fetchWeeklyDebriefData,
  monthly_briefing: fetchMonthlyBriefingData,
  monthly_debrief: fetchMonthlyDebriefData,
};

// ── Handler ─────────────────────────────────────────────────

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;

  if (req.method !== "GET") return error("Method not allowed", 405);

  const db = createServiceClient();
  const url = new URL(req.url);

  try {
    // ── Schedule endpoint ───────────────────────────────────
    if (url.searchParams.get("schedule") === "true") {
      const [schedules, rules] = await Promise.all([
        db
          .from("scheduled_briefings")
          .select("id, title, cron_expression, timezone, enabled, description")
          .eq("enabled", true)
          .order("id"),
        db
          .from("briefing_combination_rules")
          .select("base_briefing_id, include_briefing_id, on_weekday"),
      ]);

      return json({
        briefings: schedules.data ?? [],
        combination_rules: (rules.data ?? []).map(
          (r: {
            base_briefing_id: string;
            include_briefing_id: string;
            on_weekday: number;
          }) => ({
            on_weekday: r.on_weekday,
            base: r.base_briefing_id,
            includes: r.include_briefing_id,
          }),
        ),
      });
    }

    // ── Generate a briefing ─────────────────────────────────
    const type = url.searchParams.get("type");
    if (!type) {
      return error(
        "Provide ?type=daily_briefing (or schedule=true for cron info)",
      );
    }

    const fetcher = FETCHERS[type];
    if (!fetcher) return error(`Unknown briefing type: ${type}`, 404);

    const today = url.searchParams.get("date") ?? berlinDate();
    const weekday = berlinWeekdayNum();

    // Fetch template from DB
    const { data: briefing, error: tplErr } = await db
      .from("scheduled_briefings")
      .select("*")
      .eq("id", type)
      .single();
    if (tplErr) return error(tplErr.message, 404);

    // Fetch live data
    const data = addCalendarTaskMatches(await fetcher(db, today) as Record<string, unknown>);

    // Check combination rules from DB
    const { data: rules } = await db
      .from("briefing_combination_rules")
      .select("include_briefing_id")
      .eq("base_briefing_id", type)
      .eq("on_weekday", weekday);

    let combined_with = null;
    if (rules && rules.length > 0) {
      const includeId = rules[0].include_briefing_id;
      const includeFetcher = FETCHERS[includeId];
      if (includeFetcher) {
        const [includeTemplate, includeData] = await Promise.all([
          db
            .from("scheduled_briefings")
            .select("id, title, template")
            .eq("id", includeId)
            .single(),
          includeFetcher(db, today),
        ]);

        combined_with = {
          type: includeId,
          title: includeTemplate.data?.title,
          template: includeTemplate.data?.template,
          data: addCalendarTaskMatches(includeData as Record<string, unknown>),
        };
      }
    }

    return json({
      type,
      title: briefing.title,
      template: briefing.template,
      data,
      combined_with,
      generated_at: new Date().toISOString(),
    });
  } catch (e) {
    return error(
      (e as Error).message || "Internal server error",
      500,
    );
  }
});
