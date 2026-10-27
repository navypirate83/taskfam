// "use client" makes this a client component: its code is also sent to the
// visitor's browser, so it can respond to clicks. It must come before any
// imports or other code (comments like these are fine). Only this file (and
// whatever it imports) becomes client code; the page that uses it stays a
// server component.
"use client";

// React "hooks":
// - useState remembers a value (like which filter is picked) and redraws the
//   component whenever that value changes.
// - useEffect runs code after the component appears on screen (here: reading
//   and saving localStorage, the browser's small built-in storage).
// - useRef remembers a value WITHOUT redrawing when it changes.
import { useEffect, useRef, useState } from "react";
// The shared types: a task, and the parts of one that can be changed.
import type { Task, TaskChanges } from "@/lib/types";
// The form for creating a new task.
import AddTaskForm from "./AddTaskForm";
// The two ways of showing the tasks: rows, or columns by status.
import TaskBoard from "./TaskBoard";
import TaskList from "./TaskList";
// The /tasks page's scoped styles (used here for the buttons). A client
// component can import a CSS Module the same way a server component can.
import styles from "./page.module.css";

// The allowed choices for each control. Writing them as types means a typo
// like "doen" or "bord" is flagged as an error.
type Filter = "all" | "todo" | "doing" | "blocked" | "done";
type Sort = "priority" | "due" | "recent" | "manual";
type View = "list" | "board";

// The buttons in each group: the value it sets, and the text on the button.
// Keeping them in lists means the buttons are drawn by one bit of code below.
const filterOptions: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "todo", label: "To do" },
  { value: "doing", label: "Doing" },
  { value: "blocked", label: "Blocked" },
  { value: "done", label: "Done" },
];

const sortOptions: { value: Sort; label: string }[] = [
  { value: "priority", label: "Priority" },
  { value: "due", label: "Due" },
  { value: "recent", label: "Recent" },
  // "Manual" keeps the order you've dragged the rows into.
  { value: "manual", label: "Manual" },
];

// The name the task list is saved under in localStorage. Each site has its own
// localStorage, and this key keeps our list separate from anything else saved.
const STORAGE_KEY = "taskfam.tasks";
// The name the chosen sort ("priority", "manual", …) is saved under.
const SORT_KEY = "taskfam.sort";

const viewOptions: { value: View; label: string }[] = [
  { value: "list", label: "List" },
  { value: "board", label: "Board" },
];

// Returns the tasks to show: first keeps only the ones matching the filter,
// then puts them in order. It never changes the original list, it builds a new one.
function applyFilterAndSort(tasks: Task[], filter: Filter, sort: Sort): Task[] {
  // .filter() makes a new list of only the tasks that pass the test.
  // "all" lets every task through; otherwise the status must match.
  const filtered = tasks.filter((task) => filter === "all" || task.status === filter);

  // "manual": keep the tasks in the order they're stored (the dragged order).
  if (sort === "manual") return filtered;

  // .sort() reorders a list using a compare function: a negative result puts
  // "a" first, a positive one puts "b" first. It's safe to sort "filtered"
  // directly because it's already a new list, not the original.
  return filtered.sort((a, b) => {
    if (sort === "priority") {
      // Lower number = more urgent, so 1 comes first. Ties go by id.
      return a.priority - b.priority || a.id - b.id;
    }
    if (sort === "due") {
      // The "Due" button sorts by the finish date (finishedAt): most recently
      // finished first. Tasks that aren't finished yet have no finishedAt, so
      // they go after all the finished ones (in id order).
      if (a.finishedAt && b.finishedAt) {
        // Comparing b to a (not a to b) puts the later date first.
        return b.finishedAt.localeCompare(a.finishedAt) || a.id - b.id;
      }
      if (a.finishedAt) return -1; // only a is finished: a first
      if (b.finishedAt) return 1; // only b is finished: b first
      return a.id - b.id; // neither is finished
    }
    // "recent": newest created first. "YYYY-MM-DD" text sorts the same as the
    // dates, and comparing b to a puts the later date first.
    return b.createdAt.localeCompare(a.createdAt) || a.id - b.id;
  });
}

