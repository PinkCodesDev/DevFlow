import AppIcon from "../components/AppIcon";
import { Link } from "react-router-dom";
import FocusTimer from "./FocusTimer";
import { dayKey } from "../lib/pomodoro";
import { addDays, dateLabel, scheduleEntries, usePlanningSnapshot, useSavedList } from "../lib/planning";
import { TASKS_KEY, isKanbanTask, projectProgress } from "../lib/workspaceData";
import "./PlanningPages.css";
import "./DashboardPage.css";
import { usePreferences } from "../lib/usePreferences";
import { formatClock } from "../lib/preferences";
const duration = (seconds: number) => { const minutes = Math.floor(seconds / 60); return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`; };
export default function DashboardPage() {
  const data = usePlanningSnapshot();
  const preferences = usePreferences();
  const tasksStore = useSavedList(TASKS_KEY, isKanbanTask);
  const tasks = tasksStore.items;
  const completedTasks = tasks.filter((t) => t.status === "done").length;
  const sessionsToday = data.sessions.filter((s) => (s.day ?? dayKey(s.completedAt)) === data.today);
  const focusToday = sessionsToday.reduce((sum, s) => sum + s.durationSeconds, 0);
  const target = data.focusGoal?.day === data.today ? data.focusGoal.target : null;
  const goalPercent = target === null ? 0 : Math.min(100, Math.round(sessionsToday.length / target * 100));
  const yesterday = addDays(data.today, -1);
  const focusYesterday = data.sessions.filter((s) => (s.day ?? dayKey(s.completedAt)) === yesterday).reduce((sum, s) => sum + s.durationSeconds, 0);
  const focusDifference = focusToday - focusYesterday;
  const focusComparison = focusDifference === 0 ? "Same focus time as yesterday" : `${focusDifference > 0 ? "+" : "−"}${duration(Math.abs(focusDifference))} from yesterday`;
  const focusDays = new Set(data.sessions.map((s) => s.day ?? dayKey(s.completedAt)));
  let streak = 0;
  for (let date = focusDays.has(data.today) ? data.today : yesterday; focusDays.has(date); date = addDays(date, -1)) streak++;
  const activeProjects = data.projects.filter((p) => p.status === "active");
  const activeApplications = data.applications.filter((a) => ["sent", "interview", "assignment", "offer"].includes(a.status));
  const goals = data.goals.filter((g) => g.current < g.target).sort((a, b) => (a.deadline || "9999").localeCompare(b.deadline || "9999"));
  const priority = { High: 0, Medium: 1, Low: 2 };
  const visibleTasks = [...tasks].sort((a, b) => Number(a.status === "done") - Number(b.status === "done") || priority[a.priority] - priority[b.priority]).slice(0, 6);
  const days = Array.from({ length: 7 }, (_, i) => { const date = addDays(data.today, i - 6); return { date, seconds: data.sessions.filter((s) => (s.day ?? dayKey(s.completedAt)) === date).reduce((sum, s) => sum + s.durationSeconds, 0) }; });
  const max = Math.max(1500, ...days.map((d) => d.seconds));
  const upcoming = scheduleEntries(data).filter((e) => !e.done && (e.date > data.today || e.date === data.today && (!e.time || new Date(`${e.date}T${e.time}`).getTime() >= data.now))).slice(0, 5);
  const statusLabels = { saved: "To apply", sent: "Applied", interview: "Interview", assignment: "Assignment", offer: "Offer", rejected: "Rejected", withdrawn: "Withdrawn" };
  return <section className="planner-page live-dashboard">
    <header className="planner-header"><div><h1>{preferences.name.trim() ? `Welcome back, ${preferences.name.trim()}` : "Your workspace"}</h1><p>Your tasks, projects and next steps, all in one place.</p></div><span className="dashboard-live-date">{dateLabel(data.today)}</span></header>
    <div className="planner-stats dashboard-live-stats">
      <article className="dashboard-stat dashboard-stat-violet">
        <div className="dashboard-stat-top"><span>Tasks completed</span><div className="dashboard-stat-icon"><AppIcon name="tasks" /></div></div>
        <strong>{completedTasks}<small> / {tasks.length}</small></strong>
        <small>{tasks.length > 0 ? `${Math.round(completedTasks / tasks.length * 100)}% of your task board completed` : "Your next small step starts here"}</small>
      </article>
      <article className="dashboard-stat dashboard-stat-mint">
        <div className="dashboard-stat-top"><span>Focus today</span><div className="dashboard-stat-icon"><AppIcon name="clock" /></div></div>
        <strong>{duration(focusToday)}</strong><small>{focusComparison}</small>
        <small className="dashboard-streak"><AppIcon name="flame" />{streak > 0 ? `${streak}-day focus streak · Keep it up!` : "Start your focus streak today"}</small>
      </article>
      <article className="dashboard-stat dashboard-stat-amber">
        <div className="dashboard-stat-top"><span>Active projects</span><div className="dashboard-stat-icon"><AppIcon name="projects" /></div></div>
        <strong>{activeProjects.length}</strong><small>{data.projects.filter((p) => p.status === "completed").length} completed · {data.projects.length} total</small>
      </article>
      <article className="dashboard-stat dashboard-stat-blue">
        <div className="dashboard-stat-top"><span>Active applications</span><div className="dashboard-stat-icon"><AppIcon name="briefcase" /></div></div>
        <strong>{activeApplications.length}</strong><small>{data.applications.filter((a) => a.status === "interview").length} at the interview stage</small>
      </article>
    </div>
    {(tasksStore.error || data.warnings.length > 0) && <p className="planner-error" role="alert">{tasksStore.error || data.warnings.join(" ")}</p>}
    <div className="dashboard-live-grid">
      <section className="planner-panel dashboard-tasks"><div className="planner-between"><h2>Your tasks</h2><Link className="planner-link" to="/tasks">View all ↗</Link></div><p className="planner-muted">Open tasks first, ordered by priority</p>{visibleTasks.length ? <ul className="dashboard-task-list">{visibleTasks.map((task) => <li key={task.id}><input type="checkbox" aria-label={`Complete task: ${task.title}`} checked={task.status === "done"} disabled={tasksStore.blocked} onChange={() => tasksStore.save(tasks.map((t) => t.id === task.id ? { ...t, status: t.status === "done" ? "todo" : "done" } : t))} /><div><Link to="/tasks" className={task.status === "done" ? "is-done" : ""}>{task.title}</Link><small>{task.category || "Uncategorized"} · {task.status === "progress" ? "In progress" : task.status === "done" ? "Done" : "To do"}</small></div><span className={`dashboard-priority priority-${task.priority.toLowerCase()}`}>{task.priority}</span></li>)}</ul> : <p className="dashboard-empty">No tasks yet. Add your first task on the Tasks page.</p>}<Link className="planner-link dashboard-bottom-link" to="/tasks">Manage tasks ↗</Link></section>
      <FocusTimer />
      <section className="planner-panel dashboard-goals"><div className="planner-between"><h2>Your goals</h2><Link className="planner-link" to="/goals">View all ↗</Link></div><div className="dashboard-focus-goal"><div className="planner-between"><div><strong>Today's Focus goal</strong><p className="dashboard-goal-caption">{target === null ? "Set a goal to get started" : `${sessionsToday.length} / ${target} sessions · ${goalPercent === 100 ? "Goal achieved!" : goalPercent >= 80 ? "Almost there!" : "One session at a time"}`}</p></div><div className="dashboard-goal-ring" role="img" aria-label={target === null ? "Daily goal not set" : `Daily goal ${goalPercent}% complete`}><svg viewBox="0 0 48 48" aria-hidden="true"><circle className="goal-ring-track" cx="24" cy="24" r="20" /><circle className="goal-ring-value" cx="24" cy="24" r="20" pathLength="100" strokeDasharray={`${goalPercent} 100`} /></svg><span>{target === null ? "—" : `${goalPercent}%`}</span></div></div>{target !== null ? <progress max={target} value={Math.min(target, sessionsToday.length)} aria-label="Today's focus goal" /> : <Link className="planner-link" to="/focus">Set a daily Focus goal ↗</Link>}</div>{goals.length ? goals.slice(0, 3).map((goal) => <div className="dashboard-goal-row" key={goal.id}><div className="planner-between"><Link to="/goals">{goal.title}</Link><span>{goal.current}/{goal.target} {goal.unit}</span></div><progress max={goal.target} value={goal.current} aria-label={`${goal.title} progress`} /><small>{dateLabel(goal.deadline)}</small></div>) : <p className="dashboard-empty">{data.goals.length ? "All your goals are completed." : "Add a goal to give your work a direction."}</p>}</section>
      <section className="planner-panel dashboard-projects"><div className="planner-between"><h2>Projects</h2><Link className="planner-link" to="/projects">View all ↗</Link></div>{data.projects.length ? [...data.projects].sort((a, b) => Number(a.status === "completed") - Number(b.status === "completed")).slice(0, 3).map((project) => <div className="dashboard-project-row" key={project.id}><div className="planner-between"><Link to="/projects">{project.title}</Link><span className="planner-tag">{project.status}</span></div><p>{project.stack || "Tech stack not set"}</p><progress max={100} value={projectProgress(project)} aria-label={`${project.title} progress`} /><small>{projectProgress(project)}% · {dateLabel(project.deadline)}</small></div>) : <p className="dashboard-empty">Your projects and their milestones will appear here.</p>}</section>
      <section className="planner-panel dashboard-upcoming"><div className="planner-between"><h2>Coming up</h2><Link className="planner-link" to="/calendar">Calendar ↗</Link></div>{upcoming.length ? <ul className="dashboard-upcoming-list">{upcoming.map((entry) => <li key={entry.id}><span className={`dashboard-dot source-${entry.source}`} /><div><Link to={entry.source === "personal" ? "/calendar" : `/${entry.source}`}>{entry.title}</Link><small>{dateLabel(entry.date)}{entry.time && ` · ${formatClock(entry.time, preferences.clock)}`} · {entry.source}</small></div></li>)}</ul> : <p className="dashboard-empty">No upcoming deadlines or events. Plan your next step in Calendar.</p>}</section>
      <section className="planner-panel dashboard-applications"><div className="planner-between"><h2>Applications</h2><Link className="planner-link" to="/applications">View all ↗</Link></div>{data.applications.length ? <ul className="dashboard-application-list">{data.applications.slice(0, 4).map((a) => <li key={a.id}><div><Link to="/applications">{a.company}</Link><small>{a.role}</small></div><span className="planner-tag">{statusLabels[a.status as keyof typeof statusLabels]}</span></li>)}</ul> : <p className="dashboard-empty">Track your first application to see it here.</p>}</section>
      <section className="planner-panel dashboard-weekly"><div className="planner-between"><div><h2>Focus · last 7 days</h2><p className="planner-muted">{duration(days.reduce((sum, d) => sum + d.seconds, 0))} total · scale 0–{Math.ceil(max / 60)} min per day</p></div><Link className="planner-link" to="/analytics">Analytics ↗</Link></div><div className="dashboard-week-bars">{days.map((day) => <div key={day.date}><span>{duration(day.seconds)}</span><div className="dashboard-week-track"><div style={{ height: `${day.seconds / max * 100}%` }} /></div><small>{new Date(`${day.date}T12:00:00`).toLocaleDateString("en-GB", { weekday: "short" })}</small></div>)}</div></section>
    </div>
  </section>;
}



