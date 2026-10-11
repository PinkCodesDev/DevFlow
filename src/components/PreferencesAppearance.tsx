import { useEffect } from "react";
import { usePreferences } from "../lib/usePreferences";
import "./PreferencesAppearance.css";
export default function PreferencesAppearance() {
  const preferences = usePreferences();
  useEffect(() => {
    document.documentElement.dataset.theme = preferences.theme;
    document.documentElement.dataset.density = preferences.density;
    document.documentElement.style.colorScheme = preferences.theme;
  }, [preferences.theme, preferences.density]);
  return null;
}
