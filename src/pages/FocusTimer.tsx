import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";
import {
  phasesFor, modesFor, FOCUS_STORAGE_KEY, advanceFocus, createTimer, dayKey, goalForToday,
  loadFocus, remainingMs, resetFocus, setGoal, toggleFocus, selectMode, validTarget,
  type FocusState, type TimerMode,
} from "../lib/pomodoro";

import { readPreferences } from "../lib/preferences";
import { usePreferences } from "../lib/usePreferences";
import { enableAudio, playChime } from "../lib/sound";
type TaskOption = { id: number; title: string; category: string; status: string };
type FocusTimerProps = { compact?: boolean };

function loadTasks(): TaskOption[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem("devflow.tasks.v1") ?? "[]");
    if (Array.isArray(saved)) return saved.filter((task): task is TaskOption =>
      task !== null && typeof task === "object" && Number.isSafeInteger(task.id) &&
      typeof task.title === "string" && typeof task.category === "string" && typeof task.status === "string"
    );
  } catch { /* The timer also works without a task. */ }
  return [];
}

function formatFocusTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  return hours === 0 ? `${minutes} min` : `${hours} h${minutes % 60 ? ` ${minutes % 60} min` : ""}`;
}

function DailyGoalForm({ target, onConfirm }: { target: number | null; onConfirm: (target: number) => void }) {
  const id = useId();
  const [draft, setDraft] = useState(target === null ? "" : String(target));
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    const value = Number(text);
    if (!/^\d+$/.test(text) || !validTarget(value)) {
      setError("Enter a whole number of focus sessions, at least 1.");
      return;
    }
    setError("");
    onConfirm(value);
  }

  return (
    <form className="focus-goal-form" onSubmit={submit} noValidate>
      <label htmlFor={id}>Focus sessions today</label>
      <div className="focus-goal-input-row">
        <input id={id} type="number" inputMode="numeric" min="1" step="1"
          placeholder="e.g. 7" value={draft} aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : `${id}-help`}
          onChange={(event) => { setDraft(event.target.value); setError(""); }} />
        <button type="submit">{target === null ? "Confirm goal" : "Update goal"}</button>
      </div>
      {error && <p className="focus-error" id={`${id}-error`} role="alert">{error}</p>}
      <p id={`${id}-help`}>{target === null ? "Confirm today's goal to unlock Start." : `Confirmed for today: ${target} focus sessions.`}</p>
    </form>
  );
}

