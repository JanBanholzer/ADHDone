import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "./supabase";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export interface BadgeCounts {
  tasks: number;
  quests: number;
  projects: number;
  missions: number;
  schedule: number;
}

async function fetchCounts(): Promise<BadgeCounts> {
  const t = today();

  const [tasks, errands, quests, projects, missions, scheduleTasks, scheduleErrands] =
    await Promise.all([
      supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("status", "planned"),
      supabase
        .from("errands")
        .select("id", { count: "exact", head: true })
        .eq("status", "planned"),
      supabase
        .from("quests")
        .select("id", { count: "exact", head: true })
        .in("status", ["planned", "active"]),
      supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .in("status", ["planned", "active"]),
      supabase
        .from("missions")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
      supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("due_date", t)
        .eq("status", "planned"),
      supabase
        .from("errands")
        .select("id", { count: "exact", head: true })
        .eq("due_date", t)
        .eq("status", "planned"),
    ]);

  return {
    tasks: (tasks.count ?? 0) + (errands.count ?? 0),
    quests: quests.count ?? 0,
    projects: projects.count ?? 0,
    missions: missions.count ?? 0,
    schedule: (scheduleTasks.count ?? 0) + (scheduleErrands.count ?? 0),
  };
}

export function useBadgeCounts() {
  const [counts, setCounts] = useState<BadgeCounts>({
    tasks: 0,
    quests: 0,
    projects: 0,
    missions: 0,
    schedule: 0,
  });
  const lastKeyRef = useRef<string>("");

  const refresh = useCallback(async () => {
    try {
      const c = await fetchCounts();
      const key = `${c.tasks}|${c.quests}|${c.projects}|${c.missions}|${c.schedule}`;
      if (key !== lastKeyRef.current) {
        lastKeyRef.current = key;
        setCounts(c);
      }
    } catch {
      // silently ignore – badge is non-critical
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 120_000);
    return () => clearInterval(interval);
  }, [refresh]);

  return counts;
}
