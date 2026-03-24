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
            .from("resources")
            .select("*")
            .eq("id", id)
            .single();
          if (e) return error(e.message, 404);
          return json(data);
        }

        let query = db.from("resources").select(
          "id, title, summary, source, tags, metadata, is_archived, last_used_at, created_at, updated_at",
        );

        const search = url.searchParams.get("search");
        if (search) {
          query = query.textSearch("search_tsv", search, {
            type: "websearch",
            config: "simple",
          });
        }

        const tag = url.searchParams.get("tag");
        if (tag) query = query.contains("tags", [tag]);

        const archived = url.searchParams.get("archived");
        if (archived === "true") query = query.eq("is_archived", true);
        else if (archived === "false") query = query.eq("is_archived", false);

        query = query.order("updated_at", { ascending: false });
        const limit = url.searchParams.get("limit");
        if (limit) query = query.limit(parseInt(limit));

        const { data, error: e } = await query;
        if (e) return error(e.message);
        return json(data);
      }

      case "POST": {
        const body = await req.json();
        if (!body.title?.trim()) return error("title is required");
        if (!body.content?.trim()) return error("content is required");

        const { data, error: e } = await db
          .from("resources")
          .insert({
            title: body.title,
            content: body.content,
            ...(body.summary !== undefined && { summary: body.summary }),
            ...(body.source !== undefined && { source: body.source }),
            ...(body.tags !== undefined && { tags: body.tags }),
            ...(body.metadata !== undefined && { metadata: body.metadata }),
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

        if (updates.touch) {
          delete updates.touch;
          updates.last_used_at = new Date().toISOString();
        }

        const { data, error: e } = await db
          .from("resources")
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

        const { error: e } = await db.from("resources").delete().eq("id", id);
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
