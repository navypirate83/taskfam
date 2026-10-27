// "use client" marks this as a client component. It's only ever used inside
// TaskView, which is already a client component, so it would be one anyway;
// the line just makes that obvious when reading this file on its own.
"use client";

// useState remembers which row is being edited and what's typed; useRef
// remembers it too, but without redrawing (used to avoid saving twice).
import { useRef, useState } from "react";
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
import styles from "./TaskList.module.css";

// Turns "2026-10-25" into "Sun, Oct 25". The language ("en-US") and time zone
// ("UTC") are fixed so the server and the browser always produce exactly the
// same text; if they differed, React would complain when the page loads.
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

function formatDate(date: string): string {
  return dateFormatter.format(new Date(`${date}T00:00:00Z`));
}

// Describes what this component accepts ("props"): the tasks to show, plus
// three functions from TaskView that actually change the list.
interface TaskListProps {
  tasks: Task[];
  // Save changes to a task (title or status); resolves to true if the server
  // saved them.
  onUpdate: (id: number, changes: TaskChanges) => Promise<boolean>;
  // Delete a task.
  onDelete: (id: number) => void;
  // Move the dragged task to where the target task is.
  onReorder: (draggedId: number, targetId: number) => void;
}

// List view: one horizontal row per task, in the order it's given (TaskView
// has already filtered and sorted them). Each row shows a status dot, the
// title (with the blocked reason under it, if any), a status dropdown, the
// priority, the due date, and View / Edit / Delete actions. Rows can be
// dragged onto each other to reorder them.
export default function TaskList({ tasks, onUpdate, onDelete, onReorder }: TaskListProps) {
  // Which task's title is being edited (only one at a time), or null for none.
  const [editingId, setEditingId] = useState<number | null>(null);
  // What's typed in the title box while editing.
  const [draft, setDraft] = useState("");
  // The same "which task is being edited" value, kept in a ref. Saving can be
  // triggered twice for one edit (pressing Enter, then the box losing focus as
  // it disappears), and a ref updates instantly, so the second call can see
  // the edit is already finished and do nothing.
  const editingRef = useRef<number | null>(null);

  // Enter edit mode for a task: show a text box filled with its current title.
  function startEditing(task: Task) {
    editingRef.current = task.id;
    setEditingId(task.id);
    setDraft(task.title);
  }

  // Leave edit mode without saving (Escape).
  function cancelEditing() {
    editingRef.current = null;
    setEditingId(null);
  }

  // Save the edit (pressing Enter, or clicking away from the box).
  async function saveEditing(task: Task) {
    // Already saved or cancelled: nothing to do.
    if (editingRef.current !== task.id) return;
    editingRef.current = null;

    const title = draft.trim();
    // Empty or unchanged: just close the box, no need to ask the server.
    if (!title || title === task.title) {
      setEditingId(null);
      return;
    }

    // Ask TaskView to save it. If that fails, stay in edit mode so the typed
    // text isn't lost (TaskView shows the error message).
    const saved = await onUpdate(task.id, { title });
    if (saved) {
      setEditingId(null);
    } else {
      editingRef.current = task.id;
    }
  }

  return (
    <ul className={styles.list}>
      {tasks.map((task) => {
        const isEditing = editingId === task.id;

        return (
          // "key" lets React tell the rows apart when they move around.
          // Drag and drop (built into the browser, no library):
          // - draggable makes the row something you can pick up (not while
          //   its title is being edited, so you can select text in the box).
          // - onDragStart: remember which task is being dragged.
          // - onDragOver: preventDefault() says "you may drop here"; without
          //   it the browser refuses the drop.
          // - onDrop: read which task was dragged and move it to this row.
          <li
            key={task.id}
            className={styles.row}
            draggable={!isEditing}
            onDragStart={(event) => event.dataTransfer.setData("text/plain", String(task.id))}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const draggedId = Number(event.dataTransfer.getData("text/plain"));
              if (draggedId && draggedId !== task.id) onReorder(draggedId, task.id);
            }}
          >
            {/* The colored dot, a quick visual hint of the status. Screen
                readers skip it (aria-hidden); they get the status from the
                dropdown instead. */}
            <span className={`${styles.dot} ${styles[task.status]}`} aria-hidden="true" />

            {/* The title cell: the title (or its edit box), plus the blocked
                reason underneath when the task is blocked. */}
            <div className={styles.titleCell}>
              {isEditing ? (
                // Edit mode: a small form with a text box. Submitting the form
                // (pressing Enter) saves; Escape cancels; clicking away saves.
                <form
                  className={styles.editForm}
                  onSubmit={(event) => {
                    // Stop the browser from reloading the page on submit.
                    event.preventDefault();
                    saveEditing(task);
                  }}
                >
                  <input
                    className={styles.editInput}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") cancelEditing();
                    }}
                    onBlur={() => saveEditing(task)}
                    aria-label={`New title for ${task.title}`}
                    // Put the cursor in the box straight away.
                    autoFocus
                  />
                </form>
              ) : (
                // Normal mode: the title as text. Double-click it to edit.
                // (It isn't a link, because the first click of a double-click
                // would already follow the link. The "View" link opens the page.)
                <span
                  className={styles.title}
                  onDoubleClick={() => startEditing(task)}
                  title="Double-click to edit"
                >
                  {task.title}
                </span>
              )}
              {/* "&&" means: only show this when the task is blocked and has a reason. */}
              {task.status === "blocked" && task.blockedReason && (
                <p className={styles.reason}>Blocked: {task.blockedReason}</p>
              )}
            </div>

            {/* Change the status here. Picking Blocked asks for a reason. */}
            <StatusPicker task={task} onChange={onUpdate} />

            <span className={styles.priority}>{priorityLabels[task.priority]}</span>

            {/* "Due" is the finish date, matching the "Due" sort button.
                Tasks that aren't finished yet show a dash instead. */}
            <span className={styles.due}>
              {task.finishedAt ? `Due ${formatDate(task.finishedAt)}` : "—"}
            </span>

            {/* The row's actions. Each aria-label names the task, so a screen
                reader says "Edit Fold laundry", not just "Edit". */}
            <span className={styles.actions}>
              {/* Opens this task's own page, e.g. /tasks/1. prefetch={false}
                  stops Next.js loading it in the background ahead of time. */}
              <Link
                href={`/tasks/${task.id}`}
                prefetch={false}
                className={styles.action}
                aria-label={`View ${task.title}`}
              >
                View
              </Link>
              <button
                type="button"
                className={styles.action}
                onClick={() => startEditing(task)}
                disabled={isEditing}
                aria-label={`Edit ${task.title}`}
              >
                Edit
              </button>
              <button
                type="button"
                className={`${styles.action} ${styles.danger}`}
                onClick={() => onDelete(task.id)}
                aria-label={`Delete ${task.title}`}
              >
                Delete
              </button>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
