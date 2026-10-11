import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { usePreferences } from "../lib/usePreferences";
import { DEFAULT_FOCUS, PREFERENCES_KEY, readPreferences, savePreferences, validFocusConfig, type Preferences } from "../lib/preferences";
import { FOCUS_STORAGE_KEY, loadFocus, resetFocus } from "../lib/pomodoro";
import { createBackup, importBackup, parseBackup, replaceStored, resetSection, RESET_SECTIONS, type Backup, type ResetSection } from "../lib/backup";
import { playChime } from "../lib/sound";
import "./PlanningPages.css";
import "./SettingsPage.css";

type FocusDraft = { focusMinutes: string; shortMinutes: string; longMinutes: string; rounds: string };
const focusDraft = (p: Preferences["focus"]): FocusDraft => ({ focusMinutes: String(p.focusMinutes), shortMinutes: String(p.shortMinutes), longMinutes: String(p.longMinutes), rounds: String(p.rounds) });
export default function SettingsPage() {
  const preferences = usePreferences();
  const [focus, setFocus] = useState<FocusDraft>(() => focusDraft(readPreferences().focus));
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pendingBackup, setPendingBackup] = useState<Backup | null>(null);
  const [backupName, setBackupName] = useState("");
  const [section, setSection] = useState<ResetSection>("tasks");
  const [confirmation, setConfirmation] = useState("");
  const [action, setAction] = useState<"import" | "reset" | "focus">("import");
  const dialog = useRef<HTMLDialogElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  function update(patch: Partial<Preferences>) {
    try { savePreferences({ ...readPreferences(), ...patch }); setError(""); setNotice("Settings saved."); }
    catch { setError("Could not save settings in this browser. Try again before leaving this page."); }
  }
  function exportData() {
    try {
      const backup = createBackup(Date.now());
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a"); link.href = url; link.download = `devflow-backup-${backup.createdAt.slice(0, 10)}.json`;
      document.body.append(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setError(""); setNotice("Backup download started. Keep the file somewhere safe.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not export your data."); }
  }
  async function chooseBackup(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; e.target.value = ""; if (!file) return;
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error("Choose a backup smaller than 10 MB.");
      const backup = parseBackup(await file.text());
      setPendingBackup(backup); setBackupName(file.name); setAction("import"); setConfirmation(""); setError(""); dialog.current?.showModal();
    } catch (e) { setError(e instanceof Error ? e.message : "The selected file is not a valid backup."); }
  }
  function submitFocus(e: FormEvent) {
    e.preventDefault();
    const candidate = Object.fromEntries(Object.entries(focus).map(([key, value]) => [key, Number(value)]));
    if (Object.values(focus).some((v) => !/^\d+$/.test(v)) || !validFocusConfig(candidate)) { setError("Use whole minutes: Focus 1–120, short break 1–60, long break 1–120, and 1–12 sessions per cycle."); return; }
    setError(""); setAction("focus"); dialog.current?.showModal();
  }
  function confirmAction() {
    try {
      if (action === "import" && pendingBackup) { if (confirmation !== "IMPORT") return; importBackup(pendingBackup); setFocus(focusDraft(pendingBackup.data.preferences.focus)); setNotice("Backup restored. Your timer is paused."); }
      if (action === "reset") { if (confirmation !== "RESET") return; resetSection(section); setFocus(focusDraft(readPreferences().focus)); setNotice(section === "all" ? "Workspace reset. Settings restored to defaults." : `${section[0].toUpperCase() + section.slice(1)} data cleared.`); }
      if (action === "focus") {
        const config = Object.fromEntries(Object.entries(focus).map(([key, value]) => [key, Number(value)]));
        if (!validFocusConfig(config)) throw new Error("Invalid timer settings.");
        const next = { ...readPreferences(), focus: config };
        const state = resetFocus(loadFocus(localStorage, Date.now()), Date.now(), config);
        replaceStored({ [PREFERENCES_KEY]: JSON.stringify(next), [FOCUS_STORAGE_KEY]: JSON.stringify(state) });
        setNotice("Timer settings saved. A fresh cycle is ready; your history and daily goal are preserved.");
      }
      setError(""); dialog.current?.close(); setPendingBackup(null);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save changes."); }
  }
  const initials = preferences.name.trim() ? preferences.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() : "DF";
  return <section className="planner-page settings-page">
    <header className="planner-header"><div><h1>Settings</h1><p>Make DevFlow feel like your workspace.</p></div><span className="planner-tag">Local workspace</span></header>
    <div className="settings-layout"><nav className="settings-nav" aria-label="Settings sections"><a href="#settings-profile">Profile</a><a href="#settings-appearance">Appearance</a><a href="#settings-focus">Focus Timer</a><a href="#settings-calendar">Calendar & time</a><a href="#settings-backup">Backup & restore</a><a href="#settings-reset">Reset data</a></nav>
    <div className="settings-sections">
      <section id="settings-profile" className="planner-panel settings-panel"><div className="settings-section-heading"><span className="settings-symbol" aria-hidden="true">◎</span><div><h2>Your profile</h2><p>A personal touch for your dashboard.</p></div></div><div className="settings-profile-row"><span className="settings-avatar" aria-hidden="true">{initials}</span><label>Display name<input maxLength={60} value={preferences.name} onChange={(e) => update({ name: e.target.value })} placeholder="e.g. Alan" autoComplete="nickname" /></label></div><p className="planner-footnote">This profile stays in this browser. No account or sign-in is needed.</p></section>
      <section id="settings-appearance" className="planner-panel settings-panel"><div className="settings-section-heading"><span className="settings-symbol" aria-hidden="true">◐</span><div><h2>Appearance</h2><p>Choose your theme and how much fits on the screen.</p></div></div><div className="settings-row"><div><h3>Theme</h3><p>Applied across the entire workspace.</p></div><div className="settings-choice" role="group" aria-label="Theme"><button aria-pressed={preferences.theme === "dark"} onClick={() => update({ theme: "dark" })}>☾ Dark</button><button aria-pressed={preferences.theme === "light"} onClick={() => update({ theme: "light" })}>☀ Light</button></div></div><div className="settings-row"><div><h3>Density</h3><p>Compact uses tighter spacing on desktop.</p></div><div className="settings-choice" role="group" aria-label="Density"><button aria-pressed={preferences.density === "standard"} onClick={() => update({ density: "standard" })}>Standard</button><button aria-pressed={preferences.density === "compact"} onClick={() => update({ density: "compact" })}>Compact</button></div></div></section>
      <section id="settings-focus" className="planner-panel settings-panel"><div className="settings-section-heading"><span className="settings-symbol" aria-hidden="true">◷</span><div><h2>Focus Timer</h2><p>A rhythm that works for you.</p></div></div><form onSubmit={submitFocus} noValidate><div className="settings-focus-inputs">{[["focusMinutes", "Focus (minutes)", 120], ["shortMinutes", "Short break (minutes)", 60], ["longMinutes", "Long break (minutes)", 120], ["rounds", "Focus sessions before long break", 12]].map(([key, label, max]) => <label key={String(key)}>{label}<input type="number" min="1" max={Number(max)} step="1" value={focus[key as keyof FocusDraft]} onChange={(e) => setFocus({ ...focus, [key]: e.target.value })} /></label>)}</div><p className="planner-footnote">Defaults: 25 min Focus, 5 min short break, 15 min long break after 3 Focus sessions. The cycle repeats automatically.</p><div className="settings-inline-actions"><button type="submit" className="planner-primary">Apply timer settings</button><button type="button" className="planner-secondary" onClick={() => setFocus(focusDraft(DEFAULT_FOCUS))}>Use default values</button></div></form><div className="settings-row"><div><h3>End-of-phase sound</h3><p>A gentle chime while the timer is visible on the screen.</p></div><label className="settings-toggle"><input type="checkbox" aria-label="End-of-phase sound" checked={preferences.sound} onChange={(e) => update({ sound: e.target.checked })} /><span>{preferences.sound ? "On" : "Off"}</span></label></div><button className="planner-link" onClick={() => { void playChime().then(() => { setError(""); setNotice("Sound played. Check your device volume if you did not hear it."); }).catch(() => setError("Sound is unavailable. Check this browser's audio permissions and try again.")); }}>Test sound ♫</button></section>
      <section id="settings-calendar" className="planner-panel settings-panel"><div className="settings-section-heading"><span className="settings-symbol" aria-hidden="true">▦</span><div><h2>Calendar & time</h2><p>Keep your schedule familiar.</p></div></div><div className="settings-row"><div><h3>First day of the week</h3><p>Used in the monthly calendar.</p></div><select aria-label="First day of the week" value={preferences.weekStart} onChange={(e) => update({ weekStart: e.target.value as Preferences["weekStart"] })}><option value="monday">Monday</option><option value="sunday">Sunday</option></select></div><div className="settings-row"><div><h3>Time format</h3><p>For events and completed focus sessions.</p></div><select aria-label="Time format" value={preferences.clock} onChange={(e) => update({ clock: e.target.value as Preferences["clock"] })}><option value="24">24 hour · 16:30</option><option value="12">12 hour · 4:30 PM</option></select></div><p className="planner-footnote">Dates and times follow this device's time zone.</p></section>
      <section id="settings-backup" className="planner-panel settings-panel"><div className="settings-section-heading"><span className="settings-symbol" aria-hidden="true">⇩</span><div><h2>Backup & restore</h2><p>Take your workspace with you.</p></div></div><p className="settings-description">Export tasks, projects, applications, goals, calendar events, Focus history and settings to one JSON file. Import it into another browser to restore your workspace.</p><div className="settings-inline-actions"><button className="planner-primary" onClick={exportData}>Export backup</button><button className="planner-secondary" onClick={() => fileInput.current?.click()}>Import backup</button><input ref={fileInput} className="settings-file" type="file" accept="application/json,.json" aria-label="Backup file" onChange={(e) => { void chooseBackup(e); }} /></div><p className="planner-footnote">Import replaces the current workspace after confirmation. The imported timer stays paused. Backup files contain your notes and personal data.</p></section>
      <section id="settings-reset" className="planner-panel settings-panel settings-danger"><div className="settings-section-heading"><span className="settings-symbol" aria-hidden="true">↺</span><div><h2>Reset data</h2><p>Clear one section or start again.</p></div></div><div className="settings-row"><label>Section to clear<select aria-label="Section to clear" value={section} onChange={(e) => setSection(e.target.value as ResetSection)}>{RESET_SECTIONS.map((s) => <option key={s} value={s}>{s === "all" ? "Entire workspace, including settings" : s === "focus" ? "Focus history, daily goal and timer" : s[0].toUpperCase() + s.slice(1)}</option>)}</select></label><button className="planner-danger" onClick={() => { setAction("reset"); setConfirmation(""); setError(""); dialog.current?.showModal(); }}>Clear selected data</button></div><p className="planner-footnote">This cannot be undone without a backup. Other sections stay unchanged when you clear a single section.</p></section>
      {error && <p className="planner-error settings-feedback" role="alert">{error}</p>}<p className="settings-feedback planner-success" role="status">{notice || "Profile, appearance and calendar changes save automatically. Apply timer settings separately."}</p>
    </div></div>
    <dialog ref={dialog} className="planner-dialog settings-confirm" aria-labelledby="settings-confirm-title"><div className="planner-between"><h2 id="settings-confirm-title">{action === "import" ? "Restore this backup?" : action === "reset" ? "Clear selected data?" : "Start a new timer cycle?"}</h2><button className="planner-quiet" aria-label="Close confirmation" onClick={() => dialog.current?.close()}>×</button></div>{action === "import" && pendingBackup ? <><p className="settings-description">{backupName}</p><ul className="settings-backup-counts"><li>{pendingBackup.data.tasks.length} tasks</li><li>{pendingBackup.data.projects.length} projects</li><li>{pendingBackup.data.applications.length} applications</li><li>{pendingBackup.data.goals.length} goals</li><li>{pendingBackup.data.calendar.length} events</li><li>{pendingBackup.data.focus.sessions.length} Focus sessions</li></ul><p className="settings-description">Your current data and settings will be replaced. Export a backup first if you want to keep them.</p></> : action === "reset" ? <p className="settings-description">{section === "all" ? "All DevFlow data and settings in this browser will be cleared." : `All ${section} data in this browser will be cleared.`} Export a backup first if you want to keep it.</p> : <p className="settings-description">This stops the current timer and resets its cycle to a full Focus session with the new durations. Your completed sessions and today's goal are kept.</p>}{action !== "focus" && <label>Type {action === "import" ? "IMPORT" : "RESET"} to confirm<input aria-label="Confirmation text" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} autoComplete="off" /></label>}{error && <p className="planner-error" role="alert">{error}</p>}<div className="planner-form-actions"><button className="planner-secondary" onClick={() => dialog.current?.close()}>Cancel</button><button className={action === "reset" ? "planner-danger" : "planner-primary"} disabled={action !== "focus" && confirmation !== (action === "import" ? "IMPORT" : "RESET")} onClick={confirmAction}>{action === "import" ? "Restore backup" : action === "reset" ? "Confirm reset" : "Apply and reset cycle"}</button></div></dialog>
  </section>;
}

