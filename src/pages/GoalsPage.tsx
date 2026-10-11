import { useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { GOALS_KEY, dateLabel, isGoal, todayKey, useSavedList, validDate, type Goal } from "../lib/planning";
import "./PlanningPages.css";

type Draft = { title: string; category: string; target: string; current: string; unit: string; deadline: string; notes: string };
const blank = (): Draft => ({ title: "", category: "Personal", target: "1", current: "0", unit: "steps", deadline: "", notes: "" });
export default function GoalsPage() {
  const { items, save, error: storageError, blocked } = useSavedList(GOALS_KEY, isGoal);
  const [filter, setFilter] = useState("active");
  const [draft, setDraft] = useState<Draft>(blank);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const first = useRef<HTMLInputElement>(null);
  const today = todayKey();
  const completed = items.filter((g) => g.current >= g.target);
  const overdue = items.filter((g) => g.current < g.target && g.deadline && g.deadline < today);
  const visible = items.filter((g) => filter === "all" || (filter === "completed" ? g.current >= g.target : filter === "overdue" ? overdue.includes(g) : g.current < g.target));
  const average = items.length ? Math.round(items.reduce((sum, g) => sum + g.current / g.target * 100, 0) / items.length) : 0;
  function open(goal?: Goal) {
    setEditingId(goal?.id ?? null);
    setDraft(goal ? { ...goal, target: String(goal.target), current: String(goal.current) } : blank());
    setError(""); setDeleting(false); dialog.current?.showModal(); first.current?.focus();
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    const target = Number(draft.target), current = Number(draft.current);
    if (!draft.title.trim()) { setError("Give your goal a name."); return; }
    if (!/^\d+$/.test(draft.target) || !Number.isSafeInteger(target) || target < 1 || !/^\d+$/.test(draft.current) || !Number.isSafeInteger(current) || current > target) {
      setError("Use whole numbers: target at least 1, progress between 0 and the target."); return;
    }
    if (draft.deadline && !validDate(draft.deadline)) { setError("Enter a valid deadline."); return; }
    const goal: Goal = { ...draft, id: editingId ?? crypto.randomUUID(), title: draft.title.trim(), category: draft.category.trim() || "Personal", unit: draft.unit.trim() || "steps", notes: draft.notes.trim(), target, current };
    if (save(editingId ? items.map((g) => g.id === editingId ? goal : g) : [goal, ...items])) {
      dialog.current?.close(); setNotice(editingId ? "Goal updated." : "Goal added.");
    }
  }
  function changeProgress(goal: Goal, value: number) {
    if (save(items.map((g) => g.id === goal.id ? { ...g, current: value } : g))) setNotice(value === goal.target ? `Completed: ${goal.title}` : `Progress updated: ${goal.title}`);
  }
  return <section className="planner-page">
    <header className="planner-header"><div><h1>Goals</h1><p>Turn your next ambition into a few measurable steps.</p></div><button className="planner-primary" disabled={blocked} onClick={() => open()}>+ Add goal</button></header>
    <div className="planner-stats"><article><span>Active goals</span><strong>{items.length - completed.length}</strong><small>Something to work towards</small></article><article><span>Completed</span><strong>{completed.length}</strong><small>Milestones you have reached</small></article><article><span>Overall progress</span><strong>{average}%</strong><small>Average progress across your goals</small></article><article><span>Overdue</span><strong>{overdue.length}</strong><small>Active goals past their deadline</small></article></div>
    {storageError && <p className="planner-error" role="alert">{storageError}</p>}
    <div className="planner-section-heading"><div className="planner-tabs" role="group" aria-label="Goal filter">{["active", "completed", "overdue", "all"].map((value) => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value[0].toUpperCase() + value.slice(1)}</button>)}</div><Link className="planner-link" to="/calendar">See deadlines in Calendar ↗</Link></div>
    {visible.length ? <div className="goal-grid">{visible.map((goal) => {
      const percent = Math.round(goal.current / goal.target * 100), done = goal.current >= goal.target;
      return <article className={`planner-panel goal-card${done ? " goal-done" : ""}`} key={goal.id}>
        <div className="planner-between"><span className="planner-tag">{goal.category}</span><button className="planner-quiet" onClick={() => open(goal)} aria-label={`Edit goal: ${goal.title}`}>Edit ↗</button></div>
        <h2>{goal.title}</h2><p className="goal-notes">{goal.notes || "Keep showing up. Every step counts."}</p>
        <div className="goal-progress-label"><span>{goal.current} / {goal.target} {goal.unit}</span><strong>{percent}%</strong></div>
        <progress max={goal.target} value={goal.current} aria-label={`${goal.title} progress`} />
        <div className="goal-footer"><span className={done ? "planner-success" : goal.deadline && goal.deadline < today ? "planner-overdue" : "planner-muted"}>{done ? "✓ Completed" : goal.deadline === today ? "Due today" : goal.deadline && goal.deadline < today ? `Overdue · ${dateLabel(goal.deadline)}` : dateLabel(goal.deadline)}</span><div><button className="planner-secondary" disabled={blocked || goal.current === 0} aria-label={`Decrease progress: ${goal.title}`} onClick={() => changeProgress(goal, goal.current - 1)}>−</button><button className="planner-secondary" disabled={blocked || done} aria-label={`Increase progress: ${goal.title}`} onClick={() => changeProgress(goal, goal.current + 1)}>+1</button></div></div>
      </article>;
    })}</div> : <div className="planner-empty"><span aria-hidden="true">◎</span><h2>{items.length ? "No goals in this view" : "What would you like to achieve?"}</h2><p>{items.length ? "Choose another filter or start a new goal." : "Try “Finish 12 lessons”, “Send 10 applications” or “Build a portfolio”. Choose a target and update your progress as you go."}</p><button className="planner-primary" disabled={blocked} onClick={() => open()}>+ Add goal</button></div>}
    <p className="planner-footnote">Progress is updated by you. Your daily Focus Timer goal stays separate.</p><p className="planner-success" role="status">{notice}</p>
    <dialog className="planner-dialog" ref={dialog} aria-labelledby="goal-dialog-title"><div className="planner-between"><h2 id="goal-dialog-title">{editingId ? "Edit goal" : "New goal"}</h2><button className="planner-quiet" aria-label="Close goal form" onClick={() => dialog.current?.close()}>×</button></div>
      <form onSubmit={submit} noValidate><div className="planner-form-grid">
        <label className="planner-wide">Goal name *<input ref={first} required maxLength={160} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="e.g. Finish the React course" /></label>
        <label>Category<input maxLength={50} list="goal-categories" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} /><datalist id="goal-categories">{["Personal", "Learning", "Career", "Project", "Focus"].map((c) => <option key={c} value={c} />)}</datalist></label>
        <label>Unit<input maxLength={40} value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} placeholder="lessons, applications, sessions…" /></label>
        <label>Target *<input type="number" min="1" step="1" value={draft.target} onChange={(e) => setDraft({ ...draft, target: e.target.value })} /></label>
        <label>Current progress<input type="number" min="0" step="1" value={draft.current} onChange={(e) => setDraft({ ...draft, current: e.target.value })} /></label>
        <label className="planner-wide">Deadline<input type="date" value={draft.deadline} onChange={(e) => setDraft({ ...draft, deadline: e.target.value })} /></label>
        <label className="planner-wide">Notes<textarea aria-label="Notes" rows={3} maxLength={4000} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Why this matters and how you plan to get there" /></label>
      </div>{(error || storageError) && <p className="planner-error" role="alert">{error || storageError}</p>}
      {deleting && <div className="planner-confirm"><p>Delete this goal and its progress?</p><button type="button" className="planner-danger" onClick={() => { if (save(items.filter((g) => g.id !== editingId))) { dialog.current?.close(); setNotice("Goal deleted."); } }}>Confirm delete</button><button type="button" className="planner-secondary" onClick={() => setDeleting(false)}>Keep goal</button></div>}
      <div className="planner-form-actions">{editingId && <button className="planner-delete" type="button" onClick={() => setDeleting(true)}>Delete goal</button>}<button className="planner-secondary" type="button" onClick={() => dialog.current?.close()}>Cancel</button><button className="planner-primary" disabled={blocked}>Save goal</button></div></form>
    </dialog>
  </section>;
}