// Describes what this component accepts ("props"): a "tasks" list, where
// every item must be a Task. Passing anything else is flagged as an error.
interface TaskViewProps {
  tasks: Task[];
}

// Shows the add form, the controls and the tasks. The server page fetches the
// tasks and hands them in as a prop; this component keeps its own copy it can
// change (add, rename, delete, reorder), saves that copy in localStorage,
// filters and sorts it, and hands the result to TaskList or TaskBoard.
export default function TaskView({ tasks }: TaskViewProps) {
  // The task list this page works with. It starts as the server's list; the
  // effects below may replace it with the copy saved in localStorage.
  const [allTasks, setAllTasks] = useState<Task[]>(tasks);

  // The three choices, each remembered by its own useState hook. The value in
  // brackets is the starting choice; calling the "set" function changes it.
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("priority");
  const [view, setView] = useState<View>("list");

  // A message shown above the tasks when renaming or deleting fails.
  const [actionError, setActionError] = useState<string | null>(null);

  // Whether we've read localStorage yet. It's a ref (not state) because
  // changing it shouldn't redraw anything; it only guards the save effect.
  const hasLoaded = useRef(false);

  // --- Saving to and reading from localStorage --------------------------------
  // The ORDER of these two effects matters. React runs effects in the order
  // they're written, so this "save" effect runs before the "read" one below.
  // On the very first run hasLoaded is still false, so it skips saving; that
  // stops it from overwriting the saved list with the server's list before the
  // saved list has been read.

  // Effect 1 (save): whenever the tasks or the sort choice change, write them
  // to localStorage as text (JSON.stringify turns the list into a string).
  useEffect(() => {
    if (!hasLoaded.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allTasks));
      localStorage.setItem(SORT_KEY, sort);
    } catch {
      // Storage can be full or switched off (e.g. some private windows).
      // The page still works; changes just won't survive a refresh.
    }
  }, [allTasks, sort]);

  // Effect 2 (read): once, when the page first appears, load the saved list if
  // there is one. This has to happen in an effect (after the page appears)
  // because localStorage only exists in the browser, not on the server.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        // The project's lint rules discourage calling setState inside an
        // effect (it causes an extra redraw). Here that's the point: we're
        // copying outside data (localStorage) into React once, on mount.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setAllTasks(JSON.parse(saved));
      }

      // The saved sort choice, but only if it's one of our options (a typo or
      // old value is ignored and the default, Priority, stays).
      const savedSort = localStorage.getItem(SORT_KEY);
      if (sortOptions.some((option) => option.value === savedSort)) {
        // Copying outside data into React once, on mount, like the tasks above.
        setSort(savedSort as Sort);
      }
    } catch {
      // Unreadable or damaged saved data: keep the server's list instead.
    }
    hasLoaded.current = true;

    // Cleanup: in development React runs effects twice to catch bugs. Resetting
    // the flag here makes the second run behave exactly like the first, so the
    // save effect still can't overwrite the saved list early.
    return () => {
      hasLoaded.current = false;
    };
  }, []);

  // The tasks to show right now. This runs again every time a choice changes.
  const visibleTasks = applyFilterAndSort(allTasks, filter, sort);

  // --- Changing tasks ------------------------------------------------------------

  // A new task was created by AddTaskForm: add it to the end of the list.
  // "prev => [...prev, task]" builds a new list (React needs a new list, not a
  // changed old one, to notice the change).
  function handleAdd(task: Task) {
    setAllTasks((prev) => [...prev, task]);
  }

  // Save changes to a task through the API (PUT): a new title, a new status,
  // or a new status with a blocked reason. Returns true if it worked, so the
  // row knows whether to close its edit box.
  async function handleUpdate(id: number, changes: TaskChanges): Promise<boolean> {
    setActionError(null);
    try {
      // "PUT" means "replace/update something". The body says what to change.
      const response = await fetch(`/api/tasks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
      if (!response.ok) {
        // 404 happens if the server forgot this task (e.g. it restarted, but
        // the browser still has it saved).
        setActionError(
          response.status === 404
            ? "Couldn't save: the server doesn't have this task any more."
            : `Couldn't save (error ${response.status}).`,
        );
        return false;
      }
      // Success: swap the old task for the server's updated one. The server's
      // copy includes anything it filled in, like the finish date for "done".
      // .map() builds a new list where only the matching task is replaced.
      const updated: Task = await response.json();
      setAllTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      return true;
    } catch {
      setActionError("Couldn't save: the server isn't reachable.");
      return false;
    }
  }

  // Delete a task through the API (DELETE).
  async function handleDelete(id: number) {
    setActionError(null);
    try {
      const response = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      if (!response.ok) {
        setActionError(
          response.status === 404
            ? "Couldn't delete: the server doesn't have this task any more."
            : `Couldn't delete (error ${response.status}).`,
        );
        return;
      }
      // Success (204): build a new list without that task.
      setAllTasks((prev) => prev.filter((t) => t.id !== id));
    } catch {
      setActionError("Couldn't delete: the server isn't reachable.");
    }
  }

  // A row was dragged onto another row: move it to that row's place.
  // The new order starts from what's on screen right now (filtered and
  // sorted), so the list doesn't jump around. Tasks hidden by the filter keep
  // their order and go after the visible ones. Then we switch to "Manual" so
  // the dragged order is what you see.
  function handleReorder(draggedId: number, targetId: number) {
    const order = [...visibleTasks];
    const from = order.findIndex((t) => t.id === draggedId);
    const to = order.findIndex((t) => t.id === targetId);
    if (from === -1 || to === -1) return;
    // Take the dragged task out, then put it back in at the target's position.
    const [moved] = order.splice(from, 1);
    order.splice(to, 0, moved);
    const hidden = allTasks.filter((t) => !order.includes(t));
    setAllTasks([...order, ...hidden]);
    setSort("manual");
  }

  // Draws one row of buttons (e.g. the filter buttons). "options" are the
  // buttons, "current" is the one that's picked, and "onPick" is what to do
  // when one is clicked. The <T extends string> part lets the same function
  // work for all three groups while keeping each group's exact choices.
  function renderGroup<T extends string>(
    label: string,
    options: { value: T; label: string }[],
    current: T,
    onPick: (value: T) => void,
  ) {
    return (
      // role="group" with aria-label tells screen readers these buttons belong
      // together, e.g. "Filter, group".
      <div className={styles.group} role="group" aria-label={label}>
        <span className={styles.groupLabel}>{label}</span>
        {options.map((option) => {
          const active = option.value === current;
          return (
            <button
              key={option.value}
              type="button"
              // The picked button gets an extra class for its distinct look.
              className={active ? `${styles.option} ${styles.active}` : styles.option}
              // aria-pressed tells screen readers whether this button is the picked one.
              aria-pressed={active}
              onClick={() => onPick(option.value)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <>
      {/* The form for adding a task. It calls handleAdd with the new task. */}
      <AddTaskForm onAdd={handleAdd} />

      {/* The three groups of buttons, above the tasks. */}
      <div className={styles.controls}>
        {renderGroup("Filter", filterOptions, filter, setFilter)}
        {renderGroup("Sort", sortOptions, sort, setSort)}
        {renderGroup("View", viewOptions, view, setView)}
      </div>

      {/* A rename or delete went wrong. role="alert" makes screen readers
          announce it right away. "&&" means: only show it if there is one. */}
      {actionError && (
        <p role="alert" className={styles.error}>
          {actionError}
        </p>
      )}

      {/* Show a message if the filter hides everything; otherwise pass the
          filtered, sorted tasks to the list or the board. */}
      {visibleTasks.length === 0 ? (
        <p className={styles.empty}>No tasks match this filter.</p>
      ) : view === "list" ? (
        // List view: one row per task, in the chosen order, with the
        // status, rename, delete and drag-to-reorder actions.
        <TaskList
          tasks={visibleTasks}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onReorder={handleReorder}
        />
      ) : (
        // Board view: three columns (To do, In progress, Done). Changing a
        // card's status moves it to the matching column.
        <TaskBoard tasks={visibleTasks} onUpdate={handleUpdate} />
      )}
    </>
  );
}
