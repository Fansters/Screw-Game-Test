import { LEVEL_IDS } from "../game/types.ts";
import type { LevelId } from "../game/types.ts";
import { LEVEL_LAYOUT_VERSIONS } from "../game/layoutVersions.ts";

// Shared by the future trusted run server, database fixtures and leaderboard UI.
// Defining a policy does NOT make a browser/local-storage result verified.
export const RANKED_RULES = Object.freeze({
  version: 1,
  generatorVersion: 1,
  mode: "solo",
  topCount: 10,
  puzzle: "server-generated-random-seed",
  timerStarts: "first-accepted-screw",
  timerStops: "accepted-winning-move",
  pausesAllowed: false,
  resumeAfterRefresh: false,
  reconnectGraceMs: 30_000,
  extraBoxes: 3,
  findMatches: 3,
  queuePeeks: 3,
  abilityTimePenaltyMs: 0,
  freeReadability: true,
  freePartPreview: true,
  freeTranslucency: true,
  publicAccount: "google-or-verified-email",
  tie: "equal-milliseconds-share-competition-rank",
} as const);

export function rankedBoardId(level: LevelId): string {
  if (!LEVEL_IDS.some(id => id === level)) throw new Error("Archived levels cannot have active ranked boards");
  return `${level}:layout-${LEVEL_LAYOUT_VERSIONS[level]}:generator-${RANKED_RULES.generatorVersion}:rules-${RANKED_RULES.version}:solo`;
}

export const RANKED_BOARDS = LEVEL_IDS.map(level => ({
  id: rankedBoardId(level), level, layoutVersion: LEVEL_LAYOUT_VERSIONS[level],
  generatorVersion: RANKED_RULES.generatorVersion, rulesVersion: RANKED_RULES.version,
}));
