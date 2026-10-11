export type FocusConfig = { focusMinutes: number; shortMinutes: number; longMinutes: number; rounds: number };
export type Preferences = {
  name: string; theme: "dark" | "light"; density: "standard" | "compact";
  weekStart: "monday" | "sunday"; clock: "24" | "12"; sound: boolean; focus: FocusConfig;
};
export const PREFERENCES_KEY = "devflow.preferences.v1";
export const DEFAULT_FOCUS: FocusConfig = { focusMinutes: 25, shortMinutes: 5, longMinutes: 15, rounds: 3 };
export const DEFAULT_PREFERENCES: Preferences = { name: "", theme: "dark", density: "standard", weekStart: "monday", clock: "24", sound: false, focus: DEFAULT_FOCUS };
export function validFocusConfig(value: unknown): value is FocusConfig {
  if (!value || typeof value !== "object") return false;
  const config = value as Record<string, unknown>;
  return [["focusMinutes", 120], ["shortMinutes", 60], ["longMinutes", 120], ["rounds", 12]].every(([key, max]) => typeof config[key] === "number" && Number.isInteger(config[key]) && Number(config[key]) >= 1 && Number(config[key]) <= Number(max));
}
export function validPreferences(value: unknown): value is Preferences {
  if (!value || typeof value !== "object") return false;
  const p = value as Record<string, unknown>;
  return typeof p.name === "string" && p.name.length <= 60 && ["dark", "light"].includes(String(p.theme)) && ["standard", "compact"].includes(String(p.density)) &&
    ["monday", "sunday"].includes(String(p.weekStart)) && ["24", "12"].includes(String(p.clock)) && typeof p.sound === "boolean" && validFocusConfig(p.focus);
}
export function readPreferences(): Preferences {
  try { const raw: unknown = JSON.parse(localStorage.getItem(PREFERENCES_KEY) ?? "null"); return validPreferences(raw) ? raw : DEFAULT_PREFERENCES; }
  catch { return DEFAULT_PREFERENCES; }
}
export function savePreferences(value: Preferences) {
  if (!validPreferences(value)) throw new Error("Invalid settings.");
  localStorage.setItem(PREFERENCES_KEY, JSON.stringify(value));
  window.dispatchEvent(new Event("devflow-preferences"));
}
export function formatClock(time: string, clock: Preferences["clock"]) {
  if (!time) return "";
  if (clock === "24") return time;
  const [hour, minute] = time.split(":");
  return `${Number(hour) % 12 || 12}:${minute} ${Number(hour) >= 12 ? "PM" : "AM"}`;
}
