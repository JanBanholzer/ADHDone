import cron from "node-cron";
import { Bot } from "grammy";
import {
  getBriefingSchedule,
  getDueReminders,
  deleteReminder,
  advanceReminder,
} from "./api";
import { deliverBriefing } from "./briefings";
import { safeSend } from "./briefings";

const CHAT_ID = process.env.TELEGRAM_CHAT_ID!;
const REMINDER_POLL_MS = 60_000;

export async function startScheduler(bot: Bot): Promise<void> {
  // Load schedules from the DB so crons are never hardcoded
  const { briefings } = await getBriefingSchedule();

  for (const b of briefings) {
    const tz = b.timezone ?? "Europe/Berlin";

    cron.schedule(
      b.cron_expression,
      async () => {
        await deliverBriefing(b.id, bot);
      },
      { timezone: tz }
    );

    console.log(
      `[Scheduler] ${b.id} → "${b.cron_expression}" (${tz})`
    );
  }

  // Reminder poll: every minute
  setInterval(() => pollReminders(bot), REMINDER_POLL_MS);

  console.log("[Scheduler] Ready");
}

async function pollReminders(bot: Bot): Promise<void> {
  try {
    const { data: reminders, error } = await getDueReminders();
    if (error) {
      console.error("[Reminders] Poll error:", error.message);
      return;
    }
    if (!reminders || reminders.length === 0) return;

    for (const r of reminders) {
      try {
        const text =
          `🔔 *${r.name}*` +
          (r.description ? `\n${r.description}` : "");
        await safeSend(bot, CHAT_ID, text);

        if (r.recurring_interval_days) {
          await advanceReminder(r.id);
        } else {
          await deleteReminder(r.id);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[Reminders] Failed to deliver ${r.id}:`, msg);
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Reminders] Unexpected error:", msg);
  }
}
