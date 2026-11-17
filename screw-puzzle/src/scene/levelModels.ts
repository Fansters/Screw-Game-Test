import { PART_IDS } from "../game/types.ts";
import type { LevelId, PartId, TitanicPartId } from "../game/types.ts";
import { PART_PIVOTS, PIECES } from "./houseModel.ts";
import { TITANIC_MODEL } from "./titanicModel.ts";

export const LEVEL_MODELS = {
  cottage: { pieces: PIECES, pivots: PART_PIVOTS, parts: PART_IDS },
  titanic: TITANIC_MODEL,
};
export const partLevel = (part: PartId): LevelId => part.startsWith("ship-") ? "titanic" : "cottage";
export function partPivot(part: PartId) {
  return partLevel(part) === "titanic" ? TITANIC_MODEL.pivots[part as TitanicPartId] : PART_PIVOTS[part];
}
