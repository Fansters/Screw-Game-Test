import { CEILING_IDS, CHEST_PART_IDS, DINING_CHAIRS, FLOOR_BEAMS, FRAME_POSTS, GARLANDS, GROUND_IDS, PARTITION_IDS, PLINTH_IDS, ROOF_IDS, ROOF_SECTIONS, SCREW_COLOR_ORDER, SNOW_ROOFS, TILE_IDS, WALL_SECTIONS } from "./types.ts";
import type { PartId, Screw } from "./types.ts";
import { HOUSE, PART_PIVOTS, ROOF_PITCH } from "../scene/houseModel.ts";
import { findScrewObstructions } from "../scene/obstructions.ts";
import { chestPosition } from "../scene/chestModel.ts";
export { ROOF_PITCH } from "../scene/houseModel.ts";
export const ROOF_RUN = HOUSE.roofRun;
export const ROOF_RISE = HOUSE.roofRise;
export const SCREW_SCALE = 0.275 * 1.25 * 1.15;

type Vector = [number, number, number];
type Placement = { position: Vector; normal: Vector; attachedTo: PartId; solutionAfter?: readonly PartId[] };
const placements: Placement[] = [];
function place(position: Vector, normal: Vector, attachedTo: PartId, solutionAfter?: readonly PartId[]) {
  placements.push({ position, normal, attachedTo, solutionAfter });
}
function roof(side: number, run: number, z: number, part: PartId, offset = 0.095) {
  place([side * (run + Math.sin(ROOF_PITCH) * offset), HOUSE.ridge - run * HOUSE.roofRise / HOUSE.roofRun + Math.cos(ROOF_PITCH) * offset, z],
    [side * Math.sin(ROOF_PITCH), Math.cos(ROOF_PITCH), 0], part);
}
const floors: PartId[] = ["floor-left", "floor-right"];
const upperPartitions = PARTITION_IDS.filter((part) => part.includes("upper"));
const lowerPartitions = PARTITION_IDS.filter((part) => part.includes("lower"));
const upperRoom = [...ROOF_IDS, ...CEILING_IDS, ...upperPartitions];
const lowerRoom = [...floors, ...lowerPartitions];

place([-0.8, 4.195, 0.6], [0, 1, 0], "chimney");
place([-1.065, 3.55, 0.6], [-1, 0, 0], "chimney");
for (const section of ROOF_SECTIONS) {
  const run = section.band === "ridge" ? 0.675 : 2.025, side = section.side === "left" ? -1 : 1;
  roof(side, run - 0.25, section.z - 0.28, section.id);
  // Forward-facing edge fixings sit behind the preceding roof course.
  // Removing that course exposes the next fixing without an extra cover object.
  place([side * run, HOUSE.ridge - run / 1.8, section.z + 0.725], [0, 0, 1], section.id);
}
for (const [part, x, y] of [["window-upper-left", -1.5, 1.15], ["window-upper-right", 1.5, 1.15],
  ["window-lower-left", -1.5, -0.65], ["window-lower-right", 1.5, -0.65]] as const) place([x, y + 0.34, 2.14], [0, 0, 1], part);
for (const [x, y] of [[0, -1.28], [-0.35, -0.48]]) place([x, y, 2.145], [0, 0, 1], "door");
for (const x of [-0.43, 0.43]) place([x, -1.605, 2.28], [0, 1, 0], "steps");
for (const side of [-1, 1]) place([side * 3.265, -1.65, 1.9], [side, 0, 0], side === -1 ? "planter-left" : "planter-right");

