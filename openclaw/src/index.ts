import "dotenv/config";
import { bot, startBot } from "./bot";
import { startScheduler } from "./scheduler";

async function main() {
  console.log("[ADHDone] Starting OpenClaw worker...");

  // Register cron jobs (reads schedule from DB — never hardcoded)
  await startScheduler(bot);

  // Start Telegram bot (long-polling)
  await startBot();
}

main().catch((err) => {
  console.error("[ADHDone] Fatal error:", err);
  process.exit(1);
});
