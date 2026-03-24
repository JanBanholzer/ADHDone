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
  project_id: string;
  title: string;
  description: string;
  status: QuestStatus;
  target_date: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  projects?: Pick<Project, "id" | "title" | "mission_id"> & {
    missions?: Pick<Mission, "id" | "title">;
  };
  tasks?: Task[];
}

export interface Task {
  id: string;
  quest_id: string;
  title: string;
  notes: string;
  status: TaskStatus;
  due_date: string;
  estimate_minutes: number | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  quests?: Pick<Quest, "id" | "title" | "project_id"> & {
    projects?: Pick<Project, "id" | "title" | "mission_id"> & {
      missions?: Pick<Mission, "id" | "title">;
    };
  };
}

export interface Errand {
  id: string;
  title: string;
  notes: string;
  status: TaskStatus;
  due_date: string;
  estimate_minutes: number | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start_at: string;
  end_at: string;
  location: string;
  notes: string;
  calendar_name: string;
  is_all_day: boolean;
  source_platform: string;
  synced_at: string;
  created_at: string;
  updated_at: string;
}

export interface SectionData<T> {
  title: string;
  data: T[];
}
