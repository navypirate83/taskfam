// No "use client" at the top: this is a server component. It runs only on the
// server, which sends the finished HTML to the browser. That's why it can be
// "async" and wait for data before anything is shown, with no loading state.

// The TypeScript type for page info like the browser-tab title.
import type { Metadata } from "next";
// The shared Task type (what fields a task has).
import type { Task } from "@/lib/types";
// Reads the task list straight from its source. The docs say server components
// should do this rather than fetch our own /api/tasks route (that adds an extra
// trip over the network and breaks "next build", when no server is running).
import { getTasks } from "@/lib/tasks";
// The client component that draws the task cards.
import TaskView from "./TaskView";
// This page's own styles (a CSS Module, so they only affect this page).
import styles from "./page.module.css";

// This page's browser-tab title. Only server components can export this,
// which is one reason the page itself stays on the server.
export const metadata: Metadata = {
  title: "Tasks · TaskFam",
};

// The /tasks page. "async" lets it "await" the data: the server waits for the
// tasks, then passes them to TaskView, the client component that draws them.
export default async function TasksPage() {
  // "Task[]" makes sure what comes back is a list of Task objects.
  const tasks: Task[] = await getTasks();

  return (
    <main className="container">
      <h1 className={styles.heading}>All tasks</h1>
      {/* Hand the tasks to the client component as a prop. */}
      <TaskView tasks={tasks} />
    </main>
  );
}
