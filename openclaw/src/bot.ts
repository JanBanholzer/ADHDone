import { Bot } from "grammy";
import { runAgent, type Message } from "./ai";
import { getDashboard } from "./api";
import { safeSend, splitMessage } from "./briefings";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID!;

if (!TOKEN) throw new Error("Missing TELEGRAM_BOT_TOKEN");
if (!CHAT_ID) throw new Error("Missing TELEGRAM_CHAT_ID");

export const bot = new Bot(TOKEN);

// Sliding conversation window — resets on /clear or restart
let conversationHistory: Message[] = [];
const MAX_HISTORY = 40;

function addToHistory(msg: Message) {
  conversationHistory.push(msg);
  if (conversationHistory.length > MAX_HISTORY) {
    conversationHistory = conversationHistory.slice(-MAX_HISTORY);
  }
}

// ── Commands ─────────────────────────────────────────────────

bot.command("start", async (ctx) => {
  conversationHistory = [];
  await ctx.reply(
    "ADHDone is running. Send me anything — I can create tasks, mark things done, schedule reminders, and more."
  );
});

bot.command("clear", async (ctx) => {
  conversationHistory = [];
  await ctx.reply("Conversation cleared.");
});

bot.command("status", async (ctx) => {
  try {
    const d = await getDashboard();
    const tasks = d.today_tasks?.length ?? 0;
    const errands = d.today_errands?.length ?? 0;
    const overdue =
      (d.overdue_tasks?.length ?? 0) + (d.overdue_errands?.length ?? 0);
    const reminders = d.due_reminders?.length ?? 0;
    const calendar = d.calendar_events_today?.length ?? 0;

    let msg = `📊 *${d.today}*\n`;
    msg += `Tasks: ${tasks}  Errands: ${errands}`;
    if (overdue > 0) msg += `  ⚠️ Overdue: ${overdue}`;
    if (reminders > 0) msg += `  🔔 Reminders due: ${reminders}`;
    if (calendar > 0) msg += `  📅 Calendar events: ${calendar}`;

    await safeSend(bot, CHAT_ID, msg);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    await ctx.reply(`Error: ${msg}`);
  }
});

bot.command("help", async (ctx) => {
  await ctx.reply(
    `*ADHDone*\n\n` +
      `/status — quick daily overview\n` +
      `/clear — reset conversation history\n` +
      `/help — this message\n\n` +
      `Or just write anything naturally — I understand context and can:\n` +
      `• Create / update tasks, errands, quests, projects, missions\n` +
      `• Mark items done\n` +
      `• Schedule reminders\n` +
      `• Save notes to your knowledge base\n` +
      `• Search your resources`,
    { parse_mode: "Markdown" }
  );
});

// ── Main message handler — agentic free text ──────────────────

bot.on("message:text", async (ctx) => {
  // Only respond to messages from the configured chat
  if (String(ctx.chat.id) !== CHAT_ID) return;

  const userText = ctx.message.text;

  // Ignore commands (handled above)
  if (userText.startsWith("/")) return;

  addToHistory({ role: "user", content: userText });

  // Keep typing indicator alive every 4s during AI processing
  let typingActive = true;
  const typingInterval = setInterval(async () => {
    if (!typingActive) return;
    try {
      await ctx.api.sendChatAction(ctx.chat.id, "typing");
    } catch {
      // ignore
    }
  }, 4000);

  try {
    await ctx.api.sendChatAction(ctx.chat.id, "typing");
    const reply = await runAgent([...conversationHistory]);
    typingActive = false;
    clearInterval(typingInterval);

    addToHistory({ role: "assistant", content: reply });

    const chunks = splitMessage(reply);
    for (const chunk of chunks) {
      await safeSend(bot, CHAT_ID, chunk);
    }
  } catch (err: unknown) {
    typingActive = false;
    clearInterval(typingInterval);

    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Bot] Error processing message:", msg);
    await ctx.reply(`Sorry, something went wrong: ${msg}`);
  }
});

// ── Start ─────────────────────────────────────────────────────

export async function startBot(): Promise<void> {
  console.log("[Bot] Starting...");
  await bot.start({
    onStart: (info) =>
      console.log(`[Bot] Running as @${info.username}`),
  });
}
