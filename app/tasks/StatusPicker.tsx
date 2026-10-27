// "use client": this dropdown reacts to changes, so it runs in the browser.
// It's used inside TaskList and TaskBoard (both client components).
"use client";

// useState remembers whether we're asking for a blocked reason, and what's typed.
import { useState } from "react";
// The shared types: a task, and the parts of one that can be changed.
import type { Task, TaskChanges } from "@/lib/types";
// Shared wording for statuses ("To do", "Doing", …).
import { statusLabels } from "@/lib/task-labels";
// This component's own styles (a CSS Module, so they only affect it).
import styles from "./StatusPicker.module.css";

// What this component accepts: the task, and a function from TaskView that
// saves the change through the API. It resolves to true if the save worked.
interface StatusPickerProps {
  task: Task;
  onChange: (id: number, changes: TaskChanges) => Promise<boolean>;
}

// The statuses in the order they appear in the dropdown.
const statusOrder: Task["status"][] = ["todo", "doing", "blocked", "done"];

// A status dropdown for one task. Picking To do, Doing or Done saves right
// away. Picking Blocked first opens a small box asking what's blocking it,
// because a blocked task should say what it's waiting on.
export default function StatusPicker({ task, onChange }: StatusPickerProps) {
  // true while the "What's blocking it?" box is open.
  const [askingReason, setAskingReason] = useState(false);
  // What's typed in that box.
  const [reason, setReason] = useState("");
  // true while waiting for the server, so the controls can't be used twice.
  const [saving, setSaving] = useState(false);

  // Runs when a different status is picked in the dropdown.
  async function handlePick(status: Task["status"]) {
    if (status === "blocked") {
      // Don't save yet: ask for the reason first.
      setReason("");
      setAskingReason(true);
      return;
    }
    setAskingReason(false);
    setSaving(true);
    await onChange(task.id, { status });
    setSaving(false);
  }

  // Runs when the reason box is submitted (Save button or Enter).
  async function handleSaveReason(event: React.FormEvent<HTMLFormElement>) {
    // Stop the browser from reloading the page on submit.
    event.preventDefault();
    if (!reason.trim()) return;
    setSaving(true);
    const saved = await onChange(task.id, { status: "blocked", blockedReason: reason.trim() });
    setSaving(false);
    // Close the box only if it worked, so the typed reason isn't lost.
    if (saved) setAskingReason(false);
  }

  return (
    <div className={styles.picker}>
      {/* The dropdown. While the reason box is open it shows "Blocked", so
          it matches what you're in the middle of choosing. The extra class
          (e.g. styles.done) colors it like the status badges. */}
      <select
        className={`${styles.select} ${styles[askingReason ? "blocked" : task.status]}`}
        value={askingReason ? "blocked" : task.status}
        onChange={(event) => handlePick(event.target.value as Task["status"])}
        disabled={saving}
        aria-label={`Status of ${task.title}`}
      >
        {statusOrder.map((status) => (
          <option key={status} value={status}>
            {statusLabels[status]}
          </option>
        ))}
      </select>

      {/* The "What's blocking it?" box, only while choosing Blocked. Escape
          or Cancel closes it without changing anything. */}
      {askingReason && (
        <form className={styles.reasonForm} onSubmit={handleSaveReason}>
          <input
            className={styles.reasonInput}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") setAskingReason(false);
            }}
            placeholder="What's blocking it?"
            aria-label={`What's blocking ${task.title}?`}
            disabled={saving}
            // Put the cursor in the box straight away.
            autoFocus
          />
          <button type="submit" className={styles.button} disabled={saving || !reason.trim()}>
            Save
          </button>
          <button
            type="button"
            className={styles.button}
            onClick={() => setAskingReason(false)}
            disabled={saving}
          >
            Cancel
          </button>
        </form>
      )}
    </div>
  );
}
