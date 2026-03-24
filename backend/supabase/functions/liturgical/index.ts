import { createServiceClient } from "../_shared/supabase.ts";
import { json, error, preflight } from "../_shared/response.ts";

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;

  if (req.method !== "GET") return error("Method not allowed", 405);

  const db = createServiceClient();
  const url = new URL(req.url);

  try {
    const date = url.searchParams.get("date");
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const year = url.searchParams.get("year");
    const eventId = url.searchParams.get("event_id");

    // Single event lookup
    if (eventId) {
      const { data, error: e } = await db
        .from("liturgical_events")
        .select("*, liturgical_observances(observance_date)")
        .eq("id", eventId)
        .single();
      if (e) return error(e.message, 404);
      return json(data);
    }

    // Observances for a specific date
    if (date) {
      const { data, error: e } = await db
        .from("liturgical_observances")
        .select("*, liturgical_events(*)")
        .eq("observance_date", date)
        .order("sort_order");
      if (e) return error(e.message);
      return json(
        (data ?? []).map((o) => ({
          observance_date: o.observance_date,
          sort_order: o.sort_order,
          ...o.liturgical_events,
        })),
      );
    }

    // Observances for a date range
    if (from && to) {
      const { data, error: e } = await db
        .from("liturgical_observances")
        .select("*, liturgical_events(*)")
        .gte("observance_date", from)
        .lte("observance_date", to)
        .order("observance_date")
        .order("sort_order");
      if (e) return error(e.message);
      return json(
        (data ?? []).map((o) => ({
          observance_date: o.observance_date,
          sort_order: o.sort_order,
          ...o.liturgical_events,
        })),
      );
    }

    // Observances for a civil year
    if (year) {
      const { data, error: e } = await db
        .from("liturgical_observances")
        .select("*, liturgical_events(*)")
        .eq("civil_year", parseInt(year))
        .order("observance_date")
        .order("sort_order");
      if (e) return error(e.message);
      return json(
        (data ?? []).map((o) => ({
          observance_date: o.observance_date,
          sort_order: o.sort_order,
          ...o.liturgical_events,
        })),
      );
    }

    // Default: today's observances
    const today = new Date().toISOString().slice(0, 10);
    const { data, error: e } = await db
      .from("liturgical_observances")
      .select("*, liturgical_events(*)")
      .eq("observance_date", today)
      .order("sort_order");
    if (e) return error(e.message);
    return json(
      (data ?? []).map((o) => ({
        observance_date: o.observance_date,
        sort_order: o.sort_order,
        ...o.liturgical_events,
      })),
    );
  } catch (e) {
    return error(e.message || "Internal server error", 500);
  }
});
