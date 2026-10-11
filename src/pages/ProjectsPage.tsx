import { useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { dateLabel, useSavedList, validDate } from "../lib/planning";
import { PROJECTS_KEY, isProject, projectProgress, safeProjectUrl, type Project } from "../lib/workspaceData";
import "./PlanningPages.css";
import "./ProjectsPage.css";

const statuses = ["planned", "active", "paused", "completed"] as const;
type Draft = Omit<Project, "id" | "milestones">;
const blank = (): Draft => ({ title: "", description: "", status: "planned", stack: "", deadline: "", repository: "", demo: "" });
export default function ProjectsPage() {
  const { items, save, error: storageError, blocked } = useSavedList(PROJECTS_KEY, isProject);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [draft, setDraft] = useState<Draft>(blank);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [milestoneError, setMilestoneError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const first = useRef<HTMLInputElement>(null);
  const detail = useRef<HTMLElement>(null);
  const visible = items.filter((p) => filter === "all" || p.status === filter);
  const selected = visible.find((p) => p.id === selectedId) ?? visible[0];
  function select(id: string) { setSelectedId(id); setMilestoneTitle(""); setMilestoneError(""); if (window.matchMedia("(max-width: 900px)").matches) requestAnimationFrame(() => { detail.current?.focus({ preventScroll: true }); detail.current?.scrollIntoView({ block: "start" }); }); }
  function open(project?: Project) {
    setEditingId(project?.id ?? null); setDraft(project ? { ...project } : blank()); setDeleting(false); setError("");
    dialog.current?.showModal(); first.current?.focus();
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    if (!draft.title.trim()) { setError("Enter a project name."); return; }
    if ([draft.repository.trim(), draft.demo.trim()].some((url) => url && !safeProjectUrl(url))) { setError("Links must start with https:// or http://."); return; }
    if (draft.deadline && !validDate(draft.deadline)) { setError("Enter a valid deadline."); return; }
    const previous = items.find((p) => p.id === editingId);
    const project: Project = { ...draft, id: editingId ?? crypto.randomUUID(), title: draft.title.trim(), description: draft.description.trim(), stack: draft.stack.trim(), repository: draft.repository.trim(), demo: draft.demo.trim(), milestones: (previous?.milestones ?? []).map((m) => draft.status === "completed" ? { ...m, completed: true } : m) };
    if (save(editingId ? items.map((p) => p.id === editingId ? project : p) : [project, ...items])) {
      setFilter("all"); select(project.id); dialog.current?.close(); setNotice(editingId ? "Project updated." : "Project added.");
    }
  }
  function addMilestone(e: FormEvent) {
    e.preventDefault(); if (!selected) return;
    const title = milestoneTitle.trim(); if (!title) { setMilestoneError("Enter a milestone name."); return; }
    const next: Project = { ...selected, status: selected.status === "completed" ? "active" : selected.status, milestones: [...selected.milestones, { id: crypto.randomUUID(), title, completed: false }] };
    if (save(items.map((p) => p.id === next.id ? next : p))) { setMilestoneTitle(""); setMilestoneError(""); if (next.status !== selected.status) setFilter("all"); }
  }
  function toggleMilestone(id: string) {
    if (!selected) return;
    const milestones = selected.milestones.map((m) => m.id === id ? { ...m, completed: !m.completed } : m);
    const status = milestones.every((m) => m.completed) ? "completed" : selected.status === "completed" || selected.status === "planned" ? "active" : selected.status;
    if (save(items.map((p) => p.id === selected.id ? { ...p, milestones, status } : p))) { if (status !== selected.status) setFilter("all"); setNotice("Milestone updated."); }
  }
  return <section className="planner-page projects-page">
    <header className="planner-header"><div><h1>Projects</h1><p>From your first idea to something you can share.</p></div><button className="planner-primary" disabled={blocked} onClick={() => open()}>+ Add project</button></header>
    <div className="planner-stats"><article><span>Total projects</span><strong>{items.length}</strong><small>Your work in one place</small></article><article><span>In progress</span><strong>{items.filter((p) => p.status === "active").length}</strong><small>Currently being built</small></article><article><span>Completed</span><strong>{items.filter((p) => p.status === "completed").length}</strong><small>Ready to show</small></article><article><span>Milestones done</span><strong>{items.reduce((sum, p) => sum + p.milestones.filter((m) => m.completed).length, 0)}</strong><small>Steps checked off your projects</small></article></div>
    {storageError && <p className="planner-error" role="alert">{storageError}</p>}
    <div className="planner-section-heading"><div className="planner-tabs" role="group" aria-label="Project filter">{["all", ...statuses].map((status) => <button key={status} aria-pressed={status === filter} onClick={() => { setFilter(status); setMilestoneTitle(""); setMilestoneError(""); }}>{status[0].toUpperCase() + status.slice(1)}</button>)}</div><Link className="planner-link" to="/calendar">Project deadlines ↗</Link></div>
    <div className="projects-layout"><div className="projects-cards">{visible.length ? visible.map((project) => <button key={project.id} className="planner-panel project-card" aria-pressed={selected?.id === project.id} onClick={() => select(project.id)}><div className="planner-between"><span className="project-symbol" aria-hidden="true">⌘</span><span className="planner-tag">{project.status}</span></div><h2>{project.title}</h2><p>{project.description || "Your next idea, one step at a time."}</p><span className="project-stack">{project.stack || "Tech stack not set"}</span><div className="goal-progress-label"><span>{project.milestones.filter((m) => m.completed).length}/{project.milestones.length} milestones</span><strong>{projectProgress(project)}%</strong></div><progress max={100} value={projectProgress(project)} aria-label={`${project.title} progress`} /><div className="project-card-footer"><span>{dateLabel(project.deadline)}</span><span>Open ↗</span></div></button>) : <div className="planner-empty"><span aria-hidden="true">⌘</span><h2>{items.length ? "No projects in this view" : "Build something of your own"}</h2><p>Add a project, define a few milestones and keep your repository and demo close by.</p><button className="planner-primary" disabled={blocked} onClick={() => open()}>+ Add project</button></div>}</div>
      <aside ref={detail} tabIndex={-1} aria-label="Project details" className="planner-panel project-detail">{selected ? <><div className="planner-between"><span className="planner-tag">{selected.status}</span><button className="planner-quiet" onClick={() => open(selected)} disabled={blocked}>Edit project ↗</button></div><h2>{selected.title}</h2><p className="project-description">{selected.description || "Add a description to capture what you want to build."}</p><dl><div><dt>Tech stack</dt><dd>{selected.stack || "Not set"}</dd></div><div><dt>Deadline</dt><dd>{dateLabel(selected.deadline)}</dd></div></dl><div className="project-links">{selected.repository && <a href={selected.repository} target="_blank" rel="noopener noreferrer">Repository ↗</a>}{selected.demo && <a href={selected.demo} target="_blank" rel="noopener noreferrer">Live demo ↗</a>}</div><div className="planner-between"><h3>Milestones</h3><span className="planner-muted">{projectProgress(selected)}%</span></div><ul className="project-milestones">{selected.milestones.map((m) => <li key={m.id}><label><input type="checkbox" checked={m.completed} disabled={blocked} onChange={() => toggleMilestone(m.id)} /><span className={m.completed ? "is-done" : ""}>{m.title}</span></label></li>)}</ul>{!selected.milestones.length && <p className="planner-muted">Break this project into small, concrete steps.</p>}<form className="project-add-milestone" onSubmit={addMilestone}><label htmlFor="project-milestone">New milestone</label><div><input id="project-milestone" maxLength={160} value={milestoneTitle} onChange={(e) => { setMilestoneTitle(e.target.value); setMilestoneError(""); }} placeholder="e.g. Build the homepage" /><button className="planner-primary" disabled={blocked}>Add</button></div>{milestoneError && <p className="planner-error" role="alert">{milestoneError}</p>}</form></> : <div className="planner-empty"><h2>Your project workspace</h2><p>Select a project to see its milestones, links and details.</p></div>}</aside>
    </div><p className="planner-success" role="status">{notice}</p>
    <dialog ref={dialog} className="planner-dialog" aria-labelledby="project-dialog-title"><div className="planner-between"><h2 id="project-dialog-title">{editingId ? "Edit project" : "New project"}</h2><button className="planner-quiet" aria-label="Close project form" onClick={() => dialog.current?.close()}>×</button></div><form onSubmit={submit} noValidate><div className="planner-form-grid"><label className="planner-wide">Project name *<input ref={first} required maxLength={160} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></label><label className="planner-wide">Description<textarea aria-label="Description" rows={3} maxLength={4000} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></label><label>Status<select aria-label="Project status" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as Project["status"] })}>{statuses.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}</select></label><label>Deadline<input type="date" value={draft.deadline} onChange={(e) => setDraft({ ...draft, deadline: e.target.value })} /></label><label className="planner-wide">Tech stack<input maxLength={200} placeholder="e.g. React, TypeScript, Vite" value={draft.stack} onChange={(e) => setDraft({ ...draft, stack: e.target.value })} /></label><label className="planner-wide">Repository URL<input type="url" value={draft.repository} maxLength={2000} onChange={(e) => setDraft({ ...draft, repository: e.target.value })} /></label><label className="planner-wide">Demo URL<input type="url" value={draft.demo} maxLength={2000} onChange={(e) => setDraft({ ...draft, demo: e.target.value })} /></label></div>{(error || storageError) && <p className="planner-error" role="alert">{error || storageError}</p>}{draft.status === "completed" && <p className="planner-footnote">Saving as completed checks off all milestones.</p>}{deleting && <div className="planner-confirm"><p>Delete this project and its milestones?</p><button type="button" className="planner-danger" onClick={() => { if (save(items.filter((p) => p.id !== editingId))) { dialog.current?.close(); setNotice("Project deleted."); } }}>Confirm delete</button><button type="button" className="planner-secondary" onClick={() => setDeleting(false)}>Keep project</button></div>}<div className="planner-form-actions">{editingId && <button type="button" className="planner-delete" onClick={() => setDeleting(true)}>Delete project</button>}<button type="button" className="planner-secondary" onClick={() => dialog.current?.close()}>Cancel</button><button className="planner-primary" disabled={blocked}>Save project</button></div></form></dialog>
  </section>;
}

