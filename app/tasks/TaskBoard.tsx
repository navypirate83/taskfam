// "use client" marks this as a client component. It's only ever used inside
// TaskView, which is already a client component, so it would be one anyway;
// the line just makes that obvious when reading this file on its own.
"use client";

// Next.js's link component: moves between pages without a full page reload.
import Link from "next/link";
// The shared types: a task, and the parts of one that can be changed.
import type { Task, TaskChanges } from "@/lib/types";
// Shared wording for priorities.
import { priorityLabels } from "@/lib/task-labels";
// The status dropdown (with the "What's blocking it?" box).
import StatusPicker from "./StatusPicker";
// This component's own styles. A "CSS Module" gives every class a unique name,
// so these styles only affect this component.
import styles from "./TaskBoard.module.css";

// The three columns, left to right: a title and which statuses go in it.
// There are four statuses but only three columns, so "blocked" tasks share the
// "To do" column (they haven't been started); their red status and reason show why.
const columns: { title: string; statuses: Task["status"][] }[] = [
  { title: "To do", statuses: ["todo", "blocked"] },
  { title: "In progress", statuses: ["doing"] },
  { title: "Done", statuses: ["done"] },
];

// Describes what this component accepts ("props"): a list of tasks, and the
// function from TaskView that saves a change (here: a new status).
interface TaskBoardProps {
  tasks: Task[];
  onUpdate: (id: number, changes: TaskChanges) => Promise<boolean>;
}

// Board view: three columns side by side, each holding the cards for its
// statuses. Within a column, cards keep the order TaskView sorted them into.
// Changing a card's status saves it, and the card moves to its new column.
export default function TaskBoard({ tasks, onUpdate }: TaskBoardProps) {
  return (
    <div className={styles.board}>
      {columns.map((column) => {
        // The tasks whose status belongs in this column.
        const columnTasks = tasks.filter((task) => column.statuses.includes(task.status));

        return (
          <section key={column.title} className={styles.column}>
            {/* Column title with a count, e.g. "In progress (1)". */}
            <h2 className={styles.columnHeading}>
              {column.title} <span>({columnTasks.length})</span>
            </h2>

            {columnTasks.length === 0 ? (
              <p className={styles.empty}>Nothing here.</p>
            ) : (
              columnTasks.map((task) => (
                // One card per task. <article> marks a self-contained piece of
                // content; "key" lets React tell the cards apart.
                <article key={task.id} className={styles.card}>
                  {/* The title links to this task's own page, e.g. /tasks/1.
                      The link sits inside the <h3> so it's still a heading.
                      prefetch={false} stops Next.js from loading that page in
                      the background ahead of time; it only loads when clicked. */}
                  <h3 className={styles.title}>
                    <Link href={`/tasks/${task.id}`} prefetch={false} className={styles.titleLink}>
                      {task.title}
                    </Link>
                  </h3>
                  {/* The status, as a dropdown you can change. Picking
                      Blocked asks for a reason first. */}
                  <StatusPicker task={task} onChange={onUpdate} />
                  {/* "&&" means: only show this when the task is blocked and
                      has a reason. */}
                  {task.status === "blocked" && task.blockedReason && (
                    <p className={styles.reason}>Blocked: {task.blockedReason}</p>
                  )}
                  {/* Priority and assignee, each with a small label above it. */}
                  <dl className={styles.meta}>
                    <div>
                      <dt>Priority</dt>
                      <dd>{priorityLabels[task.priority]}</dd>
                    </div>
                    <div>
                      <dt>Assignee</dt>
                      <dd>{task.assignee}</dd>
                    </div>
                  </dl>
                </article>
              ))
            )}
          </section>
        );
      })}
    </div>
  );
}
