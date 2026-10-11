import type { ReactNode } from "react";
const icons = {
  home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z" /></>,
  tasks: <><rect x="4" y="3" width="16" height="18" rx="3" /><path d="m8 12 3 3 5-6" /></>,
  timer: <><circle cx="12" cy="13" r="8" /><path d="M12 9v4l3 2M9 2h6M12 2v3m6 1 2-2" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 6v6l4 2" /></>,
  projects: <><path d="M3 7V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" /><path d="M3 9h18" /></>,
  briefcase: <><rect x="3" y="7" width="18" height="14" rx="2" /><path d="M8 7V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v3M3 12a20 20 0 0 0 18 0M12 12v4" /></>,
  goal: <><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></>,
  chart: <><path d="M4 21h17M5 21V11h4v10m0 0V4h4v17m0 0V8h4v13" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4m10-4v4M3 11h18m-13 4h2m4 0h2" /></>,
  settings: <><path d="m9 3-.5 2-2 1-2-.6-2 3.2L4 10v3l-1.5 1.4 2 3.2 2-.6 2 1 .5 2h4l.5-2 2-1 2 .6 2-3.2L18 13v-3l1.5-1.4-2-3.2-2 .6-2-1-.5-2Z" /><circle cx="11" cy="11.5" r="3" /></>,
  sparkles: <><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3ZM3 3v4M1 5h4m15 13v4m-2-2h4" /></>,
  flame: <><path d="M13 2c1 6-3 7-3 10-2-1-3-3-3-4-6 7-3 14 5 14 7 0 10-8 5-13 0 3-1 4-2 4 1-5 0-8-2-11Z" /></>,
} satisfies Record<string, ReactNode>;
export type AppIconName = keyof typeof icons;
export default function AppIcon({ name, className = "" }: { name: AppIconName; className?: string }) {
  return <svg className={`app-icon ${className}`} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{icons[name]}</svg>;
}
