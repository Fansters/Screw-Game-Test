import type { LevelId, PartId } from "../game/types.ts";
import type { Piece, Vector } from "./houseModel.ts";
export type LevelModel = { pieces: Piece[]; pivots: Partial<Record<PartId, Vector>>; parts: readonly PartId[] };
// Only loaded levels live here; model modules contain factories, not instances.
export const LEVEL_MODELS = {} as Record<LevelId, LevelModel>;
const cleaners = new Set<(level: LevelId) => void>();
export function onLevelRelease(clean: (level: LevelId) => void) { cleaners.add(clean); }
export function registerModel(level: LevelId, model: LevelModel) { LEVEL_MODELS[level] = model; }
export function releaseModel(level: LevelId) {
  const model = LEVEL_MODELS[level]; if (!model) return;
  cleaners.forEach(clean => clean(level));
  for (const geometry of new Set(model.pieces.flatMap(p => p.geometry ? [p.geometry] : []))) geometry.dispose();
  delete LEVEL_MODELS[level];
}
export const partLevel = (part: PartId): LevelId => part.startsWith("oasis-") ? "oasis" : part.startsWith("arctic-") ? "arctic" : part.startsWith("castle-") ? "castle" : part.startsWith("space-") ? "space" : part.startsWith("zoo-") ? "zoo" : part.startsWith("fair-") ? "carnival" : part.startsWith("site-") ? "construction" : part.startsWith("desert-") ? "desert" : part.startsWith("camp-") ? "campsite" : part.startsWith("ship-") ? "titanic" : "cottage";
export function partPivot(part: PartId): Vector {
  const pivot = LEVEL_MODELS[partLevel(part)]?.pivots[part];
  if (!pivot) throw new Error(`Load the level before using ${part}`);
  return pivot;
}
