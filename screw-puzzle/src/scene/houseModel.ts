import { CHEST_PART_IDS, DINING_CHAIRS, FLOOR_BEAMS, FRAME_POSTS, GROUND_IDS, PLINTH_IDS, ROOF_SECTIONS, TILE_IDS, WALL_SECTIONS } from "../game/types.ts";
import type { ChestPartId, PartId } from "../game/types.ts";
import { addChristmasDetails } from "./christmas.ts";
import { addInteriors } from "./interiors.ts";
import { CHEST_ORIGIN, CHEST_SURFACES, chestPosition } from "./chestModel.ts";
export type Vector = [number, number, number];
export type Piece = { position: Vector; size: Vector; color: string; rotation?: Vector } & (
  { kind: "box" | "cylinder" | "ico" | "gable" | "cone" | "star" | "snow-slab" | "snow-drift"; part: PartId } |
  { kind: "chest-surface"; part: ChestPartId }
);
export const HOUSE = { halfWidth: 2.4, halfDepth: 1.9, ground: -1.6, upper: 0.25, eave: 2, ridge: 3.5, roofRun: 2.7, roofRise: 1.5 };
export const ROOF_PITCH = Math.atan2(HOUSE.roofRise, HOUSE.roofRun);
export const PART_PIVOTS = {
  chimney: [-0.8, 3.55, 0.6],
  "window-upper-left": [-1.5, 1.15, 2], "window-upper-right": [1.5, 1.15, 2],
  "window-lower-left": [-1.5, -0.65, 2], "window-lower-right": [1.5, -0.65, 2],
  door: [0, -0.75, 2], steps: [0, -1.72, 2.35], "planter-left": [-2.9, -1.5, 1.9], "planter-right": [2.9, -1.5, 1.9],
  bed: [-1.45, 0.65, 0.65], wardrobe: [-1.55, 1.1, -1.25], desk: [1.4, 0.8, -1.15],
  stairs: [0, -0.6, 0], "floor-left": [-1.375, 0.25, 0], "floor-right": [1.375, 0.25, 0],
  sofa: [-1.45, -1.15, 0.65], kitchen: [-1.45, -1.1, -1.25], table: [1.35, -0.9, 0.6], "table-vase": [1.3, -0.32, 0.6],
  "ground-nw": [-1.1625, -1.65, -0.9125], "ground-ne": [1.1625, -1.65, -0.9125], "ground-sw": [-1.1625, -1.65, 0.9125], "ground-se": [1.1625, -1.65, 0.9125],
  "plinth-nw": [-1.2625, -1.82, -1.0125], "plinth-ne": [1.2625, -1.82, -1.0125], "plinth-sw": [-1.2625, -1.82, 1.0125], "plinth-se": [1.2625, -1.82, 1.0125],
  "tile-nw": [-2.8, -2.01, -2.8], "tile-n": [0, -2.01, -2.8], "tile-ne": [2.8, -2.01, -2.8],
  "tile-w": [-2.8, -2.01, 0], "tile-center": [0, -2.01, 0], "tile-e": [2.8, -2.01, 0],
  "tile-sw": [-2.8, -2.01, 2.8], "tile-s": [0, -2.01, 2.8], "tile-se": [2.8, -2.01, 2.8],
} as Record<PartId, Vector>;
for (const section of ROOF_SECTIONS) {
  const run = section.band === "ridge" ? 0.675 : 2.025;
  PART_PIVOTS[section.id] = [(section.side === "left" ? -1 : 1) * run, 3.5 - run / 1.8, section.z];
}
for (const section of WALL_SECTIONS) {
  const along = section.face === "front" || section.face === "back" ? (section.column - 2) * 1.6 : (section.column - 2) * 3.8 / 3;
  const y = section.story === "upper" ? 1.1 : -0.7;
  PART_PIVOTS[section.id] = section.face === "front" || section.face === "back" ? [along, y, section.face === "front" ? 1.9 : -1.9] : [section.face === "left" ? -2.4 : 2.4, y, along];
}
export const PIECES: Piece[] = [];
function box(position: Vector, size: Vector, color: string, part: PartId, rotation?: Vector) { PIECES.push({ kind: "box", position, size, color, part, rotation }); }
function round(kind: "cylinder" | "ico", position: Vector, size: Vector, color: string, part: PartId, rotation?: Vector) { PIECES.push({ kind, position, size, color, part, rotation }); }
function window(x: number, y: number, part: PartId) {
  box([x, y, 1.99], [0.96, 1.05, 0.12], "#89685b", part);
  box([x, y, 2.07], [0.78, 0.86, 0.06], "#f6d985", part);
  box([x, y, 2.115], [0.055, 0.86, 0.035], "#fff3d1", part);
  box([x, y, 2.115], [0.78, 0.055, 0.035], "#fff3d1", part);
  box([x, y - 0.57, 2.03], [1.12, 0.1, 0.3], "#a77e65", part);
}

