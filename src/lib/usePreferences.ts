import { useEffect, useState } from "react";
import { PREFERENCES_KEY, readPreferences } from "./preferences";
export function usePreferences() {
  const [preferences, setPreferences] = useState(readPreferences);
  useEffect(() => {
    const refresh = () => setPreferences(readPreferences());
    const storage = (event: StorageEvent) => { if (event.key === PREFERENCES_KEY || event.key === null) refresh(); };
    window.addEventListener("devflow-preferences", refresh); window.addEventListener("storage", storage);
    return () => { window.removeEventListener("devflow-preferences", refresh); window.removeEventListener("storage", storage); };
  }, []);
  return preferences;
}