function FocusTimer({ compact = true }: FocusTimerProps) {
  const preferences = usePreferences();
  const [state, setState] = useState<FocusState>(() => {
    try { return loadFocus(localStorage, Date.now()); }
    catch { return { timer: createTimer(), goal: null, sessions: [] }; }
  });
  const stateRef = useRef(state);
  const initialSavedRef = useRef(false);
  const [tasks] = useState(loadTasks);
  const [now, setNow] = useState(() => Date.now());
  const [storageError, setStorageError] = useState("");

  const commit = useCallback((next: FocusState) => {
    stateRef.current = next;
    initialSavedRef.current = true;
    setState(next);
    // Save the phase, goal and history together so a reload cannot count twice.
    try {
      localStorage.setItem(FOCUS_STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event("devflow-data"));
      setStorageError("");
    } catch {
      setStorageError("Changes could not be saved in this browser and may be lost after refreshing.");
    }
  }, []);

  useEffect(() => {
    function refreshClock() {
      const time = Date.now();
      setNow(time);
      const current = stateRef.current;
      const next = advanceFocus(current, time);
      if (next !== current && readPreferences().sound && document.visibilityState === "visible" && (next.timer.step !== current.timer.step || next.sessions.length > current.sessions.length)) void playChime().catch(() => {});
      if (next !== current || !initialSavedRef.current) commit(next);
    }
    function storageChanged(event: StorageEvent) {
      if (event.key !== FOCUS_STORAGE_KEY && event.key !== null) return;
      const next = loadFocus(localStorage, Date.now());
      stateRef.current = next; setState(next); setNow(Date.now()); initialSavedRef.current = true;
    }
    window.addEventListener("storage", storageChanged);
    const firstTick = window.setTimeout(refreshClock, 0);
    const interval = window.setInterval(refreshClock, 250);
    document.addEventListener("visibilitychange", refreshClock);
    return () => {
      window.removeEventListener("storage", storageChanged);
      window.clearTimeout(firstTick);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshClock);
    };
  }, [commit]);

  const timer = state.timer;
  const today = dayKey(now);
  const target = goalForToday(state, now);
  const phases = phasesFor(timer.config);
  const modes = modesFor(timer.config);
  const phase = timer.manualMode ? modes.find((item) => item.mode === timer.manualMode)! : phases[timer.step];
  const mode = modes.find((option) => option.mode === phase.mode)!;
  const nextPhase = phases[timer.manualMode ? 0 : (timer.step + 1) % phases.length];
  const nextMode = modes.find((option) => option.mode === nextPhase.mode)!;
  const secondsLeft = Math.ceil(remainingMs(timer, now) / 1000);
  const running = target !== null && timer.endsAt !== null;
  const paused = timer.endsAt === null && (timer.step !== 0 || timer.remainingMs < mode.seconds * 1000);
  const minutes = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const seconds = String(secondsLeft % 60).padStart(2, "0");
  const progress = Math.min(100, Math.max(0, (1 - secondsLeft / mode.seconds) * 100));
  const selectedTask = tasks.find((task) => String(task.id) === timer.taskId);
  const todaySessions = state.sessions
    .filter((session) => (session.day ?? dayKey(session.completedAt)) === today)
    .sort((a, b) => b.completedAt - a.completedAt);
  const todaySeconds = todaySessions.reduce((sum, session) => sum + session.durationSeconds, 0);
  const goalProgress = target === null ? 0 : Math.min(100, todaySessions.length / target * 100);
  const statusText = target === null ? "Set today's goal to start"
    : running ? `Automatic cycle · next: ${nextMode.label}`
    : paused ? "Cycle paused" : "Ready when you are";
  const buttonText = running ? "Pause" : paused ? "Resume" : "Start";

  function confirmGoal(value: number, time: number) {
    commit(setGoal(stateRef.current, value, time));
    setNow(time);
  }

  function toggleTimer(time: number) {
    if (preferences.sound) void enableAudio().catch(() => {});
    commit(toggleFocus(stateRef.current, time));
    setNow(time);
  }

  function resetTimer(time: number) {
    commit(resetFocus(stateRef.current, time));
    setNow(time);
  }

  function changeMode(mode: TimerMode, time: number) {
    commit(selectMode(stateRef.current, mode, time));
    setNow(time);
  }

  function changeTask(taskId: string, time: number) {
    const current = advanceFocus(stateRef.current, time);
    const task = tasks.find((item) => String(item.id) === taskId);
    commit({ ...current, timer: { ...current.timer, taskId, taskTitle: task?.title ?? "Focus without a task" } });
    setNow(time);
  }

  return (
    <section
      className={
        compact
          ? "focus-view focus-view-compact"
          : "focus-view"
      }
    >
      <header className="focus-heading">
        <div>
          <h1>Focus Timer</h1>
          {!compact && (
            <p>Make space for focused, meaningful work.</p>
          )}
        </div>

        <span className="focus-heading-badge">
          Pomodoro
        </span>
      </header>

      {!compact && (
        <div className="focus-stats">
          <article className="focus-stat-card">
            <span>Focus today</span>
            <strong>{formatFocusTime(todaySeconds)}</strong>
            <p>Time from completed focus sessions</p>
          </article>
          <article className="focus-stat-card">
            <span>Completed sessions</span>
            <strong>{todaySessions.length}</strong>
            <p>One session at a time</p>
          </article>
          <article className="focus-stat-card">
            <span>Daily goal</span>
            <strong>{todaySessions.length}<small> / {target ?? "—"}</small></strong>
            {target !== null && (
              <>
                <div className="focus-goal-track" role="progressbar" aria-label="Daily focus goal"
                  aria-valuemin={0} aria-valuemax={target} aria-valuenow={Math.min(todaySessions.length, target)}>
                  <div className="focus-goal-fill" style={{ width: `${goalProgress}%` }} />
                </div>
                <p>{todaySessions.length >= target ? "Daily goal reached — keep going if you like." : `${target - todaySessions.length} sessions to go`}</p>
              </>
            )}
            <DailyGoalForm key={today} target={target} onConfirm={(value) => confirmGoal(value, Date.now())} />
          </article>
        </div>
      )}

      <div className="focus-layout">
        <div className="focus-timer-panel">
          {compact && target === null && (
            <div className="focus-compact-goal">
              <DailyGoalForm key={today} target={target} onConfirm={(value) => confirmGoal(value, Date.now())} />
            </div>
          )}
          <div className="focus-modes" role="group" aria-label="Timer mode">
            {modes.map((option) => (
              <button key={option.mode} type="button" className="focus-mode-option"
                aria-pressed={mode.mode === option.mode}
                onClick={() => changeMode(option.mode, Date.now())}>
                <span>{option.label}</span>
                <strong>{option.seconds / 60} min</strong>
              </button>
            ))}
          </div>

          <div
            className="focus-ring"
            style={{
              background: `conic-gradient(
                var(--night-accent, #a5a3ff) ${progress}%,
                var(--night-border, #33415c) 0
              )`,
            }}
          >
            <div className="focus-ring-inner">
              <span className="focus-mode-label">
                {mode.label}
              </span>

              <strong
                className="focus-time"
                role="timer"
                aria-label={`${minutes} minutes ${seconds} seconds remaining`}
              >
                {minutes}:{seconds}
              </strong>

              <span className="focus-duration">
                {mode.seconds / 60} minute session
              </span>
            </div>
          </div>

          <p className="focus-status" role="status">
            {statusText}
          </p>

          <div className="focus-controls">
            <button
              type="button"
              className="focus-start"
              disabled={target === null}
              onClick={() => toggleTimer(Date.now())}
            >
              {buttonText}
            </button>

            <button
              type="button"
              className="focus-reset"
              onClick={() => resetTimer(Date.now())}
            >
              Reset cycle
            </button>
          </div>

          <p className="focus-hint">
            {mode.mode === "focus" ? "One task. Your full attention." : "Step away and recharge. Focus starts automatically after this break."}
          </p>
        </div>

        {!compact && (
          <aside className="focus-details">
            <div className="focus-detail-panel">
              <span className="focus-eyebrow">
                YOUR NEXT STEP
              </span>

              <h2>What are you working on?</h2>
              <p>Choose a task or focus without one.</p>

              <label htmlFor="focus-task">
                Task
              </label>

              <select
                id="focus-task"
                value={selectedTask ? timer.taskId : ""}
                onChange={(event) =>
                  changeTask(event.target.value, Date.now())
                }
              >
                <option value="">No task selected</option>

                {tasks.filter((task) => task.status !== "done" || String(task.id) === timer.taskId).map((task) => (
                  <option
                    key={task.id}
                    value={String(task.id)}
                  >
                    {task.title}
                  </option>
                ))}
              </select>

              {selectedTask ? (
                <div className="focus-selected-task">
                  <span>{selectedTask.category}</span>
                  <h3>{selectedTask.title}</h3>
                </div>
              ) : (
                <p className="focus-task-note">
                  {tasks.length === 0
                    ? "Add a task on the Tasks page to see it here."
                    : "You can start a session without choosing a task."}
                </p>
              )}
            </div>

            <div className="focus-detail-panel">
              <h2>Your focus rhythm</h2>
              <p>Focus sessions and breaks switch automatically. Choose a mode above whenever you need a change.</p>
              <details className="focus-cycle-details">
                <summary>How the cycle works</summary>
                <p>{phases.map((item) => `${item.seconds / 60} min ${item.mode === "focus" ? "Focus" : item.mode === "short" ? "short break" : "long break"}`).join(" → ")}. Then repeat.</p>
                <p>Switching modes restarts the selected phase. A running timer keeps running; a paused timer stays paused. Only completed Focus sessions count.</p>
                <p>At midnight, confirm a new daily goal before resuming.</p>
              </details>
            </div>
          </aside>
        )}
      </div>

      {!compact && (
        <section className="focus-history">
          <div className="focus-history-heading">
            <div>
              <h2>Today's sessions</h2>
              <p>Your completed focus sessions, all in one place.</p>
            </div>
            <span className="focus-history-count">{todaySessions.length} completed</span>
          </div>
          {todaySessions.length === 0 ? (
            <div className="focus-history-empty">
              <div className="focus-empty-symbol" aria-hidden="true">◷</div>
              <h3>Your first session starts here</h3>
              <p>Complete a Focus session to see it in your history.</p>
            </div>
          ) : (
            <table className="focus-history-table">
              <caption className="focus-sr-only">Completed focus sessions today</caption>
              <thead>
                <tr>
                  <th scope="col">Completed at</th>
                  <th scope="col">Task</th>
                  <th scope="col">Duration</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {todaySessions.map((session) => (
                  <tr key={session.id}>
                    <td data-label="Completed at">
                      <time dateTime={new Date(session.completedAt).toISOString()}>
                        {new Date(session.completedAt).toLocaleTimeString("pl-PL", {
                          hour: "2-digit", minute: "2-digit", hour12: preferences.clock === "12",
                        })}
                      </time>
                    </td>
                    <td data-label="Task" className="focus-history-task">{session.taskTitle}</td>
                    <td data-label="Duration">{formatFocusTime(session.durationSeconds)}</td>
                    <td data-label="Status"><span className="focus-session-done">Completed</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {storageError && (
        <p className="focus-error" role="alert">
          {storageError}
        </p>
      )}
    </section>
  );
}

export default FocusTimer;