for (const [index, part] of TILE_IDS.entries()) {
  const [x, y, z] = PART_PIVOTS[part];
  box([x, y, z], [2.76, 0.24, 2.76], "#799c8b", part);
  box([x, y + 0.125, z], [2.65, 0.025, 2.65], index % 2 ? "#a9c8ae" : "#bbcfb2", part);
}
for (const part of PLINTH_IDS) box(PART_PIVOTS[part], [2.505, 0.2, 2.005], "#bbb7aa", part);
for (const part of GROUND_IDS) box(PART_PIVOTS[part], [2.305, 0.1, 1.805], "#cfaa77", part);
// Partition the front wall around genuine openings, including the siding strips.
export const FRONT_OPENINGS = [
  ...[-1.5, 1.5].flatMap((x) => [1.15, -0.65].map((y) => ({ x, y, width: 0.84, height: 0.91 }))),
  { x: 0, y: -0.75, width: 0.94, height: 1.62 },
];
function wallIntervals(y: number): [number, number][] {
  let intervals: [number, number][] = [[-2.4, 2.4]];
  for (const hole of FRONT_OPENINGS.filter((hole) => Math.abs(y - hole.y) < hole.height / 2)) {
    const left = hole.x - hole.width / 2, right = hole.x + hole.width / 2;
    intervals = intervals.flatMap(([a, b]) => right <= a || left >= b ? [[a, b]] : [[a, Math.max(a, left)], [Math.min(b, right), b]].filter(([a, b]) => b - a > 0.001) as [number, number][]);
  }
  return intervals;
}
const bands = [...new Set([-1.6, 0.2, 2, ...FRONT_OPENINGS.flatMap((hole) => [hole.y - hole.height / 2, hole.y + hole.height / 2])])].sort((a, b) => a - b);
for (let index = 1; index < bands.length; index += 1) {
  const y = (bands[index - 1] + bands[index]) / 2;
  for (const [left, right] of wallIntervals(y)) for (const section of WALL_SECTIONS.filter((part) => part.face === "front" && part.story === (y < 0.2 ? "lower" : "upper"))) {
    const center = PART_PIVOTS[section.id][0];
    const a = Math.max(left, center - 0.8), b = Math.min(right, center + 0.8);
    if (b > a) box([(a + b) / 2, y, 1.9], [b - a - 0.008, bands[index] - bands[index - 1], 0.12], "#f2d6b7", section.id);
  }
}
for (const section of WALL_SECTIONS) {
  const [x, y, z] = PART_PIVOTS[section.id];
  const broad = section.face === "front" || section.face === "back";
  if (section.face !== "front") box([x, y, z], broad ? [1.588, 1.788, 0.12] : [0.12, 1.788, 3.8 / 3 - 0.012], "#eed1af", section.id);
  if (broad && section.story === "upper" && section.column === 2) PIECES.push({ kind: "gable", position: [0, 2, z], size: [1, 1, 1], color: "#f2d6b7", part: section.id });
  for (const dy of [-0.6, -0.15, 0.3, 0.75]) {
    if (section.face === "front") {
      for (const [left, right] of wallIntervals(y + dy)) {
        const a = Math.max(left, x - 0.79), b = Math.min(right, x + 0.79);
        if (b > a) box([(a + b) / 2, y + dy, 1.964], [b - a, 0.025, 0.012], "#d6b894", section.id);
      }
    } else box([broad ? x : x + Math.sign(x) * 0.064, y + dy, broad ? z + Math.sign(z) * 0.064 : z], broad ? [1.58, 0.025, 0.012] : [0.012, 0.025, 1.23], "#d6b894", section.id);
  }
}
// Separate timbers at each floor joint with visible end caps and joinery.
for (const { id, story, x, z } of FRAME_POSTS) {
  const upper = story === "upper";
  PART_PIVOTS[id] = [x, upper ? 1.17 : -0.70, z];
  box(PART_PIVOTS[id], [0.15, upper ? 1.77 : 1.82, 0.15], "#987056", id);
  box([x, upper ? 0.32 : -1.55, z], [0.18, 0.1, 0.18], "#855f48", id);
}
for (const [id, z] of [[FLOOR_BEAMS[0], 1.84], [FLOOR_BEAMS[1], -1.84]] as const) {
  PART_PIVOTS[id] = [0, 0.24, z];
  box(PART_PIVOTS[id], [4.7, 0.16, 0.14], "#a07859", id);
}
for (const section of ROOF_SECTIONS) {
  const side = section.side === "left" ? -1 : 1;
  const [x, y, z] = PART_PIVOTS[section.id];
  box([x, y, z], [Math.hypot(1.35, 0.75) - 0.012, 0.16, 1.38], side === 1 ? "#d7776d" : "#ea9580", section.id, [0, 0, -side * ROOF_PITCH]);
  for (const dz of [-0.68, 0.68]) box([x, y, z + dz], [1.54, 0.18, 0.04], "#a95f58", section.id, [0, 0, -side * ROOF_PITCH]);
  if (section.band === "ridge") box([side * 0.044, 3.54, z], [0.09, 0.16, 1.38], "#aa6058", section.id);
}
box([-0.8, 3.55, 0.6], [0.5, 1.0, 0.5], "#cba38d", "chimney");
box([-0.8, 4.11, 0.6], [0.66, 0.14, 0.66], "#77707e", "chimney");
for (const y of [3.25, 3.55, 3.85]) box([-0.8, y, 0.86], [0.5, 0.035, 0.025], "#b38d7a", "chimney");
window(-1.5, 1.15, "window-upper-left"); window(1.5, 1.15, "window-upper-right");
window(-1.5, -0.65, "window-lower-left"); window(1.5, -0.65, "window-lower-right");
box([0, -0.75, 1.99], [1.1, 1.75, 0.15], "#8e6b54", "door");
box([0, -0.75, 2.09], [0.9, 1.6, 0.07], "#568e85", "door");
box([0, -0.35, 2.14], [0.55, 0.5, 0.03], "#b9d7be", "door");
round("ico", [0.31, -0.85, 2.16], [0.06, 0.06, 0.06], "#ffdb85", "door");
box([0, -1.71, 2.25], [1.35, 0.18, 0.6], "#c9c3b2", "steps");
box([0, -1.82, 2.65], [1.55, 0.14, 0.34], "#c9c3b2", "steps");
for (const side of [-1, 1]) {
  const part = side === -1 ? "planter-left" : "planter-right";
  round("cylinder", [side * 2.9, -1.65, 1.9], [0.35, 0.5, 0.35], "#bb8463", part);
  round("cylinder", [side * 2.9, -1.865, 1.9], [0.327, 0.085, 0.327], "#a76a50", part);
  round("cylinder", [side * 2.9, -1.39, 1.9], [0.40, 0.09, 0.40], "#c98868", part);
  round("cylinder", [side * 2.9, -1.345, 1.9], [0.382, 0.036, 0.382], "#dda485", part);
  round("cylinder", [side * 2.9, -1.317, 1.9], [0.319, 0.035, 0.319], "#775c4a", part);
  for (let index = 0; index < 12; index += 1) {
    const angle = (index + 0.5) * Math.PI / 6;
    const dx = Math.sin(angle), dz = Math.cos(angle);
    box([side * 2.9 + dx * 0.329, -1.615, 1.9 + dz * 0.329], [0.037, 0.31, 0.024], "#ca9473", part, [0, angle, 0]);
    const height = -1.08 + (index % 3) * 0.10;
    round("ico", [side * 2.9 + dx * 0.23, height, 1.9 + dz * 0.23],
      [0.16, 0.19, 0.16], index % 2 ? "#77ab80" : "#518c6b", part);
    if (index % 3 === 0) round("ico", [side * 2.9 + dx * 0.30, height + 0.13, 1.9 + dz * 0.30], [0.042, 0.046, 0.042], "#e86c87", part);
  }
  round("ico", [side * 2.9, -0.93, 1.9], [0.25, 0.25, 0.25], "#669b70", part);
}
// Removable upper floor wings surround an open stairwell.
box([-1.375, 0.25, 0], [1.85, 0.12, 3.4], "#d0ac79", "floor-left");
box([1.375, 0.25, 0], [1.85, 0.12, 3.4], "#d0ac79", "floor-right");
for (const side of [-1, 1]) for (const z of [-1.2, -0.6, 0, 0.6, 1.2]) box([side * 1.375, 0.315, z], [1.84, 0.012, 0.018], "#b78e61", side === -1 ? "floor-left" : "floor-right");
// Bed, pillows, blanket, wardrobe doors and handles.
box([-1.45, 0.55, 0.65], [1.25, 0.5, 1.6], "#a57c65", "bed");
box([-1.45, 0.83, 0.65], [1.2, 0.15, 1.5], "#87b8ca", "bed");
box([-1.45, 0.83, -0.12], [1.32, 0.9, 0.1], "#9a705d", "bed");
for (const x of [-1.77, -1.13]) box([x, 0.96, 0.02], [0.49, 0.16, 0.32], "#fff0db", "bed");
box([-1.55, 1.1, -1.25], [1.15, 1.7, 0.65], "#b48b70", "wardrobe");
for (const x of [-1.84, -1.26]) box([x, 1.1, -0.91], [0.51, 1.58, 0.04], "#c49b7f", "wardrobe");
for (const x of [-1.62, -1.48]) round("ico", [x, 1.05, -0.865], [0.035, 0.035, 0.035], "#f5d18d", "wardrobe");
// Desk, lamp and books.
box([1.4, 0.97, -1.15], [1.45, 0.12, 0.95], "#bd9573", "desk");
for (const x of [0.8, 2]) for (const z of [-1.5, -0.8]) box([x, 0.59, z], [0.09, 0.64, 0.09], "#99725d", "desk");
box([1.35, 1.09, -1.05], [0.35, 0.11, 0.3], "#a797ce", "desk");
round("cylinder", [1.95, 1.09, -1.4], [0.12, 0.06, 0.12], "#e9bf7d", "desk");
box([1.95, 1.29, -1.4], [0.045, 0.35, 0.045], "#ad936e", "desk");
round("cylinder", [1.95, 1.5, -1.4], [0.21, 0.21, 0.21], "#f8d89c", "desk");
// Exact exported surfaces are used by CPU clearance and visibility audits.
// The render layer loads the matching textured nodes instead of these meshes.
for (const part of CHEST_PART_IDS) {
  PART_PIVOTS[part] = chestPosition(CHEST_SURFACES[part].pivot);
  PIECES.push({ kind: "chest-surface", part, position: CHEST_ORIGIN, size: [1, 1, 1], color: "#ffffff" });
}
// A real thirteen-tread stair connects the two stories.
for (let step = 0; step < 13; step += 1) {
  const top = -1.5 + step * 0.15;
  const z = 1.25 - step * 0.18;
  box([0, top - 0.06, z], [0.82, 0.12, 0.23], "#b68a60", "stairs");
  box([-0.43, top + 0.24, z], [0.04, 0.6, 0.04], "#bd9775", "stairs");
}
box([0, 0.25, -1.3], [0.9, 0.12, 0.8], "#c6a177", "stairs");
// Ground-floor sofa, kitchen sink/hob, and a dining set.
box([-1.45, -1.23, 0.65], [1.5, 0.55, 1.25], "#6e9eaa", "sofa");
box([-1.45, -0.78, 0.03], [1.5, 1.1, 0.16], "#739faa", "sofa");
for (const x of [-2.13, -0.77]) box([x, -0.98, 0.65], [0.16, 0.6, 1.25], "#7baab4", "sofa");
for (const x of [-1.78, -1.12]) box([x, -0.9, 0.7], [0.61, 0.12, 0.98], "#9bc2c8", "sofa");
for (const x of [-1.78, -1.12]) {
  box([x, -0.855, 1.185], [0.55, 0.025, 0.025], "#c3dbe0", "sofa");
  box([x, -0.49, 0.123], [0.57, 0.28, 0.075], "#8eb6bb", "sofa");
}
for (const x of [-2.07, -0.82]) for (const z of [0.19, 1.12]) box([x, -1.535, z], [0.13, 0.12, 0.13], "#8d6551", "sofa");
box([-1.45, -1.1, -1.25], [1.6, 1, 0.9], "#b7c4a3", "kitchen");
box([-1.45, -0.55, -1.25], [1.7, 0.1, 1], "#e1d4b7", "kitchen");
box([-1.75, -0.48, -1.25], [0.43, 0.06, 0.45], "#9caeb0", "kitchen");
box([-1.75, -0.44, -1.25], [0.31, 0.02, 0.33], "#667f83", "kitchen");
for (const z of [-1.45, -1.05]) round("cylinder", [-1.13, -0.48, z], [0.13, 0.035, 0.13], "#6d6c72", "kitchen");
box([-1.75, -0.26, -1.5], [0.04, 0.38, 0.04], "#c1cac4", "kitchen");
for (const x of [-1.97, -1.45, -0.93]) {
  box([x, -1.055, -0.785], [0.46, 0.69, 0.05], "#aabd99", "kitchen");
  box([x, -1.075, -0.753], [0.35, 0.51, 0.025], "#c4d1b2", "kitchen");
  box([x, -0.785, -0.737], [0.18, 0.044, 0.07], "#c58e66", "kitchen");
}
box([1.35, -0.63, 0.6], [1.5, 0.09, 1.1], "#9e6e50", "table");
for (const [index, color] of ["#bc8b65", "#cc9d74", "#c49570", "#d1a279", "#bf9069"].entries()) {
  box([1.35, -0.575, 0.16 + index * 0.22], [1.5, 0.05, 0.214], color, "table");
}
for (const z of [0.14, 1.06]) box([1.35, -0.733, z], [1.28, 0.16, 0.1], "#ad7958", "table");
for (const x of [0.75, 1.95]) for (const z of [0.2, 1]) {
  box([x, -1.09, z], [0.09, 0.85, 0.09], "#a57858", "table");
  box([x, -1.48, z], [0.12, 0.12, 0.12], "#895d49", "table");
}
for (const { id, z, outward } of DINING_CHAIRS) {
  PART_PIVOTS[id] = [1.35, -1.1, z];
  const back = z + outward * 0.24;
  box([1.35, -1.08, z], [0.55, 0.1, 0.5], "#c99770", id);
  for (const x of [1.12, 1.58]) {
    for (const offset of [-0.18, 0.18]) box([x, -1.34, z + offset], [0.07, 0.52, 0.07], "#9b6b51", id);
    box([x, -0.82, back], [0.075, 0.6, 0.075], "#9b6b51", id);
    box([x, -1.34, z], [0.055, 0.055, 0.35], "#ae7c5c", id);
  }
  for (const y of [-0.72, -0.92]) box([1.35, y, back], [0.48, 0.10, 0.07], "#c99770", id);
  box([1.35, -0.54, back], [0.55, 0.095, 0.095], "#b47d5e", id);
}
round("cylinder", [1.3, -0.4, 0.6], [0.1, 0.3, 0.1], "#b38cc1", "table-vase");
round("cylinder", [1.3, -0.26, 0.6], [0.109, 0.035, 0.109], "#d1a8de", "table-vase");
for (const x of [1.22, 1.3, 1.38]) {
  round("cylinder", [x, -0.22, 0.6], [0.013, 0.16, 0.013], "#5c9274", "table-vase", [0, 0, (1.3 - x) * 4]);
  round("ico", [x, -0.12 - Math.abs(x - 1.3) * 0.48, 0.6], [0.073, 0.068, 0.071], "#e9adc7", "table-vase");
}
addChristmasDetails(PIECES, PART_PIVOTS, ROOF_PITCH);
addInteriors(PIECES, PART_PIVOTS);

