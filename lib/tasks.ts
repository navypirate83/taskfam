// The one place the task data lives, plus small helpers to change it. The API
// routes (/api/tasks and /api/tasks/[id]) and the /tasks page all use this file.
//
// The list is kept "in memory": it lives only while the server is running.
// Restarting the server (or, in development, some code reloads) puts it back
// to the four starting tasks. A real app would use a database instead.

// The shared Task type. "import type" brings in only the type (used for checking
// while you write code); nothing extra ends up in the running app.
// "@/" is the import alias from tsconfig.json and means "the project folder".
import type { Task, TaskChanges } from "@/lib/types";

// This week's tasks. "export" lets the API routes add to and change this list.
// It's a "const" because the list itself is never swapped for a new one; only
// its contents change (tasks are added, edited or removed in place).
export const tasks: Task[] = [
  { id: 1, title: "Fold laundry", status: "doing", priority: 2, assignee: "Ana", createdAt: "2026-10-22" },
  { id: 2, title: "Empty dishwasher", status: "todo", priority: 1, assignee: "Jeff", createdAt: "2026-10-26" },
  { id: 3, title: "Shopping", status: "blocked", priority: 1, assignee: "Jeff", createdAt: "2026-10-24", blockedReason: "Waiting on the grocery list" },
  { id: 4, title: "Vacuum", status: "done", priority: 3, assignee: "Ana", createdAt: "2026-10-20", finishedAt: "2026-10-25" },
];

// Hands back the task list. It's "async" (it returns a Promise you "await")
// even though the data is right here, so that later we can swap in a real
// database without changing any code that calls it.
// "Promise<Task[]>" means "eventually gives you a list of Task objects".
export async function getTasks(): Promise<Task[]> {
  return tasks;
}

// Builds a brand-new task (it doesn't add it to the list; the caller does).
// Only the title and assignee are required; everything else gets a sensible
// starting value.
export function newTask(input: {
  title: string;
  assignee: Task["assignee"];
  status?: Task["status"];
  priority?: Task["priority"];
}): Task {
  // The next id is one more than the biggest id so far, so ids never repeat.
  // .reduce() walks the list keeping the largest id it has seen (starting at 0).
  const nextId = tasks.reduce((max, task) => Math.max(max, task.id), 0) + 1;

  return {
    id: nextId,
    title: input.title,
    // "??" means "use the value on the left, unless it's missing".
    status: input.status ?? "todo",
    priority: input.priority ?? 2,
    assignee: input.assignee,
    createdAt: todayAsText(),
  };
}

// Today's date as "YYYY-MM-DD", using the computer's own time zone (not UTC,
// which can already be "tomorrow" in the evening). getMonth() counts from 0,
// so January is 0 and we add 1. padStart(2, "0") turns "7" into "07".
function todayAsText(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

// Changes a task's title and/or status. Returns the updated task, or undefined
// if there's no task with that id (the caller turns that into a 404).
// Each change is optional ("?"): only what's passed in gets changed.
export function updateTask(id: number, changes: TaskChanges): Task | undefined {
  // .find() returns the matching task itself (not a copy), so changing it here
  // changes it in the list too.
  const task = tasks.find((t) => t.id === id);
  if (!task) return undefined;

  if (changes.title !== undefined) {
    task.title = changes.title;
  }

  // A real status change (not just picking the same one again).
  if (changes.status !== undefined && changes.status !== task.status) {
    task.status = changes.status;
    // Finishing a task records today as its finish date; moving it out of
    // "done" removes the date ("delete" removes a field from an object).
    if (task.status === "done") {
      task.finishedAt = todayAsText();
    } else {
      delete task.finishedAt;
    }
  }

  // Only blocked tasks keep a reason; any other status drops it.
  if (task.status === "blocked") {
    if (changes.blockedReason !== undefined) task.blockedReason = changes.blockedReason;
  } else {
    delete task.blockedReason;
  }

  return task;
}

// Removes the task with this id from the list. Returns true if one was
// removed, false if there was no task with that id.
export function deleteTask(id: number): boolean {
  // .findIndex() gives the task's position in the list, or -1 if not found.
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return false;
  // .splice(index, 1) cuts one item out of the list at that position.
  tasks.splice(index, 1);
  return true;
}
