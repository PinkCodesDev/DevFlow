import { DEFAULT_FOCUS, validFocusConfig, type FocusConfig } from "./preferences.ts";
export const FOCUS_STORAGE_KEY = "devflow.pomodoro.v2";

export const PHASES = [
  { mode: "focus", label: "Focus 1", seconds: 25 * 60 },
  { mode: "short", label: "Short Break", seconds: 5 * 60 },
  { mode: "focus", label: "Focus 2", seconds: 25 * 60 },
  { mode: "short", label: "Short Break", seconds: 5 * 60 },
  { mode: "focus", label: "Focus 3", seconds: 25 * 60 },
  { mode: "long", label: "Long Break", seconds: 15 * 60 },
] as const;

export type TimerMode = (typeof PHASES)[number]["mode"];
export const TIMER_MODES = [
  { mode: "focus", label: "Focus", seconds: 25 * 60 },
  { mode: "short", label: "Short Break", seconds: 5 * 60 },
  { mode: "long", label: "Long Break", seconds: 15 * 60 },
] as const;

export function phasesFor(config: FocusConfig = DEFAULT_FOCUS) {
  return Array.from({ length: config.rounds }, (_, index) => [
    { mode: "focus" as const, label: `Focus ${index + 1}`, seconds: config.focusMinutes * 60 },
    index === config.rounds - 1
      ? { mode: "long" as const, label: "Long Break", seconds: config.longMinutes * 60 }
      : { mode: "short" as const, label: "Short Break", seconds: config.shortMinutes * 60 },
  ]).flat();
}
export function modesFor(config: FocusConfig = DEFAULT_FOCUS) {
  return [
    { mode: "focus" as const, label: "Focus", seconds: config.focusMinutes * 60 },
    { mode: "short" as const, label: "Short Break", seconds: config.shortMinutes * 60 },
    { mode: "long" as const, label: "Long Break", seconds: config.longMinutes * 60 },
  ];
}

export type FocusSession = {
  id: string;
  taskTitle: string;
  completedAt: number;
  durationSeconds: number;
  day?: string;
};

export type DailyGoal = { day: string; target: number };
export type CycleTimer = {
  config?: FocusConfig;
  manualMode?: TimerMode;
  step: number;
  remainingMs: number;
  endsAt: number | null;
  taskId: string;
  taskTitle: string;
};
export type FocusState = {
  timer: CycleTimer;
  goal: DailyGoal | null;
  sessions: FocusSession[];
};

