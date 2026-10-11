import { useRef, useState, type FormEvent } from "react";
import "./LearningPage.css";

type Topic = { id: string; title: string; completed: boolean };
type PathColor = "violet" | "blue" | "mint";
type LearningPath = { id: string; title: string; description: string; color: PathColor; topics: Topic[] };
const STORAGE_KEY = "devflow.learning.v1";
const COLORS: PathColor[] = ["violet", "blue", "mint"];
const TEMPLATES = [
  { title: "React fundamentals", description: "Build a solid foundation for creating interactive interfaces.", color: "violet" as const,
    topics: ["Components & JSX", "Props and composition", "State and events", "Effects and lifecycle", "Forms and validation", "React Router"] },
  { title: "TypeScript essentials", description: "Write clearer, safer code with types you understand.", color: "blue" as const,
    topics: ["Basic types", "Objects and interfaces", "Unions and narrowing", "Generics"] },
  { title: "Git & GitHub", description: "Keep track of your work and collaborate with confidence.", color: "mint" as const,
    topics: ["Commits and history", "Branches and merging", "Pull requests", "Resolving conflicts"] },
];

function loadPaths(): LearningPath[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(saved)) return [];
    const valid = saved.every((path) =>
      path !== null && typeof path === "object" && typeof path.id === "string" &&
      typeof path.title === "string" && path.title.trim().length > 0 && typeof path.description === "string" &&
      COLORS.includes(path.color) && Array.isArray(path.topics) &&
      path.topics.every((topic: unknown) => {
        if (topic === null || typeof topic !== "object") return false;
        const item = topic as Record<string, unknown>;
        return typeof item.id === "string" && typeof item.title === "string" && item.title.trim().length > 0 && typeof item.completed === "boolean";
      }) && new Set(path.topics.map((topic: Topic) => topic.id)).size === path.topics.length
    );
    if (valid && new Set(saved.map((path) => path.id)).size === saved.length) return saved;
  } catch { /* Start empty when browser data is unavailable or invalid. */ }
  return [];
}

function BookIcon() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 6v14m0-14C9 3 5 3 2 4v15c3-1 7-1 10 1m0-14c3-3 7-3 10-2v15c-3-1-7-1-10 1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function completion(path: LearningPath) {
  const done = path.topics.filter((topic) => topic.completed).length;
  return { done, percent: path.topics.length ? Math.round(done / path.topics.length * 100) : 0 };
}

