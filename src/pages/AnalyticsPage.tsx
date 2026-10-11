import { useState } from "react";
import { Link } from "react-router-dom";
import { dayKey } from "../lib/pomodoro";
import { addDays, dateLabel, usePlanningSnapshot } from "../lib/planning";
import "./PlanningPages.css";
import { usePreferences } from "../lib/usePreferences";

function duration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`;
}
export default function AnalyticsPage() {
  const data = usePlanningSnapshot();
  const preferences = usePreferences();
  const [period, setPeriod] = useState(7);
  const start = addDays(data.today, 1 - period);
  const sessionDay = (session: typeof data.sessions[number]) => session.day ?? dayKey(session.completedAt);
  const sessions = data.sessions.filter((s) => sessionDay(s) >= start && sessionDay(s) <= data.today);
  const focusSeconds = sessions.reduce((sum, s) => sum + s.durationSeconds, 0);
  const days = Array.from({ length: period }, (_, i) => {
    const date = addDays(start, i);
    return { date, seconds: sessions.filter((s) => sessionDay(s) === date).reduce((sum, s) => sum + s.durationSeconds, 0) };
  });
  const maxSeconds = Math.max(1500, ...days.map((d) => d.seconds));
  const activeDays = days.filter((d) => d.seconds > 0).length;
  const submitted = data.applications.filter((a) => a.appliedOn && a.appliedOn >= start && a.appliedOn <= data.today).length;
  const undated = data.applications.filter((a) => a.status !== "saved" && !a.appliedOn).length;
  const tasksDone = data.tasks.filter((t) => t.status === "done").length;
  const totalTopics = data.projects.reduce((sum, p) => sum + p.milestones.length, 0);
  const doneTopics = data.projects.reduce((sum, p) => sum + p.milestones.filter((t) => t.completed).length, 0);
  const goalsDone = data.goals.filter((g) => g.current >= g.target).length;
  const statuses = [ ["saved", "To apply"], ["sent", "Applied"], ["interview", "Interview"], ["assignment", "Assignment"], ["offer", "Offer"], ["rejected", "Rejected"], ["withdrawn", "Withdrawn"] ];
  const recent = [...sessions].sort((a, b) => b.completedAt - a.completedAt).slice(0, 5);
  return <section className="planner-page">
    <header className="planner-header"><div><h1>Analytics</h1><p>A clearer picture of your focus, projects and next opportunities.</p></div><div className="planner-tabs" role="group" aria-label="Analytics period">{[7, 30].map((n) => <button key={n} aria-pressed={period === n} onClick={() => setPeriod(n)}>Last {n} days</button>)}</div></header>
    {data.warnings.length > 0 && <p className="planner-error" role="alert">{data.warnings.join(" ")}</p>}
    <div className="planner-stats analytics-period-stats"><article><span>Focus time</span><strong>{duration(focusSeconds)}</strong><small>From completed Focus sessions</small></article><article><span>Focus sessions</span><strong>{sessions.length}</strong><small>{activeDays} active {activeDays === 1 ? "day" : "days"} in this period</small></article><article><span>Daily average</span><strong>{duration(focusSeconds / period)}</strong><small>Across all {period} calendar days</small></article><article><span>Applications sent</span><strong>{submitted}</strong><small>By the date you applied</small></article></div>
    <section className="planner-panel analytics-chart-panel"><div className="planner-section-heading"><div><h2>Your focus rhythm</h2><p className="planner-muted">{dateLabel(start)} – {dateLabel(data.today)}</p></div><Link className="planner-link" to="/focus">Open Focus Timer ↗</Link></div>
      <p className="planner-muted">Daily focus time · chart scale: 0–{Math.ceil(maxSeconds / 60)} minutes</p>
      <div className="analytics-chart" data-period={period} role="img" aria-label={`Completed focus time over ${period} days: ${duration(focusSeconds)}. Daily values are available below.`}>{days.map((day, i) => <div className="analytics-bar-column" key={day.date}><div className="analytics-bar-track"><div className={`analytics-bar${day.date === data.today ? " is-today" : ""}`} style={{ height: `${day.seconds / maxSeconds * 100}%` }} title={`${dateLabel(day.date)}: ${duration(day.seconds)}`} /></div><span>{period === 7 || i % 5 === 0 || i === period - 1 ? new Date(`${day.date}T12:00:00`).toLocaleDateString("en-GB", period === 7 ? { weekday: "short" } : { day: "numeric", month: "short" }) : ""}</span></div>)}</div>
      {sessions.length === 0 && <p className="analytics-empty-chart">Complete a Focus session to start building your history.</p>}
      <details className="analytics-data"><summary>Daily breakdown</summary><table><thead><tr><th scope="col">Day</th><th scope="col">Focus time</th></tr></thead><tbody>{days.map((d) => <tr key={d.date}><td>{dateLabel(d.date)}</td><td>{duration(d.seconds)}</td></tr>)}</tbody></table></details>
    </section>
    {undated > 0 && <p className="planner-footnote">{undated} submitted {undated === 1 ? "application has" : "applications have"} no application date and {undated === 1 ? "is" : "are"} excluded from the period count.</p>}
    <div className="planner-section-heading analytics-current-heading"><div><h2>Where things stand</h2><p className="planner-muted">Current totals across all dates · independent of the period above</p></div></div>
    <div className="analytics-current-grid">
      <section className="planner-panel"><div className="planner-between"><h2>Tasks</h2><Link className="planner-link" to="/tasks">View ↗</Link></div><strong className="analytics-total">{tasksDone}<small> / {data.tasks.length}</small></strong><p className="planner-muted">Tasks completed</p><progress max={Math.max(1, data.tasks.length)} value={tasksDone} aria-label="Tasks completed" /><div className="analytics-mini-list">{[["todo", "To do"], ["progress", "In progress"], ["done", "Done"]].map(([status, label]) => <div key={status}><span>{label}</span><strong>{data.tasks.filter((t) => t.status === status).length}</strong></div>)}</div>{!data.tasks.length && <p className="planner-footnote">No saved tasks yet.</p>}</section>
      <section className="planner-panel"><div className="planner-between"><h2>Projects</h2><Link className="planner-link" to="/projects">View ↗</Link></div><strong className="analytics-total">{doneTopics}<small> / {totalTopics}</small></strong><p className="planner-muted">Milestones completed</p><progress max={Math.max(1, totalTopics)} value={doneTopics} aria-label="Project milestones completed" /><div className="analytics-mini-list">{data.projects.length ? data.projects.map((p) => <div key={p.id}><span>{p.title}</span><strong>{p.milestones.filter((t) => t.completed).length}/{p.milestones.length}</strong></div>) : <p className="planner-footnote">Add a project to track your progress here.</p>}</div></section>
      <section className="planner-panel"><div className="planner-between"><h2>Goals</h2><Link className="planner-link" to="/goals">View ↗</Link></div><strong className="analytics-total">{goalsDone}<small> / {data.goals.length}</small></strong><p className="planner-muted">Goals completed</p><progress max={Math.max(1, data.goals.length)} value={goalsDone} aria-label="Goals completed" /><div className="analytics-mini-list"><div><span>Active</span><strong>{data.goals.length - goalsDone}</strong></div><div><span>Overdue</span><strong>{data.goals.filter((g) => g.current < g.target && g.deadline && g.deadline < data.today).length}</strong></div></div></section>
    </div>
    <div className="analytics-bottom-grid"><section className="planner-panel"><div className="planner-between"><h2>Application pipeline</h2><Link className="planner-link" to="/applications">View ↗</Link></div><p className="planner-muted">Current status of {data.applications.length} applications</p><div className="analytics-pipeline">{statuses.map(([status, label]) => { const count = data.applications.filter((a) => a.status === status).length; return <div key={status}><span>{label}</span><progress max={Math.max(1, data.applications.length)} value={count} aria-label={`${label} applications`} /><strong>{count}</strong></div>; })}</div></section>
      <section className="planner-panel"><h2>Recent focus sessions</h2><p className="planner-muted">Completed within the selected period</p>{recent.length ? <ul className="analytics-sessions">{recent.map((s) => <li key={s.id}><div><strong>{s.taskTitle}</strong><small>{dateLabel(sessionDay(s))} · {new Date(s.completedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: preferences.clock === "12" })}</small></div><span>{duration(s.durationSeconds)}</span></li>)}</ul> : <p className="planner-footnote">Your completed sessions will appear here.</p>}</section></div>
    <p className="planner-footnote">Based on data saved in this browser. Task, milestone and goal completion dates are not tracked, so their totals show the current state.</p>
  </section>;
}




