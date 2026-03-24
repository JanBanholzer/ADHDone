import { Bot } from "grammy";
import { getBriefing } from "./api";
import { generateBriefing } from "./ai";

const CHAT_ID = process.env.TELEGRAM_CHAT_ID!;

function isTomorrowFirstOfMonth(): boolean {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.getDate() === 1;
}

export async function deliverBriefing(
  type: string,
  bot: Bot
): Promise<void> {
  // Monthly debrief guard: cron fires 28-31, only deliver if tomorrow is the 1st
  if (type === "monthly_debrief" && !isTomorrowFirstOfMonth()) {
    console.log(
      `[Briefings] ${type} skipped — tomorrow is not the 1st of the month`
    );
    return;
  }

  try {
    console.log(`[Briefings] Generating ${type}...`);

    const briefing = await getBriefing(type);

    const message = await generateBriefing(
      briefing.template,
      briefing.data,
      briefing.combined_with
    );

    const chunks = splitMessage(message);
    for (const chunk of chunks) {
      await safeSend(bot, CHAT_ID, chunk);
    }

    console.log(`[Briefings] ${type} delivered (${message.length} chars)`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Briefings] Error delivering ${type}:`, msg);
    await safeSend(
      bot,
      CHAT_ID,
      `⚠️ Error delivering ${type}: ${msg}`
    );
  }
}

// Split at newline boundaries to stay under Telegram's 4096 char limit
export function splitMessage(text: string, maxLen = 4000): string[] {
  if (text.length <= maxLen) return [text];

  const chunks: string[] = [];
  let current = "";

  for (const line of text.split("\n")) {
    if (current.length + line.length + 1 > maxLen) {
      if (current.trim()) chunks.push(current.trim());
      current = "";
    }
    current += line + "\n";
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

// Try Markdown first, fall back to plain text if Telegram rejects it
export async function safeSend(
  bot: Bot,
  chatId: string,
  text: string
): Promise<void> {
  try {
    await bot.api.sendMessage(chatId, text, { parse_mode: "Markdown" });
  } catch {
    await bot.api.sendMessage(chatId, text);
  }
}
