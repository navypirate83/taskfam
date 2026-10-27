// No "use client": this is a server component. It runs on the server, fetches
// the task from our API, and sends finished HTML to the browser.

// Suspense shows a fallback (a "Loading…" message) while the part inside it
// is still waiting for data.
import { Suspense } from "react";
// headers() reads the incoming request, which tells us the site's own address.
import { headers } from "next/headers";
// Next.js's link component, for the "back" link.
import Link from "next/link";
// notFound() stops rendering and shows Next.js's 404 ("not found") page.
import { notFound } from "next/navigation";
// The shared Task type (what fields a task has).
import type { Task } from "@/lib/types";
// Shared wording for statuses and priorities (also used by TaskList and TaskBoard).
import { priorityLabels, statusLabels } from "@/lib/task-labels";

// Turns "2026-10-25" into "Sun, Oct 25". The language and time zone are fixed
// so the result is always the same, wherever the server runs.
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

// Fetches one task from our own API route (/api/tasks/[id]). On the server,
// fetch needs a full address ("http://host:port/..."), not just "/api/...".
// Instead of writing "localhost:3000" into the code (that port is taken by
// another app on this computer), we read the address this request came in on,
// so it works on whatever port the app is running.
async function getTask(id: string): Promise<Task> {
  const requestHeaders = await headers();
  // "host" is e.g. "localhost:3001". "x-forwarded-proto" is "https" when the
  // site sits behind a hosting service; locally it's missing, so use "http".
  const host = requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  // encodeURIComponent makes the id safe to put in an address (e.g. spaces).
  const url = `${protocol}://${host}/api/tasks/${encodeURIComponent(id)}`;

  // If the request itself fails (the server can't be reached), show the 404 page.
  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    notFound();
  }

  // If the API answered with an error (like 404 for an unknown id), also show
  // the 404 page.
  if (!response.ok) {
    notFound();
  }

  // "as Task" tells TypeScript to treat the JSON as a Task. It's a promise we
  // make, not a check: TypeScript can't see what the server actually sent.
  return (await response.json()) as Task;
}

// The part of the page that needs the task. It waits for the address ("params"),
// fetches the task, and draws it.
async function TaskDetail({ params }: { params: PageProps<"/tasks/[id]">["params"] }) {
  // "params" is a Promise, so we wait for it before reading the id.
  const { id } = await params;
  const task = await getTask(id);

  return (
    // <article> marks a self-contained piece of content: this one task.
    <article>
      <header>
        <h1>{task.title}</h1>
      </header>

      {/* A description list (<dl>): each <dt> is a label, and the <dd> after
          it is that label's value. It's the right element for label/value pairs. */}
      <dl>
        <dt>Status</dt>
        <dd>
          {/* Reuses the colored pill styles from globals.css. */}
          <span className={`status-pill status-${task.status}`}>
            {statusLabels[task.status]}
          </span>
        </dd>

        {/* Only blocked tasks have a reason, so only show it for them.
            "&&" means: if there's a reason, draw what comes after it. */}
        {task.blockedReason && (
          <>
            <dt>Blocked because</dt>
            <dd>{task.blockedReason}</dd>
          </>
        )}

        <dt>Priority</dt>
        <dd>{priorityLabels[task.priority]}</dd>

        <dt>Assignee</dt>
        <dd>{task.assignee}</dd>

        {/* "Due" is the finish date, matching the "Due" sort on /tasks. <time>
            marks it as a date, with the machine-readable version in dateTime. */}
        <dt>Due</dt>
        <dd>
          {task.finishedAt ? (
            <time dateTime={task.finishedAt}>
              {dateFormatter.format(new Date(`${task.finishedAt}T00:00:00Z`))}
            </time>
          ) : (
            "Not finished yet"
          )}
        </dd>
      </dl>
    </article>
  );
}

// The /tasks/[id] page, e.g. /tasks/1. The address and the API response are
// only known when someone visits, so the page builds them on each request.
// Everything that waits for them sits inside <Suspense>, which Next.js requires
// for this kind of page (with Cache Components on, "next build" fails without it).
export default function TaskPage({ params }: PageProps<"/tasks/[id]">) {
  return (
    <main className="container">
      {/* Link back to the full list. "text-link" is the link style from
          globals.css (accent color and underline). */}
      <p>
        <Link href="/tasks" className="text-link">
          &larr; All tasks
        </Link>
      </p>

      <Suspense fallback={<p>Loading task…</p>}>
        <TaskDetail params={params} />
      </Suspense>
    </main>
  );
}
