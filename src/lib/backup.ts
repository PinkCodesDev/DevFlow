import { isGoal, isCalendarEvent, validDate } from "./planning";
import { TASKS_KEY, PROJECTS_KEY, isKanbanTask, isProject, migrateLearning, safeProjectUrl } from "./workspaceData";
import { PREFERENCES_KEY, DEFAULT_PREFERENCES, validPreferences, readPreferences } from "./preferences";
import { FOCUS_STORAGE_KEY, loadFocus, validFocusState, advanceFocus, remainingMs, createTimer, type FocusState } from "./pomodoro";
const APPS_KEY = "devflow.applications.v1";
const GOALS_KEY = "devflow.goals.v1";
const CALENDAR_KEY = "devflow.calendar.v1";
function object(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function isApplication(value: unknown) {
  return object(value) && ["id", "company", "role", "status", "url", "appliedOn", "salary", "nextStep", "deadline", "notes"].every((k) => typeof value[k] === "string") &&
    Boolean(value.id) && Boolean(String(value.company).trim()) && Boolean(String(value.role).trim()) && ["saved", "sent", "interview", "assignment", "offer", "rejected", "withdrawn"].includes(String(value.status)) &&
    (!value.url || safeProjectUrl(String(value.url))) && (!value.appliedOn || validDate(String(value.appliedOn))) && (!value.deadline || validDate(String(value.deadline)));
}
function list(value: unknown, validator: (item: unknown) => boolean): boolean {
  return Array.isArray(value) && value.length <= 50000 && value.every(validator) && new Set(value.map((v) => v.id)).size === value.length;
}
export type Backup = { format: "devflow-backup"; version: 1; createdAt: string; data: {
  tasks: unknown[]; projects: unknown[]; applications: unknown[]; goals: unknown[]; calendar: unknown[];
  focus: FocusState; preferences: typeof DEFAULT_PREFERENCES;
} };
export function parseBackup(text: string): Backup {
  const value: unknown = JSON.parse(text);
  if (!object(value) || value.format !== "devflow-backup" || value.version !== 1 || typeof value.createdAt !== "string" || !object(value.data)) throw new Error("This is not a supported DevFlow backup.");
  const data = value.data;
  if (Object.keys(data).length !== 7 || !list(data.tasks, isKanbanTask) || !list(data.projects, isProject) || !list(data.applications, isApplication) || !list(data.goals, isGoal) || !list(data.calendar, isCalendarEvent) || !validFocusState(data.focus) || !validPreferences(data.preferences)) throw new Error("The backup contains missing or invalid data. Nothing has been changed.");
  return value as Backup;
}
function paused(state: FocusState, now: number): FocusState {
  const settled = advanceFocus(state, now);
  return { ...settled, timer: { ...settled.timer, endsAt: null, remainingMs: Math.max(1, remainingMs(settled.timer, now)) } };
}
export function createBackup(now: number): Backup {
  const read = (key: string, fallback: unknown = []) => { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); };
  const projects = read(PROJECTS_KEY, null) ?? migrateLearning(localStorage.getItem("devflow.learning.v1"));
  const rawFocus = read(FOCUS_STORAGE_KEY, null);
  if (rawFocus !== null && !validFocusState(rawFocus)) throw new Error("Focus data could not be exported. Existing data has been kept.");
  const backup = { format: "devflow-backup", version: 1, createdAt: new Date(now).toISOString(), data: {
    tasks: read(TASKS_KEY), projects, applications: read(APPS_KEY), goals: read(GOALS_KEY), calendar: read(CALENDAR_KEY),
    focus: paused(loadFocus(localStorage, now), now), preferences: read(PREFERENCES_KEY, DEFAULT_PREFERENCES),
  } };
  return parseBackup(JSON.stringify(backup));
}
// Restore already-written keys on failure instead of leaving a partially imported workspace.
export function replaceStored(patch: Record<string, string | null>) {
  const previous = new Map(Object.keys(patch).map((key) => [key, localStorage.getItem(key)]));
  const written: string[] = [];
  try {
    for (const [key, value] of Object.entries(patch)) {
      if (value === previous.get(key)) continue;
      if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value);
      written.push(key);
    }
  } catch {
    let restored = true;
    for (const key of written.reverse()) {
      try { const value = previous.get(key); if (value == null) localStorage.removeItem(key); else localStorage.setItem(key, value); }
      catch { restored = false; }
    }
    throw new Error(restored ? "Could not save changes. Previous data was restored. Free some browser storage and try again." : "Browser storage failed during recovery. Keep your backup file and restore it before continuing.");
  }
  window.dispatchEvent(new Event("devflow-preferences"));
  window.dispatchEvent(new Event("devflow-data"));
}
export function importBackup(backup: Backup) {
  const checked = parseBackup(JSON.stringify(backup)).data;
  replaceStored({
    [TASKS_KEY]: JSON.stringify(checked.tasks), [PROJECTS_KEY]: JSON.stringify(checked.projects), [APPS_KEY]: JSON.stringify(checked.applications),
    [GOALS_KEY]: JSON.stringify(checked.goals), [CALENDAR_KEY]: JSON.stringify(checked.calendar), [PREFERENCES_KEY]: JSON.stringify(checked.preferences),
    "devflow.learning.v1": null, "devflow.focus.sessions.v1": null, "devflow.focus.v1": null,
    [FOCUS_STORAGE_KEY]: JSON.stringify({ ...checked.focus, timer: { ...checked.focus.timer, endsAt: null } }),
  });
}
export const RESET_SECTIONS = ["tasks", "projects", "applications", "goals", "calendar", "focus", "all"] as const;
export type ResetSection = (typeof RESET_SECTIONS)[number];
export function resetSection(section: ResetSection) {
  const keys = { tasks: TASKS_KEY, projects: PROJECTS_KEY, applications: APPS_KEY, goals: GOALS_KEY, calendar: CALENDAR_KEY };
  const patch: Record<string, string | null> = {};
  for (const [name, key] of Object.entries(keys)) if (section === name || section === "all") patch[key] = "[]";
  if (section === "projects" || section === "all") patch["devflow.learning.v1"] = null;
  if (section === "focus" || section === "all") {
    patch[FOCUS_STORAGE_KEY] = JSON.stringify({ timer: createTimer(section === "all" ? DEFAULT_PREFERENCES.focus : readPreferences().focus), goal: null, sessions: [] });
    patch["devflow.focus.sessions.v1"] = null; patch["devflow.focus.v1"] = null;
  }
  if (section === "all") patch[PREFERENCES_KEY] = JSON.stringify(DEFAULT_PREFERENCES);
  replaceStored(patch);
}
