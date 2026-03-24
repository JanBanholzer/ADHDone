import { supabase } from "./supabase";
import type { Mission, Project, Quest, Task, Errand } from "./types";

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

// ── Quests ──────────────────────────────────────────────────

export async function fetchQuests(): Promise<Quest[]> {
  const { data, error } = await supabase
    .from("quests")
    .select("*, projects(id, title, mission_id, missions(id, title))")
    .order("sort_order")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createQuest(
  fields: Pick<Quest, "title" | "project_id"> &
    Partial<Pick<Quest, "description" | "status" | "target_date">>
): Promise<Quest> {
  const { data, error } = await supabase
    .from("quests")
    .insert(fields)
    .select()
    .single();
  if (error) throw error;
  return data;
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

// ── Tasks ───────────────────────────────────────────────────

export async function fetchTasks(opts?: {
  questId?: string;
  status?: string;
  dueDate?: string;
}): Promise<Task[]> {
  let q = supabase
    .from("tasks")
    .select(
      "*, quests(id, title, project_id, projects(id, title, mission_id, missions(id, title)))"
    );

  if (opts?.questId) q = q.eq("quest_id", opts.questId);
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
  fields: Pick<Task, "title" | "quest_id" | "due_date"> &
    Partial<Pick<Task, "notes" | "estimate_minutes">>
): Promise<Task> {
  const { data, error } = await supabase
    .from("tasks")
    .insert(fields)
    .select()
    .single();
  if (error) throw error;
  return data;
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
    Partial<Pick<Errand, "notes" | "estimate_minutes">>
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
