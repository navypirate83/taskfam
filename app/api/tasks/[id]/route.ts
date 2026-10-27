// The same data source the /api/tasks route uses, plus the helpers that
// change it. "@/" is the import alias from tsconfig.json and means "the project folder".
import { deleteTask, getTasks, updateTask } from "@/lib/tasks";
// The shared Task type, used to check which statuses are allowed.
import type { Task } from "@/lib/types";

// The four allowed statuses. Used to check the request.
const statuses: Task["status"][] = ["todo", "doing", "blocked", "done"];

// An API route for one task. The [id] folder name makes this a "dynamic"
// route: Next.js runs it for /api/tasks/1, /api/tasks/2 and so on, and passes
// whatever is in that part of the address as "id".
// "RouteContext<'/api/tasks/[id]'>" is a type Next.js provides automatically
// (no import needed); it says "params" holds an "id" that is a string.

// GET /api/tasks/[id]: send back one task, or a 404 if there's no such task.
export async function GET(_request: Request, { params }: RouteContext<"/api/tasks/[id]">) {
  // "params" is a Promise, so we wait for it before reading the id.
  const { id } = await params;

  // Everything in a web address is text, so "1" has to become the number 1
  // before it can match a task's id. Something like "abc" becomes NaN ("not a
  // number"), which matches no task, so it falls through to the 404 below.
  const taskId = Number(id);

  // .find() returns the first task whose id matches, or undefined if none does.
  const task = (await getTasks()).find((t) => t.id === taskId);

  // No match: send a 404 ("Not Found") status with a short error message.
  if (!task) {
    return Response.json({ error: `No task with id ${id}` }, { status: 404 });
  }

  // Found it: send the task as JSON (status 200, "OK", is the default).
  return Response.json(task);
}

// PUT /api/tasks/[id]: change a task's title and/or status. The request body
// must be JSON with at least one of them, like:
//   { "title": "Fold and put away laundry" }
//   { "status": "done" }
//   { "status": "blocked", "blockedReason": "Waiting on the grocery list" }
export async function PUT(request: Request, { params }: RouteContext<"/api/tasks/[id]">) {
  const { id } = await params;

  // Read the JSON body. If it isn't valid JSON, request.json() throws an error;
  // we catch it and answer 400 ("Bad Request") instead of crashing with a 500.
  let body: { title?: unknown; status?: unknown; blockedReason?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Body must be JSON" }, { status: 400 });
  }

  // There has to be something to change.
  if (body.title === undefined && body.status === undefined) {
    return Response.json({ error: "send a title and/or a status" }, { status: 400 });
  }

  // If a title is sent, it must be text with something in it besides spaces.
  if (body.title !== undefined && (typeof body.title !== "string" || !body.title.trim())) {
    return Response.json({ error: "title must not be empty" }, { status: 400 });
  }

  // If a status is sent, it must be one of the four allowed words.
  if (body.status !== undefined && !statuses.includes(body.status as Task["status"])) {
    return Response.json({ error: "status must be todo, doing, blocked or done" }, { status: 400 });
  }

  // Blocking a task needs a reason, so everyone knows what it's waiting on.
  const reason = typeof body.blockedReason === "string" ? body.blockedReason.trim() : "";
  if (body.status === "blocked" && !reason) {
    return Response.json({ error: "blockedReason required when blocking a task" }, { status: 400 });
  }

  // Change the task. updateTask gives back undefined if the id doesn't exist.
  // "?:" picks a value only if it was sent; otherwise "undefined" means
  // "leave this part as it is".
  const updated = updateTask(Number(id), {
    title: typeof body.title === "string" ? body.title.trim() : undefined,
    status: body.status as Task["status"] | undefined,
    blockedReason: reason || undefined,
  });
  if (!updated) {
    return Response.json({ error: `No task with id ${id}` }, { status: 404 });
  }

  // Send back the updated task so the page can show exactly what was saved.
  return Response.json(updated);
}

// DELETE /api/tasks/[id]: remove a task.
export async function DELETE(_request: Request, { params }: RouteContext<"/api/tasks/[id]">) {
  const { id } = await params;

  // deleteTask gives back false if there was no task with that id.
  if (!deleteTask(Number(id))) {
    return Response.json({ error: `No task with id ${id}` }, { status: 404 });
  }

  // 204 means "No Content": it worked, and there's nothing to send back.
  // (A 204 must have an empty body, hence "null".)
  return new Response(null, { status: 204 });
}
