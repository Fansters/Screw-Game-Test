import { GARLANDS, SNOW_ROOFS } from "../game/types.ts";
import type { PartId } from "../game/types.ts";
import type { Piece, Vector } from "./houseModel.ts";

// Original procedural props. Every detail belongs to a removable assembly.
export function addChristmasDetails(pieces: Piece[], pivots: Record<PartId, Vector>, pitch: number) {
  const box = (position: Vector, size: Vector, color: string, part: PartId, rotation?: Vector) => pieces.push({ kind: "box", position, size, color, part, rotation });
  const round = (kind: "ico" | "cylinder" | "cone" | "star", position: Vector, size: Vector, color: string, part: PartId, rotation?: Vector) => pieces.push({ kind, position, size, color, part, rotation });
  const snow = "#f1f6ff", red = "#cf4f61", green = "#397d65", gold = "#efc86c";
  for (const strip of SNOW_ROOFS) {
    const side = strip.side === "left" ? -1 : 1;
    const x = side * (1.35 + Math.sin(pitch) * 0.2), y = 2.75 + Math.cos(pitch) * 0.2;
    pivots[strip.id] = [x, y, strip.z];
    box([x, y, strip.z], [3.11, 0.23, 1.38], snow, strip.id, [0, 0, -side * pitch]);
    box([side * 2.83, 1.95, strip.z], [0.18, 0.44, 1.38], snow, strip.id);
    for (const dz of [-0.45, 0, 0.45]) {
      round("ico", [side * 2.82, 2.13, strip.z + dz], [0.15, 0.16, 0.24], snow, strip.id);
      round("cone", [side * 2.88, 1.62, strip.z + dz], [0.065, 0.3, 0.065], "#d5e8f3", strip.id, [Math.PI, 0, 0]);
    }
  }
  for (const [part, side] of [["roof-lights-left", -1], ["roof-lights-right", 1]] as const) {
    pivots[part] = [side * 1.55, 3.12, 0];
    for (const run of [0.45, 1.35, 2.25]) {
      const x = side * (run + Math.sin(pitch) * 0.43), y = 3.5 - run / 1.8 + Math.cos(pitch) * 0.43;
      box([x, y, 0], [0.26, 0.18, 4.18], green, part, [0, 0, -side * pitch]);
      for (const z of [-1.75, -1.05, -0.35, 0.35, 1.05, 1.75]) round("ico", [x + side * Math.sin(pitch) * 0.12, y + Math.cos(pitch) * 0.12, z], [0.06, 0.075, 0.06], z > 0 ? gold : red, part);
    }
    box([side * (1.35 + Math.sin(pitch) * 0.43), 2.75 + Math.cos(pitch) * 0.43, 2.1], [3.12, 0.18, 0.15], green, part, [0, 0, -side * pitch]);
  }
  for (const garland of GARLANDS) {
    const broad = garland.face === "front" || garland.face === "back";
    const sign = garland.face === "back" || garland.face === "left" ? -1 : 1;
    const y = garland.story === "upper" ? 1.84 : 0.04;
    pivots[garland.id] = broad ? [0, y, sign * 2.1] : [sign * 2.6, y, 0];
    box(pivots[garland.id], broad ? [4.9, 0.42, 0.18] : [0.18, 0.42, 3.86], green, garland.id);
    for (let index = 0; index < 11; index += 1) {
      const along = (index - 5) * (broad ? 0.44 : 0.35);
      round("ico", broad ? [along, y - 0.1, sign * 2.19] : [sign * 2.69, y - 0.1, along], broad ? [0.26, 0.19, 0.13] : [0.13, 0.19, 0.22], green, garland.id);
      round("ico", broad ? [along, y - 0.15, sign * 2.31] : [sign * 2.81, y - 0.15, along], [0.045, 0.06, 0.045], index % 2 ? gold : red, garland.id);
    }
    if (garland.face === "front" && garland.story === "lower") for (const x of [-1.5, 1.5]) box([x, -0.1, 2.62], [0.65, 0.35, 0.22], green, garland.id);
  }
  for (const [part, sign] of [["icicles-front", 1], ["icicles-back", -1]] as const) {
    pivots[part] = [0, 1.88, sign * 2.42];
    box(pivots[part], [5.02, 0.45, 0.48], snow, part);
    for (let index = 0; index < 12; index += 1) round("cone", [(index - 5.5) * 0.41, 1.54 - (index % 3) * 0.035, sign * 2.36], [0.08, 0.36, 0.08], "#d9ebf7", part, [Math.PI, 0, 0]);
  }
  for (const [part, axis, sign] of [["snowbank-front", "z", 1], ["snowbank-back", "z", -1], ["snowbank-left", "x", -1], ["snowbank-right", "x", 1]] as const) {
    const broad = axis === "z";
    pivots[part] = broad ? [0, -1.65, sign * 3.35] : [sign * 3.35, -1.65, 0];
    // Corner overlaps form a sealed snowy rim; no free screws hide behind fake locks.
    box(pivots[part], broad ? [8.7, 1, 2] : [2, 1, 4.68], snow, part);
    for (let index = 0; index < 7; index += 1) round("ico", broad ? [(index - 3) * 1.12, -1.16, sign * 3.5] : [sign * 3.5, -1.16, (index - 3) * 0.68], broad ? [0.75, 0.15, 0.75] : [0.75, 0.15, 0.5], snow, part);
  }
  for (const [part, x, y] of [["wreath-upper-left", -1.5, 1.15], ["wreath-upper-right", 1.5, 1.15], ["wreath-lower-left", -1.5, -0.65], ["wreath-lower-right", 1.5, -0.65]] as const) {
    pivots[part] = [x, y, 2.29];
    for (let index = 0; index < 16; index += 1) {
      const angle = index * Math.PI / 8;
      round("ico", [x + Math.cos(angle) * 0.37, y + Math.sin(angle) * 0.37, 2.29], [0.18, 0.18, 0.18], green, part);
    }
    for (const dx of [-0.14, 0.14]) round("ico", [x + dx, y + 0.46, 2.45], [0.18, 0.12, 0.09], red, part);
    box([x, y + 0.28, 2.43], [0.11, 0.3, 0.08], red, part);
    box([x, y + 0.5, 2.48], [0.5, 0.23, 0.1], gold, part);
    for (const dx of [-0.32, 0.32]) round("ico", [x + dx, y + 0.1, 2.46], [0.065, 0.065, 0.065], gold, part);
  }
  pivots["door-bow"] = [0, -0.75, 2.45];
  box([0, -0.75, 2.43], [0.19, 1.88, 0.14], red, "door-bow");
  box([0, -0.25, 2.43], [1.2, 0.2, 0.14], red, "door-bow");
  for (const dx of [-0.16, 0.16]) round("ico", [dx, -0.18, 2.56], [0.2, 0.16, 0.1], gold, "door-bow");

  pivots["christmas-tree"] = [-3.2, -0.2, 2.8];
  round("cylinder", [-3.2, -1.2, 2.8], [0.14, 1.25, 0.14], "#986b53", "christmas-tree");
  for (const [y, radius, height] of [[-0.3, 0.85, 1.5], [0.25, 0.65, 1.3], [0.75, 0.45, 1.1]]) round("cone", [-3.2, y, 2.8], [radius, height, radius], green, "christmas-tree");
  for (let index = 0; index < 12; index += 1) {
    const angle = index * Math.PI * 0.73, y = -0.8 + index * 0.13, radius = 0.72 - index * 0.038;
    round("ico", [-3.2 + Math.cos(angle) * radius, y, 2.8 + Math.sin(angle) * radius], [0.06, 0.06, 0.06], index % 2 ? red : gold, "christmas-tree");
  }
  pivots["tree-star"] = [-3.2, 1.25, 3.01];
  round("star", pivots["tree-star"], [1, 1, 1], gold, "tree-star");

  function gift(part: "gift-left" | "gift-right", position: Vector, color: string) {
    pivots[part] = position;
    box(position, [1.15, 1.2, 0.65], color, part);
    box([position[0], position[1] + 0.62, position[2]], [1.22, 0.09, 0.72], color, part);
    box([position[0], position[1], position[2] + 0.335], [0.13, 1.2, 0.035], gold, part);
    box([position[0], position[1] + 0.2, position[2] + 0.335], [1.15, 0.13, 0.035], gold, part);
    for (const dx of [-0.16, 0.16]) round("ico", [position[0] + dx, position[1] + 0.75, position[2]], [0.22, 0.13, 0.13], gold, part);
  }
  gift("gift-left", [-3.2, -0.85, 3.65], "#a779bd");
  gift("gift-right", [3.05, -0.85, -0.65], red);
  pivots.santa = [3.05, -0.55, -1.3];
  box([3.05, -0.65, -1.3], [0.95, 1.85, 0.1], "#c09b75", "santa");
  round("ico", [3.05, -0.65, -1.13], [0.44, 0.6, 0.35], red, "santa");
  box([3.05, -0.82, -0.9], [0.78, 0.12, 0.12], "#6b5362", "santa");
  box([3.05, -0.82, -0.82], [0.2, 0.18, 0.05], gold, "santa");
  round("ico", [3.05, 0.02, -1.12], [0.28, 0.28, 0.25], "#efc3a5", "santa");
  round("ico", [3.05, -0.09, -0.89], [0.27, 0.24, 0.13], snow, "santa");
  round("cone", [3.05, 0.37, -1.12], [0.29, 0.55, 0.29], red, "santa");
  round("ico", [3.05, 0.66, -1.12], [0.1, 0.1, 0.1], snow, "santa");
  for (const dx of [-0.09, 0.09]) round("ico", [3.05 + dx, 0.08, -0.883], [0.025, 0.025, 0.025], "#665066", "santa");
  for (const dx of [-0.21, 0.21]) box([3.05 + dx, -1.48, -1.09], [0.28, 0.18, 0.4], "#665066", "santa");

  for (const [part, side] of [["candy-left", -1], ["candy-right", 1]] as const) {
    pivots[part] = [side * 0.6, -0.45, 2.5];
    for (let index = 0; index < 8; index += 1) round("cylinder", [side * 0.6, -1.2 + index * 0.2, 2.5], [0.12, 0.205, 0.12], index % 2 ? red : snow, part);
    for (let index = 0; index < 8; index += 1) {
      const angle = index * Math.PI / 7;
      round("ico", [side * (0.82 - Math.cos(angle) * 0.22), 0.2 + Math.sin(angle) * 0.22, 2.5], [0.12, 0.12, 0.12], index % 2 ? red : snow, part);
    }
  }
  pivots["porch-snow"] = [0, -1.48, 2.4];
  box(pivots["porch-snow"], [1.75, 0.45, 1.15], snow, "porch-snow");
  pivots["chimney-snow"] = [-0.8, 3.95, 0.6];
  box(pivots["chimney-snow"], [0.85, 1.2, 0.85], snow, "chimney-snow");
  for (const dx of [-0.27, 0, 0.27]) round("ico", [-0.8 + dx, 4.5, 0.6], [0.23, 0.15, 0.4], snow, "chimney-snow");
  for (const [part, position, color] of [
    ["present-bed", [-1.1, 1.15, 0.75], "#d7798f"], ["present-desk", [1, 1.29, -1.15], "#74a7b7"],
    ["present-sofa", [-1.1, -0.55, 0.7], "#b98bce"], ["present-table", [1.8, -0.28, 0.6], "#ce8a70"],
  ] as const) {
    pivots[part] = [...position];
    box([...position], [0.6, 0.48, 0.6], color, part);
    box([position[0], position[1] + 0.25, position[2]], [0.12, 0.025, 0.61], gold, part);
    box([position[0], position[1], position[2] + 0.305], [0.12, 0.48, 0.025], gold, part);
  }
}
