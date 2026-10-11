import { useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { dayKey } from "../lib/pomodoro";
import { EVENTS_KEY, scheduleEntries, addDays, dateLabel, isCalendarEvent, todayKey, usePlanningSnapshot, useSavedList, validDate, type CalendarEvent } from "../lib/planning";
import "./PlanningPages.css";
import { usePreferences } from "../lib/usePreferences";
import { formatClock } from "../lib/preferences";

type Draft = Omit<CalendarEvent, "id">;
export default function CalendarPage() {
  const data = usePlanningSnapshot();
  const preferences = usePreferences();
  const { items: events, save, error: storageError, blocked } = useSavedList(EVENTS_KEY, isCalendarEvent);
  const [selected, setSelected] = useState(todayKey);
  const [month, setMonth] = useState(() => todayKey().slice(0, 7));
  const [filter, setFilter] = useState("all");
  const [draft, setDraft] = useState<Draft>({ title: "", date: todayKey(), time: "", notes: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const first = useRef<HTMLInputElement>(null);
  const firstDay = `${month}-01`;
  const weekday = new Date(`${firstDay}T12:00:00`).getDay();
  const gridStart = addDays(firstDay, -((weekday - (preferences.weekStart === "monday" ? 1 : 0) + 7) % 7));
  const weekdays = preferences.weekStart === "monday" ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dates = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const entries = scheduleEntries(data, events).filter((e) => filter === "all" || e.source === filter);
  const agenda = entries.filter((e) => e.date === selected);
  const monthEntries = entries.filter((e) => e.date.startsWith(month));
  const upcoming = entries.filter((e) => e.date >= data.today && !e.done).slice(0, 5);
  function navigate(offset: number) {
    const date = new Date(`${firstDay}T12:00:00`); date.setMonth(date.getMonth() + offset);
    const next = dayKey(date.getTime()); setMonth(next.slice(0, 7)); setSelected(next);
  }
  function selectDay(date: string) { setSelected(date); setMonth(date.slice(0, 7)); }
  function open(event?: CalendarEvent) {
    setEditingId(event?.id ?? null); setDraft(event ? { ...event } : { title: "", date: selected, time: "", notes: "" });
    setError(""); setDeleting(false); dialog.current?.showModal(); first.current?.focus();
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    if (!draft.title.trim() || !validDate(draft.date) || (draft.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.time))) { setError("Enter a title, a valid date and, optionally, a valid time."); return; }
    const event: CalendarEvent = { ...draft, id: editingId ?? crypto.randomUUID(), title: draft.title.trim(), notes: draft.notes.trim() };
    if (save(editingId ? events.map((item) => item.id === editingId ? event : item) : [...events, event])) {
      selectDay(event.date); dialog.current?.close(); setNotice(editingId ? "Event updated." : "Event added.");
    }
  }
  return <section className="planner-page">
    <header className="planner-header"><div><h1>Calendar</h1><p>A little space for everything that comes next.</p></div><button className="planner-primary" disabled={blocked} onClick={() => open()}>+ Add event</button></header>
    {(storageError || data.warnings.length > 0) && <p className="planner-error" role="alert">{storageError || data.warnings.join(" ")}</p>}
    <div className="calendar-toolbar"><div className="calendar-navigation"><button className="planner-secondary" aria-label="Previous month" onClick={() => navigate(-1)}>‹</button><h2>{new Date(`${firstDay}T12:00:00`).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</h2><button className="planner-secondary" aria-label="Next month" onClick={() => navigate(1)}>›</button><button className="planner-quiet" onClick={() => selectDay(data.today)}>Today</button></div><div className="planner-tabs" role="group" aria-label="Calendar source">{["all", "personal", "goals", "projects", "applications"].map((s) => <button key={s} aria-pressed={filter === s} onClick={() => setFilter(s)}>{s[0].toUpperCase() + s.slice(1)}</button>)}</div></div>
    <div className="calendar-layout"><section className="planner-panel calendar-month" aria-label="Month view"><div className="calendar-weekdays" aria-hidden="true">{weekdays.map((d) => <span key={d}>{d}</span>)}</div>
      <div className="calendar-grid">{dates.map((date) => { const dayEntries = entries.filter((e) => e.date === date); return <button key={date} className={`calendar-day${date.startsWith(month) ? "" : " outside-month"}${date === data.today ? " is-today" : ""}`} aria-label={`${dateLabel(date)}, ${dayEntries.length} events`} aria-pressed={selected === date} aria-current={date === data.today ? "date" : undefined} onClick={() => selectDay(date)}><span className="calendar-day-number">{Number(date.slice(-2))}</span><span className="calendar-mobile-dots" aria-hidden="true">{dayEntries.slice(0, 3).map((entry) => <i key={entry.id} className={`source-${entry.source}${entry.done ? " is-done" : ""}`} />)}{dayEntries.length > 3 && <small>+</small>}</span><span className="calendar-day-items">{dayEntries.slice(0, 2).map((e) => <span className={`calendar-chip source-${e.source}${e.done ? " is-done" : ""}`} key={e.id}>{e.time && `${formatClock(e.time, preferences.clock)} `}{e.title}</span>)}{dayEntries.length > 2 && <small>+{dayEntries.length - 2} more</small>}</span></button>; })}</div>
      <div className="calendar-legend"><span className="source-personal">● Personal</span><span className="source-goals">● Goal deadlines</span><span className="source-projects">● Projects</span><span className="source-applications">● Applications</span><small>{monthEntries.length} entries this month</small></div></section>
      <aside className="calendar-agenda"><section className="planner-panel"><span className="planner-eyebrow">YOUR DAY</span><h2>{dateLabel(selected)}</h2><p className="planner-muted">{agenda.length} scheduled {agenda.length === 1 ? "item" : "items"}</p><div className="calendar-agenda-list">{agenda.length ? agenda.map((entry) => <article key={entry.id} className={`calendar-agenda-item source-${entry.source}`}><div className="planner-between"><span className="planner-tag">{entry.source === "personal" ? formatClock(entry.time, preferences.clock) || "All day" : entry.source === "goals" ? "Goal deadline" : entry.source === "projects" ? "Project deadline" : "Application"}</span>{entry.done && <small className="planner-success">Completed</small>}</div><h3>{entry.title}</h3>{entry.subtitle && <p>{entry.subtitle}</p>}{entry.date < data.today && !entry.done && entry.source !== "personal" && <small className="planner-overdue">Past deadline</small>}{entry.event ? <button className="planner-link" onClick={() => open(entry.event)}>Edit event ↗</button> : <Link className="planner-link" to={`/${entry.source}`}>Open {entry.source === "goals" ? "Goals" : entry.source === "projects" ? "Projects" : "Applications"} ↗</Link>}</article>) : <div className="calendar-free"><span aria-hidden="true">☷</span><h3>A little breathing room</h3><p>No items for this day with the current filter.</p><button className="planner-secondary" disabled={blocked} onClick={() => open()}>+ Plan something</button></div>}</div></section>
        <section className="planner-panel calendar-upcoming"><h2>Coming up</h2>{upcoming.length ? upcoming.map((entry) => <button key={entry.id} onClick={() => selectDay(entry.date)}><span>{entry.title}</span><small>{dateLabel(entry.date)}{entry.time && ` · ${formatClock(entry.time, preferences.clock)}`}</small></button>) : <p className="planner-muted">No upcoming items in this view.</p>}</section>
      </aside></div>
    <p className="planner-footnote">Goals, projects and application deadlines appear automatically; edit them in their original sections. Personal events use your local time. Rejected and withdrawn applications are hidden.</p><p role="status" className="planner-success">{notice}</p>
    <dialog ref={dialog} className="planner-dialog" aria-labelledby="event-dialog-title"><div className="planner-between"><h2 id="event-dialog-title">{editingId ? "Edit event" : "New event"}</h2><button className="planner-quiet" aria-label="Close event form" onClick={() => dialog.current?.close()}>×</button></div><form onSubmit={submit} noValidate><div className="planner-form-grid"><label className="planner-wide">Event title *<input ref={first} maxLength={160} required value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="e.g. Portfolio review" /></label><label>Date *<input type="date" required value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} /></label><label>Time (optional)<input type="time" value={draft.time} onChange={(e) => setDraft({ ...draft, time: e.target.value })} /></label><label className="planner-wide">Notes<textarea aria-label="Notes" rows={4} maxLength={4000} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Details, location or things to prepare" /></label></div>{(error || storageError) && <p className="planner-error" role="alert">{error || storageError}</p>}{deleting && <div className="planner-confirm"><p>Delete this event?</p><button type="button" className="planner-danger" onClick={() => { if (save(events.filter((e) => e.id !== editingId))) { dialog.current?.close(); setNotice("Event deleted."); } }}>Confirm delete</button><button type="button" className="planner-secondary" onClick={() => setDeleting(false)}>Keep event</button></div>}<div className="planner-form-actions">{editingId && <button className="planner-delete" type="button" onClick={() => setDeleting(true)}>Delete event</button>}<button type="button" className="planner-secondary" onClick={() => dialog.current?.close()}>Cancel</button><button className="planner-primary" disabled={blocked}>Save event</button></div></form></dialog>
  </section>;
}



