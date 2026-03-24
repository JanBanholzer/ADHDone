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
            .from("reminders")
            .select("*")
            .eq("id", id)
            .single();
          if (e) return error(e.message, 404);
          return json(data);
        }

        let query = db.from("reminders").select("*");

        // Reminders due now or in the past (for cron polling)
        if (url.searchParams.get("due") === "true")
          query = query.lte("remind_at", new Date().toISOString());

        // Reminders within next N hours (default 24)
        const withinHours = url.searchParams.get("within_hours");
        if (withinHours) {
          const horizon = new Date(
            Date.now() + parseInt(withinHours) * 3_600_000,
          ).toISOString();
          query = query.lte("remind_at", horizon);
        }

        const recurring = url.searchParams.get("recurring");
        if (recurring === "true")
          query = query.not("recurring_interval_days", "is", null);
        else if (recurring === "false")
          query = query.is("recurring_interval_days", null);

        query = query.order("remind_at");
        const limit = url.searchParams.get("limit");
        if (limit) query = query.limit(parseInt(limit));

        const { data, error: e } = await query;
        if (e) return error(e.message);
        return json(data);
      }

      case "POST": {
        const body = await req.json();
        if (!body.name?.trim()) return error("name is required");
        if (!body.remind_at) return error("remind_at is required");

        const { data, error: e } = await db
          .from("reminders")
          .insert({
            name: body.name,
            remind_at: body.remind_at,
            ...(body.recurring_interval_days !== undefined && {
              recurring_interval_days: body.recurring_interval_days,
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

        // Convenience: advance a recurring reminder to its next fire time
        if (updates.advance_recurring) {
          delete updates.advance_recurring;
          const { data: current, error: fetchErr } = await db
            .from("reminders")
            .select("remind_at, recurring_interval_days")
            .eq("id", id)
            .single();
          if (fetchErr) return error(fetchErr.message, 404);
          if (!current.recurring_interval_days)
            return error("reminder is not recurring");

          const next = new Date(current.remind_at);
          next.setDate(next.getDate() + current.recurring_interval_days);
          updates.remind_at = next.toISOString();
        }

        const { data, error: e } = await db
          .from("reminders")
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

        const { error: e } = await db.from("reminders").delete().eq("id", id);
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
