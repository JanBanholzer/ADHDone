import Anthropic from "@anthropic-ai/sdk";
import * as api from "./api";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
export const MODEL =
  process.env.ANTHROPIC_MODEL ?? "claude-opus-4-5";

// Simple conversation message type (used in bot.ts history)
export interface Message {
  role: "user" | "assistant";
  content: string;
}

const SYSTEM_PROMPT = `You are ADHDone, a personal productivity assistant inspired by monastic and Franciscan discipline.

You manage a hierarchical task system:
- Missions: highest-level long-term goals (status: active/accomplished/aborted)
- Projects: medium-term work serving a mission (planned/active/completed/aborted)
- Quests: finite plannable chunks under a project OR directly under a mission (planned/active/completed/aborted)
- Tasks: day-level actionable items with a due_date, linked to a quest (planned/done/skipped/aborted)
- Errands: standalone day items NOT linked to quests (planned/done/skipped/aborted)
- Resources: persistent knowledge base / notes / preferences
- Reminders: scheduled one-shot or recurring notifications

CRITICAL RULES — NEVER violate these:
1. ALWAYS update the database immediately. Never rely on conversation memory to track state.
2. When the user says something is done/finished/complete, find it and call update_task or update_errand immediately.
3. Before creating a task for a calendar event, check calendar_event_task_matches. If has_corresponding_task_or_errand is true, do NOT create a duplicate — only acknowledge the existing one.
4. Save important user preferences (e.g. preferred times, recurring habits) as resources using save_resource.
5. Be concise and warm. Use 24h time format. Respond in the user's language.
6. After any database write, confirm briefly what was saved.
7. If unsure of a task's ID, call get_tasks or get_errands first to find it.`;

