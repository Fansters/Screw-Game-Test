import { DESERT_MODEL } from "./desertModel.ts";
import { CONSTRUCTION_MODEL } from "./constructionModel.ts";
import { CARNIVAL_MODEL } from "./carnivalModel.ts";
import { ZOO_MODEL } from "./zooModel.ts";
import { PART_IDS } from "../game/types.ts";
import type { CampsitePartId, CarnivalPartId, ConstructionPartId, DesertPartId, LevelId, PartId, TitanicPartId, ZooPartId } from "../game/types.ts";
import { PART_PIVOTS, PIECES } from "./houseModel.ts";
import { TITANIC_MODEL } from "./titanicModel.ts";
import { CAMPSITE_MODEL } from "./campsiteModel.ts";

export const LEVEL_MODELS = {
  cottage: { pieces: PIECES, pivots: PART_PIVOTS, parts: PART_IDS },
  titanic: TITANIC_MODEL,
  campsite: CAMPSITE_MODEL,
  desert: DESERT_MODEL,
  construction: CONSTRUCTION_MODEL,
  carnival: CARNIVAL_MODEL,
  zoo: ZOO_MODEL,
};
export const partLevel = (part: PartId): LevelId => part.startsWith("zoo-") ? "zoo" : part.startsWith("fair-") ? "carnival" : part.startsWith("site-") ? "construction" : part.startsWith("desert-") ? "desert" : part.startsWith("camp-") ? "campsite" : part.startsWith("ship-") ? "titanic" : "cottage";
export function partPivot(part: PartId) {
  if (part.startsWith("zoo-")) return ZOO_MODEL.pivots[part as ZooPartId];
  if (part.startsWith("fair-")) return CARNIVAL_MODEL.pivots[part as CarnivalPartId];
  if (part.startsWith("site-")) return CONSTRUCTION_MODEL.pivots[part as ConstructionPartId];
  if (part.startsWith("desert-")) return DESERT_MODEL.pivots[part as DesertPartId];
  if (part.startsWith("camp-")) return CAMPSITE_MODEL.pivots[part as CampsitePartId];
  return partLevel(part) === "titanic" ? TITANIC_MODEL.pivots[part as TitanicPartId] : PART_PIVOTS[part];
}
