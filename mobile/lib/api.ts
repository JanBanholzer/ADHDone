import { supabase } from "./supabase";
import type { Mission, Project, Quest, Task, Errand, Routine, RoutineItem, RoutineRun } from "./types";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Missions ────────────────────────────────────────────────

export async function fetchMissions(): Promise<Mission[]> {
  const { data, error } = await supabase
    .from("missions")
    .select("*")
    .order("sort_order")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createMission(
  fields: Pick<Mission, "title"> & Partial<Pick<Mission, "description" | "status">>
): Promise<Mission> {
  const { data, error } = await supabase
    .from("missions")
    .insert(fields)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateMission(
  id: string,
  fields: Partial<Omit<Mission, "id">>
): Promise<Mission> {
  if (fields.status === "accomplished")
    fields = { ...fields, accomplished_at: new Date().toISOString() } as any;
  if (fields.status === "aborted")
    fields = { ...fields, aborted_at: new Date().toISOString() } as any;

  const { data, error } = await supabase
    .from("missions")
    .update(fields)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteMission(id: string): Promise<void> {
  const { error } = await supabase.from("missions").delete().eq("id", id);
  if (error) throw error;
}

// ── Projects ────────────────────────────────────────────────

export async function fetchProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("*, missions(id, title)")
    .order("sort_order")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchProjectsByMission(missionId: string): Promise<Project[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("mission_id", missionId)
    .order("sort_order")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createProject(
  fields: Pick<Project, "title" | "mission_id"> &
    Partial<Pick<Project, "description" | "status" | "target_date">>
): Promise<Project> {
  const { data, error } = await supabase
    .from("projects")
    .insert(fields)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateProject(
  id: string,
  fields: Partial<Omit<Project, "id">>
): Promise<Project> {
  if (fields.status === "completed")
    fields = { ...fields, completed_at: new Date().toISOString() } as any;
  if (fields.status === "aborted")
    fields = { ...fields, aborted_at: new Date().toISOString() } as any;

  const { data, error } = await supabase
    .from("projects")
    .update(fields)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw error;
}

// ── Quests ──────────────────────────────────────────────────

export async function fetchQuests(): Promise<Quest[]> {
  const { data, error } = await supabase
    .from("quests")
    .select("*, projects(id, title, mission_id, missions(id, title)), missions(id, title)")
    .order("sort_order")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchQuestsByProject(projectId: string): Promise<Quest[]> {
  const { data, error } = await supabase
    .from("quests")
    .select("*")
    .eq("project_id", projectId)
    .order("sort_order")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchQuestsByMission(missionId: string): Promise<Quest[]> {
  const { data, error } = await supabase
    .from("quests")
    .select("*")
    .eq("mission_id", missionId)
    .order("sort_order")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createQuest(
  fields: Pick<Quest, "title"> &
    Partial<Pick<Quest, "description" | "status" | "target_date">> &
    ({ project_id: string } | { mission_id: string })
): Promise<Quest> {
  const base = {
    title: fields.title,
    description: fields.description,
    status: fields.status,
    target_date: fields.target_date,
  };
  let row: Record<string, unknown>;
  if ("project_id" in fields && fields.project_id) {
    row = { ...base, project_id: fields.project_id, mission_id: null };
  } else if ("mission_id" in fields && fields.mission_id) {
    row = { ...base, project_id: null, mission_id: fields.mission_id };
  } else {
    throw new Error("Either project_id or mission_id is required");
  }

  const { data, error } = await supabase.from("quests").insert(row).select().single();
  if (error) throw error;
  return data as Quest;
}

export async function updateQuest(
  id: string,
  fields: Partial<Omit<Quest, "id">>
): Promise<Quest> {
  if (fields.status === "completed")
    fields = { ...fields, completed_at: new Date().toISOString() } as any;
  if (fields.status === "aborted")
    fields = { ...fields, aborted_at: new Date().toISOString() } as any;

  const { data, error } = await supabase
    .from("quests")
    .update(fields)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteQuest(id: string): Promise<void> {
  const { error } = await supabase.from("quests").delete().eq("id", id);
  if (error) throw error;
}

// ── Tasks ───────────────────────────────────────────────────

export async function fetchTasks(opts?: {
  questId?: string;
  missionId?: string;
  status?: string;
  dueDate?: string;
}): Promise<Task[]> {
  let q = supabase
    .from("tasks")
    .select(
      "*, quests(id, title, project_id, mission_id, projects(id, title, mission_id, missions(id, title)), missions(id, title)), missions(id, title)"
    );

  if (opts?.questId) q = q.eq("quest_id", opts.questId);
  if (opts?.missionId) q = q.eq("mission_id", opts.missionId);
  if (opts?.status) q = q.eq("status", opts.status);
  if (opts?.dueDate) q = q.eq("due_date", opts.dueDate);

  q = q
    .order("due_date")
    .order("sort_order")
    .order("created_at", { ascending: false });

  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function createTask(
  fields: Pick<Task, "title" | "due_date"> &
    Partial<Pick<Task, "description" | "notes" | "estimate_minutes">> &
    ({ quest_id: string; mission_id?: null } | { mission_id: string; quest_id?: null })
): Promise<Task> {
  const base = {
    title: fields.title,
    due_date: fields.due_date,
    description: fields.description,
    notes: fields.notes,
    estimate_minutes: fields.estimate_minutes,
  };
  let row: Record<string, unknown>;
  if ("quest_id" in fields && fields.quest_id) {
    row = { ...base, quest_id: fields.quest_id, mission_id: null };
  } else if ("mission_id" in fields && fields.mission_id) {
    row = { ...base, quest_id: null, mission_id: fields.mission_id };
  } else {
    throw new Error("Either quest_id or mission_id is required");
  }

  const { data, error } = await supabase
    .from("tasks")
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return data as Task;
}

export async function updateTask(
  id: string,
  fields: Partial<Omit<Task, "id">>
): Promise<Task> {
  if (fields.status === "done")
    fields = { ...fields, done_at: new Date().toISOString() } as any;
  if (fields.status === "skipped")
    fields = { ...fields, skipped_at: new Date().toISOString() } as any;
  if (fields.status === "aborted")
    fields = { ...fields, aborted_at: new Date().toISOString() } as any;

  const { data, error } = await supabase
    .from("tasks")
    .update(fields)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Errands ─────────────────────────────────────────────────

export async function fetchErrands(opts?: {
  status?: string;
  dueDate?: string;
}): Promise<Errand[]> {
  let q = supabase.from("errands").select("*");

  if (opts?.status) q = q.eq("status", opts.status);
  if (opts?.dueDate) q = q.eq("due_date", opts.dueDate);

  q = q
    .order("due_date")
    .order("sort_order")
    .order("created_at", { ascending: false });

  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function createErrand(
  fields: Pick<Errand, "title" | "due_date"> &
    Partial<Pick<Errand, "description" | "notes" | "estimate_minutes">>
): Promise<Errand> {
  const { data, error } = await supabase
    .from("errands")
    .insert(fields)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateErrand(
  id: string,
  fields: Partial<Omit<Errand, "id">>
): Promise<Errand> {
  if (fields.status === "done")
    fields = { ...fields, done_at: new Date().toISOString() } as any;
  if (fields.status === "skipped")
    fields = { ...fields, skipped_at: new Date().toISOString() } as any;
  if (fields.status === "aborted")
    fields = { ...fields, aborted_at: new Date().toISOString() } as any;

  const { data, error } = await supabase
    .from("errands")
    .update(fields)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw error;
}

export async function deleteErrand(id: string): Promise<void> {
  const { error } = await supabase.from("errands").delete().eq("id", id);
  if (error) throw error;
}

// ── Routines (public.* — avoids non-exposed `routines` schema on hosted Supabase) ──

export async function fetchRoutines(): Promise<Routine[]> {
  const { data, error } = await supabase
    .from("routines")
    .select("*")
    .order("sort_order")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Routine[];
}

export async function createRoutine(
  fields: Pick<Routine, "title"> &
    Partial<
      Pick<
        Routine,
        | "description"
        | "enabled"
        | "apply_as"
        | "schedule_type"
        | "schedule_anchor"
        | "quest_title_template"
        | "quest_description_template"
        | "ai_prompt"
        | "target_mission_id"
      >
    >
): Promise<Routine> {
  const { data, error } = await supabase
    .from("routines")
    .insert(fields)
    .select()
    .single();
  if (error) throw error;
  return data as Routine;
}

export async function updateRoutine(
  id: string,
  fields: Partial<Omit<Routine, "id">>
): Promise<Routine> {
  const { data, error } = await supabase
    .from("routines")
    .update(fields)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Routine;
}

export async function deleteRoutine(id: string): Promise<void> {
  const { error } = await supabase.from("routines").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchRoutineItems(routineId: string): Promise<RoutineItem[]> {
  const { data, error } = await supabase
    .from("routine_items")
    .select("*")
    .eq("routine_id", routineId)
    .order("sort_order")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as RoutineItem[];
}

export async function createRoutineItem(
  fields: Pick<RoutineItem, "routine_id" | "title"> &
    Partial<Pick<RoutineItem, "notes" | "estimate_minutes">>
): Promise<RoutineItem> {
  const { data, error } = await supabase
    .from("routine_items")
    .insert(fields)
    .select()
    .single();
  if (error) throw error;
  return data as RoutineItem;
}

export async function updateRoutineItem(
  id: string,
  fields: Partial<Omit<RoutineItem, "id">>
): Promise<RoutineItem> {
  const { data, error } = await supabase
    .from("routine_items")
    .update(fields)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as RoutineItem;
}

export async function deleteRoutineItem(id: string): Promise<void> {
  const { error } = await supabase.from("routine_items").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Applies a routine for the given date.
 * Returns quest id in quest mode, or null in direct-task mode.
 */
export async function applyRoutine(
  routineId: string,
  targetDate: string,
  questTitle?: string,
  questDescription?: string
): Promise<string | null> {
  const { data, error } = await supabase.rpc("apply_routine_quest", {
    p_routine_id: routineId,
    p_target_date: targetDate,
    p_quest_title: questTitle ?? null,
    p_quest_description: questDescription ?? null,
  });
  if (error) throw error;
  return (data as string | null) ?? null;
}

export async function fetchRoutineRuns(routineId: string): Promise<RoutineRun[]> {
  const { data, error } = await supabase
    .from("routine_runs")
    .select("*")
    .eq("routine_id", routineId)
    .order("applied_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data ?? []) as RoutineRun[];
}

// ── Schedule helpers ────────────────────────────────────────

export async function fetchSchedule(date: string) {
  const [tasks, errands] = await Promise.all([
    supabase
      .from("tasks")
      .select("*, quests(id, title)")
      .eq("due_date", date)
      .order("sort_order"),
    supabase
      .from("errands")
      .select("*")
      .eq("due_date", date)
      .order("sort_order"),
  ]);
  if (tasks.error) throw tasks.error;
  if (errands.error) throw errands.error;

  return {
    tasks: (tasks.data ?? []) as Task[],
    errands: (errands.data ?? []) as Errand[],
  };
}

export async function fetchOverdue() {
  const t = today();
  const [tasks, errands] = await Promise.all([
    supabase
      .from("tasks")
      .select("*, quests(id, title)")
      .lt("due_date", t)
      .eq("status", "planned")
      .order("due_date"),
    supabase
      .from("errands")
      .select("*")
      .lt("due_date", t)
      .eq("status", "planned")
      .order("due_date"),
  ]);
  if (tasks.error) throw tasks.error;
  if (errands.error) throw errands.error;

  return {
    tasks: (tasks.data ?? []) as Task[],
    errands: (errands.data ?? []) as Errand[],
  };
}