const TOOLS: Anthropic.Tool[] = [
  {
    name: "get_dashboard",
    description:
      "Get full current status: today's tasks/errands, overdue items, active missions/projects/quests, due reminders, calendar events.",
    input_schema: { type: "object" as const, properties: {} },
  },
  {
    name: "get_tasks",
    description: "Query tasks with optional filters.",
    input_schema: {
      type: "object" as const,
      properties: {
        status: {
          type: "string",
          enum: ["planned", "done", "skipped", "aborted"],
        },
        due_date: { type: "string", description: "YYYY-MM-DD" },
        quest_id: { type: "string" },
      },
    },
  },
  {
    name: "get_errands",
    description: "Query standalone errands with optional filters.",
    input_schema: {
      type: "object" as const,
      properties: {
        status: {
          type: "string",
          enum: ["planned", "done", "skipped", "aborted"],
        },
        due_date: { type: "string" },
      },
    },
  },
  {
    name: "get_quests",
    description:
      "Query quests with optional filters. Quests attach to either a project OR directly to a mission.",
    input_schema: {
      type: "object" as const,
      properties: {
        status: {
          type: "string",
          enum: ["planned", "active", "completed", "aborted"],
        },
        project_id: { type: "string" },
        mission_id: { type: "string" },
      },
    },
  },
  {
    name: "get_projects",
    description: "Query projects with optional filters.",
    input_schema: {
      type: "object" as const,
      properties: {
        status: {
          type: "string",
          enum: ["planned", "active", "completed", "aborted"],
        },
        mission_id: { type: "string" },
      },
    },
  },
  {
    name: "get_missions",
    description: "Query missions with optional status filter.",
    input_schema: {
      type: "object" as const,
      properties: {
        status: {
          type: "string",
          enum: ["active", "accomplished", "aborted"],
        },
      },
    },
  },
  {
    name: "create_task",
    description:
      "Create a new task. Tasks must be linked to a quest. Use get_quests first if you don't have a quest_id.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string" },
        quest_id: { type: "string" },
        due_date: { type: "string", description: "YYYY-MM-DD" },
        description: { type: "string" },
        notes: { type: "string" },
        estimate_minutes: { type: "number" },
      },
      required: ["title", "quest_id", "due_date"],
    },
  },
  {
    name: "update_task",
    description:
      "Update a task — mark done/skipped/aborted, change due date, add notes, etc.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "string" },
        status: {
          type: "string",
          enum: ["planned", "done", "skipped", "aborted"],
        },
        title: { type: "string" },
        due_date: { type: "string" },
        notes: { type: "string" },
        estimate_minutes: { type: "number" },
      },
      required: ["id"],
    },
  },
  {
    name: "create_errand",
    description:
      "Create a standalone errand (not linked to a quest). Use for one-off day items.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string" },
        due_date: { type: "string", description: "YYYY-MM-DD" },
        description: { type: "string" },
        notes: { type: "string" },
        estimate_minutes: { type: "number" },
      },
      required: ["title", "due_date"],
    },
  },
  {
    name: "update_errand",
    description:
      "Update an errand — mark done/skipped/aborted or change details.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "string" },
        status: {
          type: "string",
          enum: ["planned", "done", "skipped", "aborted"],
        },
        title: { type: "string" },
        due_date: { type: "string" },
        notes: { type: "string" },
      },
      required: ["id"],
    },
  },
  {
    name: "create_quest",
    description:
      "Create a new quest under a project OR directly under a mission (exactly one of project_id or mission_id).",
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string" },
        project_id: {
          type: "string",
          description: "Link quest to this project",
        },
        mission_id: {
          type: "string",
          description: "Link quest to this mission only (no project)",
        },
        description: { type: "string" },
        target_date: { type: "string", description: "YYYY-MM-DD" },
      },
      required: ["title"],
    },
  },
  {
    name: "update_quest",
    description: "Update a quest status or details.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "string" },
        status: {
          type: "string",
          enum: ["planned", "active", "completed", "aborted"],
        },
        title: { type: "string" },
        target_date: { type: "string" },
      },
      required: ["id"],
    },
  },
  {
    name: "create_project",
    description: "Create a new project under a mission.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string" },
        mission_id: { type: "string" },
        description: { type: "string" },
        target_date: { type: "string" },
      },
      required: ["title", "mission_id"],
    },
  },
  {
    name: "update_project",
    description: "Update a project status or details.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "string" },
        status: {
          type: "string",
          enum: ["planned", "active", "completed", "aborted"],
        },
        title: { type: "string" },
        target_date: { type: "string" },
      },
      required: ["id"],
    },
  },
  {
    name: "create_mission",
    description: "Create a new top-level mission.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string" },
        description: { type: "string" },
      },
      required: ["title"],
    },
  },
  {
    name: "update_mission",
    description: "Update a mission status or details.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "string" },
        status: {
          type: "string",
          enum: ["active", "accomplished", "aborted"],
        },
        title: { type: "string" },
        description: { type: "string" },
      },
      required: ["id"],
    },
  },
  {
    name: "create_reminder",
    description:
      "Schedule a reminder. Omit recurring_interval_days for one-shot.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string" },
        remind_at: { type: "string", description: "ISO 8601 UTC timestamp" },
        description: { type: "string" },
        recurring_interval_days: { type: "number" },
      },
      required: ["name", "remind_at"],
    },
  },
  {
    name: "save_resource",
    description:
      "Save a note, preference, or knowledge item to the persistent resource database.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string" },
        content: { type: "string" },
        summary: { type: "string" },
        tags: { type: "array", items: { type: "string" } },
      },
      required: ["title", "content"],
    },
  },
  {
    name: "search_resources",
    description: "Search the persistent knowledge base.",
    input_schema: {
      type: "object" as const,
      properties: { query: { type: "string" } },
      required: ["query"],
    },
  },
];

