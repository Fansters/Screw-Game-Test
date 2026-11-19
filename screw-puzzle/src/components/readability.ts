import { useSyncExternalStore } from "react";

type Readability = { outlines: boolean; labels: boolean };
const key = "screw-it:readability:v1";
let settings: Readability = { outlines: false, labels: false };
try {
  const saved = JSON.parse(localStorage.getItem(key) ?? "null");
  settings = { outlines: saved?.outlines === true, labels: saved?.labels === true };
} catch { /* Storage can be unavailable in private browsers. */ }
const listeners = new Set<() => void>();
function subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export function updateReadability(next: Readability) {
  settings = next;
  try { localStorage.setItem(key, JSON.stringify(settings)); } catch { /* Keep the setting for this session. */ }
  listeners.forEach((listener) => listener());
}
window.addEventListener("storage", (event) => {
  if (event.key !== key) return;
  try {
    const saved = JSON.parse(event.newValue ?? "null");
    settings = { outlines: saved?.outlines === true, labels: saved?.labels === true };
    listeners.forEach((listener) => listener());
  } catch { /* Ignore invalid data from another tab. */ }
});
export function useReadability() { return useSyncExternalStore(subscribe, () => settings); }