// Group tabletop props and dining chairs with their furniture so their feet
// and bases stay on the right surfaces when the room is scaled.
const furnitureFamilies = [
  { base: 0.31, ids: ["bed", "present-bed"] },
  { base: 0.31, ids: ["wardrobe"] },
  { base: 0.31, ids: ["desk", "present-desk"] },
  { base: -1.6, ids: ["sofa", "present-sofa"] },
  { base: -1.6, ids: ["kitchen"] },
  { base: -1.6, ids: ["table", "table-vase", "present-table", ...DINING_CHAIRS.map(({ id }) => id)] },
] as const;
const furnitureAnchors = new Map<PartId, Vector>();
const FURNITURE_SCALE = 0.5;
for (const { base, ids } of furnitureFamilies) {
  const [x, , z] = PART_PIVOTS[ids[0]];
  for (const id of ids) furnitureAnchors.set(id, [x, base, z]);
}
export function resizeFurniturePoint(part: PartId, point: Vector): Vector {
  const anchor = furnitureAnchors.get(part);
  if (!anchor) return point;
  const [x, y, z] = anchor;
  return [x + (point[0] - x) * FURNITURE_SCALE, y + (point[1] - y) * FURNITURE_SCALE, z + (point[2] - z) * FURNITURE_SCALE];
}
for (const part of furnitureAnchors.keys()) PART_PIVOTS[part] = resizeFurniturePoint(part, PART_PIVOTS[part]);
for (const piece of PIECES) {
  if (!furnitureAnchors.has(piece.part)) continue;
  piece.position = resizeFurniturePoint(piece.part, piece.position);
  piece.size = [piece.size[0] * FURNITURE_SCALE, piece.size[1] * FURNITURE_SCALE, piece.size[2] * FURNITURE_SCALE];
}