// Furniture has a few fixings distributed across corners and side faces.
place([-1.8, 0.92, 0.4], [0, 1, 0], "bed", upperRoom);
place([-1.1, 0.92, 1.1], [0, 1, 0], "bed", upperRoom);
place([-1.85, 1.65, -0.87], [0, 0, 1], "wardrobe", upperRoom);
place([-0.96, 0.75, -1.25], [1, 0, 0], "wardrobe", upperRoom);
place([1, 1.045, -1.45], [0, 1, 0], "desk", upperRoom);
place([0.66, 1, -1.15], [-1, 0, 0], "desk", upperRoom);
place(chestPosition([0, 0.44, 0.408]), [0, 0, 1], "chest-lock", upperRoom);
for (const [position, normal] of [[[-0.31, 0.881, 0.093], [0, 0.957805, 0.287418]], [[0.31, 0.8794, -0.1028], [0, 0.961147, -0.276036]]]) {
  const length = Math.hypot(...normal);
  place(chestPosition(position), [normal[0] / length, normal[1] / length, normal[2] / length], "chest-lid", upperRoom);
}
place(chestPosition([0, 0.31, 0.367]), [0, 0, 1], "chest", upperRoom);
place(chestPosition([0, 0.014, 0]), [0, 1, 0], "chest", [...upperRoom, "chest-lid"]);
for (const step of [1, 7, 11]) place([step % 4 === 1 ? -0.2 : 0.2, -1.485 + step * 0.15, 1.25 - step * 0.18], [0, 1, 0], "stairs", upperRoom);
for (const side of [-1, 1]) {
  const part = side === -1 ? "floor-left" : "floor-right";
  const after: PartId[] = [...upperRoom, ...(side === -1 ? ["bed", "wardrobe"] as const : ["desk", ...CHEST_PART_IDS] as const)];
  for (const x of [0.65, 2.05]) for (const z of [-1.3, 1.3]) place([side * x, 0.33, z], [0, 1, 0], part, after);
  place([side * 1.4, 0.33, 0], [0, 1, 0], part, after);
}
place([-1.8, -0.825, 0.4], [0, 1, 0], "sofa", lowerRoom);
place([-1.1, -0.825, 1], [0, 1, 0], "sofa", lowerRoom);
for (const [x, z] of [[-2.05, -1.55], [-0.85, -0.95]]) place([x, -0.485, z], [0, 1, 0], "kitchen", lowerRoom);
place([-0.635, -1.1, -1.25], [1, 0, 0], "kitchen", lowerRoom);
place([0.85, -0.535, 0.25], [0, 1, 0], "table", lowerRoom);
place([1.8, -0.535, 0.95], [0, 1, 0], "table", lowerRoom);
place([1.84, -0.72, 1.125], [0, 0, 1], "table", lowerRoom);
for (const { id, z, outward } of DINING_CHAIRS) {
  place([1.25, -1.017, z - outward * 0.08], [0, 1, 0], id, lowerRoom);
  place([1.42, -0.72, z + outward * 0.19], [0, 0, -outward], id, lowerRoom);
}
place([1.3, -0.36, 0.711], [0, 0, 1], "table-vase", lowerRoom);

