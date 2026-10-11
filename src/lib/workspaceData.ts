export const TASKS_KEY = "devflow.tasks.v1";
export const PROJECTS_KEY = "devflow.projects.v1";
export type TaskStatus = "todo" | "progress" | "done";
export type TaskPriority = "Low" | "Medium" | "High";
export type KanbanTask = { id: number; title: string; description?: string; category: string; priority: TaskPriority; status: TaskStatus };
export type Milestone = { id: string; title: string; completed: boolean };
export type Project = { id: string; title: string; description: string; status: "planned" | "active" | "paused" | "completed"; stack: string; deadline: string; repository: string; demo: string; milestones: Milestone[] };
function object(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === "object"; }
export function isKanbanTask(value: unknown): value is KanbanTask {
  return object(value) && typeof value.id === "number" && Number.isSafeInteger(value.id) && value.id > 0 && typeof value.title === "string" && Boolean(value.title.trim()) && typeof value.category === "string" &&
    (value.description === undefined || typeof value.description === "string") && ["todo", "progress", "done"].includes(String(value.status)) && ["Low", "Medium", "High"].includes(String(value.priority));
}
export function safeProjectUrl(value: string) { try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; } }
function milestone(value: unknown): value is Milestone { return object(value) && typeof value.id === "string" && Boolean(value.id) && typeof value.title === "string" && Boolean(value.title.trim()) && typeof value.completed === "boolean"; }
export function isProject(value: unknown): value is Project {
  if (!object(value) || !["id", "title", "description", "stack", "deadline", "repository", "demo"].every((key) => typeof value[key] === "string")) return false;
  const date = String(value.deadline), time = Date.parse(`${date}T12:00:00Z`);
  return Boolean(value.id) && Boolean(String(value.title).trim()) && ["planned", "active", "paused", "completed"].includes(String(value.status)) &&
    (!date || (/^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === date)) &&
    [value.repository, value.demo].every((url) => !url || safeProjectUrl(String(url))) && Array.isArray(value.milestones) && value.milestones.every(milestone) && new Set(value.milestones.map((m) => m.id)).size === value.milestones.length;
}
// Read old Learning entries as projects until the first project save. Keep the old key intact.
export function migrateLearning(raw: string | null): Project[] {
  const paths: unknown = JSON.parse(raw ?? "[]");
  if (!Array.isArray(paths) || !paths.every((p) => object(p) && typeof p.id === "string" && typeof p.title === "string" && typeof p.description === "string" && Array.isArray(p.topics) && p.topics.every(milestone))) throw new Error("Invalid Learning data");
  return paths.map((p) => ({ id: p.id, title: p.title, description: p.description, stack: "", deadline: "", repository: "", demo: "", milestones: p.topics,
    status: p.topics.length && p.topics.every((m: Milestone) => m.completed) ? "completed" : "active" }));
}
export function projectProgress(project: Project) { return project.status === "completed" ? 100 : project.milestones.length ? Math.round(project.milestones.filter((m) => m.completed).length / project.milestones.length * 100) : 0; }
