import { GARLANDS, SNOW_ROOFS } from "../game/types.ts";
import type { PartId } from "../game/types.ts";
import type { Piece, Vector } from "./houseModel.ts";

// Original procedural props. Every detail belongs to a removable assembly.
export function addChristmasDetails(pieces: Piece[], pivots: Record<PartId, Vector>, pitch: number) {
  const box = (position: Vector, size: Vector, color: string, part: PartId, rotation?: Vector) => pieces.push({ kind: "box", position, size, color, part, rotation });
  const round = (kind: "ico" | "cylinder" | "cone" | "star" | "snow-slab" | "snow-drift", position: Vector, size: Vector, color: string, part: PartId, rotation?: Vector) => pieces.push({ kind, position, size, color, part, rotation });
  const snow = "#f1f6ff", red = "#cf4f61", green = "#397d65", gold = "#efc86c";
  const shadedSnow = "#e2edf7";
  const ice = "#d5e8f3";
  for (const strip of SNOW_ROOFS) {
    const side = strip.side === "left" ? -1 : 1;
    const x = side * (1.35 + Math.sin(pitch) * 0.2), y = 2.75 + Math.cos(pitch) * 0.2;
    pivots[strip.id] = [x, y, strip.z];
    const tilt: Vector = [0, 0, -side * pitch];
    round("snow-slab", [x, y, strip.z], [3.11, 0.24, 1.38], snow, strip.id, tilt);
    round("snow-slab", [side * 2.83, 1.95, strip.z], [0.20, 0.44, 1.38], shadedSnow, strip.id);
    // Thin, uneven shelves stay on the same snow section as it detaches.
    for (const [index, run] of [0.72, 1.98, 2.47].entries()) {
      const lift = 0.29;
      const ridgeX = side * (run + Math.sin(pitch) * lift);
      const ridgeY = 3.5 - run / 1.8 + Math.cos(pitch) * lift;
      round("snow-drift", [ridgeX, ridgeY, strip.z + (index - 1) * 0.16],
        [0.34 + index * 0.065, 0.08 + index * 0.017, 0.55 - index * 0.055],
        index === 2 ? shadedSnow : snow, strip.id, tilt);
    }
    for (const [index, dz] of [-0.48, -0.16, 0.21, 0.50].entries()) {
      const drip = 0.16 + ((index + Math.round(strip.z + 2)) % 3) * 0.048;
      round("snow-drift", [side * 2.84, 2.09, strip.z + dz], [0.14, 0.15 + drip * 0.2, 0.20], snow, strip.id);
      round("cone", [side * 2.88, 1.76 - drip / 2, strip.z + dz + 0.08], [0.05, drip, 0.052], ice, strip.id, [Math.PI, 0, 0]);
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
    round("snow-slab", pivots[part], [5.02, 0.45, 0.48], snow, part);
    for (let index = 0; index < 12; index += 1) round("cone", [(index - 5.5) * 0.41, 1.54 - (index % 3) * 0.035, sign * 2.36], [0.08, 0.36, 0.08], "#d9ebf7", part, [Math.PI, 0, 0]);
    for (const [index, x] of [-2.17, -1.03, -0.39, 0.72, 1.74, 2.23].entries()) {
      round("snow-drift", [x, 2.045 + (index % 3) * 0.023, sign * 2.55],
        [0.29 + (index % 3) * 0.05, 0.10, 0.18], snow, part);
    }
  }
  for (const [part, axis, sign] of [["snowbank-front", "z", 1], ["snowbank-back", "z", -1], ["snowbank-left", "x", -1], ["snowbank-right", "x", 1]] as const) {
    const broad = axis === "z";
    pivots[part] = broad ? [0, -1.65, sign * 3.35] : [sign * 3.35, -1.65, 0];
    round("snow-slab", pivots[part], broad ? [8.7, 1, 2] : [2, 1, 4.68], snow, part);
    for (const [index, drift] of [0.15, 0.19, 0.12, 0.23, 0.16, 0.21, 0.13].entries()) {
      const along = (index - 3) * (broad ? 1.16 : 0.65);
      const edge = sign * (3.55 + (index % 3 - 1) * 0.22);
      round("snow-drift", broad ? [along, -1.20, edge] : [edge, -1.20, along],
        broad ? [0.84, drift, 0.70] : [0.70, drift, 0.55], snow, part);
      const crest = sign * (3.78 + (index % 3 - 1) * 0.16);
      round("snow-drift", broad ? [along + 0.18, -1.17, crest] : [crest, -1.17, along - 0.10],
        broad ? [0.56, drift * 0.75, 0.40] : [0.41, drift * 0.75, 0.43], "#f8fbff", part);
      if (index % 2 === 0) {
        round("snow-drift", broad ? [along + 0.32, -1.32, sign * 3.06] : [sign * 3.06, -1.32, along + 0.12],
          broad ? [0.63, drift, 0.62] : [0.62, drift, 0.43], shadedSnow, part);
      }
    }
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
  const lantern = "holiday-lantern", iron = "#394e4b";
  const lx = 3.42, lz = -1.62;
  pivots[lantern] = [lx, -0.63, lz];
  for (const [y, size] of [[-1.095, 0.74], [-1.02, 0.63], [-0.22, 0.62], [-0.12, 0.52], [-0.043, 0.35]]) {
    box([lx, y, lz], [size, 0.085, size], iron, lantern);
  }
  for (const dx of [-0.26, 0.26]) for (const dz of [-0.26, 0.26]) {
    box([lx + dx, -0.62, lz + dz], [0.047, 0.82, 0.047], iron, lantern);
    box([lx + dx, -0.91, lz + dz], [0.069, 0.075, 0.069], "#91724e", lantern);
  }
  for (const dx of [-0.105, 0.105]) box([lx + dx, 0.073, lz], [0.033, 0.16, 0.04], iron, lantern);
  box([lx, 0.155, lz], [0.22, 0.035, 0.041], iron, lantern);
  for (const [dx, dz, height] of [[-0.10, -0.05, 0.43], [0.14, 0.12, 0.29]]) {
    round("cylinder", [lx + dx, -0.975 + height / 2, lz + dz], [0.066, height, 0.066], "#fff0c3", lantern);
    round("ico", [lx + dx, -0.94 + height, lz + dz], [0.028, 0.061, 0.028], "#ffb54d", lantern);
  }
  for (const [index, dx] of [-0.31, -0.18, -0.04, 0.12, 0.27].entries()) {
    round("ico", [lx + dx, -0.985 + (index % 2) * 0.032, lz + 0.26], [0.12, 0.051, 0.08], green, lantern);
    if (index % 2 === 0) round("ico", [lx + dx, -0.94, lz + 0.31], [0.035, 0.033, 0.035], red, lantern);
  }
  for (const side of [-1, 1]) box([lx + side * 0.096, -0.055, lz + 0.209],
    [0.18, 0.086, 0.035], red, lantern, [0, 0, side * 0.3]);
  round("ico", [lx, -0.06, lz + 0.233], [0.065, 0.055, 0.031], red, lantern);

  for (const [part, side] of [["candy-left", -1], ["candy-right", 1]] as const) {
    pivots[part] = [side * 0.6, -0.45, 2.5];
    for (let index = 0; index < 8; index += 1) round("cylinder", [side * 0.6, -1.2 + index * 0.2, 2.5], [0.12, 0.205, 0.12], index % 2 ? red : snow, part);
    for (let index = 0; index < 8; index += 1) {
      const angle = index * Math.PI / 7;
      round("ico", [side * (0.82 - Math.cos(angle) * 0.22), 0.2 + Math.sin(angle) * 0.22, 2.5], [0.12, 0.12, 0.12], index % 2 ? red : snow, part);
    }
  }
  pivots["porch-snow"] = [0, -1.48, 2.4];
  round("snow-slab", pivots["porch-snow"], [1.75, 0.45, 1.15], snow, "porch-snow");
  for (const [x, z, width] of [[-0.68, 2.8, 0.22], [-0.28, 2.94, 0.24], [0.17, 2.86, 0.29], [0.63, 2.79, 0.25]]) {
    round("snow-drift", [x, -1.43, z], [width, 0.15, 0.15], shadedSnow, "porch-snow");
  }
  pivots["chimney-snow"] = [-0.8, 3.95, 0.6];
  round("snow-slab", pivots["chimney-snow"], [0.85, 1.2, 0.85], snow, "chimney-snow");
  for (const dx of [-0.27, 0, 0.27]) round("ico", [-0.8 + dx, 4.5, 0.6], [0.23, 0.15, 0.4], snow, "chimney-snow");
  for (const [index, dx] of [-0.28, -0.07, 0.18, 0.32].entries()) {
    round("snow-drift", [-0.8 + dx, 4.43 - (index % 2) * 0.06, 0.97],
      [0.12, 0.12 + (index % 2) * 0.04, 0.09], snow, "chimney-snow");
  }
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