// Outer wall heads face INTO rooms, on solid jambs and corners, never buried
// in their own wall. Real windows, doorways and the roof provide access.
for (const section of WALL_SECTIONS) {
  const [x, , z] = PART_PIVOTS[section.id], upper = section.story === "upper";
  const after: PartId[] = [...floors, ...PARTITION_IDS];
  if (section.face === "front") {
    const outer = section.column !== 2, sign = section.column === 1 ? -1 : 1;
    const fixings = outer ? [[sign * 2.15, upper ? 1.67 : -0.3], [sign * 2.05, upper ? 0.5 : -1.28]] :
      [[-0.74, upper ? 1.65 : -0.25], [0.74, upper ? 0.55 : -1.3]];
    for (const [along, y] of fixings) place([along, y, 1.82], [0, 0, -1], section.id, after);
  } else if (section.face === "back") {
    if (section.column === 2) place([x - 0.4, upper ? 1.62 : -0.25, -1.82], [0, 0, 1], section.id, after);
    else {
      const inward = -Math.sign(x);
      place([x + inward * 0.796, upper ? 1.62 : -0.25, -1.9], [inward, 0, 0], section.id, after);
    }
    place([x + 0.31, upper ? 0.6 : -1.22, -1.82], [0, 0, 1], section.id, after);
  } else {
    const side = section.face === "left" ? -1 : 1;
    const backUpper = upper && section.column === 1;
    const firstZ = backUpper ? -0.74 : section.id === "wall-right-lower-3" ? 1.18 : z - 0.3;
    const secondZ = backUpper && side === -1 ? -1.26 : z + 0.32;
    place([side * 2.32, upper ? 1.55 : -0.3, firstZ], [-side, 0, 0], section.id, after);
    place([side * 2.32, backUpper && side === -1 ? 0.55 : upper ? 0.6 : -1.25, secondZ], [-side, 0, 0], section.id, after);
  }
}
for (const [index, part] of CEILING_IDS.entries()) {
  const z = 1.2 - index * 1.2;
  place([-1.5, 2.14, z - 0.25], [0, 1, 0], part, ROOF_IDS);
  place([1.5, 2.14, z + 0.25], [0, 1, 0], part, ROOF_IDS);
  if (index !== 1) place([0, 2.14, z], [0, 1, 0], part, ROOF_IDS);
}
for (const part of PARTITION_IDS) {
  const upper = part.includes("upper"), side = part.endsWith("left") ? -1 : 1;
  const after = upper ? [...ROOF_IDS, ...CEILING_IDS] : [...floors, "stairs"] as PartId[];
  if (part.includes("cross")) {
    place([side * 1.9, upper ? 1.7 : -0.12, -0.325], [0, 0, 1], part, after);
    place([side * 0.595, upper ? 0.9 : -1.1, -0.4], [-side, 0, 0], part, after);
  } else {
    place([side * 0.47, upper ? 1.76 : -0.08, -0.2], [-side, 0, 0], part, after);
    place([side * 0.47, upper ? 0.55 : -1.35, 1.48], [-side, 0, 0], part, after);
  }
}
for (const part of GROUND_IDS) {
  const [x, , z] = PART_PIVOTS[part];
  for (const [dx, dz] of [[-0.75, -0.55], [0.75, -0.55], [-0.75, 0.55], [0.75, 0.55], [0, 0]]) {
    const after: PartId[] = [...floors, "stairs", "sofa", "kitchen", "table", ...DINING_CHAIRS.map((chair) => chair.id)];
    // The floor faces the walls along these two outside edges of each room.
    if (x * dx > 0) place([Math.sign(x) * 2.32, -1.62, z + dz], [Math.sign(x), 0, 0], part, after);
    else {
      const along = x * dx < 0 && dz === 0.55 ? Math.sign(x) * 0.55 : x + dx;
      place([along, -1.585, z + dz], [0, 1, 0], part, after);
    }
  }
}
for (const [index, part] of PLINTH_IDS.entries()) {
  const [x, , z] = PART_PIVOTS[part];
  for (const [dx, dz] of [[-0.75, -0.55], [0.75, 0.55]]) place([x + dx, -1.705, z + dz], [0, 1, 0], part, [GROUND_IDS[index]]);
  place([Math.sign(x) * 2.53, -1.765, z], [Math.sign(x), 0, 0], part, [GROUND_IDS[index]]);
}
for (const { id, x, z, story } of FRAME_POSTS) {
  const [a, b] = [-Math.sign(x), -Math.sign(z)];
  const depth = 0.078;
  place([x + a * depth, story === "upper" ? 1.74 : -0.94, z + b * 0.048], [a, 0, 0], id);
}
for (const part of FLOOR_BEAMS) {
  const [, y, z] = PART_PIVOTS[part];
  const sign = Math.sign(z);
  place([0.92, y, z - sign * 0.075], [0, 0, -sign], part);
}