function LearningPage() {
  const [paths, setPaths] = useState(loadPaths);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [pathError, setPathError] = useState("");
  const [topicTitle, setTopicTitle] = useState("");
  const [topicError, setTopicError] = useState("");
  const [storageError, setStorageError] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const topicRef = useRef<HTMLInputElement>(null);

  const selected = paths.find((path) => path.id === selectedId) ?? paths[0];
  const selectedProgress = selected ? completion(selected) : { done: 0, percent: 0 };
  const totalTopics = paths.reduce((sum, path) => sum + path.topics.length, 0);
  const doneTopics = paths.reduce((sum, path) => sum + completion(path).done, 0);
  const activePaths = paths.filter((path) => completion(path).percent < 100).length;
  const overallProgress = totalTopics ? Math.round(doneTopics / totalTopics * 100) : 0;

  function savePaths(next: LearningPath[]) {
    setPaths(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setStorageError("");
    } catch {
      setStorageError("Your changes could not be saved in this browser and may be lost after refreshing.");
    }
  }

  function selectPath(id: string) {
    setSelectedId(id);
    setTopicTitle("");
    setTopicError("");
  }

  function openPathForm() {
    setDraftTitle("");
    setDraftDescription("");
    setPathError("");
    dialogRef.current?.showModal();
    titleRef.current?.focus();
  }

  function createPath(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = draftTitle.trim();
    if (!title) {
      setPathError("Enter a name for your learning path.");
      titleRef.current?.focus();
      return;
    }
    if (paths.some((path) => path.title.toLowerCase() === title.toLowerCase())) {
      setPathError("A path with this name already exists.");
      titleRef.current?.focus();
      return;
    }
    const path: LearningPath = { id: crypto.randomUUID(), title, description: draftDescription.trim(), color: COLORS[paths.length % COLORS.length], topics: [] };
    savePaths([path, ...paths]);
    selectPath(path.id);
    dialogRef.current?.close();
    setAnnouncement(`Created ${title}. Add your first topic to get started.`);
  }

  function addTemplate(template: typeof TEMPLATES[number]) {
    if (paths.some((path) => path.title.toLowerCase() === template.title.toLowerCase())) return;
    const path: LearningPath = { ...template, id: crypto.randomUUID(), topics: template.topics.map((title) => ({ id: crypto.randomUUID(), title, completed: false })) };
    savePaths([...paths, path]);
    selectPath(path.id);
    setAnnouncement(`Added ${template.title}. All topics are ready to start.`);
  }

  function addTopic(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const title = topicTitle.trim();
    if (!title) {
      setTopicError("Enter a topic name.");
      topicRef.current?.focus();
      return;
    }
    if (selected.topics.some((topic) => topic.title.toLowerCase() === title.toLowerCase())) {
      setTopicError("This topic is already in this path.");
      return;
    }
    const topic = { id: crypto.randomUUID(), title, completed: false };
    savePaths(paths.map((path) => path.id === selected.id ? { ...path, topics: [...path.topics, topic] } : path));
    setTopicTitle("");
    setTopicError("");
    setAnnouncement(`Added ${title}.`);
    topicRef.current?.focus();
  }

  function toggleTopic(id: string) {
    if (!selected) return;
    savePaths(paths.map((path) => path.id === selected.id
      ? { ...path, topics: path.topics.map((topic) => topic.id === id ? { ...topic, completed: !topic.completed } : topic) }
      : path));
  }

  return (
    <div className="learning-page">
      <header className="learning-header">
        <div><h1>Learning</h1><p>Build your skills, one topic at a time.</p></div>
        <button type="button" className="learning-primary" onClick={openPathForm}><span aria-hidden="true">＋</span> New path</button>
      </header>
      <p className="learning-sr-only" role="status">{announcement}</p>
      {storageError && <p className="learning-error" role="alert">{storageError}</p>}

      <div className="learning-stats">
        <article><span className="learning-stat-label">Active paths<span className="learning-stat-symbol" aria-hidden="true">↗</span></span><strong>{activePaths}</strong><p>{paths.length} learning paths in your collection</p></article>
        <article><span className="learning-stat-label">Topics completed<span className="learning-stat-symbol mint" aria-hidden="true">✓</span></span><strong>{doneTopics}<small> / {totalTopics}</small></strong><p>Small steps. Real progress.</p></article>
        <article><span className="learning-stat-label">Overall progress<span className="learning-stat-symbol blue" aria-hidden="true">◷</span></span><strong>{overallProgress}<small>%</small></strong><p>Across all your learning topics</p></article>
      </div>

      <div className="learning-layout">
        <section className="learning-library" aria-labelledby="learning-paths-heading">
          <div className="learning-section-heading"><h2 id="learning-paths-heading">Your learning paths</h2><span>{paths.length} paths</span></div>
          {paths.length === 0 ? (
            <div className="learning-empty">
              <span className="learning-book"><BookIcon /></span>
              <h3>What do you want to learn next?</h3>
              <p>Create a path, break it into topics, and watch your progress grow.</p>
              <button type="button" className="learning-primary" onClick={openPathForm}>Create your first path</button>
            </div>
          ) : (
            <div className="learning-path-grid">
              {paths.map((path) => {
                const { done, percent } = completion(path);
                return (
                  <button type="button" key={path.id} className={`learning-path-card ${path.color}`}
                    aria-pressed={selected?.id === path.id} onClick={() => selectPath(path.id)}>
                    <span className="learning-card-top"><span className="learning-path-mark" aria-hidden="true">{path.title.slice(0, 2).toUpperCase()}</span><span className={`learning-path-status ${percent === 100 ? "is-complete" : ""}`}>{percent === 100 ? "Completed" : done > 0 ? "In progress" : "Ready to start"}</span></span>
                    <h3>{path.title}</h3><p>{path.description || "Your next skill starts here."}</p>
                    <span className="learning-card-progress-label"><span>{done} / {path.topics.length} topics</span><strong>{percent}%</strong></span>
                    <span className="learning-progress-track" aria-hidden="true"><span style={{ width: `${percent}%` }} /></span>
                    <span className="learning-card-footer">{selected?.id === path.id ? "Viewing topics" : "Explore path"}<span aria-hidden="true">→</span></span>
                  </button>
                );
              })}
            </div>
          )}
          <div className="learning-quick-start">
            <span className="learning-eyebrow">A LITTLE INSPIRATION</span>
            <h3>Start with a suggested path</h3><p>Use a ready-made topic list to get going.</p>
            <div className="learning-template-list">
              {TEMPLATES.map((template) => {
                const added = paths.some((path) => path.title.toLowerCase() === template.title.toLowerCase());
                return <button key={template.title} type="button" disabled={added} onClick={() => addTemplate(template)}>
                  <span>{template.title}</span><span aria-hidden="true">{added ? "✓" : "+"}</span>
                </button>;
              })}
            </div>
          </div>
        </section>

        <section className={`learning-detail ${selected?.color ?? "violet"}`} aria-labelledby="learning-detail-heading">
          {selected ? (
            <>
              <div className="learning-detail-top"><span className="learning-eyebrow">YOUR NEXT STEPS</span><span className="learning-book small"><BookIcon /></span></div>
              <h2 id="learning-detail-heading">{selected.title}</h2>
              <p className="learning-detail-description">{selected.description || "Add the topics you want to learn in this path."}</p>
              <div className="learning-detail-progress">
                <div><span>Path progress</span><strong>{selectedProgress.percent}%</strong></div>
                <div className="learning-progress-track" role="progressbar" aria-label={`${selected.title} progress`}
                  aria-valuemin={0} aria-valuemax={100} aria-valuenow={selectedProgress.percent}>
                  <span style={{ width: `${selectedProgress.percent}%` }} />
                </div>
              </div>
              <div className="learning-topics-heading"><h3>Topics</h3><span>{selectedProgress.done} of {selected.topics.length} completed</span></div>
              {selected.topics.length === 0 ? <p className="learning-no-topics">Every path starts with one topic. Add yours below.</p> : (
                <ul className="learning-topic-list">
                  {selected.topics.map((topic, index) => (
                    <li key={topic.id}>
                      <label className={topic.completed ? "is-done" : ""}>
                        <input type="checkbox" checked={topic.completed} onChange={() => toggleTopic(topic.id)} />
                        <span>{topic.title}</span><small aria-hidden="true">{String(index + 1).padStart(2, "0")}</small>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
              {selectedProgress.percent === 100 && <p className="learning-complete" role="status">✓ Path complete. One more skill in your toolkit.</p>}
              <form className="learning-topic-form" onSubmit={addTopic} noValidate>
                <label htmlFor="learning-topic-title">Add a topic</label>
                <div><input ref={topicRef} id="learning-topic-title" value={topicTitle} maxLength={160}
                  placeholder="What would you like to learn?" aria-invalid={Boolean(topicError)}
                  aria-describedby={topicError ? "learning-topic-error" : undefined}
                  onChange={(event) => { setTopicTitle(event.target.value); setTopicError(""); }} />
                  <button type="submit" className="learning-primary">Add</button></div>
                {topicError && <p id="learning-topic-error" className="learning-error" role="alert">{topicError}</p>}
              </form>
              <p className="learning-detail-note">Check off a topic when you understand it. Your progress is saved automatically.</p>
            </>
          ) : (
            <div className="learning-detail-placeholder"><span className="learning-book"><BookIcon /></span><h2 id="learning-detail-heading">A clear path forward</h2><p>Your topics and progress will appear here when you create or choose a path.</p><div className="learning-placeholder-lines" aria-hidden="true"><span /><span /><span /></div></div>
          )}
        </section>
      </div>

      <dialog ref={dialogRef} className="learning-dialog" aria-labelledby="learning-dialog-heading">
        <form onSubmit={createPath} noValidate>
          <div className="learning-dialog-header"><div><span className="learning-eyebrow">MAKE ROOM TO GROW</span><h2 id="learning-dialog-heading">New learning path</h2></div><button type="button" className="learning-close" aria-label="Close new path form" onClick={() => dialogRef.current?.close()}>×</button></div>
          <label htmlFor="learning-path-title">Path name <span>Required</span></label>
          <input ref={titleRef} id="learning-path-title" value={draftTitle} maxLength={80} placeholder="e.g. React, English, UI design"
            aria-invalid={Boolean(pathError)} aria-describedby={pathError ? "learning-path-error" : undefined}
            onChange={(event) => { setDraftTitle(event.target.value); setPathError(""); }} />
          {pathError && <p id="learning-path-error" className="learning-error" role="alert">{pathError}</p>}
          <label htmlFor="learning-path-description">Description <span>Optional</span></label>
          <textarea id="learning-path-description" value={draftDescription} maxLength={500} rows={3} placeholder="What would you like to achieve?" onChange={(event) => setDraftDescription(event.target.value)} />
          <div className="learning-dialog-actions"><button type="button" className="learning-secondary" onClick={() => dialogRef.current?.close()}>Cancel</button><button type="submit" className="learning-primary">Create path</button></div>
        </form>
      </dialog>
    </div>
  );
}

export default LearningPage;
