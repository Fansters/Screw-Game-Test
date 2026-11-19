import { DESERT_BLOCKERS, DESERT_EXPOSED_IDS } from "../scene/desertAudit.ts";
import { DESERT_MOUNTS } from "../scene/desertModel.ts";
import { CONSTRUCTION_BLOCKERS, CONSTRUCTION_EXPOSED_IDS } from "../scene/constructionAudit.ts";
import { CONSTRUCTION_MOUNTS } from "../scene/constructionModel.ts";
import { CARNIVAL_BLOCKERS, CARNIVAL_EXPOSED_IDS } from "../scene/carnivalAudit.ts";
import { CARNIVAL_MOUNTS } from "../scene/carnivalModel.ts";
import { ZOO_BLOCKERS, ZOO_EXPOSED_IDS } from "../scene/zooAudit.ts";
import { ZOO_MOUNTS } from "../scene/zooModel.ts";
import { SPACE_BLOCKERS, SPACE_EXPOSED_IDS } from "../scene/spaceAudit.ts";
import { SPACE_MOUNTS } from "../scene/spaceModel.ts";
import { budgetFasteners } from "./fastenerBudget.ts";
import type { LevelId } from "./types.ts";
import { DEMO_LEVEL, SCREW_SCALE } from "./levels.ts";
import { generatePuzzle, PuzzleColorsUnavailable } from "./randomize.ts";
import { SCREW_COLOR_ORDER } from "./types.ts";
import type { Screw } from "./types.ts";
import { findScrewObstructions } from "../scene/obstructions.ts";
import { TITANIC_MOUNTS } from "../scene/titanicModel.ts";
import { CAMPSITE_MOUNTS } from "../scene/campsiteModel.ts";
import { findExposedScrews } from "../scene/exposure.ts";
import { createInitialState } from "./rules.ts";

let titanic: Screw[] | undefined;
let campsite: Screw[] | undefined;
let desert: Screw[] | undefined;
let construction: Screw[] | undefined;
let carnival: Screw[] | undefined;
let zoo: Screw[] | undefined;
let space: Screw[] | undefined;
const spaceOpening = new Set<string>(SPACE_EXPOSED_IDS);
const zooOpening = new Set<string>(ZOO_EXPOSED_IDS);
const carnivalOpening = new Set<string>(CARNIVAL_EXPOSED_IDS);
const constructionOpening = new Set<string>(CONSTRUCTION_EXPOSED_IDS);
const desertOpening = new Set<string>(DESERT_EXPOSED_IDS);
let campsiteOpening: ReadonlySet<string> | undefined;
export function soloLevelTemplate(level: LevelId): readonly Screw[] {
  if (level === "cottage") return DEMO_LEVEL;
  if (level === "space") return space ??= SPACE_MOUNTS.map((mount, index) => ({
    ...mount, id: `space-${index + 1}`, removed: false,
    color: SCREW_COLOR_ORDER[Math.floor(index / 3) % SCREW_COLOR_ORDER.length], obstructedBy: [...SPACE_BLOCKERS[index]],
  }));
  if (level === "zoo") return zoo ??= ZOO_MOUNTS.map((mount, index) => ({
    ...mount, id: `zoo-${index + 1}`, removed: false,
    color: SCREW_COLOR_ORDER[Math.floor(index / 3) % SCREW_COLOR_ORDER.length],
    obstructedBy: [...ZOO_BLOCKERS[index]],
  }));
  if (level === "carnival") return carnival ??= CARNIVAL_MOUNTS.map((mount, index) => ({
    ...mount, id: `carnival-${index + 1}`, removed: false,
    color: SCREW_COLOR_ORDER[Math.floor(index / 3) % SCREW_COLOR_ORDER.length],
    obstructedBy: [...CARNIVAL_BLOCKERS[index]],
  }));
  if (level === "construction") return construction ??= CONSTRUCTION_MOUNTS.map((mount, index) => ({
    ...mount, id: `construction-${index + 1}`, removed: false,
    color: SCREW_COLOR_ORDER[Math.floor(index / 3) % SCREW_COLOR_ORDER.length],
    obstructedBy: [...CONSTRUCTION_BLOCKERS[index]],
  }));
  if (level === "desert") return desert ??= DESERT_MOUNTS.map((mount, index) => ({
    ...mount, id: `desert-${index + 1}`, removed: false,
    color: SCREW_COLOR_ORDER[Math.floor(index / 3) % SCREW_COLOR_ORDER.length],
    obstructedBy: [...DESERT_BLOCKERS[index]],
  }));
  if (level === "campsite") return campsite ??= budgetFasteners(CAMPSITE_MOUNTS.map((mount) => ({
    ...mount, obstructedBy: findScrewObstructions(mount, SCREW_SCALE),
  })), 240, (mount) => (mount.obstructedBy.length ? 100 : 0) +
    (mount.normal[1] < 0 ? 35 : mount.normal[1] < .9 ? 20 : 0) +
    (/^camp-(tent-|van-|meadow|foundation|dock-deck|boat)/.test(mount.attachedTo) ? 15 : 0)).map((mount, index) => ({
    ...mount, id: `campsite-${index + 1}`, removed: false,
    color: SCREW_COLOR_ORDER[Math.floor(index / 3) % SCREW_COLOR_ORDER.length],
  }));
  return titanic ??= TITANIC_MOUNTS.map((mount, index) => ({
    ...mount, id: `titanic-${index + 1}`, removed: false,
    color: SCREW_COLOR_ORDER[Math.floor(index / 3) % SCREW_COLOR_ORDER.length],
    obstructedBy: findScrewObstructions(mount, SCREW_SCALE),
  }));
}

function generateLayeredPuzzle(seed: number, template: readonly Screw[], opening?: ReadonlySet<string>, adaptPeelToColors = false) {
  for (const candidate of [seed, (seed ^ 0x9e3779b9) >>> 0]) {
    try {
      return generatePuzzle(candidate, template, true, opening, adaptPeelToColors);
    } catch (error) {
      if (!(error instanceof PuzzleColorsUnavailable)) throw error;
    }
  }
  // A verified layout is the last resort if the randomized assignments are exhausted.
  return generatePuzzle(245, template, true, opening, adaptPeelToColors);
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
  if (level === "space") return generateLayeredPuzzle(seed, template, spaceOpening, true);
  if (level === "zoo") return generateLayeredPuzzle(seed, template, zooOpening, true);
  if (level === "carnival") return generateLayeredPuzzle(seed, template, carnivalOpening, true);
  if (level === "construction") return generateLayeredPuzzle(seed, template, constructionOpening, true);
  if (level === "desert") {
    return generateLayeredPuzzle(seed, template, desertOpening);
  }
  if (level === "campsite") {
    campsiteOpening ??= new Set(findExposedScrews(createInitialState(template), "campsite"));
    return generateLayeredPuzzle(seed, template, campsiteOpening);
  }
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