// Original Christmas props remain; small decorations use a single fixing.
for (const strip of SNOW_ROOFS) roof(strip.side === "left" ? -1 : 1, 1.35, strip.z + 0.3, strip.id, 0.34);
for (const garland of GARLANDS) {
  const broad = garland.face === "front" || garland.face === "back", sign = garland.face === "back" || garland.face === "left" ? -1 : 1;
  place(broad ? [0, garland.story === "upper" ? 1.84 : 0.04, sign * 2.355] : [sign * 2.855, garland.story === "upper" ? 1.84 : 0.04, 0], broad ? [0, 0, sign] : [sign, 0, 0], garland.id);
}
for (const [part, sign] of [["icicles-front", 1], ["icicles-back", -1]] as const) place([0, 1.9, sign * 2.69], [0, 0, sign], part);
for (const [part, axis, sign] of [["snowbank-front", "z", 1], ["snowbank-back", "z", -1], ["snowbank-left", "x", -1], ["snowbank-right", "x", 1]] as const) for (const along of [-1, 1]) place(axis === "z" ? [along * 3, -1.6, sign * 4.37] : [sign * 4.37, -1.6, along * 1.6], axis === "z" ? [0, 0, sign] : [sign, 0, 0], part);
for (const [part, x, y] of [["wreath-upper-left", -1.5, 1.15], ["wreath-upper-right", 1.5, 1.15], ["wreath-lower-left", -1.5, -0.65], ["wreath-lower-right", 1.5, -0.65]] as const) place([x, y + 0.57, 2.54], [0, 0, 1], part);
place([-0.48, -0.25, 2.53], [0, 0, 1], "door-bow");
for (const side of [-1, 1]) {
  const radialX = side * 0.4 / 0.765, radialZ = Math.sqrt(1 - radialX * radialX), length = Math.hypot(1, 0.85 / 1.5);
  const normal: Vector = [radialX / length, (0.85 / 1.5) / length, radialZ / length];
  place([-3.2 + side * 0.4 + normal[0] * 0.02, -0.9 + normal[1] * 0.02, 2.8 + radialZ * 0.765 + normal[2] * 0.02], normal, "christmas-tree");
}
place([-3.2, 1.11, 2.91], [0, 0.3786328457, 0.9255469562], "christmas-tree");
place([-3.2, 1.49, 3.10], [0, 0, 1], "tree-star");
for (const [part, x, z] of [["gift-left", -3.2, 3.65], ["gift-right", 3.05, -0.65]] as const) place([x, -1.1, z + 0.37], [0, 0, 1], part);
place([3.05, -0.7, -0.8], [0, 0, 1], "santa");
for (const [part, side] of [["candy-left", -1], ["candy-right", 1]] as const) place([side * 0.6, -0.55, 2.63], [0, 0, 1], part);
for (const x of [-0.55, 0.55]) place([x, -1.235, 2.5], [0, 1, 0], "porch-snow");
place([-0.8, 4.67, 0.6], [0, 1, 0], "chimney-snow");
for (const [part, side] of [["roof-lights-left", -1], ["roof-lights-right", 1]] as const) roof(side, 1.35, 2.1, part, 0.54);
for (const part of ["present-bed", "present-desk", "present-sofa", "present-table"] as const) {
  const [x, y, z] = PART_PIVOTS[part];
  if (part === "present-table") {
    place([x, y - 0.02, z + 0.325], [0, 0, 1], part, lowerRoom);
    continue;
  }
  place([x, y + 0.28, z + 0.18], [0, 1, 0], part, part === "present-bed" || part === "present-desk" ? upperRoom : lowerRoom);
}
const lighterTiles = new Set<PartId>(["tile-nw", "tile-n", "tile-ne", "tile-w", "tile-e", "tile-sw", "tile-se"]);
for (const part of TILE_IDS) {
  const [x, , z] = PART_PIVOTS[part];
  const after: PartId[] = PLINTH_IDS.filter((plinth) => {
    const [px, , pz] = PART_PIVOTS[plinth]; return Math.abs(x - px) < 2.64 && Math.abs(z - pz) < 2.39;
  });
  if (z > 0 && x === 0) after.push("steps");
  if (z >= 0 && x < 0) after.push("planter-left");
  if (z >= 0 && x > 0) after.push("planter-right");
  for (const dx of [-1, 1]) for (const dz of [-1, 1]) {
    if (lighterTiles.has(part) && dx === (Math.sign(x) || 1) && dz === (Math.sign(z) || 1)) continue;
    place([x + dx, -1.855, z + dz], [0, 1, 0], part, after);
  }
  if (z !== 0) place([x + 0.7, -2.01, z + Math.sign(z) * 1.395], [0, 0, Math.sign(z)], part, after);
  else if (x !== 0) place([x + Math.sign(x) * 1.395, -2.01, 0.7], [Math.sign(x), 0, 0], part, after);
  else place([0, -1.855, 0], [0, 1, 0], part, after);
}
export const DEMO_LEVEL: Screw[] = placements.map((placement, index) => ({ ...placement, solutionAfter: placement.solutionAfter ? [...placement.solutionAfter] : undefined,
  obstructedBy: findScrewObstructions(placement, SCREW_SCALE), id: `screw-${index + 1}`,
  // Quotas are whole triples; actual positions receive verified randomized colors.
  color: SCREW_COLOR_ORDER[Math.floor(index / 3) % SCREW_COLOR_ORDER.length], removed: false }));
