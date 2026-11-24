import type { LevelId } from "./types.ts";

// Geometry, fixing IDs/positions and reveal changes need a new layout revision.
// Keep these independent of cosmetic app releases and the room wire protocol.
export const LEVEL_LAYOUT_VERSIONS: Readonly<Record<LevelId, number>> = Object.freeze({
  cottage: 2, campsite: 3, desert: 3, construction: 2,
  carnival: 2, zoo: 2, castle: 1, arctic: 1, jungle: 2, oasis: 1, space: 3, titanic: 2,
});

export const layoutRevision = (level: LevelId) => `v${LEVEL_LAYOUT_VERSIONS[level]}`;
