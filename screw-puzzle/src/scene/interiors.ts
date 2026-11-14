import { CEILING_IDS } from "../game/types.ts";
import type { PartId } from "../game/types.ts";
import type { Piece, Vector } from "./houseModel.ts";

// Real room walls with doorways, baseboards and lintels. These stay inside the
// cottage: the exterior keeps its original Christmas decorations.
export function addInteriors(pieces: Piece[], pivots: Record<PartId, Vector>) {
  const box = (position: Vector, size: Vector, color: string, part: PartId) => pieces.push({ kind: "box", position, size, color, part });
  for (const [index, part] of CEILING_IDS.entries()) {
    const z = 1.2 - index * 1.2;
    pivots[part] = [0, 2.06, z];
    box([0, 2.06, z], [4.5, 0.12, 1.18], "#d9b98a", part);
    for (const dz of [-0.57, 0.57]) box([0, 2.125, z + dz], [4.48, 0.025, 0.035], "#a77e61", part);
  }
  for (const story of ["upper", "lower"] as const) {
    const bottom = story === "upper" ? 0.33 : -1.59;
    const top = story === "upper" ? 1.99 : 0.18;
    for (const side of [-1, 1]) {
      const part = `partition-${story}-${side === -1 ? "left" : "right"}` as const;
      const x = side * 0.55;
      pivots[part] = [x, (bottom + top) / 2, 0];
      // Two doorways connect each room to the central stair hall.
      for (const [a, b] of [[-1.7, -1.53], [-0.77, 0.35], [1.11, 1.7]]) {
        box([x, (bottom + top) / 2, (a + b) / 2], [0.12, top - bottom, b - a], "#d8c6b1", part);
        box([x, bottom + 0.06, (a + b) / 2], [0.145, 0.1, b - a], "#9f8064", part);
      }
      for (const z of [-1.15, 0.73]) box([x, top - 0.1, z], [0.12, 0.2, 0.76], "#d8c6b1", part);
    }
    for (const side of story === "upper" ? [-1, 1] : [-1]) {
      const part = `partition-${story}-cross-${side === -1 ? "left" : "right"}` as PartId;
      pivots[part] = [side * 1.45, (bottom + top) / 2, -0.4];
      box([side * 1.45, (bottom + top) / 2, -0.4], [1.68, top - bottom, 0.12], "#c8b9aa", part);
      box([side * 1.45, bottom + 0.06, -0.4], [1.68, 0.1, 0.145], "#9f8064", part);
    }
  }
}
