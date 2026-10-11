import { useEffect, useRef, useState, type FormEvent } from "react";
import "./ApplicationsPage.css";

const STORAGE_KEY = "devflow.applications.v1";
const STATUSES = [
  { value: "saved", label: "To apply" },
  { value: "sent", label: "Applied" },
  { value: "interview", label: "Interview" },
  { value: "assignment", label: "Assignment" },
  { value: "offer", label: "Offer" },
  { value: "rejected", label: "Rejected" },
  { value: "withdrawn", label: "Withdrawn" },
] as const;
type Status = (typeof STATUSES)[number]["value"];
type Application = {
  id: string; company: string; role: string; status: Status; url: string;
  appliedOn: string; salary: string; nextStep: string; deadline: string; notes: string;
};
type Draft = Omit<Application, "id">;
const emptyDraft = (): Draft => ({ company: "", role: "", status: "saved", url: "", appliedOn: "", salary: "", nextStep: "", deadline: "", notes: "" });
const isActive = (status: Status) => ["sent", "interview", "assignment", "offer"].includes(status);
const statusLabel = (status: Status) => STATUSES.find((item) => item.value === status)!.label;

function dateNumber(value: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
  const parsed = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(parsed) && new Date(parsed).toISOString().slice(0, 10) === value ? parsed / 86400000 : NaN;
}
function todayNumber() {
  const now = new Date();
  return dateNumber(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`);
}
function displayDate(value: string) {
  return value ? new Date(`${value}T12:00:00`).toLocaleDateString("pl-PL") : "—";
}
function safeUrl(value: string) {
  try { return ["https:", "http:"].includes(new URL(value).protocol); }
  catch { return false; }
}
function deadlineInfo(item: Application, today: number) {
  if (!item.deadline || ["rejected", "withdrawn"].includes(item.status)) return null;
  const days = dateNumber(item.deadline) - today;
  if (days < 0) return { tone: "overdue", label: `Overdue · ${Math.abs(days)}d` };
  if (days === 0) return { tone: "soon", label: "Today" };
  if (days === 1) return { tone: "soon", label: "Tomorrow" };
  if (days <= 3) return { tone: "soon", label: `In ${days} days` };
  return null;
}
function loadApplications(): { items: Application[]; error: string } {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(parsed)) throw new Error("Invalid applications");
    const valid = parsed.every((item) => item && typeof item === "object" &&
      ["id", "company", "role", "url", "appliedOn", "salary", "nextStep", "deadline", "notes"].every((key) => typeof item[key] === "string") &&
      item.id && item.company.trim() && item.role.trim() && STATUSES.some((s) => s.value === item.status) &&
      (!item.url || safeUrl(item.url)) && (!item.appliedOn || Number.isFinite(dateNumber(item.appliedOn))) &&
      (!item.deadline || Number.isFinite(dateNumber(item.deadline))));
    if (!valid || new Set(parsed.map((item) => item.id)).size !== parsed.length) throw new Error("Invalid applications");
    return { items: parsed, error: "" };
  } catch {
    return { items: [], error: "Saved applications could not be read. Reload the page before making changes; existing browser data has been kept." };
  }
}

export default function ApplicationsPage() {
  const [loaded] = useState(loadApplications);
  const [items, setItems] = useState(loaded.items);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [notice, setNotice] = useState("");
  const [today, setToday] = useState(todayNumber);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const companyRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const refresh = () => setToday(todayNumber());
    const interval = window.setInterval(refresh, 60000);
    window.addEventListener("focus", refresh);
    return () => { window.clearInterval(interval); window.removeEventListener("focus", refresh); };
  }, []);

  const query = search.trim().toLocaleLowerCase();
  const visible = items.filter((item) => (filter === "all" || item.status === filter) &&
    `${item.company} ${item.role}`.toLocaleLowerCase().includes(query));
  const submitted = items.filter((item) => item.appliedOn || item.status !== "saved").length;
  const active = items.filter((item) => isActive(item.status)).length;
  const interviews = items.filter((item) => item.status === "interview").length;
  const rejected = items.filter((item) => item.status === "rejected").length;
  const attention = items.filter((item) => deadlineInfo(item, today)).length;

  function openForm(item?: Application) {
    setEditingId(item?.id ?? null);
    setDraft(item ? { ...item } : emptyDraft());
    setError(""); setConfirmDelete(false);
    dialogRef.current?.showModal();
    companyRef.current?.focus();
  }
  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setError(""); setConfirmDelete(false);
  }
  function persist(next: Application[]) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setItems(next);
      return true;
    } catch {
      setError("Could not save in this browser. Your form is still here — try again before closing it.");
      return false;
    }
  }
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loaded.error) return;
    const cleaned: Draft = { ...draft, company: draft.company.trim(), role: draft.role.trim(), url: draft.url.trim(),
      salary: draft.salary.trim(), nextStep: draft.nextStep.trim(), notes: draft.notes.trim() };
    if (!cleaned.company || !cleaned.role) {
      setError("Enter a company and a position."); return;
    }
    if (cleaned.url && !safeUrl(cleaned.url)) {
      setError("Enter a full offer link starting with https:// or http://."); return;
    }
    if ([cleaned.appliedOn, cleaned.deadline].some((value) => value && !Number.isFinite(dateNumber(value)))) {
      setError("Enter a valid date."); return;
    }
    const item: Application = { ...cleaned, id: editingId ?? crypto.randomUUID() };
    const next = editingId ? items.map((current) => current.id === editingId ? item : current) : [item, ...items];
    if (persist(next)) {
      setNotice(editingId ? "Application updated." : "Application added.");
      dialogRef.current?.close();
    }
  }
  function remove() {
    if (loaded.error || !editingId) return;
    if (persist(items.filter((item) => item.id !== editingId))) {
      setNotice("Application deleted."); dialogRef.current?.close();
    }
  }

  return (
    <section className="applications-page">
      <header className="applications-header">
        <div><h1>Applications</h1><p>Your next opportunity starts here. Keep every step in view.</p></div>
        <button className="applications-primary" disabled={Boolean(loaded.error)} onClick={() => openForm()}>+ Add application</button>
      </header>
      <div className="applications-stats">
        <article><span>Applications sent <b aria-hidden="true">↗</b></span><strong>{submitted}</strong><p>Submitted across all stages</p></article>
        <article><span>Active processes <b aria-hidden="true">◎</b></span><strong>{active}</strong><p>Applied, interviews, assignments & offers</p></article>
        <article><span>Interviews <b aria-hidden="true">◇</b></span><strong>{interviews}</strong><p>Currently at the interview stage</p></article>
        <article><span>Rejected <b aria-hidden="true">×</b></span><strong>{rejected}</strong><p>Applications declined by the company</p></article>
      </div>
      {loaded.error && <p className="applications-error" role="alert">{loaded.error}</p>}
      <div className="applications-board">
        <div className="applications-board-heading"><div><h2>Your applications <span>{items.length}</span></h2><p>{attention ? `${attention} with a next step due within 3 days or overdue` : "A clear view of your job search"}</p></div><span className="applications-local">Saved in this browser</span></div>
        <div className="applications-toolbar">
          <label className="applications-search">Search applications<input type="search" placeholder="Search company or position…" value={search} onChange={(e) => setSearch(e.target.value)} /></label>
          <label>Status<select aria-label="Status" value={filter} onChange={(e) => setFilter(e.target.value)}><option value="all">All statuses</option>{STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></label>
          <span className="applications-results">{visible.length} of {items.length} applications</span>
        </div>
        {visible.length ? <><div className="applications-table-wrap"><table className="applications-table">
          <caption className="applications-sr-only">Job applications. Select a company to view or edit details.</caption>
          <thead><tr><th scope="col">Company</th><th scope="col">Position</th><th scope="col">Status</th><th scope="col">Applied on</th><th scope="col">Next step</th><th scope="col"><span className="applications-sr-only">Details</span></th></tr></thead>
          <tbody>{visible.map((item) => {
            const due = deadlineInfo(item, today);
            return <tr key={item.id} onClick={() => openForm(item)}>
              <td><button className="applications-company" onClick={(e) => { e.stopPropagation(); openForm(item); }} aria-label={`Edit application at ${item.company} for ${item.role}`}><span className="applications-monogram" aria-hidden="true">{item.company.slice(0, 2).toUpperCase()}</span><strong>{item.company}</strong></button></td>
              <td>{item.role}</td><td><span className={`applications-status status-${item.status}`}>{statusLabel(item.status)}</span></td>
              <td className="applications-date">{displayDate(item.appliedOn)}</td>
              <td><div className="applications-next"><span>{item.nextStep || "No next step set"}</span>{item.deadline && <small>{displayDate(item.deadline)}</small>}{due && <span className={`applications-deadline ${due.tone}`}>{due.label}</span>}</div></td>
              <td aria-hidden="true" className="applications-arrow">↗</td>
            </tr>;
          })}</tbody>
        </table></div><div className="applications-mobile-list" aria-label="Your applications">{visible.map((item) => {
          const due = deadlineInfo(item, today);
          return <button type="button" key={item.id} className="application-mobile-card" onClick={() => openForm(item)} aria-label={`Edit application at ${item.company} for ${item.role}`}>
            <span className="application-mobile-heading"><span className="applications-monogram" aria-hidden="true">{item.company.slice(0, 2).toUpperCase()}</span><span><strong>{item.company}</strong><small>{item.role}</small></span></span>
            <span className="application-mobile-meta"><span className={`applications-status status-${item.status}`}>{statusLabel(item.status)}</span><small>Applied: {displayDate(item.appliedOn)}</small></span>
            <span className="applications-next"><span>{item.nextStep || "No next step set"}</span>{item.deadline && <small>{displayDate(item.deadline)}</small>}{due && <span className={`applications-deadline ${due.tone}`}>{due.label}</span>}</span>
            <span className="application-mobile-action">View details & edit ↗</span>
          </button>;
        })}</div></> : <div className="applications-empty"><span aria-hidden="true">↗</span><h3>{items.length ? "No matching applications" : "Make room for your next opportunity"}</h3><p>{items.length ? "Try another company, position or status." : "Save an interesting role, track your application and plan what comes next."}</p>{items.length ? <button className="applications-secondary" onClick={() => { setSearch(""); setFilter("all"); }}>Clear filters</button> : <button className="applications-primary" disabled={Boolean(loaded.error)} onClick={() => openForm()}>+ Add your first application</button>}</div>}
      </div>
      <p className="applications-notice" role="status">{notice}</p>

      <dialog ref={dialogRef} className={`applications-dialog${editingId ? " applications-drawer" : ""}`} aria-labelledby="application-dialog-title">
        <div className="applications-dialog-heading"><div><span className="applications-eyebrow">YOUR NEXT OPPORTUNITY</span><h2 id="application-dialog-title">{editingId ? "Application details" : "Add application"}</h2><p>{editingId ? "Update the details and save your changes." : "Only company and position are required."}</p></div><button type="button" className="applications-close" aria-label="Close application form" onClick={() => dialogRef.current?.close()}>×</button></div>
        <form onSubmit={save} noValidate>
          <div className="applications-form-grid">
            <label>Company *<input ref={companyRef} value={draft.company} onChange={(e) => update("company", e.target.value)} required maxLength={120} placeholder="Company name" /></label>
            <label>Position *<input value={draft.role} onChange={(e) => update("role", e.target.value)} required maxLength={160} placeholder="e.g. Junior Frontend Developer" /></label>
            <label>Status<select aria-label="Status" value={draft.status} onChange={(e) => update("status", e.target.value as Status)}>{STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></label>
            <label>Applied on<input type="date" value={draft.appliedOn} onChange={(e) => update("appliedOn", e.target.value)} /></label>
            <label className="applications-wide">Offer link<input type="url" value={draft.url} onChange={(e) => update("url", e.target.value)} maxLength={2000} placeholder="https://…" /></label>
            {safeUrl(draft.url) && <a className="applications-offer-link applications-wide" href={draft.url} target="_blank" rel="noopener noreferrer">Open offer in a new tab ↗</a>}
            <label className="applications-wide">Salary range<input value={draft.salary} onChange={(e) => update("salary", e.target.value)} maxLength={120} placeholder="e.g. 6,000–8,000 PLN gross / month" /></label>
            <label>Next step<input value={draft.nextStep} onChange={(e) => update("nextStep", e.target.value)} maxLength={200} placeholder="e.g. Technical interview" /></label>
            <label>Next step deadline<input type="date" value={draft.deadline} onChange={(e) => update("deadline", e.target.value)} /></label>
            <label className="applications-wide">Notes<textarea aria-label="Notes" rows={4} value={draft.notes} onChange={(e) => update("notes", e.target.value)} maxLength={10000} placeholder="Recruiter details, interview notes, questions to ask…" /></label>
          </div>
          {error && <p className="applications-error" role="alert">{error}</p>}
          {confirmDelete && <div className="applications-delete-confirm"><p>Delete this application at <strong>{draft.company}</strong>? This cannot be undone.</p><div><button type="button" className="applications-danger" onClick={remove}>Confirm delete</button><button type="button" className="applications-secondary" onClick={() => setConfirmDelete(false)}>Keep application</button></div></div>}
          <div className="applications-form-actions">{editingId && <button type="button" className="applications-delete" onClick={() => setConfirmDelete(true)}>Delete application</button>}<div><button type="button" className="applications-secondary" onClick={() => dialogRef.current?.close()}>Cancel</button><button type="submit" className="applications-primary">{editingId ? "Save changes" : "Save application"}</button></div></div>
        </form>
      </dialog>
    </section>
  );
}




