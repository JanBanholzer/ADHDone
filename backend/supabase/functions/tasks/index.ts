import { createServiceClient } from "../_shared/supabase.ts";
import { json, error, preflight } from "../_shared/response.ts";

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;

  const db = createServiceClient();
  const url = new URL(req.url);

  try {
    switch (req.method) {
      case "GET": {
        const id = url.searchParams.get("id");
        if (id) {
          const { data, error: e } = await db
            .from("tasks")
            .select(
              `*, quests(id, title, project_id,
                projects(id, title, mission_id, missions(id, title)))`,
            )
            .eq("id", id)
            .single();
          if (e) return error(e.message, 404);
          return json(data);
        }

        let query = db
          .from("tasks")
          .select("*, quests(id, title, project_id)");

        const questId = url.searchParams.get("quest_id");
        if (questId) query = query.eq("quest_id", questId);

        const status = url.searchParams.get("status");
        if (status) query = query.eq("status", status);

        const dueDate = url.searchParams.get("due_date");
        if (dueDate) query = query.eq("due_date", dueDate);

        if (url.searchParams.get("today") === "true")
          query = query.eq("due_date", todayDate());

        if (url.searchParams.get("overdue") === "true")
          query = query.lt("due_date", todayDate()).eq("status", "planned");

        const upcomingDays = url.searchParams.get("upcoming_days");
        if (upcomingDays) {
          const t = todayDate();
          const future = new Date(
            Date.now() + parseInt(upcomingDays) * 86_400_000,
          )
            .toISOString()
            .slice(0, 10);
          query = query.gte("due_date", t).lte("due_date", future);
        }

        query = query
          .order("due_date")
          .order("sort_order")
          .order("created_at", { ascending: false });
        const limit = url.searchParams.get("limit");
        if (limit) query = query.limit(parseInt(limit));

        const { data, error: e } = await query;
        if (e) return error(e.message);
        return json(data);
      }

      case "POST": {
        const body = await req.json();
        if (!body.title?.trim()) return error("title is required");
        if (!body.quest_id) return error("quest_id is required");
        if (!body.due_date) return error("due_date is required");

        const { data, error: e } = await db
          .from("tasks")
          .insert({
            quest_id: body.quest_id,
            title: body.title,
            due_date: body.due_date,
            ...(body.notes !== undefined && { notes: body.notes }),
            ...(body.status !== undefined && { status: body.status }),
            ...(body.estimate_minutes !== undefined && {
              estimate_minutes: body.estimate_minutes,
            }),
            ...(body.sort_order !== undefined && {
              sort_order: body.sort_order,
            }),
          })
          .select()
          .single();
        if (e) return error(e.message);
        return json(data, 201);
      }

      case "PATCH": {
        const body = await req.json();
        if (!body.id) return error("id is required");

        const { id, ...updates } = body;
        if (updates.status === "done" && !updates.done_at)
          updates.done_at = new Date().toISOString();
        if (updates.status === "skipped" && !updates.skipped_at)
          updates.skipped_at = new Date().toISOString();
        if (updates.status === "aborted" && !updates.aborted_at)
          updates.aborted_at = new Date().toISOString();
        if (updates.status === "planned") {
          updates.done_at = null;
          updates.skipped_at = null;
          updates.aborted_at = null;
        }

        const { data, error: e } = await db
          .from("tasks")
          .update(updates)
          .eq("id", id)
          .select()
          .single();
        if (e) return error(e.message);
        return json(data);
      }

      case "DELETE": {
        const id = url.searchParams.get("id");
        if (!id) return error("id query parameter is required");

        const { error: e } = await db.from("tasks").delete().eq("id", id);
        if (e) return error(e.message);
        return json({ deleted: id });
      }

      default:
        return error("Method not allowed", 405);
    }
  } catch (e) {
    return error(e.message || "Internal server error", 500);
  }
});
