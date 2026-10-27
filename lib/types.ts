// Shared TypeScript types, kept in one place so every file that works with
// tasks (the homepage, the API route, and anything added later) agrees on
// exactly what a task looks like.

// A TypeScript "interface" describes the shape of an object: which fields it has
// and what kind of value each one holds. Any task missing a field, or with a
// wrong value, gets flagged by the editor before the code ever runs.
// "export" lets other files import it.
export interface Task {
  id: number;
  title: string;
  // Only these four words are allowed. A typo like "doen" is caught as an error.
  status: "todo" | "doing" | "done" | "blocked";
  // 1 is the most urgent, 3 the least. Only 1, 2 or 3 are allowed.
  priority: 1 | 2 | 3;
  // Only the three people in the family. Jeff and Ana are the adults; Tiny is
  // the child, who only gets certain kid-sized tasks (none in this week's list).
  assignee: "Jeff" | "Ana" | "Tiny";
  // The day the task was created, written as "YYYY-MM-DD" (e.g. "2026-10-21").
  // Dates in this format sort correctly as plain text, earliest first.
  createdAt: string;
  // The day the task was finished, in the same format. The "?" means it's
  // optional: only finished tasks have one. It's filled in automatically when
  // the status changes to "done", and removed if it changes back.
  finishedAt?: string;
  // Why the task is blocked, e.g. "Waiting on the grocery list". Only blocked
  // tasks have one; it's removed when the task is unblocked.
  blockedReason?: string;
}

// The parts of a task that can be changed after it's created (with PUT
// /api/tasks/[id]). Every field is optional: send only what's changing.
export interface TaskChanges {
  title?: string;
  status?: Task["status"];
  blockedReason?: string;
}
