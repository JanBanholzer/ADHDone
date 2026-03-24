import * as Calendar from "expo-calendar";
import { Platform } from "react-native";
import { supabase } from "./supabase";

const SYNC_WINDOW_DAYS_PAST = 1;
const SYNC_WINDOW_DAYS_FUTURE = 14;

export async function requestCalendarAccess(): Promise<boolean> {
  try {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    return status === "granted";
  } catch (err) {
    console.error("Calendar permission error:", err);
    return false;
  }
}

export async function syncCalendar(): Promise<void> {
  const hasPermission = await requestCalendarAccess();
  if (!hasPermission) {
    console.log("Calendar permission not granted, skipping sync");
    return;
  }

  try {
    // Define the sync window
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - SYNC_WINDOW_DAYS_PAST);
    const endDate = new Date(now);
    endDate.setDate(now.getDate() + SYNC_WINDOW_DAYS_FUTURE);

    // Get all calendars
    const calendars = await Calendar.getCalendarsAsync(
      Calendar.EntityTypes.EVENT
    );

    // Read all events from all calendars in the window
    const allEvents: Calendar.Event[] = [];
    for (const cal of calendars) {
      const events = await Calendar.getEventsAsync(
        [cal.id],
        startDate,
        endDate
      );
      allEvents.push(...events);
    }

    // Map to DB row shape
    const rows = allEvents.map((e) => ({
      id: e.id,
      title: e.title || "Untitled Event",
      start_at: new Date(e.startDate).toISOString(),
      end_at: new Date(e.endDate).toISOString(),
      location: e.location || "",
      notes: e.notes || "",
      calendar_name:
        calendars.find((c) => c.id === e.calendarId)?.title || "",
      is_all_day: e.allDay || false,
      source_platform: Platform.OS,
      synced_at: new Date().toISOString(),
    }));

    // Full-replace sync: delete window, then insert snapshot
    const windowStart = startDate.toISOString();
    const windowEnd = endDate.toISOString();

    const { error: deleteErr } = await supabase
      .from("calendar_events")
      .delete()
      .gte("start_at", windowStart)
      .lte("start_at", windowEnd);

    if (deleteErr) {
      console.error("Calendar delete error:", deleteErr);
      return;
    }

    if (rows.length > 0) {
      const { error: insertErr } = await supabase
        .from("calendar_events")
        .insert(rows);

      if (insertErr) {
        console.error("Calendar insert error:", insertErr);
        return;
      }
    }

    console.log(`Synced ${rows.length} calendar events`);
  } catch (err) {
    console.error("Calendar sync error:", err);
  }
}
