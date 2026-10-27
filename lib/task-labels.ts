// Human-friendly words for task fields, shared by the /tasks components
// (TaskList and TaskBoard) so they always use the same wording.

// The shared Task type (what fields a task has).
import type { Task } from "@/lib/types";

// The words shown for each status, one for every allowed status.
// "Record<Task['status'], string>" means forgetting one is an error.
export const statusLabels: Record<Task["status"], string> = {
  todo: "To do",
  doing: "Doing",
  done: "Done",
  blocked: "Blocked",
};

// Plain-English names for the priority numbers.
export const priorityLabels: Record<Task["priority"], string> = {
  1: "High",
  2: "Medium",
  3: "Low",
};
