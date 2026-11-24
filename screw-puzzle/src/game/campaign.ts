import type { LevelId } from "./types.ts";
export type { LevelId } from "./types.ts";
export const DIFFICULTIES = ["easy", "medium", "hard"] as const;
export type Difficulty = typeof DIFFICULTIES[number];

export const CAMPAIGN_LEVELS = [
  { id: "cottage", title: "Christmas Cottage", difficulty: "medium", available: true },
  { id: "campsite", title: "Lakeside Camp", difficulty: "hard", available: true },
  { id: "desert", title: "Route 66 Gas Stop", difficulty: "hard", available: true },
  { id: "construction", title: "Construction Crew", difficulty: "medium", available: true },
  { id: "carnival", title: "Carnival Fairground", difficulty: "medium", available: true },
  { id: "zoo", title: "Zoo Adventure Park", difficulty: "medium", available: true },
  { id: "castle", title: "Royal Castle Courtyard", difficulty: "medium", available: true },
  { id: "arctic", title: "Arctic Expedition", difficulty: "easy", available: true },
  { id: "jungle", title: "Jungle Temple", difficulty: "easy", available: true },
  { id: "oasis", title: "Egyptian Oasis", difficulty: "hard", available: true },
] as const;

const grouped = {
  easy: CAMPAIGN_LEVELS.filter(level => level.difficulty === "easy"),
  medium: CAMPAIGN_LEVELS.filter(level => level.difficulty === "medium"),
  hard: CAMPAIGN_LEVELS.filter(level => level.difficulty === "hard"),
};
export const levelsForDifficulty = (difficulty: Difficulty) => grouped[difficulty];
export function levelIdentity(id: LevelId) {
  const level = CAMPAIGN_LEVELS.find(level => level.id === id);
  return level ? { ...level, number: levelsForDifficulty(level.difficulty).findIndex(world => world.id === id) + 1 } : null;
}

const cleared = new Set<LevelId>();

export function recordLevelClear(id: LevelId) {
  cleared.add(id);
}

export function readLevelProgress(): ReadonlySet<LevelId> {
  return new Set(cleared);
}
export function clearVisitProgress() { cleared.clear(); }

export function levelStatus(index: number) {
  return CAMPAIGN_LEVELS[index]?.available ? "playable" : "coming-soon";
}
