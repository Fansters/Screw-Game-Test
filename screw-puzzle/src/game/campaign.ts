import { readSoloTimes } from "./leaderboard.ts";

export const CAMPAIGN_LEVELS = [
  { id: "cottage", title: "Christmas Cottage", available: true },
  { id: "titanic", title: "Titanic", available: false },
] as const;

export type LevelId = typeof CAMPAIGN_LEVELS[number]["id"];
const cleared = new Set<LevelId>();
const clearKey = (id: LevelId) => `screw-it:cleared:${id}`;

export function recordLevelClear(id: LevelId) {
  cleared.add(id);
  try { window.localStorage.setItem(clearKey(id), "1"); } catch { /* Keep progress for the current visit. */ }
}

export function readLevelProgress(): ReadonlySet<LevelId> {
  const completed = new Set(cleared);
  try {
    for (const { id } of CAMPAIGN_LEVELS) {
      if (window.localStorage.getItem(clearKey(id)) === "1") completed.add(id);
    }
  } catch { /* Keep progress for the current visit. */ }
  // Personal times from before the level picker also prove a Cottage win.
  if (!completed.has("cottage") && readSoloTimes().length > 0) completed.add("cottage");
  return completed;
}

export function levelStatus(index: number, completed: ReadonlySet<LevelId>) {
  if (!CAMPAIGN_LEVELS.slice(0, index).every(({ id }) => completed.has(id))) return "locked";
  return CAMPAIGN_LEVELS[index]?.available ? "playable" : "coming-soon";
}
