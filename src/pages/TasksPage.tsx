import { useRef, useState, type FormEvent } from "react";

import { TASKS_KEY, isKanbanTask, type KanbanTask, type TaskStatus, type TaskPriority } from "../lib/workspaceData";
import { useSavedList } from "../lib/planning";
type TaskDraft = Omit<KanbanTask, "id">;
const columns = [
  { id: "todo", title: "To Do" },
  { id: "progress", title: "In Progress" },
  { id: "done", title: "Done" },
] as const;

function emptyDraft(status: TaskStatus = "todo"): TaskDraft {
  return {
    title: "",
    description: "",
    category: "",
    priority: "Medium",
    status,
  };
}

function TasksPage() {
  const { items: tasks, save: updateTasks, error: storageError, blocked } = useSavedList(TASKS_KEY, isKanbanTask);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<number | null>(
    null
  );
  const [draft, setDraft] = useState<TaskDraft>(() => emptyDraft());
  const [titleError, setTitleError] = useState("");


  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  const categories = [
    ...new Set(tasks.map((task) => task.category)),
  ].filter(Boolean);

  function openTaskForm(status: TaskStatus = "todo") {
    setEditingId(null);
    setDraft(emptyDraft(status));
    setTitleError("");
    dialogRef.current?.showModal();
    titleRef.current?.focus();
  }

  function editTask(task: KanbanTask) {
    setEditingId(task.id); setDraft({ ...task }); setTitleError("");
    dialogRef.current?.showModal(); titleRef.current?.focus();
  }

  function closeTaskForm() {
    dialogRef.current?.close();
  }

  function saveTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const title = draft.title.trim();

    if (!title) {
      setTitleError("Enter a task name.");
      titleRef.current?.focus();
      return;
    }

    const newTask: KanbanTask = {
      ...draft,
      id: editingId ?? (tasks.reduce((maxId, task) => Math.max(maxId, task.id), 0) + 1),
      title,
      description: draft.description?.trim(),
      category: draft.category.trim() || "Bez kategorii",
    };

    if (!Number.isSafeInteger(newTask.id)) { setTitleError("Unable to create a task ID."); return; }
    if (updateTasks(editingId === null ? [...tasks, newTask] : tasks.map((task) => task.id === editingId ? newTask : task))) closeTaskForm();
  }

  function moveTask(status: TaskStatus) {
    if (draggedTaskId === null) return;

    updateTasks(
      tasks.map((task) =>
        task.id === draggedTaskId
          ? { ...task, status }
          : task
      )
    );

    setDraggedTaskId(null);
  }

  return (
    <div className="tasks-page">
      <div className="tasks-page-header">
        <div>
          <h1>Tasks</h1>
          <p>Manage your work and stay focused.</p>
        </div>

        <button
          type="button"
          className="primary-action" disabled={blocked}
          onClick={() => openTaskForm()}
        >
          + Add Task
        </button>
      </div>

      {storageError && (
        <p className="task-form-error" role="alert">
          {storageError}
        </p>
      )}

      <div className="kanban-board">
        {columns.map((column) => {
          const columnTasks = tasks.filter(
            (task) => task.status === column.id
          );

          return (
            <section
              key={column.id}
              className="kanban-column"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                moveTask(column.id);
              }}
            >
              <div className="kanban-column-header">
                <h2>{column.title}</h2>
                <span className="task-count">
                  {columnTasks.length}
                </span>
              </div>

              <div className="kanban-task-list">
                {columnTasks.map((task) => (
                  <article
                    key={task.id}
                    className="kanban-card"
                    draggable
                    onDragStart={(event) => {
                      setDraggedTaskId(task.id);
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData(
                        "text/plain",
                        String(task.id)
                      );
                    }}
                    onDragEnd={() => setDraggedTaskId(null)}
                  >
                    <div className="kanban-card-top">
                      <span className="task-category">
                        {task.category}
                      </span>

                      <span
                        className={`priority priority-${task.priority.toLowerCase()}`}
                      >
                        {task.priority}
                      </span>
                    </div>

                    <h3>{task.title}</h3>

                    {task.description && (
                      <p className="task-description">
                        {task.description}
                      </p>
                    )}

                    <div className="kanban-card-footer">
                      <span>DEV-{task.id}</span>
                      <button type="button" disabled={blocked} aria-label={`Edit task: ${task.title}`} onClick={() => editTask(task)}>Edit</button>
                    </div>
                  </article>
                ))}
              </div>

              <button
                type="button"
                className="add-column-task"
                onClick={() => openTaskForm(column.id)}
              >
                + Add task
              </button>
            </section>
          );
        })}
      </div>

      <dialog
        ref={dialogRef}
        className="task-dialog"
        aria-labelledby="task-dialog-title"
      >
        <form
          className="task-form"
          onSubmit={saveTask}
          noValidate
        >
          <div className="task-dialog-header">
            <div>
              <h2 id="task-dialog-title">{editingId === null ? "Add a new task" : "Edit task"}</h2>
              <p>Plan your next step.</p>
            </div>

            <button
              type="button"
              className="task-dialog-close"
              aria-label="Close task form"
              onClick={closeTaskForm}
            >
              ×
            </button>
          </div>

          <label className="task-field" htmlFor="task-title">
            Task name
            <span className="task-required">Required</span>

            <input
              ref={titleRef}
              id="task-title"
              type="text"
              required
              maxLength={160}
              placeholder="e.g. Finish my portfolio"
              value={draft.title}
              aria-invalid={Boolean(titleError)}
              aria-describedby={
                titleError ? "task-title-error" : undefined
              }
              onChange={(event) => {
                setDraft({
                  ...draft,
                  title: event.target.value,
                });
                setTitleError("");
              }}
            />
          </label>

          {titleError && (
            <p
              id="task-title-error"
              className="task-form-error"
              role="alert"
            >
              {titleError}
            </p>
          )}

          <label
            className="task-field"
            htmlFor="task-description"
          >
            Description
            <span className="task-optional">Optional</span>

            <textarea
              id="task-description"
              rows={4}
              maxLength={2000}
              placeholder="Add details about this task..."
              value={draft.description ?? ""}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  description: event.target.value,
                })
              }
            />
          </label>

          <div className="task-form-row">
            <label
              className="task-field"
              htmlFor="task-category"
            >
              Category

              <input
                id="task-category"
                type="text"
                list="task-categories"
                placeholder="np. Praca, Nauka, Dom"
                maxLength={40}
                value={draft.category}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    category: event.target.value,
                  })
                }
              />

              <datalist id="task-categories">
                {categories.map((category) => (
                  <option key={category} value={category} />
                ))}
              </datalist>
            </label>

            <label
              className="task-field"
              htmlFor="task-priority"
            >
              Priority

              <select
                id="task-priority"
                value={draft.priority}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    priority: event.target.value as TaskPriority,
                  })
                }
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </label>

            <label className="task-field" htmlFor="task-status">
              Status

              <select
                id="task-status"
                value={draft.status}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    status: event.target.value as TaskStatus,
                  })
                }
              >
                {columns.map((column) => (
                  <option key={column.id} value={column.id}>
                    {column.title}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {storageError && <p className="task-form-error" role="alert">{storageError}</p>}
          <div className="task-dialog-actions">
            <button
              type="button"
              className="task-cancel"
              onClick={closeTaskForm}
            >
              Cancel
            </button>

            <button type="submit" className="primary-action" disabled={blocked}>
              {editingId === null ? "Save task" : "Save changes"}
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}

export default TasksPage;

