import { useEffect, useState } from "react";
import { dayKey, loadFocus } from "./pomodoro";
import { TASKS_KEY, PROJECTS_KEY, isKanbanTask, isProject, migrateLearning } from "./workspaceData";

export type Goal = { id: string; title: string; category: string; target: number; current: number; unit: string; deadline: string; notes: string };
export type CalendarEvent = { id: string; title: string; date: string; time: string; notes: string };
export const GOALS_KEY = "devflow.goals.v1";
export const EVENTS_KEY = "devflow.calendar.v1";
export const todayKey = () => dayKey(Date.now());
export function validDate(value: string): boolean {
  const time = Date.parse(`${value}T12:00:00Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value;
}
export function dateLabel(value: string) {
  return value ? new Date(`${value}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "No deadline";
}
export function addDays(value: string, count: number) {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + count);
  return dayKey(date.getTime());
}
export function record(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === "object"; }
export function isGoal(value: unknown): value is Goal {
  return record(value) && ["id", "title", "category", "unit", "deadline", "notes"].every((k) => typeof value[k] === "string") &&
    Boolean(value.id) && Boolean(String(value.title).trim()) && typeof value.target === "number" && Number.isSafeInteger(value.target) && value.target > 0 &&
    typeof value.current === "number" && Number.isSafeInteger(value.current) && value.current >= 0 && value.current <= value.target &&
    (!value.deadline || validDate(String(value.deadline)));
}
export function isCalendarEvent(value: unknown): value is CalendarEvent {
  return record(value) && ["id", "title", "date", "time", "notes"].every((k) => typeof value[k] === "string") && Boolean(value.id) &&
    Boolean(String(value.title).trim()) && validDate(String(value.date)) && (!value.time || /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value.time)));
}
export function readList<T>(key: string, check: (item: unknown) => item is T): { items: T[]; error: string } {
  try {
    const raw = localStorage.getItem(key);
    const value: unknown = key === PROJECTS_KEY && raw === null ? migrateLearning(localStorage.getItem("devflow.learning.v1")) : JSON.parse(raw ?? "[]");
    if (!Array.isArray(value) || !value.every(check)) throw new Error("Invalid data");
    const ids = value.map((item) => record(item) ? item.id : undefined);
    if (new Set(ids).size !== ids.length) throw new Error("Duplicate data");
    return { items: value, error: "" };
  } catch { return { items: [], error: "Saved data could not be read. Existing data has been kept. Reload before making changes." }; }
}
export function useSavedList<T>(key: string, check: (item: unknown) => item is T) {
  const [data, setData] = useState(() => readList(key, check));
  const [saveError, setSaveError] = useState("");
  useEffect(() => {
    const refresh = (event: StorageEvent) => { if (event.key === key || event.key === null) setData(readList(key, check)); };
    const refreshLocal = () => setData(readList(key, check));
    window.addEventListener("storage", refresh); window.addEventListener("devflow-data", refreshLocal);
    return () => { window.removeEventListener("storage", refresh); window.removeEventListener("devflow-data", refreshLocal); };
  }, [key, check]);
  function save(items: T[]) {
    if (data.error) return false;
    try {
      localStorage.setItem(key, JSON.stringify(items));
      setData({ items, error: "" }); setSaveError("");
      window.dispatchEvent(new Event("devflow-data"));
      return true;
    } catch { setSaveError("Could not save in this browser. Keep this page open and try again."); return false; }
  }
  return { items: data.items, error: data.error || saveError, blocked: Boolean(data.error), save };
}

export type ApplicationSummary = { id: string; company: string; role: string; status: string; appliedOn: string; nextStep: string; deadline: string };
const applicationStatuses = ["saved", "sent", "interview", "assignment", "offer", "rejected", "withdrawn"];
function isApplication(value: unknown): value is ApplicationSummary {
  return record(value) && ["id", "company", "role", "status", "appliedOn", "nextStep", "deadline"].every((k) => typeof value[k] === "string") &&
    applicationStatuses.includes(String(value.status)) && (!value.appliedOn || validDate(String(value.appliedOn))) && (!value.deadline || validDate(String(value.deadline)));
}
function readSnapshot() {
  const now = Date.now();
  const tasks = readList(TASKS_KEY, isKanbanTask);
  const projects = readList(PROJECTS_KEY, isProject);
  const applications = readList("devflow.applications.v1", isApplication);
  const goals = readList(GOALS_KEY, isGoal);
  const events = readList(EVENTS_KEY, isCalendarEvent);
  const unavailable = [["Tasks", tasks], ["Projects", projects], ["Applications", applications], ["Goals", goals], ["Calendar", events]] as const;
  const warnings = unavailable.filter(([, data]) => data.error).map(([name]) => `${name} data could not be read.`);
  let sessions: ReturnType<typeof loadFocus>["sessions"] = [];
  let focusGoal: ReturnType<typeof loadFocus>["goal"] = null;
  try { const focus = loadFocus(localStorage, Date.now()); sessions = focus.sessions; focusGoal = focus.goal; }
  catch { warnings.push("Focus data could not be read."); }
  return { tasks: tasks.items, projects: projects.items, applications: applications.items, goals: goals.items, events: events.items, sessions, focusGoal, warnings, now, today: dayKey(now) };
}
export function usePlanningSnapshot() {
  const [snapshot, setSnapshot] = useState(readSnapshot);
  useEffect(() => {
    const refresh = () => setSnapshot(readSnapshot());
    const interval = window.setInterval(refresh, 15000);
    window.addEventListener("storage", refresh); window.addEventListener("focus", refresh); window.addEventListener("devflow-data", refresh);
    return () => { window.clearInterval(interval); window.removeEventListener("storage", refresh); window.removeEventListener("focus", refresh); window.removeEventListener("devflow-data", refresh); };
  }, []);
  return snapshot;
}


export type ScheduleEntry = { id: string; title: string; date: string; time: string; source: "personal" | "goals" | "applications" | "projects"; subtitle: string; done?: boolean; event?: CalendarEvent };
export function scheduleEntries(data: ReturnType<typeof readSnapshot>, events = data.events): ScheduleEntry[] {
  return [
    ...events.map((e): ScheduleEntry => ({ id: `event-${e.id}`, title: e.title, date: e.date, time: e.time, source: "personal", subtitle: e.notes, event: e })),
    ...data.goals.filter((g) => g.deadline).map((g): ScheduleEntry => ({ id: `goal-${g.id}`, title: g.title, date: g.deadline, time: "", source: "goals", subtitle: `${g.current} / ${g.target} ${g.unit}`, done: g.current >= g.target })),
    ...data.projects.filter((p) => p.deadline).map((p): ScheduleEntry => ({ id: `project-${p.id}`, title: p.title, date: p.deadline, time: "", source: "projects", subtitle: p.stack || p.description, done: p.status === "completed" })),
    ...data.applications.filter((a) => a.deadline && !["rejected", "withdrawn"].includes(a.status)).map((a): ScheduleEntry => ({ id: `app-${a.id}`, title: `${a.company} · ${a.nextStep || "Application follow-up"}`, date: a.deadline, time: "", source: "applications", subtitle: a.role })),
  ].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`) || a.title.localeCompare(b.title));
}