export function dayKey(time: number): string {
  const date = new Date(time);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dayEnd(day: string): number {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(year, month - 1, date + 1).getTime();
}

function validDay(day: unknown): day is string {
  if (typeof day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const [year, month, date] = day.split("-").map(Number);
  return dayKey(new Date(year, month - 1, date).getTime()) === day;
}

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function timestamp(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 && !Number.isNaN(new Date(value).getTime());
}

export function validTarget(target: number): boolean {
  return Number.isSafeInteger(target) && target > 0;
}

export function createTimer(config: FocusConfig = DEFAULT_FOCUS): CycleTimer {
  return { config, step: 0, remainingMs: config.focusMinutes * 60000, endsAt: null, taskId: "", taskTitle: "Focus without a task" };
}

export function goalForToday(state: FocusState, now: number): number | null {
  return state.goal?.day === dayKey(now) && validTarget(state.goal.target) ? state.goal.target : null;
}

export function remainingMs(timer: CycleTimer, now: number): number {
  return timer.endsAt === null ? timer.remainingMs : Math.max(0, timer.endsAt - now);
}

function readSessions(value: unknown): FocusSession[] {
  if (!Array.isArray(value)) return [];
  const sessions = value.filter((item): item is FocusSession =>
    object(item) && typeof item.id === "string" && typeof item.taskTitle === "string" &&
    timestamp(item.completedAt) && typeof item.durationSeconds === "number" &&
    Number.isFinite(item.durationSeconds) && item.durationSeconds > 0 &&
    (item.day === undefined || validDay(item.day))
  );
  return [...new Map(sessions.map((session) => [session.id, session])).values()];
}

// Advance from scheduled deadlines, never from the delayed interval callback.
// This also catches up after navigation, tab throttling or a browser restart.
export function advanceFocus(state: FocusState, now: number): FocusState {
  if (state.timer.endsAt === null) return state;
  if (!state.goal || state.goal.day > dayKey(now)) {
    return { ...state, timer: { ...state.timer, remainingMs: remainingMs(state.timer, now), endsAt: null } };
  }
  const stopAt = dayEnd(state.goal.day);
  const through = Math.min(now, stopAt);
  let timer = state.timer;
  const phases = phasesFor(timer.config);
  let sessions = state.sessions;

  while (timer.endsAt !== null && timer.endsAt <= through) {
    const completedAt = timer.endsAt;
    const phase = timer.manualMode ? modesFor(timer.config).find((mode) => mode.mode === timer.manualMode)! : phases[timer.step];
    if (phase.mode === "focus") {
      const id = `focus-${completedAt}`;
      if (!sessions.some((session) => session.id === id)) {
        sessions = [...sessions, {
          id, taskTitle: timer.taskTitle, completedAt,
          durationSeconds: phase.seconds,
          // A session ending exactly at midnight belongs to the day just worked.
          day: dayKey(completedAt - 1),
        }];
      }
    }
    const nextStep = timer.manualMode ? 0 : (timer.step + 1) % phases.length;
    const duration = phases[nextStep].seconds * 1000;
    timer = { ...timer, step: nextStep, remainingMs: duration, endsAt: completedAt + duration };
    delete timer.manualMode;
  }

  if (now >= stopAt && timer.endsAt !== null) {
    timer = { ...timer, remainingMs: Math.max(0, timer.endsAt - stopAt), endsAt: null };
  }
  return timer === state.timer && sessions === state.sessions ? state : { ...state, timer, sessions };
}

export function setGoal(state: FocusState, target: number, now: number): FocusState {
  const settled = advanceFocus(state, now);
  if (!validTarget(target)) return settled;
  return { ...settled, goal: { day: dayKey(now), target } };
}

export function toggleFocus(state: FocusState, now: number): FocusState {
  const settled = advanceFocus(state, now);
  if (!goalForToday(settled, now)) return settled;
  const timer = settled.timer;
  const left = Math.max(1, remainingMs(timer, now));
  return { ...settled, timer: {
    ...timer, remainingMs: left, endsAt: timer.endsAt === null ? now + left : null,
  } };
}

// A manual choice moves to the next matching phase in the existing cycle.
// Skipped, unfinished Focus time is never recorded as a completed session.
export function selectMode(state: FocusState, mode: TimerMode, now: number): FocusState {
  const settled = advanceFocus(state, now);
  const current = settled.timer;
  const phases = phasesFor(current.config);
  if ((current.manualMode ?? phases[current.step].mode) === mode) return settled;
  let step = current.step;
  let found = false;
  for (let offset = 1; offset <= phases.length; offset++) {
    const candidate = (current.step + offset) % phases.length;
    if (phases[candidate].mode === mode) { step = candidate; found = true; break; }
  }
  const duration = modesFor(current.config).find((item) => item.mode === mode)!.seconds * 1000;
  return { ...settled, timer: { ...current, step, manualMode: found ? undefined : mode, remainingMs: duration,
    endsAt: current.endsAt !== null && goalForToday(settled, now) !== null ? now + duration : null } };
}
export function resetFocus(state: FocusState, now: number, config: FocusConfig = state.timer.config ?? DEFAULT_FOCUS): FocusState {
  const settled = advanceFocus(state, now);
  return { ...settled, timer: { ...createTimer(config), taskId: settled.timer.taskId, taskTitle: settled.timer.taskTitle } };
}

function parseState(value: unknown): FocusState | null {
  if (!object(value) || !object(value.timer)) return null;
  const timer = value.timer;
  if (timer.config !== undefined && !validFocusConfig(timer.config)) return null;
  const config = timer.config as FocusConfig | undefined;
  const phases = phasesFor(config);
  if (timer.manualMode !== undefined && (timer.manualMode !== "short" || (config?.rounds ?? 3) !== 1)) return null;
  const duration = timer.manualMode === "short" ? (config ?? DEFAULT_FOCUS).shortMinutes * 60 : phases[Number(timer.step)]?.seconds;
  if (
    typeof timer.step !== "number" || !Number.isInteger(timer.step) || timer.step < 0 || timer.step >= phases.length ||
    typeof timer.remainingMs !== "number" || !Number.isFinite(timer.remainingMs) || timer.remainingMs <= 0 ||
    timer.remainingMs > duration * 1000 ||
    !(timer.endsAt === null || timestamp(timer.endsAt)) ||
    typeof timer.taskId !== "string" || typeof timer.taskTitle !== "string"
  ) return null;
  const goal = object(value.goal) && validDay(value.goal.day) && typeof value.goal.target === "number" && validTarget(value.goal.target)
    ? { day: value.goal.day, target: value.goal.target } : null;
  // A malformed deadline must not create an unbounded catch-up loop.
  if (timer.endsAt !== null && goal) {
    const end = dayEnd(goal.day);
    const [year, month, date] = goal.day.split("-").map(Number);
    const start = new Date(year, month - 1, date).getTime();
    if ((timer.endsAt as number) < start || (timer.endsAt as number) > end + duration * 1000) return null;
  }
  return { timer: timer as CycleTimer, goal, sessions: readSessions(value.sessions) };
}

type Reader = Pick<Storage, "getItem">;
function readJson(storage: Reader, key: string): unknown {
  try { return JSON.parse(storage.getItem(key) ?? "null"); } catch { return null; }
}

export function loadFocus(storage: Reader, now: number): FocusState {
  const raw = readJson(storage, FOCUS_STORAGE_KEY);
  const saved = parseState(raw);
  if (saved) return advanceFocus(saved, now);

  // Preserve the existing history when upgrading from the manual timer.
  const oldSessions = readSessions(readJson(storage, "devflow.focus.sessions.v1"));
  const recovered = object(raw) ? readSessions(raw.sessions) : [];
  const sessions = [...new Map([...oldSessions, ...recovered].map((session) => [session.id, session])).values()];
  const oldTimer = readJson(storage, "devflow.focus.v1");
  const timer = createTimer();
  if (object(oldTimer) && typeof oldTimer.taskId === "string") {
    timer.taskId = oldTimer.taskId;
    const tasks = readJson(storage, "devflow.tasks.v1");
    const task = Array.isArray(tasks) ? tasks.find((item) => object(item) && String(item.id) === timer.taskId) : null;
    if (object(task) && typeof task.title === "string") timer.taskTitle = task.title;
    // The new automatic cycle always begins at Focus 1, after goal confirmation.
    if (oldTimer.mode === "focus" && timestamp(oldTimer.endsAt) && oldTimer.endsAt <= now) {
      const id = `focus-${oldTimer.endsAt}`;
      if (!sessions.some((session) => session.id === id)) {
        sessions.push({ id, taskTitle: timer.taskTitle, completedAt: oldTimer.endsAt, durationSeconds: 1500 });
      }
    }
  }
  return { timer, goal: null, sessions };
}

export function validFocusState(value: unknown): value is FocusState {
  if (!object(value) || !parseState(value) || !Array.isArray(value.sessions)) return false;
  if (value.goal !== null && (!object(value.goal) || !validDay(value.goal.day) || typeof value.goal.target !== "number" || !validTarget(value.goal.target))) return false;
  return readSessions(value.sessions).length === value.sessions.length;
}

