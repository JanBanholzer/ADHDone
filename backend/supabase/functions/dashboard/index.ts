import { createServiceClient } from "../_shared/supabase.ts";
import { json, error, preflight } from "../_shared/response.ts";

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;

  if (req.method !== "GET") return error("Method not allowed", 405);

  const db = createServiceClient();
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString();
  const weekFromNow = new Date(Date.now() + 7 * 86_400_000)
    .toISOString()
    .slice(0, 10);

  try {
    const [
      missionsRes,
      todayTasksRes,
      todayErrandsRes,
      overdueTasksRes,
      overdueErrandsRes,
      remindersRes,
      liturgicalRes,
      weekTasksRes,
      doneRecentRes,
    ] = await Promise.all([
      db
        .from("missions")
        .select("id, title, status, sort_order, projects(id, title, status)")
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
        .from("tasks")
        .select("*, quests(id, title, project_id)")
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
        .from("reminders")
        .select("*")
        .lte("remind_at", now)
        .order("remind_at"),
      db
        .from("liturgical_observances")
        .select("*, liturgical_events(*)")
        .eq("observance_date", today),
      db
        .from("tasks")
        .select("id, title, status, due_date, quests(id, title)")
        .gte("due_date", today)
        .lte("due_date", weekFromNow)
        .in("status", ["planned"])
        .order("due_date")
        .limit(50),
      db
        .from("tasks")
        .select("id, title, done_at")
        .eq("status", "done")
        .gte("done_at", today + "T00:00:00Z")
        .order("done_at", { ascending: false }),
    ]);

    const missions = missionsRes.data ?? [];
    const statusCount = (arr: { status: string }[], s: string) =>
      arr.filter((m) => m.status === s).length;

    type ProjectRow = { id: string; title: string; status: string };
    const activeMissions = missions
      .filter((m) => m.status === "active")
      .map((m) => ({
        id: m.id,
        title: m.title,
        projects_total: (m.projects as ProjectRow[]).length,
        projects_active: (m.projects as ProjectRow[]).filter(
          (p) => p.status === "active",
        ).length,
        projects_completed: (m.projects as ProjectRow[]).filter(
          (p) => p.status === "completed",
        ).length,
      }));

    return json({
      generated_at: now,
      today,
      missions_summary: {
        active: statusCount(missions, "active"),
        accomplished: statusCount(missions, "accomplished"),
        aborted: statusCount(missions, "aborted"),
        total: missions.length,
      },
      active_missions: activeMissions,
      today_tasks: todayTasksRes.data ?? [],
      today_errands: todayErrandsRes.data ?? [],
      overdue_tasks: overdueTasksRes.data ?? [],
      overdue_errands: overdueErrandsRes.data ?? [],
      due_reminders: remindersRes.data ?? [],
      week_ahead_tasks: weekTasksRes.data ?? [],
      completed_today: doneRecentRes.data ?? [],
      liturgical_today: (liturgicalRes.data ?? []).map((o) => ({
        date: o.observance_date,
        ...o.liturgical_events,
      })),
    });
  } catch (e) {
    return error(e.message || "Internal server error", 500);
  }
});
