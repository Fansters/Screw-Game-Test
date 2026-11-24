import type { LevelId, Screw } from "./types.ts";
import { levelData } from "./levelData.ts";
import { generatePuzzle, PuzzleColorsUnavailable } from "./randomize.ts";
import { colorProofInputs } from './colorLayoutCompatibility.ts';
import { EASY_PROFILE } from "./difficultyProfiles.ts";
export function soloLevelTemplate(level: LevelId): readonly Screw[] { return levelData(level).template; }

function generateLayeredPuzzle(seed: number, template: readonly Screw[], opening?: ReadonlySet<string>, adaptPeelToColors = false, openingMatches?: readonly [number, number]) {
  for (const candidate of [seed, (seed ^ 0x9e3779b9) >>> 0]) {
    try {
      return generatePuzzle(candidate, template, true, opening, adaptPeelToColors, openingMatches);
    } catch (error) {
      if (!(error instanceof PuzzleColorsUnavailable)) throw error;
    }
  }
  // A verified layout is the last resort if the randomized assignments are exhausted.
  return generatePuzzle(245, template, true, opening, adaptPeelToColors, openingMatches);
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

function generateColorPuzzle(level: LevelId, seed: number, template: readonly Screw[], opening: ReadonlySet<string> | undefined, legacyTitanicLayout: boolean) {
  if (level === "jungle") return generateLayeredPuzzle(seed, template, opening, true, EASY_PROFILE.openingMatches);
  if (level === "cottage") return generatePuzzle(seed, template);
  if (level === "oasis") return generateLayeredPuzzle(seed, template, opening, true);
  if (level === "arctic") return generateLayeredPuzzle(seed, template, opening, true);
  if (level === "castle") return generateLayeredPuzzle(seed, template, opening, true);
  if (level === "space") return generateLayeredPuzzle(seed, template, opening, true);
  if (level === "zoo") return generateLayeredPuzzle(seed, template, opening, true);
  if (level === "carnival") return generateLayeredPuzzle(seed, template, opening, true);
  if (level === "construction") return generateLayeredPuzzle(seed, template, opening, true);
  if (level === "desert") {
    return generateLayeredPuzzle(seed, template, opening);
  }
  if (level === "campsite") return generateLayeredPuzzle(seed, template, opening);
  if (!legacyTitanicLayout) return generateLayeredPuzzle(seed, template);
  const original = template.map((screw) => {
    const fixing = originalWaterFixings.get(screw.id);
    if (fixing) return { ...screw, ...fixing };
    return screw.attachedTo?.startsWith("ship-promenade-") ? {
      ...screw, obstructedBy: screw.obstructedBy?.filter((part) => !part.startsWith("ship-lifeboat-")),
    } : screw;
  });
  const puzzle = generateLayeredPuzzle(seed, original);
  const screws = puzzle.state.screws.map(({ color }, index) => ({ ...template[index], color }));
  return { ...puzzle, state: { ...puzzle.state, screws } };
}

// Keep historical seeded colours without imposing historical false blockers.
export function generateSoloPuzzle(level: LevelId, seed: number, legacyTitanicLayout = false) {
  const physical = soloLevelTemplate(level);
  const proof = colorProofInputs(level, physical, levelData(level).opening);
  const puzzle = generateColorPuzzle(level, seed, proof.template, proof.opening, legacyTitanicLayout);
  if (proof.template === physical) return puzzle;
  return { ...puzzle, state: { ...puzzle.state,
    screws: puzzle.state.screws.map((screw, index) => ({ ...screw,
      obstructedBy: physical[index].obstructedBy ? [...physical[index].obstructedBy] : undefined,
    })),
  } };
}
