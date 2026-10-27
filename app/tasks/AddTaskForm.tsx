// "use client": this form reacts to typing and clicks, so it runs in the browser.
"use client";

// useState remembers values between redraws (what's typed, whether we're
// busy, any error) and redraws the form whenever they change.
import { useState } from "react";
// The shared Task type (what fields a task has).
import type { Task } from "@/lib/types";
// Shared wording for priorities ("High", "Medium", "Low").
import { priorityLabels } from "@/lib/task-labels";
// This form's own styles (a CSS Module, so they only affect this form).
import styles from "./AddTaskForm.module.css";

// What this component accepts: "onAdd" is a function from the parent
// (TaskView). We call it with the new task so the parent can add it to the list.
interface AddTaskFormProps {
  onAdd: (task: Task) => void;
}

// A small form for creating a task: a title box, who it's for, how urgent it
// is, and a button.
export default function AddTaskForm({ onAdd }: AddTaskFormProps) {
  // What's typed in the title box. The box always shows this value, and every
  // keystroke updates it (a "controlled input").
  const [title, setTitle] = useState("");
  // Who the new task is for. Starts on Jeff, the first choice in the list.
  const [assignee, setAssignee] = useState<Task["assignee"]>("Jeff");
  // How urgent the new task is. Starts on 2 (Medium), the middle choice.
  const [priority, setPriority] = useState<Task["priority"]>(2);
  // true while we're waiting for the server, so we can disable the form.
  const [submitting, setSubmitting] = useState(false);
  // An error message to show under the form, or null for none.
  const [error, setError] = useState<string | null>(null);

  // Runs when the form is submitted (button click or Enter in the title box).
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    // Stop the browser's default form behavior, which would reload the page.
    event.preventDefault();
    // Ignore a title that's empty or only spaces.
    if (!title.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      // Send the new task to our API. "POST" means "create something".
      // The Content-Type header tells the server the body is JSON.
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, assignee, priority }),
      });

      // The server answered with an error (e.g. 400 for a missing title).
      if (!response.ok) {
        setError("Could not create task. Try again.");
        return;
      }

      // Success: the server sends back the new task (with its id and dates).
      // Hand it to the parent, then clear the title box for the next one.
      const created: Task = await response.json();
      onAdd(created);
      setTitle("");
    } catch {
      // fetch itself failed (e.g. the server isn't reachable).
      setError("Could not reach the server. Try again.");
    } finally {
      // Whatever happened, we're no longer waiting. "finally" always runs.
      setSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {/* The label is linked to the box by htmlFor/id, so clicking the label
          focuses the box and screen readers announce "New task title". It's
          visually hidden because the placeholder already says what to type. */}
      <label htmlFor="new-task-title" className={styles.srOnly}>
        New task title
      </label>
      <input
        id="new-task-title"
        className={styles.input}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="New task title"
        disabled={submitting}
      />

      {/* Who the task is for. The value comes back as plain text, so
          "as Task['assignee']" tells TypeScript it's one of the three names
          (it can only be, since those are the only options). */}
      <label htmlFor="new-task-assignee" className={styles.srOnly}>
        Assign to
      </label>
      <select
        id="new-task-assignee"
        className={styles.select}
        value={assignee}
        onChange={(event) => setAssignee(event.target.value as Task["assignee"])}
        disabled={submitting}
      >
        <option value="Jeff">Jeff</option>
        <option value="Ana">Ana</option>
        <option value="Tiny">Tiny</option>
      </select>

      {/* How urgent the task is. Option values are text ("1", "2", "3"), so
          Number(...) turns the picked one back into a number, and
          "as Task['priority']" tells TypeScript it's 1, 2 or 3. */}
      <label htmlFor="new-task-priority" className={styles.srOnly}>
        Priority
      </label>
      <select
        id="new-task-priority"
        className={styles.select}
        value={priority}
        onChange={(event) => setPriority(Number(event.target.value) as Task["priority"])}
        disabled={submitting}
      >
        <option value={1}>{priorityLabels[1]} priority</option>
        <option value={2}>{priorityLabels[2]} priority</option>
        <option value={3}>{priorityLabels[3]} priority</option>
      </select>

      {/* Disabled while saving, or while the title is empty. */}
      <button type="submit" className={styles.button} disabled={submitting || !title.trim()}>
        {submitting ? "Adding…" : "Add task"}
      </button>

      {/* Only shown when there's an error. role="alert" makes screen readers
          announce it right away. "&&" means: if there's an error, show this. */}
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </form>
  );
}
