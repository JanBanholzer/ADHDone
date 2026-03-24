import { createServiceClient } from "../_shared/supabase.ts";
import { json, error, preflight } from "../_shared/response.ts";

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
            .from("quests")
            .select(
              `*, projects(id, title, mission_id, missions(id, title)),
               tasks(id, title, status, due_date, sort_order)`,
            )
            .eq("id", id)
            .single();
          if (e) return error(e.message, 404);
          return json(data);
        }

        let query = db
          .from("quests")
          .select("*, projects(id, title, mission_id)");
        const projectId = url.searchParams.get("project_id");
        if (projectId) query = query.eq("project_id", projectId);
        const status = url.searchParams.get("status");
        if (status) query = query.eq("status", status);
        query = query
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
        if (!body.project_id) return error("project_id is required");

        const { data, error: e } = await db
          .from("quests")
          .insert({
            project_id: body.project_id,
            title: body.title,
            ...(body.description !== undefined && {
              description: body.description,
            }),
            ...(body.status !== undefined && { status: body.status }),
            ...(body.target_date !== undefined && {
              target_date: body.target_date,
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
        if (updates.status === "completed" && !updates.completed_at)
          updates.completed_at = new Date().toISOString();
        if (updates.status === "aborted" && !updates.aborted_at)
          updates.aborted_at = new Date().toISOString();
        if (updates.status === "planned" || updates.status === "active") {
          updates.completed_at = null;
          updates.aborted_at = null;
        }

        const { data, error: e } = await db
          .from("quests")
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

        const { error: e } = await db.from("quests").delete().eq("id", id);
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
