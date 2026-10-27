// "use client" makes this a client component: its code also runs in the
// visitor's browser, not just on the server. We need that because useState and
// useEffect (below) only work in the browser. It must come before any imports
// or other code (comments like these are fine).
"use client";

// React "hooks": useState remembers values between screen updates, and
// useEffect runs code after the page appears on screen.
import { useEffect, useState } from "react";
// Next.js's link component: moves between pages without a full page reload.
import Link from "next/link";
// The shared Task type (what fields a task has), now kept in lib/types.ts so
// the API route can use the same one. "import type" brings in only the type.
import type { Task } from "@/lib/types";

// The words shown on each status pill. "Record<Task['status'], string>" means
// "one label for every allowed status", so forgetting one is an error.
const statusLabels: Record<Task["status"], string> = {
  todo: "To do",
  doing: "Doing",
  done: "Done",
  blocked: "Blocked",
};

// Plain-English names for the priority numbers.
const priorityLabels: Record<Task["priority"], string> = {
  1: "High",
  2: "Medium",
  3: "Low",
};

// The home page, shown at "/". Next.js uses the function exported from page.tsx
// as the page, and whatever it returns is what appears on screen.
export default function Home() {
  // The task list. It starts empty ([]) and fills in once the fetch finishes.
  // Calling setTasks with new tasks makes React redraw the page with them.
  const [tasks, setTasks] = useState<Task[]>([]);
  // true until the first fetch finishes. When the page fetches again later
  // (for example, coming back from About), the cards already on screen stay
  // visible until the new ones arrive, instead of flashing a loading message.
  const [loading, setLoading] = useState(true);
  // The error text if the fetch fails; null means "no error".
  const [error, setError] = useState<string | null>(null);

  // Fetch the tasks from our API route once, right after the page first
  // appears ("on mount"). The empty [] at the end means "run this only once".
  useEffect(() => {
    // An AbortController lets us cancel the request if the page goes away
    // before it finishes, so we never update a page that's no longer there.
    const controller = new AbortController();

    // useEffect can't be "async" itself, so the waiting happens in this
    // helper function, which we call straight away below.
    async function loadTasks() {
      try {
        // Ask our own API for the tasks. "await" pauses here until the server replies.
        const response = await fetch("/api/tasks", { signal: controller.signal });
        // fetch only fails on its own for network problems, so we also treat
        // error replies (like 404 Not Found or 500 Server Error) as failures.
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }
        // Turn the JSON text back into a list of tasks and store it.
        setTasks(await response.json());
        // Clear any error left over from an earlier failed attempt, so the
        // fresh tasks show instead of an old error message.
        setError(null);
      } catch (err) {
        // If we cancelled the request ourselves, that's not a real error.
        if (controller.signal.aborted) return;
        // Otherwise remember the error text so it can be shown on the page.
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        // Whether it worked or not, we're no longer waiting. "finally" always runs.
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadTasks();

    // Cleanup: React runs this when the page goes away, which cancels the
    // request if it's still in progress.
    return () => controller.abort();
  }, []);

  return (
    <>
      {/* Site header: product name and tagline across the top. */}
      <header className="site-header">
        <p className="brand">TaskFam</p>
        <p className="tagline">Happy wife, happy life or some shit.</p>
      </header>

      <main className="container">
        {/* Hero: the big headline section that says what the app is for. */}
        <section className="hero">
          <h1>Chores, sorted. Arguments, avoided.</h1>
          <p className="hero-subhead">
            TaskFam shows the whole household who&apos;s doing what this week, so
            nothing gets forgotten.
          </p>
          {/* The main call-to-action. It goes to /tasks, where the "add a
              task" form is at the top. It's a link (not a <button>) because it
              takes you to another page; it just keeps the button look. */}
          <Link href="/tasks" className="button-primary">
            Add a task
          </Link>
        </section>

        {/* This week's tasks, shown as a grid of cards. */}
        <section className="tasks" aria-labelledby="tasks-heading">
          <h2 id="tasks-heading">This week&apos;s tasks</h2>

          {/* Show exactly one of three things: a loading message while we wait,
              an error message if the fetch failed, or the task cards. */}
          {loading ? (
            <p className="tasks-message">Loading tasks…</p>
          ) : error ? (
            // role="alert" makes screen readers announce the error right away.
            <p className="tasks-message tasks-error" role="alert">
              Couldn&apos;t load tasks: {error}
            </p>
          ) : (
            /* .map() runs once per task and turns each one into a card.
                "key" tells React which card is which if the list changes. */
            <ul className="task-grid">
              {tasks.map((task) => (
                <li key={task.id} className="task-card">
                  <h3 className="task-title">{task.title}</h3>
                  {/* The pill gets two classes: "status-pill" for its shape and
                      e.g. "status-done" for its color. */}
                  <span className={`status-pill status-${task.status}`}>
                    {statusLabels[task.status]}
                  </span>
                  {/* Small details under the title: priority and who it's for. */}
                  <dl className="task-meta">
                    <div>
                      <dt>Priority</dt>
                      <dd>{priorityLabels[task.priority]}</dd>
                    </div>
                    <div>
                      <dt>Assignee</dt>
                      <dd>{task.assignee}</dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
