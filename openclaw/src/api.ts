import { createClient } from "@supabase/supabase-js";

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

export const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const FN_BASE = `${SUPABASE_URL}/functions/v1`;
const FN_HEADERS = {
  "Content-Type": "application/json",
  apikey: SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
};

async function callFn(path: string): Promise<any> {
  const res = await fetch(`${FN_BASE}/${path}`, { headers: FN_HEADERS });
  if (!res.ok)
    throw new Error(`Edge fn error ${res.status}: ${await res.text()}`);
  return res.json();
}

// ── Edge function endpoints ──────────────────────────────────

export const getDashboard = () => callFn("dashboard");

export const getBriefingSchedule = () =>
  callFn("briefings?schedule=true");

export const getBriefing = (type: string, date?: string) =>
  callFn(`briefings?type=${type}${date ? `&date=${date}` : ""}`);

// ── Reminders ────────────────────────────────────────────────

export const getDueReminders = () =>
  db
    .from("reminders")
    .select("*")
    .lte("remind_at", new Date().toISOString());

export const deleteReminder = (id: string) =>
  db.from("reminders").delete().eq("id", id);

export const advanceReminder = async (id: string) => {
  const { data } = await db
    .from("reminders")
    .select("remind_at, recurring_interval_days")
    .eq("id", id)
    .single();
  if (!data?.recurring_interval_days) return;
  const next = new Date(data.remind_at);
  next.setDate(next.getDate() + data.recurring_interval_days);
  return db
    .from("reminders")
    .update({ remind_at: next.toISOString() })
    .eq("id", id);
};

export const createReminder = (fields: Record<string, unknown>) =>
  db.from("reminders").insert(fields).select().single();

// ── Tasks ────────────────────────────────────────────────────

export const getTasks = (filters: Record<string, string> = {}) => {
  let q = db
    .from("tasks")
    .select(
      "*, quests(id, title, project_id, projects(id, title, mission_id, missions(id, title)))"
    );
  if (filters.status) q = q.eq("status", filters.status);
  if (filters.due_date) q = q.eq("due_date", filters.due_date);
  if (filters.quest_id) q = q.eq("quest_id", filters.quest_id);
  return q.order("due_date").order("sort_order");
};

export const createTask = (fields: Record<string, unknown>) =>
  db.from("tasks").insert(fields).select().single();

export const updateTask = (id: string, fields: Record<string, unknown>) => {
  const u: Record<string, unknown> = { ...fields };
  if (u.status === "done" && !u.done_at)
    u.done_at = new Date().toISOString();
  if (u.status === "skipped" && !u.skipped_at)
    u.skipped_at = new Date().toISOString();
  if (u.status === "aborted" && !u.aborted_at)
    u.aborted_at = new Date().toISOString();
  if (u.status === "planned") {
    u.done_at = null;
    u.skipped_at = null;
    u.aborted_at = null;
  }
  return db.from("tasks").update(u).eq("id", id).select().single();
};

// ── Errands ──────────────────────────────────────────────────

export const getErrands = (filters: Record<string, string> = {}) => {
  let q = db.from("errands").select("*");
  if (filters.status) q = q.eq("status", filters.status);
  if (filters.due_date) q = q.eq("due_date", filters.due_date);
  return q.order("due_date").order("sort_order");
};

export const createErrand = (fields: Record<string, unknown>) =>
  db.from("errands").insert(fields).select().single();

export const updateErrand = (id: string, fields: Record<string, unknown>) => {
  const u: Record<string, unknown> = { ...fields };
  if (u.status === "done" && !u.done_at)
    u.done_at = new Date().toISOString();
  if (u.status === "skipped" && !u.skipped_at)
    u.skipped_at = new Date().toISOString();
  if (u.status === "aborted" && !u.aborted_at)
    u.aborted_at = new Date().toISOString();
  if (u.status === "planned") {
    u.done_at = null;
    u.skipped_at = null;
    u.aborted_at = null;
  }
  return db.from("errands").update(u).eq("id", id).select().single();
};

// ── Quests ───────────────────────────────────────────────────

export const getQuests = (filters: Record<string, string> = {}) => {
  let q = db
    .from("quests")
    .select("*, projects(id, title, mission_id, missions(id, title))");
  if (filters.status) q = q.eq("status", filters.status);
  if (filters.project_id) q = q.eq("project_id", filters.project_id);
  return q.order("sort_order");
};

export const createQuest = (fields: Record<string, unknown>) =>
  db.from("quests").insert(fields).select().single();

export const updateQuest = (id: string, fields: Record<string, unknown>) => {
  const u: Record<string, unknown> = { ...fields };
  if (u.status === "completed" && !u.completed_at)
    u.completed_at = new Date().toISOString();
  if (u.status === "aborted" && !u.aborted_at)
    u.aborted_at = new Date().toISOString();
  return db.from("quests").update(u).eq("id", id).select().single();
};

// ── Projects ─────────────────────────────────────────────────

export const getProjects = (filters: Record<string, string> = {}) => {
  let q = db
    .from("projects")
    .select("*, missions(id, title)");
  if (filters.status) q = q.eq("status", filters.status);
  if (filters.mission_id) q = q.eq("mission_id", filters.mission_id);
  return q.order("sort_order");
};

export const createProject = (fields: Record<string, unknown>) =>
  db.from("projects").insert(fields).select().single();

export const updateProject = (id: string, fields: Record<string, unknown>) => {
  const u: Record<string, unknown> = { ...fields };
  if (u.status === "completed" && !u.completed_at)
    u.completed_at = new Date().toISOString();
  if (u.status === "aborted" && !u.aborted_at)
    u.aborted_at = new Date().toISOString();
  return db.from("projects").update(u).eq("id", id).select().single();
};

// ── Missions ─────────────────────────────────────────────────

export const getMissions = (filters: Record<string, string> = {}) => {
  let q = db.from("missions").select("*");
  if (filters.status) q = q.eq("status", filters.status);
  return q.order("sort_order");
};

export const createMission = (fields: Record<string, unknown>) =>
  db.from("missions").insert(fields).select().single();

export const updateMission = (id: string, fields: Record<string, unknown>) => {
  const u: Record<string, unknown> = { ...fields };
  if (u.status === "accomplished" && !u.accomplished_at)
    u.accomplished_at = new Date().toISOString();
  if (u.status === "aborted" && !u.aborted_at)
    u.aborted_at = new Date().toISOString();
  return db.from("missions").update(u).eq("id", id).select().single();
};

// ── Resources ────────────────────────────────────────────────

export const createResource = (fields: Record<string, unknown>) =>
  db.from("resources").insert(fields).select().single();

export const searchResources = (query: string) =>
  db
    .from("resources")
    .select("id, title, summary, source, tags, last_used_at")
    .textSearch("search_tsv", query, { type: "websearch", config: "simple" })
    .eq("is_archived", false)
    .limit(5);
