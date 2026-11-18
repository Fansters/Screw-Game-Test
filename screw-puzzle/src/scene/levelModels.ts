import { DESERT_MODEL } from "./desertModel.ts";
import { CONSTRUCTION_MODEL } from "./constructionModel.ts";
import { PART_IDS } from "../game/types.ts";
import type { CampsitePartId, ConstructionPartId, DesertPartId, LevelId, PartId, TitanicPartId } from "../game/types.ts";
import { PART_PIVOTS, PIECES } from "./houseModel.ts";
import { TITANIC_MODEL } from "./titanicModel.ts";
import { CAMPSITE_MODEL } from "./campsiteModel.ts";

export const LEVEL_MODELS = {
  cottage: { pieces: PIECES, pivots: PART_PIVOTS, parts: PART_IDS },
  titanic: TITANIC_MODEL,
  campsite: CAMPSITE_MODEL,
  desert: DESERT_MODEL,
  construction: CONSTRUCTION_MODEL,
};
export const partLevel = (part: PartId): LevelId => part.startsWith("site-") ? "construction" : part.startsWith("desert-") ? "desert" : part.startsWith("camp-") ? "campsite" : part.startsWith("ship-") ? "titanic" : "cottage";
export function partPivot(part: PartId) {
  if (part.startsWith("site-")) return CONSTRUCTION_MODEL.pivots[part as ConstructionPartId];
  if (part.startsWith("desert-")) return DESERT_MODEL.pivots[part as DesertPartId];
  if (part.startsWith("camp-")) return CAMPSITE_MODEL.pivots[part as CampsitePartId];
  return partLevel(part) === "titanic" ? TITANIC_MODEL.pivots[part as TitanicPartId] : PART_PIVOTS[part];
}
