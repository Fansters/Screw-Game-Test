import { readLegacyCottageClear } from "./leaderboard.ts";
import type { LevelId } from "./types.ts";
export type { LevelId } from "./types.ts";

export const CAMPAIGN_LEVELS = [
  { id: "cottage", title: "Christmas Cottage", available: true },
  { id: "campsite", title: "Lakeside Camp", available: true },
  { id: "desert", title: "Route 66 Gas Stop", available: true },
  { id: "construction", title: "Construction Crew", available: true },
  { id: "carnival", title: "Carnival Fairground", available: true },
  { id: "zoo", title: "Zoo Adventure Park", available: true },
  { id: "castle", title: "Royal Castle Courtyard", available: true },
] as const;

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
  if (!completed.has("cottage") && readLegacyCottageClear()) completed.add("cottage");
  return completed;
}

export function levelStatus(index: number) {
  return CAMPAIGN_LEVELS[index]?.available ? "playable" : "coming-soon";
}
