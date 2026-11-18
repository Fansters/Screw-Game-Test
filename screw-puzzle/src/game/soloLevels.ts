import type { LevelId } from "./types.ts";
import { DEMO_LEVEL, SCREW_SCALE } from "./levels.ts";
import { generatePuzzle, PuzzleColorsUnavailable } from "./randomize.ts";
import { SCREW_COLOR_ORDER } from "./types.ts";
import type { Screw } from "./types.ts";
import { findScrewObstructions } from "../scene/obstructions.ts";
import { TITANIC_MOUNTS } from "../scene/titanicModel.ts";

let titanic: Screw[] | undefined;
export function soloLevelTemplate(level: LevelId): readonly Screw[] {
  if (level === "cottage") return DEMO_LEVEL;
  return titanic ??= TITANIC_MOUNTS.map((mount, index) => ({
    ...mount, id: `titanic-${index + 1}`, removed: false,
    color: SCREW_COLOR_ORDER[Math.floor(index / 3) % SCREW_COLOR_ORDER.length],
    obstructedBy: findScrewObstructions(mount, SCREW_SCALE),
  }));
}

function generateTitanicPuzzle(seed: number, template: readonly Screw[]) {
  for (const candidate of [seed, (seed ^ 0x9e3779b9) >>> 0]) {
    try {
      return generatePuzzle(candidate, template, true);
    } catch (error) {
      if (!(error instanceof PuzzleColorsUnavailable)) throw error;
    }
  }
  // A verified layout is the last resort if the randomized assignments are exhausted.
  return generatePuzzle(245, template, true);
}

// Seed-only v1 checkpoints need the original generation inputs to reproduce
// their colors. The resumed game still uses the new screw positions and covers.
const originalWaterFixings = new Map<string, Pick<Screw, "attachedTo" | "obstructedBy" | "solutionAfter">>();
for (let bay = 1; bay <= 8; bay += 1) {
  originalWaterFixings.set(`titanic-${6 + 39 * (bay - 1)}`, {
    attachedTo: `ship-bilge-port-${bay}`,
    solutionAfter: [`ship-saloon-deck-${bay}`],
    obstructedBy: bay === 8 ? ["ship-hull-port-8"] : [],
  });
}

export function generateSoloPuzzle(level: LevelId, seed: number, legacyTitanicLayout = false) {
  const template = soloLevelTemplate(level);
  if (level === "cottage") return generatePuzzle(seed, template);
  if (!legacyTitanicLayout) return generateTitanicPuzzle(seed, template);
  const original = template.map((screw) => {
    const fixing = originalWaterFixings.get(screw.id);
    if (fixing) return { ...screw, ...fixing };
    return screw.attachedTo?.startsWith("ship-promenade-") ? {
      ...screw, obstructedBy: screw.obstructedBy?.filter((part) => !part.startsWith("ship-lifeboat-")),
    } : screw;
  });
  const puzzle = generateTitanicPuzzle(seed, original);
  const screws = puzzle.state.screws.map(({ color }, index) => ({ ...template[index], color }));
  return { ...puzzle, state: { ...puzzle.state, screws } };
}
