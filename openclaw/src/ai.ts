import OpenAI from "openai";
import type { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources/chat/completions";
import * as api from "./api";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o";

export type Message = ChatCompletionMessageParam;

const SYSTEM_PROMPT = `You are ADHDone, a personal productivity assistant inspired by monastic and Franciscan discipline.

You manage a hierarchical task system:
- Missions: highest-level long-term goals (status: active/accomplished/aborted)
- Projects: medium-term work serving a mission (planned/active/completed/aborted)
- Quests: finite plannable chunks within a project (planned/active/completed/aborted)
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

const TOOLS: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_dashboard",
      description:
        "Get full current status: today's tasks/errands, overdue items, active missions/projects/quests, due reminders, calendar events.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_tasks",
      description: "Query tasks with optional filters.",
      parameters: {
        type: "object",
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
  },
  {
    type: "function",
    function: {
      name: "get_errands",
      description: "Query standalone errands with optional filters.",
      parameters: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["planned", "done", "skipped", "aborted"],
          },
          due_date: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_quests",
      description: "Query quests with optional filters.",
      parameters: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["planned", "active", "completed", "aborted"],
          },
          project_id: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_projects",
      description: "Query projects with optional filters.",
      parameters: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["planned", "active", "completed", "aborted"],
          },
          mission_id: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_missions",
      description: "Query missions with optional status filter.",
      parameters: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["active", "accomplished", "aborted"],
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_task",
      description:
        "Create a new task. Tasks must be linked to a quest. Use get_quests first if you don't have a quest_id.",
      parameters: {
        type: "object",
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
  },
  {
    type: "function",
    function: {
      name: "update_task",
      description:
        "Update a task — mark done/skipped/aborted, change due date, add notes, etc.",
      parameters: {
        type: "object",
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
  },
  {
    type: "function",
    function: {
      name: "create_errand",
      description:
        "Create a standalone errand (not linked to a quest). Use for one-off day items.",
      parameters: {
        type: "object",
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
  },
  {
    type: "function",
    function: {
      name: "update_errand",
      description: "Update an errand — mark done/skipped/aborted or change details.",
      parameters: {
        type: "object",
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
  },
  {
    type: "function",
    function: {
      name: "create_quest",
      description: "Create a new quest under a project.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          project_id: { type: "string" },
          description: { type: "string" },
          target_date: { type: "string", description: "YYYY-MM-DD" },
        },
        required: ["title", "project_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_quest",
      description: "Update a quest status or details.",
      parameters: {
        type: "object",
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
  },
  {
    type: "function",
    function: {
      name: "create_project",
      description: "Create a new project under a mission.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          mission_id: { type: "string" },
          description: { type: "string" },
          target_date: { type: "string" },
        },
        required: ["title", "mission_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_project",
      description: "Update a project status or details.",
      parameters: {
        type: "object",
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
  },
  {
    type: "function",
    function: {
      name: "create_mission",
      description: "Create a new top-level mission.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_mission",
      description: "Update a mission status or details.",
      parameters: {
        type: "object",
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
  },
  {
    type: "function",
    function: {
      name: "create_reminder",
      description:
        "Schedule a reminder. Omit recurring_interval_days for one-shot.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          remind_at: { type: "string", description: "ISO 8601 UTC timestamp" },
          description: { type: "string" },
          recurring_interval_days: { type: "number" },
        },
        required: ["name", "remind_at"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "save_resource",
      description:
        "Save a note, preference, or knowledge item to the persistent resource database.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          content: { type: "string" },
          summary: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
        },
        required: ["title", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_resources",
      description: "Search the persistent knowledge base.",
      parameters: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"],
      },
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
        const r = await api.createQuest(args);
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
    const msg = err instanceof Error ? err.message : String(err);
    return `Error: ${msg}`;
  }
}

// ── Agentic loop ─────────────────────────────────────────────

export async function runAgent(
  messages: Message[],
  extraContext?: string
): Promise<string> {
  const sys: Message = {
    role: "system",
    content:
      SYSTEM_PROMPT + (extraContext ? `\n\n${extraContext}` : ""),
  };

  let history: Message[] = [sys, ...messages];

  for (let i = 0; i < 12; i++) {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: history,
      tools: TOOLS,
      tool_choice: "auto",
    });

    const msg = response.choices[0].message;
    history.push(msg as Message);

    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      return msg.content ?? "";
    }

    const results: Message[] = await Promise.all(
      msg.tool_calls.map(async (tc) => ({
        role: "tool" as const,
        tool_call_id: tc.id,
        content: await executeTool(
          tc.function.name,
          JSON.parse(tc.function.arguments) as Record<string, unknown>
        ),
      }))
    );

    history.push(...results);
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
      `TEMPLATE:\n${combinedWith.template}\n\nDATA:\n${JSON.stringify(combinedWith.data, null, 2)}`;
  }

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ],
  });

  return response.choices[0].message.content ?? "";
}
