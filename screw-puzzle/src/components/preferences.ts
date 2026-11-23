import { useSyncExternalStore } from "react";
import { checkedPreferences } from "../game/preferences";
import type { Preferences } from "../game/preferences";
const key = "screw-it:preferences:v1";
let settings = checkedPreferences(null);
try { settings = checkedPreferences(JSON.parse(localStorage.getItem(key) ?? "null")); } catch { /* Device defaults work without storage. */ }
const listeners = new Set<() => void>();
function notify() {
  document.documentElement.style.setProperty("--ui-scale", String(settings.uiScale));
  listeners.forEach(listener => listener());
}
notify();
export function updatePreferences(value: Preferences) {
  settings = checkedPreferences(value);
  try { localStorage.setItem(key, JSON.stringify(settings)); } catch { /* Keep session preferences. */ }
  notify();
}
window.addEventListener("storage", event => {
  if (event.key !== key) return;
  try { settings = checkedPreferences(JSON.parse(event.newValue ?? "null")); notify(); } catch { /* Ignore malformed settings. */ }
});
export function usePreferences() { return useSyncExternalStore(listener => { listeners.add(listener); return () => { listeners.delete(listener); }; }, () => settings); }
