import { SCREW_COLOR_ORDER } from "./types.ts";
import type { LevelId, Screw, PartId } from "./types.ts";
import { SCREW_SCALE } from "./screwScale.ts";
import { registerLevelData } from "./levelData.ts";
import { registerModel } from "../scene/levelModels.ts";
import type { LevelModel } from "../scene/levelModels.ts";
import { findScrewObstructions } from "../scene/obstructions.ts";
import { budgetFasteners } from "./fastenerBudget.ts";
import { findExposedScrews } from "../scene/exposure.ts";
import { createInitialState } from "./rules.ts";
export type BuiltModel = { model: LevelModel; mounts?: readonly (Pick<Screw, "position" | "normal" | "solutionAfter"> & { attachedTo: PartId })[] };
export function installLevel(level: LevelId, built: BuiltModel, audit?: { blockers: readonly (readonly PartId[])[]; exposed: readonly string[] }, cottageTemplate?: () => readonly Screw[]) {
  registerModel(level, built.model);
  if (cottageTemplate) { registerLevelData(level, { template: cottageTemplate() }); return; }
  let mounts = built.mounts!.map((mount, index) => ({ ...mount,
    obstructedBy: audit ? [...audit.blockers[index]] : findScrewObstructions(mount, SCREW_SCALE) }));
  if (level === "campsite") mounts = budgetFasteners(mounts, 240, mount => (mount.obstructedBy.length ? 100 : 0) +
    (mount.normal[1] < 0 ? 35 : mount.normal[1] < .9 ? 20 : 0) + (/^camp-(tent-|van-|meadow|foundation|dock-deck|boat)/.test(mount.attachedTo!) ? 15 : 0));
  const template: Screw[] = mounts.map((mount, index) => ({ ...mount, id: `${level}-${index + 1}`, removed: false,
    color: SCREW_COLOR_ORDER[Math.floor(index / 3) % SCREW_COLOR_ORDER.length] }));
  registerLevelData(level, { template, opening: audit ? new Set(audit.exposed) : level === "campsite" ? new Set(findExposedScrews(createInitialState(template), level)) : undefined });
}