async function executeTool(
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  try {
    let result: unknown;
    switch (name) {
      case "get_dashboard":
        result = await api.getDashboard();
        break;
      case "get_tasks": {
        const r = await api.getTasks(args as Record<string, string>);
        result = r.data;
        break;
      }
      case "get_errands": {
        const r = await api.getErrands(args as Record<string, string>);
        result = r.data;
        break;
      }
      case "get_quests": {
        const r = await api.getQuests(args as Record<string, string>);
        result = r.data;
        break;
      }
      case "get_projects": {
        const r = await api.getProjects(args as Record<string, string>);
        result = r.data;
        break;
      }
      case "get_missions": {
        const r = await api.getMissions(args as Record<string, string>);
        result = r.data;
        break;
      }
      case "create_task": {
        const r = await api.createTask(args);
        result = r.data;
        break;
      }
      case "update_task": {
        const { id, ...rest } = args;
        const r = await api.updateTask(id as string, rest);
        result = r.data;
        break;
      }
      case "create_errand": {
        const r = await api.createErrand(args);
        result = r.data;
        break;
      }
      case "update_errand": {
        const { id, ...rest } = args;
        const r = await api.updateErrand(id as string, rest);
        result = r.data;
        break;
      }
      case "create_quest": {
        const pid = (args as Record<string, unknown>).project_id as
          | string
          | undefined;
        const mid = (args as Record<string, unknown>).mission_id as
          | string
          | undefined;
        if (!!pid === !!mid) {
          throw new Error(
            "create_quest: pass exactly one of project_id or mission_id",
          );
        }
        const row = pid
          ? { ...args, project_id: pid, mission_id: null }
          : { ...args, project_id: null, mission_id: mid };
        const r = await api.createQuest(row);
        result = r.data;
        break;
      }
      case "update_quest": {
        const { id, ...rest } = args;
        const r = await api.updateQuest(id as string, rest);
        result = r.data;
        break;
      }
      case "create_project": {
        const r = await api.createProject(args);
        result = r.data;
        break;
      }
      case "update_project": {
        const { id, ...rest } = args;
        const r = await api.updateProject(id as string, rest);
        result = r.data;
        break;
      }
      case "create_mission": {
        const r = await api.createMission(args);
        result = r.data;
        break;
      }
      case "update_mission": {
        const { id, ...rest } = args;
        const r = await api.updateMission(id as string, rest);
        result = r.data;
        break;
      }
      case "create_reminder": {
        const r = await api.createReminder(args);
        result = r.data;
        break;
      }
      case "save_resource": {
        const r = await api.createResource({ ...args, source: "telegram" });
        result = r.data;
        break;
      }
      case "search_resources": {
        const r = await api.searchResources(args.query as string);
        result = r.data;
        break;
      }
      default:
        return `Unknown tool: ${name}`;
    }
    return JSON.stringify(result ?? "ok");
  } catch (err: unknown) {
    return `Error: ${err instanceof Error ? err.message : String(err)}`;
  }
}

// ── Agentic loop ─────────────────────────────────────────────

export async function runAgent(
  messages: Message[],
  extraContext?: string
): Promise<string> {
  const system =
    SYSTEM_PROMPT + (extraContext ? `\n\n${extraContext}` : "");

  let history: Anthropic.MessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  for (let i = 0; i < 12; i++) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system,
      tools: TOOLS,
      messages: history,
    });

    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
    );

    if (toolUseBlocks.length === 0 || response.stop_reason === "end_turn") {
      const textBlock = response.content.find(
        (b): b is Anthropic.TextBlock => b.type === "text"
      );
      return textBlock?.text ?? "";
    }

    // Add assistant turn (contains both text and tool_use blocks)
    history.push({ role: "assistant", content: response.content });

    // Execute tools in parallel and add results
    const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
      toolUseBlocks.map(async (block) => ({
        type: "tool_result" as const,
        tool_use_id: block.id,
        content: await executeTool(
          block.name,
          block.input as Record<string, unknown>
        ),
      }))
    );

    history.push({ role: "user", content: toolResults });
  }

  return "I hit a processing limit. Please try a simpler request.";
}

// ── Briefing generation ──────────────────────────────────────

export async function generateBriefing(
  template: string,
  data: Record<string, unknown>,
  combinedWith?: {
    title: string;
    template: string;
    data: Record<string, unknown>;
  } | null
): Promise<string> {
  let userContent =
    `Deliver this briefing now. Follow the template structure exactly, filling in the data provided.\n\n` +
    `TEMPLATE:\n${template}\n\nDATA:\n${JSON.stringify(data, null, 2)}`;

  if (combinedWith) {
    userContent +=
      `\n\nThis briefing also includes the ${combinedWith.title}. Integrate it naturally:\n` +
      `TEMPLATE:\n${combinedWith.template}\n\nDATA:\n${JSON.stringify(
        combinedWith.data,
        null,
        2
      )}`;
  }

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 8096,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userContent }],
  });

  const textBlock = response.content.find(
    (b): b is Anthropic.TextBlock => b.type === "text"
  );
  return textBlock?.text ?? "";
}
