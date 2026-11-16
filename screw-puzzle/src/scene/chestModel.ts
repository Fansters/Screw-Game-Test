import surfaces from "../assets/treasure_chest_collision.json" with { type: "json" };
import type { ChestPartId } from "../game/types.ts";
import type { Vector } from "./houseModel.ts";

export const CHEST_ORIGIN: Vector = [1.45, 0.315, 0.85];
export const CHEST_SURFACES = surfaces;

export function isChestPart(part: string): part is ChestPartId {
  return Object.hasOwn(CHEST_SURFACES, part);
}

export function chestPosition(local: readonly number[]): Vector {
  return [CHEST_ORIGIN[0] + local[0], CHEST_ORIGIN[1] + local[1], CHEST_ORIGIN[2] + local[2]];
}
