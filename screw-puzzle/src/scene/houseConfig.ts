import type { Vector } from "./houseModel.ts";
export const HOUSE = { halfWidth: 2.4, halfDepth: 1.9, ground: -1.6, upper: 0.25, eave: 2, ridge: 3.5, roofRun: 2.7, roofRise: 1.5 };
export const ROOF_PITCH = Math.atan2(HOUSE.roofRise, HOUSE.roofRun);
export const STAIR_WIDTH = 0.58;
export function stairTread(step: number): Vector {
  return [-0.145, -1.5 + step * 0.15, 1.12 - step * 0.17];
}
