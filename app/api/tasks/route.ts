// connection() tells Next.js "wait for a real visitor's request before running
// the rest". Without it, Next.js would run GET once while building the site and
// keep serving that saved answer, so newly added tasks would never show up in a
// production build.
import { connection } from "next/server";
// The task list and the helper that builds a new task.
// "@/" is the import alias from tsconfig.json and means "the project folder".
import { getTasks, newTask, tasks } from "@/lib/tasks";
// The shared Task type, used to check what's allowed in a new task.
import type { Task } from "@/lib/types";

// The three people a task can be assigned to. Used to check the request.
const assignees: Task["assignee"][] = ["Jeff", "Ana", "Tiny"];
// The allowed priorities: 1 (High), 2 (Medium), 3 (Low).
const priorities: Task["priority"][] = [1, 2, 3];

// GET /api/tasks: send back every task as JSON (a plain-text data format
// other programs can read).
export async function GET() {
  await connection();
  const allTasks = await getTasks();
  return Response.json(allTasks);
}

// POST /api/tasks: create a new task. The request body must be JSON like
// { "title": "Water plants", "assignee": "Ana", "priority": 1 } (priority is optional).
export async function POST(request: Request) {
  // Read the JSON body. If it isn't valid JSON, request.json() throws an error;
  // we catch it and answer 400 ("Bad Request") instead of crashing with a 500.
  let body: { title?: unknown; assignee?: unknown; priority?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Body must be JSON" }, { status: 400 });
  }

  // The title must be text with something in it besides spaces.
  // .trim() removes spaces from both ends.
  if (typeof body.title !== "string" || !body.title.trim()) {
    return Response.json({ error: "title required" }, { status: 400 });
  }

  // The assignee must be one of the three family members.
  // ".includes(... as ...)" checks the value is in the list above.
  if (!assignees.includes(body.assignee as Task["assignee"])) {
    return Response.json({ error: "assignee must be Jeff, Ana or Tiny" }, { status: 400 });
  }

  // The priority is optional (it defaults to Medium), but if it's sent it
  // must be 1, 2 or 3.
  if (body.priority !== undefined && !priorities.includes(body.priority as Task["priority"])) {
    return Response.json({ error: "priority must be 1, 2 or 3" }, { status: 400 });
  }

  // Build the task, add it to the end of the list, and send it back with
  // status 201 ("Created").
  const created = newTask({
    title: body.title.trim(),
    assignee: body.assignee as Task["assignee"],
    priority: body.priority as Task["priority"] | undefined,
  });
  tasks.push(created);
  return Response.json(created, { status: 201 });
}
