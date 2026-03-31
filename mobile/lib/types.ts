export type MissionStatus = "active" | "accomplished" | "aborted";
export type ProjectStatus = "planned" | "active" | "completed" | "aborted";
export type QuestStatus = "planned" | "active" | "completed" | "aborted";
export type TaskStatus = "planned" | "done" | "skipped" | "aborted";

export interface Mission {
  id: string;
  title: string;
  description: string;
  status: MissionStatus;
  sort_order: number;
  created_at: string;
  updated_at: string;
  projects?: Project[];
}

export interface Project {
  id: string;
  mission_id: string;
  title: string;
  description: string;
  status: ProjectStatus;
  target_date: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  missions?: Pick<Mission, "id" | "title">;
  quests?: Quest[];
}

export interface Quest {
  id: string;
  /** Set when quest lives under a project. */
  project_id: string | null;
  /** Set when quest is attached directly to a mission (no project). */
  mission_id: string | null;
  title: string;
  description: string;
  status: QuestStatus;
  target_date: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  projects?: Pick<Project, "id" | "title" | "mission_id"> & {
    missions?: Pick<Mission, "id" | "title">;
  } | null;
  missions?: Pick<Mission, "id" | "title"> | null;
  tasks?: Task[];
}

export interface Task {
  id: string;
  /** Set when the task lives under a quest. */
  quest_id: string | null;
  /** Set when the task is attached directly to a mission (no quest). */
  mission_id: string | null;
  title: string;
  description: string;
  notes: string;
  status: TaskStatus;
  due_date: string;
  estimate_minutes: number | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  quests?: Pick<Quest, "id" | "title" | "project_id" | "mission_id"> & {
    projects?: Pick<Project, "id" | "title" | "mission_id"> & {
      missions?: Pick<Mission, "id" | "title">;
    } | null;
    missions?: Pick<Mission, "id" | "title"> | null;
  } | null;
  missions?: Pick<Mission, "id" | "title"> | null;
}

export interface Errand {
  id: string;
  title: string;
  description: string;
  notes: string;
  status: TaskStatus;
  due_date: string;
  estimate_minutes: number | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type RoutineScheduleType = "manual" | "weekly" | "monthly" | "quarterly" | "yearly";
export type RoutineApplyAs = "quest" | "task";

export interface Routine {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
  /** Whether applying this routine creates a quest or direct mission tasks. */
  apply_as: RoutineApplyAs;
  schedule_type: RoutineScheduleType;
  /** Human-readable trigger window, e.g. "last week of month". OpenClaw uses this to decide when to fire. */
  schedule_anchor: string;
  /** Quest title template. Placeholders: {month}, {year}, {quarter}. Falls back to title if empty. */
  quest_title_template: string;
  quest_description_template: string;
  /** If non-empty: OpenClaw generates tasks via AI after quest creation. If empty: routine_items become tasks. */
  ai_prompt: string;
  target_mission_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface RoutineRun {
  id: string;
  routine_id: string;
  quest_id: string | null;
  target_date: string;
  applied_at: string;
  ai_generated: boolean;
  notes: string;
}

export interface RoutineItem {
  id: string;
  routine_id: string;
  title: string;
  notes: string;
  estimate_minutes: number | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface SectionData<T> {
  title: string;
  data: T[];
}
