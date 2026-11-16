import { CEILING_IDS, INTERIOR_DOORS, INTERIOR_DOORWAYS, INTERIOR_STORIES } from "../game/types.ts";
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
  for (const { story, bottom, top } of INTERIOR_STORIES) {
    for (const side of [-1, 1]) {
      const part = `partition-${story}-${side === -1 ? "left" : "right"}` as const;
      const x = side * 0.55;
      pivots[part] = [x, (bottom + top) / 2, 0];
      // Two doorways connect each room to the central stair hall.
      for (const [a, b] of [[-1.7, -1.53], [-0.77, 0.35], [1.11, 1.7]]) {
        box([x, (bottom + top) / 2, (a + b) / 2], [0.12, top - bottom, b - a], "#d8c6b1", part);
        box([x, bottom + 0.06, (a + b) / 2], [0.145, 0.1, b - a], "#9f8064", part);
      }
      for (const { z } of INTERIOR_DOORWAYS) {
        box([x, top - 0.1, z], [0.12, 0.2, 0.76], "#d8c6b1", part);
        box([x, top - 0.205, z], [0.157, 0.046, 0.766], "#a78368", part);
      }
    }
    for (const side of story === "upper" ? [-1, 1] : [-1]) {
      const part = `partition-${story}-cross-${side === -1 ? "left" : "right"}` as PartId;
      pivots[part] = [side * 1.45, (bottom + top) / 2, -0.4];
      box([side * 1.45, (bottom + top) / 2, -0.4], [1.68, top - bottom, 0.12], "#c8b9aa", part);
      box([side * 1.45, bottom + 0.06, -0.4], [1.68, 0.1, 0.145], "#9f8064", part);
    }
  }

  for (const { id, bottom, top, side, story, z } of INTERIOR_DOORS) {
    const x = side * 0.55;
    const height = top - bottom - 0.045;
    const y = bottom + 0.014 + height / 2;
    const stile = story === "upper" ? "#557d7a" : "#a4745b";
    const panel = story === "upper" ? "#739a90" : "#c18e6e";
    pivots[id] = [x, y, z];
    box(pivots[id], [0.084, height, 0.724], stile, id);
    for (const face of [-1, 1]) {
      for (const [offset, size] of [[-0.31, 0.46], [0.29, 0.52]]) {
        box([x + face * 0.047, y + offset, z], [0.02, size, 0.542], panel, id);
      }
      const latchZ = z - side * 0.26;
      box([x + face * 0.055, y + 0.046, latchZ], [0.025, 0.13, 0.054], "#aa8053", id);
      pieces.push({ kind: "ico", position: [x + face * 0.085, y + 0.052, latchZ],
        size: [0.037, 0.036, 0.036], color: "#edc57e", part: id });
    }
    const hingeZ = z + side * 0.342;
    for (const offset of [-0.48, 0.48]) {
      box([x - side * 0.049, y + offset, hingeZ], [0.034, 0.115, 0.043], "#b88d64", id);
    }
  }

  pivots["reading-chair"] = [-2, 0.51, 1.27];
  box([-2, 0.47, 1.27], [0.52, 0.14, 0.52], "#aa775c", "reading-chair");
  box([-2, 0.565, 1.23], [0.44, 0.09, 0.40], "#7caaa4", "reading-chair");
  box([-2, 0.71, 1.49], [0.50, 0.46, 0.09], "#aa775c", "reading-chair");
  for (const x of [-2.2, -1.8]) {
    box([x, 0.65, 1.28], [0.075, 0.095, 0.47], "#93624f", "reading-chair");
    for (const z of [1.09, 1.46]) box([x, 0.39, z], [0.075, 0.16, 0.075], "#93624f", "reading-chair");
  }

  pivots.bookcase = [2.045, 0.76, -1.31];
  box([2.045, 0.76, -1.53], [0.48, 0.9, 0.061], "#9c6f58", "bookcase");
  for (const x of [1.825, 2.265]) box([x, 0.76, -1.31], [0.063, 0.9, 0.46], "#ac7d5e", "bookcase");
  for (const y of [0.35, 0.73, 1.18]) box([2.045, y, -1.31], [0.48, 0.077, 0.46], "#c3926b", "bookcase");
  for (const [index, color] of ["#ca6176", "#d8b65e", "#7395af", "#7a9271", "#a786ba"].entries()) {
    const height = 0.21 + (index % 3) * 0.037;
    box([1.885 + index * 0.067, 0.77 + height / 2, -1.36], [0.048, height, 0.21], color, "bookcase");
  }

  pivots.sideboard = [1.18, -1.28, -0.92];
  box([1.18, -1.33, -0.93], [0.80, 0.50, 0.40], "#986851", "sideboard");
  box([1.18, -1.045, -0.93], [0.85, 0.074, 0.47], "#c39671", "sideboard");
  for (const y of [-1.46, -1.25]) {
    box([1.18, y, -0.71], [0.72, 0.165, 0.045], "#b5856a", "sideboard");
    box([1.18, y + 0.028, -0.68], [0.15, 0.032, 0.039], "#e4bb77", "sideboard");
  }

  for (const [part, x, y, z, width, depth, color] of [
    ["bedroom-rug", -1.42, 0.355, -0.06, 1.22, 0.52, "#ad789b"],
    ["study-rug", 1.44, 0.355, -0.05, 1.20, 0.64, "#73a196"],
    ["hall-runner", 0, -1.555, -1.46, 1.02, 0.39, "#bd776f"],
  ] as const) {
    pivots[part] = [x, y, z];
    box([x, y, z], [width, 0.09, depth], color, part);
    for (const side of [-1, 1]) {
      box([x, y + 0.046, z + side * (depth / 2 - 0.033)], [width - 0.08, 0.009, 0.023], "#e8c8a8", part);
      for (const along of [-0.33, -0.21, -0.1, 0, 0.1, 0.21, 0.33]) {
        box([x + along, y - 0.006, z + side * depth / 2], [0.026, 0.017, 0.077], "#b68b83", part);
      }
    }
  }
}
