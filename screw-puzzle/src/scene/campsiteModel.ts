import { Box3, CylinderGeometry, DoubleSide, Euler, Matrix4, Mesh, MeshBasicMaterial, Quaternion, Raycaster, Vector3 } from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { ConvexGeometry } from "three/addons/geometries/ConvexGeometry.js";
import type { CampsitePartId, Screw } from "../game/types.ts";
import type { Piece, Vector } from "./houseModel.ts";
import { geometryFor } from "./geometry.ts";

// Construct only when this level is requested. No live geometry is kept in the module.
export function createCampsiteModel() {

type Mount = Pick<Screw, "position" | "normal" | "solutionAfter"> & { attachedTo: CampsitePartId };
const pieces: Piece[] = [];
const pivots: Record<CampsitePartId, Vector> = {};
const CAMPSITE_MOUNTS: Mount[] = [];
const softBox = new RoundedBoxGeometry(1, 1, 1, 3, 0.09);
const roundLog = new CylinderGeometry(1, 1, 1, 24);
const wood = "#a86e3e", paleWood = "#d6a86a", darkWood = "#714b37";
const cream = "#fff0ce", teal = "#469b95", ochre = "#f3ba37", stone = "#9a9ba7";

function owner(name: string, pivot: Vector): CampsitePartId {
  const id: CampsitePartId = `camp-${name}`;
  pivots[id] = pivot;
  return id;
}
function piece(part: CampsitePartId, kind: Piece["kind"], position: Vector, size: Vector, color: string, rotation?: Vector) {
  pieces.push({ part, kind, position, size, color, rotation });
}
function box(part: CampsitePartId, position: Vector, size: Vector, color: string, rotation?: Vector) {
  piece(part, "box", position, size, color, rotation);
}
function soft(part: CampsitePartId, position: Vector, size: Vector, color: string, rotation?: Vector) {
  pieces.push({ part, kind: "box", geometry: softBox, position, size, color, rotation });
}
function ball(part: CampsitePartId, position: Vector, size: Vector, color: string) {
  piece(part, "ico-detail", position, size, color);
}
function tube(part: CampsitePartId, position: Vector, radius: number, height: number, color: string, rotation?: Vector) {
  pieces.push({ part, kind: "cylinder", geometry: roundLog, position, size: [radius, height, radius], color, rotation });
}
function beam(part: CampsitePartId, from: Vector, to: Vector, radius: number, color = wood) {
  const a = new Vector3(...from), b = new Vector3(...to), direction = b.clone().sub(a);
  const position = a.add(b).multiplyScalar(0.5).toArray();
  const quaternion = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), direction.clone().normalize());
  const rotation = new Euler().setFromQuaternion(quaternion).toArray().slice(0, 3) as Vector;
  tube(part, position, radius, direction.length(), color, rotation);
}
function screw(part: CampsitePartId, position: Vector, normal: Vector = [0, 1, 0]) {
  CAMPSITE_MOUNTS.push({ attachedTo: part, position, normal: new Vector3(...normal).normalize().toArray() });
}
function crate(name: string, [x, y, z]: Vector, color = wood) {
  const body = owner(name, [x, y + 0.28, z]), lid = owner(`${name}-lid`, [x, y + 0.58, z]);
  soft(body, [x, y + 0.27, z], [0.78, 0.54, 0.65], color);
  for (const dx of [-0.31, 0.31]) box(body, [x + dx, y + 0.27, z + 0.33], [0.065, 0.49, 0.055], paleWood);
  soft(lid, [x, y + 0.59, z], [0.84, 0.10, 0.71], paleWood);
  for (const dx of [-0.25, 0.25]) box(lid, [x + dx, y + 0.646, z], [0.048, 0.016, 0.66], darkWood);
  screw(lid, [x, y + 0.59, z + 0.36], [0, 0, 1]);
  screw(body, [x - 0.20, y + 0.54, z]);
  screw(body, [x + 0.20, y + 0.54, z]);
}
function foliage(part: CampsitePartId, [x, y, z]: Vector, radius: number, seed: number) {
  for (let i = 0; i < 7; i += 1) {
    const angle = i * 2.4 + seed;
    ball(part, [x + Math.cos(angle) * radius * 0.55, y + (i % 3) * radius * 0.23, z + Math.sin(angle) * radius * 0.5],
      [radius * 0.68, radius * 0.64, radius * 0.67], i % 2 ? "#80b853" : "#609f50");
    if (i % 2 === 0) ball(part, [x + Math.cos(angle) * radius * 0.96, y + 0.12, z + Math.sin(angle) * radius * 0.9],
      [0.065, 0.07, 0.065], "#d96968");
  }
}

// Nine removable meadow tiles sit over separate stone foundations.
const terrain: { part: CampsitePartId; x: number; z: number }[] = [];
for (let row = 0; row < 3; row += 1) for (let column = 0; column < 3; column += 1) {
  const x = (column - 1) * 3.25, z = (row - 1) * 3.25;
  const grass = owner(`meadow-${row}-${column}`, [x, -0.25, z]);
  const base = owner(`foundation-${row}-${column}`, [x, -0.83, z]);
  soft(base, [x, -0.84, z], [3.23, 0.73, 3.23], "#ded6c1");
  soft(grass, [x, -0.24, z], [3.23, 0.48, 3.23], (row + column) % 2 ? "#97be64" : "#8cb35b");
  screw(base, [x - 0.70, -0.475, z]);
  screw(base, [x + 0.70, -0.475, z]);
  terrain.push({ part: grass, x, z });
  for (let i = 0; i < 13; i += 1) {
    const dx = Math.sin(i * 7 + row) * 1.37, dz = Math.cos(i * 4 + column) * 1.37;
    if (z + dz > 1.8 && x + dx < 0) continue;
    const flower: Vector = [x + dx, 0.035, z + dz];
    for (let petal = 0; petal < 5; petal += 1) {
      const angle = petal * 2 * Math.PI / 5;
      ball(grass, [flower[0] + Math.cos(angle) * 0.045, flower[1], flower[2] + Math.sin(angle) * 0.045],
        [0.045, 0.016, 0.035], "#fff3cf");
    }
    ball(grass, [flower[0], 0.058, flower[2]], [0.027, 0.019, 0.027], "#e5bd3f");
  }
}

// A hollow canvas tent. Roof, curtains and sleeping gear peel independently.
const tx = -2.15, tz = -1.25;
for (const s of [-1, 1]) {
  const roof = owner(`tent-roof-${s}`, [tx + s * 0.77, 1.86, tz]);
  box(roof, [tx + s * 0.78, 1.87, tz], [2.65, 0.10, 3.06], ochre, [0, 0, -s * 0.95]);
  box(roof, [tx + s * 1.45, .46, tz], [.07, .58, 3.05], cream);
  beam(roof, [tx + s * 1.51, 0.77, tz - 1.50], [tx, 2.98, tz - 1.50], 0.055, cream);
  beam(roof, [tx + s * 1.51, 0.77, tz + 1.50], [tx, 2.98, tz + 1.50], 0.055, cream);
  screw(roof, [tx + s * 0.95, 1.62, tz + 1.555], [0, 0, 1]);
  const slope = Math.tan(.95);
  const inward: Vector = [-s * Math.sin(.95), -Math.cos(.95), 0];
  screw(roof, [tx + s * .38 + inward[0] * .055, 1.87 + .40 * slope + inward[1] * .055, tz + 1.31], inward);
  screw(roof, [tx + s * 1.41, .42, tz + (s > 0 ? .43 : .22)], [-s, 0, 0]);
  const curtain = owner(`tent-curtain-${s}`, [tx + s * 0.77, 1.30, tz + 1.31]);
  const tri = new ConvexGeometry([-.045, .045].flatMap((z) => [
    new Vector3(s * .035, .19, z), new Vector3(s * .035, 2.91, z),
    new Vector3(s * 1.45, .79, z), new Vector3(s * 1.45, .19, z),
  ]));
  pieces.push({ part: curtain, kind: "box", geometry: tri, position: [tx, 0, tz + 1.31], size: [1, 1, 1], color: cream });
  beam(curtain, [tx + s * 0.19, 0.25, tz + 1.37], [tx + s * 0.19, 2.48, tz + 1.37], 0.038, "#e7cdae");
  for (let flag = 0; flag < 3; flag += 1) {
    piece(curtain, "cone", [tx + s * (.25 + flag * .21), 2.63 - flag * .30, tz + 1.38],
      [.09, .20, .02], ["#73a8b2", "#e6ae8e", "#8da94f"][flag], [0, 0, Math.PI]);
  }
  screw(curtain, [tx + s * 0.32, 2.03, tz + 1.36], [0, 0, 1]);
  screw(curtain, [tx + s * .85, 0.38, tz + 1.36], [0, 0, 1]);
  const back = owner(`tent-back-${s}`, [tx + s * 0.65, 1.1, tz - 1.32]);
  const backPanel = new ConvexGeometry([-.05, .05].flatMap((z) => [
    new Vector3(0, .19, z), new Vector3(0, 2.91, z), new Vector3(s * 1.45, .19, z),
  ]));
  pieces.push({ part: back, kind: "box", position: [tx, 0, tz - 1.32], size: [1, 1, 1], color: "#dfd3ad", geometry: backPanel });
  screw(back, [tx + s * .50, 1.10, tz - 1.26], [0, 0, 1]);
  screw(back, [tx + s * .45, 0.50, tz - 1.26], [0, 0, 1]);
  const floor = owner(`tent-floor-${s}`, [tx + s * 0.68, 0.10, tz]);
  soft(floor, [tx + s * 0.68, 0.10, tz], [1.35, 0.17, 2.65], "#b68e5c");
  for (const z of [-0.91, 0, 0.91]) screw(floor, [tx + s * 0.68, 0.188, tz + z]);
  const frame = owner(`tent-frame-${s}`, [tx + s * 0.72, 1.15, tz - 1.43]);
  beam(frame, [tx + s * 1.45, 0.19, tz - 1.44], [tx, 2.98, tz - 1.44], 0.073);
  screw(frame, [tx + s * 1.02, 0.99, tz - 1.36], [0, 0, 1]);
  screw(frame, [tx + s * 0.40, 2.20, tz - 1.36], [0, 0, 1]);
}
const mattress = owner("mattress", [tx, 0.36, tz]);
soft(mattress, [tx, 0.35, tz], [1.75, 0.30, 1.86], "#ba6c50");
screw(mattress, [tx - 0.48, 0.503, tz - 0.10]);
screw(mattress, [tx + 0.48, 0.503, tz + 0.1]);
const quilt = owner("quilt", [tx, 0.54, tz + 0.25]);
soft(quilt, [tx, 0.54, tz + 0.25], [1.81, 0.10, 1.18], "#ce7d51");
for (const dz of [-0.13, 0.19]) box(quilt, [tx, 0.595, tz + dz], [1.69, 0.01, 0.04], "#e7aa6b");
screw(quilt, [tx, 0.594, tz + 0.45]);
const pillow = owner("tent-pillows", [tx, 0.56, tz - 0.64]);
for (const s of [-1, 1]) soft(pillow, [tx + s * 0.39, 0.57, tz - 0.64], [0.65, 0.15, 0.41], cream);
screw(pillow, [tx - 0.39, 0.648, tz - 0.64]);
crate("tent-chest", [tx - 0.88, 0.19, tz + 0.22]);
const rug = owner("tent-rug", [tx, 0.21, tz + 0.5]);
soft(rug, [tx, 0.205, tz + 0.45], [1.90, 0.025, 1.74], "#536f73");
screw(rug, [tx + 0.80, 0.22, tz + 1.11]);
const roll = owner("tent-bedroll", [tx - 1.22, 0.54, tz + 1.49]);
tube(roll, [tx - 1.23, 0.54, tz + 1.49], 0.23, 0.95, "#548fbb", [0, 0, Math.PI / 2]);
for (const dx of [-0.27, 0.27]) tube(roll, [tx - 1.23 + dx, 0.54, tz + 1.49], 0.239, 0.07, "#335e83", [0, 0, Math.PI / 2]);
screw(roll, [tx - .73, 0.54, tz + 1.49], [1, 0, 0]);

// The van contains seats, a kitchen and bedding behind individually removable panels.
const vx = 2.25, vz = -1.63;
const chassis = owner("van-chassis", [vx, 0.43, vz]);
soft(chassis, [vx, 0.43, vz], [2.02, 0.26, 3.56], "#5d6d69");
for (const dz of [-1.30, 0, 1.30]) screw(chassis, [vx, 0.565, vz + dz]);
const vanFloor = owner("van-floor", [vx, 0.65, vz]);
soft(vanFloor, [vx, 0.65, vz], [1.96, 0.16, 3.40], paleWood);
for (const dz of [-1.13, 0, 1.13]) screw(vanFloor, [vx, 0.733, vz + dz]);
const roof = owner("van-roof", [vx, 2.52, vz]);
soft(roof, [vx, 2.52, vz], [2.16, 0.22, 3.78], cream);
for (const [dx, dz] of [[-.50, -.85], [.50, -.85], [0, .85]]) screw(roof, [vx + dx, 2.633, vz + dz]);
const rack = owner("van-roof-rack", [vx, 2.82, vz - 0.20]);
for (const s of [-1, 1]) {
  box(rack, [vx + s * 0.86, 2.87, vz - 0.20], [0.08, 0.25, 2.69], darkWood);
  box(rack, [vx, 2.87, vz - 0.20 + s * 1.32], [1.8, 0.25, 0.08], darkWood);
}
for (const dz of [-1.0, -0.2, 0.6]) box(rack, [vx, 2.69, vz + dz], [1.81, 0.07, 0.10], wood);
for (const s of [-1, 1]) {
  box(rack, [vx + s * .65, 2.70, vz + s * .40], [.20, .10, .20], darkWood);
  screw(rack, [vx + s * .65, 2.647, vz + s * .40], [0, -1, 0]);
}
for (const [i, dx, dz, color] of [[0, -0.42, -0.65, "#e9a536"], [1, 0.42, -0.65, "#629ab2"], [2, 0, 0.55, "#6c9956"]] as const) {
  const baggage = owner(`van-baggage-${i}`, [vx + dx, 2.94, vz + dz]);
  soft(baggage, [vx + dx, 2.94, vz + dz], [0.76, 0.47, 0.76], color);
  for (const s of [-1, 1]) box(baggage, [vx + dx + s * 0.22, 2.94, vz + dz + 0.388], [0.045, 0.43, 0.025], cream);
  box(baggage, [vx + dx, 3.21, vz + dz], [0.22, 0.10, 0.075], wood);
  screw(baggage, [vx + dx, 2.94, vz + dz + (i === 2 ? -0.393 : 0.393)], [0, 0, i === 2 ? -1 : 1]);
}
for (const s of [-1, 1]) {
  for (const half of [-1, 1]) {
    const wall = owner(`van-wall-${s}-${half}`, [vx + s * 0.97, 1.44, vz + half * 0.86]);
    soft(wall, [vx + s * 0.97, 1.10, vz + half * 0.86], [0.13, 0.78, 1.69], teal);
    box(wall, [vx + s * 0.97, 2.26, vz + half * 0.86], [0.13, 0.26, 1.69], cream);
    for (const dz of [-0.74, 0.74]) box(wall, [vx + s * 0.97, 1.81, vz + half * 0.86 + dz], [0.13, 0.70, 0.12], cream);
    screw(wall, [vx + s * 0.89, 1.29, vz + half * 0.86], [-s, 0, 0]);
    screw(wall, [vx + s * 0.89, 2.19, vz + half * 0.86], [-s, 0, 0]);
    const window = owner(`van-window-${s}-${half}`, [vx + s * 0.98, 1.79, vz + half * 0.86]);
    box(window, [vx + s * 0.98, 1.79, vz + half * 0.86], [0.075, 0.57, 1.31], "#a9d4ce");
    for (const dz of [-0.66, 0.66]) box(window, [vx + s * 1.03, 1.79, vz + half * 0.86 + dz], [0.10, 0.62, 0.055], cream);
    screw(window, [vx + s * .938, 1.55, vz + (half < 0 ? -1.35 : .77)], [-s, 0, 0]);
  }
  for (const dz of [-1.15, 1.15]) {
    const wheel = owner(`van-wheel-${s}-${dz}`, [vx + s * 1.03, 0.45, vz + dz]);
    tube(wheel, [vx + s * 1.03, 0.45, vz + dz], 0.40, 0.22, "#37464d", [0, 0, Math.PI / 2]);
    tube(wheel, [vx + s * 1.16, 0.45, vz + dz], 0.235, 0.055, cream, [0, 0, Math.PI / 2]);
    screw(wheel, [vx + s * .91, 0.45, vz + dz], [-s, 0, 0]);
  }
}
for (const s of [-1, 1]) {
  const end = owner(`van-end-${s}`, [vx, 1.52, vz + s * 1.77]);
  soft(end, [vx, 1.20, vz + s * 1.77], [2.06, 0.94, 0.18], teal);
  box(end, [vx, 2.26, vz + s * 1.77], [2.06, 0.29, 0.16], cream);
  for (const dx of [-0.96, 0, 0.96]) box(end, [vx + dx, 1.87, vz + s * 1.77], [0.11, 0.62, 0.16], cream);
  for (const dx of [-0.48, 0.48]) {
    box(end, [vx + dx, 1.88, vz + s * 1.79], [0.80, 0.52, 0.07], "#a2cbc4");
    ball(end, [vx + dx * 1.45, 1.15, vz + s * 1.88], [0.16, 0.16, 0.047], "#ffdb88");
  }
  box(end, [vx, 0.74, vz + s * 1.90], [1.97, 0.15, 0.16], cream);
  if (s > 0) {
    tube(end, [vx, 1.15, vz + 1.89], .27, .03, cream, [Math.PI / 2, 0, 0]);
    piece(end, "cone", [vx, 1.19, vz + 1.915], [.15, .29, .018], "#688d61");
  }
  screw(end, [vx - 0.64, 1.08, vz + s * 1.67], [0, 0, -s]);
  screw(end, [vx + 0.64, 1.08, vz + s * 1.67], [0, 0, -s]);
}
const door = owner("van-door", [vx - 1.07, 1.45, vz + 0.1]);
soft(door, [vx - 1.07, 1.45, vz + 0.1], [0.10, 1.48, 0.75], paleWood);
box(door, [vx - 1.13, 1.91, vz + 0.10], [0.025, 0.38, 0.55], "#aaccc0");
box(door, [vx - 1.14, 1.38, vz + 0.33], [0.035, 0.07, 0.14], cream);
screw(door, [vx - 1.015, 0.97, vz + 0.10], [1, 0, 0]);
screw(door, [vx - 1.015, 2.09, vz + 0.10], [1, 0, 0]);
const awning = owner("van-awning", [vx - 1.52, 2.32, vz]);
box(awning, [vx - 1.46, 2.29, vz], [0.85, 0.06, 2.63], cream, [0, 0, 0.12]);
for (let i = 0; i < 7; i += 1) box(awning, [vx - 1.46, 2.33, vz - 1.12 + i * 0.36], [0.85, 0.035, 0.18], "#cf6d5c", [0, 0, 0.12]);
screw(awning, [vx - 1.02, 2.29, vz - 0.76], [1, 0, 0]);
screw(awning, [vx - 1.02, 2.29, vz + 0.76], [1, 0, 0]);
const ladder = owner("van-ladder", [vx + 1.10, 1.46, vz - 1.22]);
for (const dz of [-0.23, 0.23]) tube(ladder, [vx + 1.12, 1.51, vz - 1.22 + dz], 0.036, 2.12, darkWood);
for (let i = 0; i < 6; i += 1) beam(ladder, [vx + 1.12, 0.62 + i * 0.35, vz - 1.45], [vx + 1.12, 0.62 + i * 0.35, vz - 0.99], 0.036, paleWood);
screw(ladder, [vx + 1.08, 1.0, vz - 1.45], [-1, 0, 0]);
screw(ladder, [vx + 1.08, 2.37, vz - 0.99], [-1, 0, 0]);
for (let i = 0; i < 4; i += 1) {
  const x = vx + (i % 2 ? 0.46 : -0.46), z = vz + (i < 2 ? 1.04 : -1.08);
  const seat = owner(`van-seat-${i}`, [x, 1.09, z]);
  soft(seat, [x, 1.00, z], [0.70, 0.48, 0.70], "#b67f58");
  soft(seat, [x, 1.37, z - 0.27], [0.70, 0.57, 0.16], "#d4a275");
  screw(seat, [x, 1.25, z + 0.20]);
}
for (const [name, x, z, color] of [["fridge", vx + 0.47, vz, cream], ["cupboard", vx - 0.47, vz, "#a9b779"]] as const) {
  const furniture = owner(`van-${name}`, [x, 1.20, z]);
  soft(furniture, [x, 1.13, z], [0.70, 0.81, 0.91], color);
  soft(furniture, [x, 1.58, z], [0.75, 0.09, 0.97], cream);
  screw(furniture, [x - 0.15, 0.95, z + 0.47], [0, 0, 1]);
  screw(furniture, [x + 0.15, 0.95, z - 0.47], [0, 0, -1]);
}
const vanBed = owner("van-bedding", [vx, 1.40, vz - 1.10]);
soft(vanBed, [vx, 1.40, vz - 1.10], [1.55, 0.10, 0.76], "#d6a66d");
screw(vanBed, [vx - 0.54, 1.455, vz - 1.10]);
screw(vanBed, [vx + 0.54, 1.455, vz - 1.10]);
const vanRug = owner("van-rug", [vx, 0.75, vz]);
soft(vanRug, [vx, 0.75, vz], [1.63, 0.025, 2.32], "#d2ba81");
screw(vanRug, [vx + 0.65, 0.765, vz + 0.77]);

// Five evergreens, each built from separately removable foliage tiers and trunk.
for (const [index, x, z, height] of [[0, -4.03, -3.76, 3.5], [1, -0.26, -3.80, 4.4], [2, 4.08, -3.77, 3.8],
  [3, -4.25, 0.38, 2.65], [4, 4.12, 0.09, 2.8]]) {
  const trunk = owner(`tree-${index}-trunk`, [x, height * 0.28, z]);
  tube(trunk, [x, height * 0.27, z], 0.18, height * 0.54, darkWood);
  piece(trunk, "cone", [x, .09, z], [.43, .18, .43], darkWood);
  for (let root = 0; root < 5; root += 1) {
    const angle = root * 2 * Math.PI / 5;
    beam(trunk, [x, .10, z], [x + Math.cos(angle) * .52, .045, z + Math.sin(angle) * .52], .055, darkWood);
  }
  screw(trunk, [x, height * 0.25, z + 0.185], [0, 0, 1]);
  screw(trunk, [x, height * 0.43, z - 0.185], [0, 0, -1]);
  for (let tier = 0; tier < 3; tier += 1) {
    const radius = height * (0.30 - tier * 0.064), y = height * (0.41 + tier * 0.205);
    const canopy = owner(`tree-${index}-tier-${tier}`, [x, y, z]);
    piece(canopy, "cone", [x, y + height * 0.07, z], [radius, height * 0.47, radius], ["#3c8052", "#519751", "#7bad52"][tier]);
    for (let leaf = 0; leaf < 9; leaf += 1) {
      const angle = leaf * 2 * Math.PI / 9;
      ball(canopy, [x + Math.cos(angle) * radius * 0.53, y - height * 0.12, z + Math.sin(angle) * radius * 0.53],
        [radius * 0.49, height * 0.08, radius * 0.49], tier % 2 ? "#55995a" : "#478b51");
    }
    screw(canopy, [x + 0.03, y + height * 0.307, z]);
  }
}

// Boulders, bushes and moss conceal edge fixings on the terrain.
for (const [i, x, z, radius] of [[0, -3.8, -2.65, .71], [1, -2.94, -3.81, .82], [2, -1.46, -3.85, .77],
  [3, -.54, -2.9, .53], [4, -4.13, 1.80, .67], [5, -3.95, 3.9, .60], [6, -.2, 4.14, .62], [7, 3.93, 3.91, .71], [8, 4.16, 2.0, .55]]) {
  const part = owner(`boulder-${i}`, [x, radius * .48, z]);
  const position: Vector = [x, radius * .48, z], size: Vector = [radius, radius * .70, radius * .85];
  ball(part, position, size, i % 2 ? "#b3adb1" : stone);
  for (const s of [-1, 1]) screw(part, [x + s * radius * .20, -radius * .20, z], [s * .20, -1, 0]);
  if (i < 4) {
    const moss = owner(`moss-${i}`, [x, radius * 1.15, z]);
    foliage(moss, [x, radius * 1.09, z], radius * .45, i);
    screw(moss, [x, radius * .79, z], [0, -1, 0]);
  }
}
for (const [i, x, z] of [[0, -3.8, -.2], [1, -3.7, 1.1], [2, -.1, -2.4], [3, .25, -.6],
  [4, 3.8, .9], [5, 3.6, 2.9], [6, .85, 3.8], [7, -2.37, -3.42]]) {
  const bush = owner(`berry-bush-${i}`, [x, .30, z]);
  foliage(bush, [x, .24, z], .52, i);
  screw(bush, [x, -.10, z], [0, -1, 0]);
}

// A picnic table with independent benches, cloth, food and storage.
const px = 2.22, pz = 2.26;
const table = owner("picnic-top", [px, .91, pz]);
for (const dz of [-.31, 0, .31]) soft(table, [px, .91, pz + dz], [2.12, .13, .29], paleWood);
screw(table, [px - .64, .84, pz], [0, -1, 0]);
screw(table, [px + .64, .84, pz], [0, -1, 0]);
const tableFrame = owner("picnic-frame", [px, .47, pz]);
for (const dx of [-.68, .68]) for (const s of [-1, 1]) beam(tableFrame, [px + dx, .07, pz + s * .68], [px + dx, .83, pz + s * .20], .08);
beam(tableFrame, [px - .83, .46, pz], [px + .83, .46, pz], .07);
screw(tableFrame, [px - .84, .46, pz], [-1, 0, 0]);
screw(tableFrame, [px + .84, .46, pz], [1, 0, 0]);
for (const s of [-1, 1]) {
  const bench = owner(`picnic-bench-${s}`, [px, .47, pz + s * .79]);
  soft(bench, [px, .47, pz + s * .79], [2.28, .15, .38], wood);
  for (const dx of [-.70, .70]) screw(bench, [px + dx, .47, pz + s * .595], [0, 0, -s]);
}
const cloth = owner("picnic-cloth", [px, 1.00, pz]);
soft(cloth, [px, .99, pz], [1.29, .025, .94], "#d86c68");
for (let i = -2; i <= 2; i += 1) {
  box(cloth, [px + i * .24, 1.006, pz], [.075, .006, .94], cream);
  box(cloth, [px, 1.007, pz + i * .20], [1.29, .006, .06], cream);
}
screw(cloth, [px - .18, 1.012, pz + .21]);
for (const [i, dx, dz] of [[0, -.34, -.12], [1, .26, .16]]) {
  const mug = owner(`picnic-mug-${i}`, [px + dx, 1.14, pz + dz]);
  tube(mug, [px + dx, 1.14, pz + dz], .13, .25, cream);
  piece(mug, "ring", [px + dx + .14, 1.14, pz + dz], [.075, .075, .075], darkWood, [0, 0, Math.PI / 2]);
  screw(mug, [px + dx, 1.013, pz + dz], [0, -1, 0]);
}
const flask = owner("thermos", [px + .40, 1.28, pz - .22]);
tube(flask, [px + .40, 1.28, pz - .22], .11, .54, "#467769");
tube(flask, [px + .40, 1.58, pz - .22], .10, .10, "#c4c6b7");
screw(flask, [px + .40, 1.011, pz - .22], [0, -1, 0]);
const sandwich = owner("sandwich", [px - .18, 1.10, pz + .21]);
soft(sandwich, [px - .18, 1.10, pz + .21], [.42, .12, .32], "#d6a56f");
soft(sandwich, [px - .18, 1.16, pz + .21], [.43, .025, .33], "#72a752");
screw(sandwich, [px - .18, 1.18, pz + .21]);
crate("picnic-cooler", [px + .13, .02, pz - .12], "#bf625b");
crate("supply-box", [3.63, .02, 1.28], "#6b927b");

// Fire, logs and stools are separate physical assemblies.
const fx = -.65, fz = 1.10;
for (let i = 0; i < 4; i += 1) {
  const angle = i * Math.PI / 2, ring = owner(`fire-ring-${i}`, [fx + Math.cos(angle) * .60, .14, fz + Math.sin(angle) * .60]);
  for (let j = -1; j <= 1; j += 1) {
    const a = angle + j * .35;
    ball(ring, [fx + Math.cos(a) * .59, .14, fz + Math.sin(a) * .59], [.23, .17, .22], "#a9a3a4");
  }
  screw(ring, [fx + Math.cos(angle) * .37, .16, fz + Math.sin(angle) * .37], [-Math.cos(angle), 0, -Math.sin(angle)]);
}
for (let i = 0; i < 3; i += 1) {
  const firewood = owner(`firewood-${i}`, [fx, .14 + i * .10, fz]);
  tube(firewood, [fx, .14 + i * .10, fz], .12, .87, wood, [0, i * 1.04, Math.PI / 2]);
  screw(firewood, [fx, .265 + i * .10, fz]);
}
const fire = owner("campfire", [fx, .70, fz]);
for (let i = 0; i < 5; i += 1) piece(fire, "cone", [fx + Math.sin(i * 3) * .17, .58 + i % 2 * .16, fz + Math.cos(i * 3) * .13],
  [.15 + (i % 2) * .04, .80 + (i % 3) * .13, .15], i % 2 ? "#ffd44c" : "#f49d30", [0, 0, Math.sin(i) * .18]);
screw(fire, [fx, .61, fz + .21], [0, 0, 1]);
for (const [i, x, z] of [[0, -2.60, 1.23], [1, .12, .02]]) {
  const log = owner(`log-seat-${i}`, [x, .24, z]);
  tube(log, [x, .24, z], .25, 1.33, wood, [0, 0, Math.PI / 2]);
  for (const s of [-1, 1]) {
    tube(log, [x + s * .68, .24, z], .218, .036, paleWood, [0, 0, Math.PI / 2]);
    screw(log, [x + s * .38, .004, z], [0, -1, 0]);
  }
}
for (const [i, x, z] of [[0, -3.27, 2.20], [1, -2.73, 2.45], [2, .15, 2.65]]) {
  const stump = owner(`stump-${i}`, [x, .25, z]);
  tube(stump, [x, .24, z], .31, .47, wood);
  tube(stump, [x, .49, z], .29, .035, paleWood);
  for (let j = 0; j < 7; j += 1) {
    const a = j * 2 * Math.PI / 7;
    tube(stump, [x + Math.cos(a) * .28, .22, z + Math.sin(a) * .28], .043, .35, "#be8a51");
  }
  screw(stump, [x, .006, z], [0, -1, 0]);
}

// Three lake tiles, a timber jetty and a hollow rowing boat fill the foreground.
for (let i = 0; i < 3; i += 1) {
  const x = -3.26 + i * 1.18, water = owner(`lake-${i}`, [x, .08, 3.40]);
  soft(water, [x, .07, 3.43], [1.17, .20, 2.77], "#4aaabd");
  for (let ripple = 0; ripple < 7; ripple += 1) {
    const z = 2.20 + ripple * .39;
    soft(water, [x + Math.sin(ripple * 2 + i) * .26, .173, z], [.34, .018, .025], "#a7ddd8");
  }
  const mountX = i === 0 ? x + .21 : i === 2 ? x - .22 : x;
  screw(water, [mountX, .174, 4.10]);
  screw(water, [mountX, .174, 4.40]);
}
for (let i = 0; i < 2; i += 1) {
  const x = -1.95 + i * .93, deck = owner(`dock-deck-${i}`, [x, .66, 3.0]);
  for (let plank = 0; plank < 6; plank += 1) soft(deck, [x, .66, 2.29 + plank * .29], [.91, .13, .265], plank % 2 ? paleWood : wood);
  screw(deck, [x - .10, .593, 2.49], [0, -1, 0]);
  screw(deck, [x + .10, .593, 3.49], [0, -1, 0]);
}
for (const x of [-2.42, -.55]) for (const z of [2.24, 3.76]) {
  const post = owner(`dock-post-${x}-${z}`, [x, .40, z]);
  tube(post, [x, .39, z], .11, 1.06, wood);
  tube(post, [x, .84, z], .13, .09, paleWood);
  for (const y of [.57, .62, .67]) piece(post, "ring", [x, y, z], [.12, .12, .12], "#e2bd7e");
  const inward = x < -1 ? 1 : -1;
  screw(post, [x + inward * .115, .65, z], [inward, 0, 0]);
}
const lifeRing = owner("dock-life-ring", [-.19, .46, 3.72]);
piece(lifeRing, "ring", [-.19, .48, 3.72], [.32, .32, .32], "#d46558", [Math.PI / 2, 0, 0]);
screw(lifeRing, [-.19, .80, 3.78], [0, 0, 1]);
const boat = owner("rowboat", [-1.85, .36, 4.25]);
soft(boat, [-1.85, .30, 4.26], [2.70, .23, .90], "#d1a16a");
for (const s of [-1, 1]) {
  soft(boat, [-1.85, .50, 4.26 + s * .49], [2.66, .36, .13], "#ac534c");
  soft(boat, [-1.85 + s * 1.30, .46, 4.26], [.15, .37, 1.0], cream);
}
screw(boat, [-2.50, .418, 4.26]);
screw(boat, [-1.20, .418, 4.26]);
for (const s of [-1, 1]) {
  const seat = owner(`boat-seat-${s}`, [-1.85 + s * .65, .65, 4.26]);
  soft(seat, [-1.85 + s * .65, .65, 4.26], [.28, .08, .94], paleWood);
  screw(seat, [-1.85 + s * .65, .696, 4.26]);
  const oar = owner(`oar-${s}`, [-1.85, .79, 4.26 + s * .21]);
  beam(oar, [-2.99, .80, 4.26 + s * .08], [-.75, .80, 4.26 + s * .08], .027, paleWood);
  soft(oar, [-.77, .80, 4.26 + s * .08], [.48, .06, .15], cream);
  // Stagger the fixings along the shafts so their wider caps stay separate.
  screw(oar, [-1.85 + s * .18, .83, 4.26 + s * .08]);
}

// Warm lanterns, trail signs and stepping stones connect the separate activities.
for (const [i, x, z] of [[0, -.29, -1.91], [1, 3.92, 3.12], [2, -2.85, 1.95]]) {
  const post = owner(`lantern-post-${i}`, [x, 1.10, z]);
  box(post, [x, 1.04, z], [.14, 2.08, .14], wood);
  box(post, [x + .24, 1.99, z], [.61, .12, .14], paleWood);
  screw(post, [x, .01, z], [0, -1, 0]);
  screw(post, [x + .47, 1.98, z], [0, -1, 0]);
  const lamp = owner(`lantern-${i}`, [x + .47, 1.68, z]);
  soft(lamp, [x + .47, 1.67, z], [.27, .33, .25], "#f9d47a");
  for (const dx of [-.14, .14]) for (const dz of [-.13, .13]) box(lamp, [x + .47 + dx, 1.67, z + dz], [.035, .37, .035], darkWood);
  soft(lamp, [x + .47, 1.47, z], [.34, .08, .32], darkWood);
  piece(lamp, "cone", [x + .47, 1.91, z], [.25, .18, .25], darkWood);
  screw(lamp, [x + .47, 1.47, z + .17], [0, 0, 1]);
}
const sign = owner("trail-sign-post", [3.69, .63, 4.20]);
box(sign, [3.69, .66, 4.20], [.16, 1.32, .16], darkWood);
screw(sign, [3.69, .35, 4.285], [0, 0, 1]);
screw(sign, [3.69, 1.00, 4.285], [0, 0, 1]);
for (let i = 0; i < 2; i += 1) {
  const arrow = owner(`trail-arrow-${i}`, [3.69, .75 + i * .47, 4.31]);
  soft(arrow, [3.69, .75 + i * .47, 4.31], [.98, .30, .09], wood, [0, 0, i ? .08 : -.08]);
  for (const dx of [-.16, .16]) piece(arrow, "cone", [3.69 + dx, .76 + i * .47, 4.37], [.10, .23, .018], cream);
  screw(arrow, [3.99, .75 + i * .47, 4.36], [0, 0, 1]);
}
for (let i = 0; i < 8; i += 1) {
  const z = -.35 + i * .56, x = .72 + Math.sin(i * .7) * .28;
  const step = owner(`path-stone-${i}`, [x, .14, z]);
  soft(step, [x, .14, z], [.48, .12, .37], "#c9bc9c", [0, i * .63, 0]);
  screw(step, [x, .078, z], [0, -1, 0]);
}
for (const [i, x, z] of [[0, -3.92, -.87], [1, -3.98, -1.66], [2, -1.39, -3.31], [3, .01, -3.66],
  [4, 3.80, -.75], [5, 3.85, -1.54]]) crate(`stack-crate-${i}`, [x, .02, z], i % 2 ? "#a67951" : "#78976d");
for (let i = 0; i < 4; i += 1) {
  const log = owner(`woodpile-${i}`, [3.60, .13 + Math.floor(i / 2) * .23, .55 + i % 2 * .25]);
  tube(log, pivots[log], .12, .78, wood, [0, 0, Math.PI / 2]);
  screw(log, [3.60, pivots[log][1] - .124, pivots[log][2]], [0, -1, 0]);
}
for (const [i, x, z] of [[0, -4.35, 2.7], [1, -4.27, 4.52], [2, .12, 4.59], [3, 2.52, 4.41]]) {
  const bank = owner(`bank-rock-${i}`, [x, .13, z]);
  ball(bank, [x, .15, z], [.50, .28, .43], stone);
  for (const s of [-1, 1]) screw(bank, [x + s * .18, -.07, z], [s * .2, -1, 0]);
}

const stove = owner("camp-stove", [-3.27, .64, 2.20]);
soft(stove, [-3.27, .63, 2.20], [.38, .19, .34], "#a94d43");
for (const dx of [-.12, .12]) beam(stove, [-3.27 + dx, .75, 2.04], [-3.27 + dx, .75, 2.36], .019, darkWood);
screw(stove, [-3.27, .53, 2.20], [0, -1, 0]);
screw(stove, [-3.27, .731, 2.20]);
const kettle = owner("kettle", [-3.27, .87, 2.20]);
ball(kettle, [-3.27, .87, 2.20], [.15, .15, .14], "#d4c49e");
beam(kettle, [-3.14, .86, 2.20], [-3.03, .99, 2.20], .041, "#d4c49e");
piece(kettle, "ring", [-3.27, 1.02, 2.20], [.10, .10, .10], darkWood, [Math.PI / 2, 0, 0]);
screw(kettle, [-3.27, .87, 2.345], [0, 0, 1]);
const fishing = owner("fishing-rod", [.06, .70, 4.15]);
beam(fishing, [.25, .10, 4.37], [-.33, 1.82, 4.04], .021, paleWood);
tube(fishing, [.16, .40, 4.32], .082, .09, "#7c8885", [Math.PI / 2, 0, 0]);
screw(fishing, [.16, .40, 4.37], [0, 0, 1]);
crate("tackle-box", [.40, .02, 4.31], "#70988a");
for (const [i, x, z] of [[0, tx + .63, tz - .90], [1, vx - .46, vz - 1.12]]) {
  const lift = i === 1 ? .70 : 0;
  const pack = owner(`backpack-${i}`, [x, .75 + lift, z]);
  soft(pack, [x, .78 + lift, z], [.39, .49, .29], i ? "#8c7865" : "#5f8b79");
  soft(pack, [x, .71 + lift, z + .18], [.29, .22, .10], "#b29764");
  if (i === 1) screw(pack, [x, 1.73, z]);
  else screw(pack, [x, .71, z + .235], [0, 0, 1]);
}
const guitar = owner("guitar", [tx + 1.03, .81, tz + .43]);
ball(guitar, [tx + 1.03, .59, tz + .43], [.23, .28, .085], "#d9a253");
box(guitar, [tx + 1.03, 1.03, tz + .43], [.065, .64, .06], darkWood);
tube(guitar, [tx + 1.03, .65, tz + .52], .073, .014, darkWood, [Math.PI / 2, 0, 0]);
screw(guitar, [tx + .96, .46, tz + .52], [0, 0, 1]);
screw(guitar, [tx + 1.03, 1.21, tz + .465], [0, 0, 1]);
const stool = owner("folding-stool", [-.18, .29, -.63]);
soft(stool, [-.18, .45, -.63], [.43, .10, .39], "#c4a366");
for (const s of [-1, 1]) beam(stool, [-.18 + s * .18, .04, -.63], [-.18 - s * .18, .40, -.63], .025, darkWood);
screw(stool, [-.33, .45, -.43], [0, 0, 1]);
screw(stool, [-.03, .45, -.83], [0, 0, -1]);
const basket = owner("picnic-basket", [px - .35, .23, pz + .05]);
soft(basket, [px - .35, .23, pz + .05], [.47, .42, .46], "#c1965d");
piece(basket, "ring", [px - .35, .49, pz + .05], [.22, .22, .22], darkWood, [Math.PI / 2, 0, 0]);
for (const s of [-1, 1]) screw(basket, [px - .35 + s * .12, .014, pz + .05], [0, -1, 0]);
const campLamp = owner("stump-lantern", [-2.73, .75, 2.45]);
soft(campLamp, [-2.73, .72, 2.45], [.22, .31, .20], "#f4c765");
for (const dx of [-.12, .12]) box(campLamp, [-2.73 + dx, .72, 2.45], [.03, .36, .23], "#8d4d42");
piece(campLamp, "cone", [-2.73, .96, 2.45], [.19, .16, .19], "#ad5149");
screw(campLamp, [-2.73, .74, 2.58], [0, 0, 1]);

// These dependencies guide the generated winning route through visible openings.
// Individual screw selection continues to use the actual geometry clearance.
for (const mount of CAMPSITE_MOUNTS) {
  if (/^camp-(tent-chest|tent-pillows|quilt|mattress|backpack-0|guitar)/.test(mount.attachedTo)) {
    mount.solutionAfter = ["camp-tent-curtain--1", "camp-tent-curtain-1"];
  }
  if (mount.attachedTo.startsWith("camp-tent-back-")) mount.solutionAfter = ["camp-tent-roof--1", "camp-tent-roof-1"];
  if (/^camp-van-(seat|wall|window|end|fridge|cupboard|bedding|rug|backpack)/.test(mount.attachedTo)) {
    mount.solutionAfter = ["camp-van-roof"];
  }
  if (mount.attachedTo === "camp-stack-crate-2") mount.solutionAfter = ["camp-tent-back--1"];
  if (mount.attachedTo.startsWith("camp-dock-deck-")) mount.solutionAfter = ["camp-meadow-2-0", "camp-meadow-2-1"];
  if (mount.attachedTo === "camp-van-rug") mount.solutionAfter = [
    "camp-van-roof", "camp-van-seat-0", "camp-van-seat-1", "camp-van-seat-2", "camp-van-seat-3",
    "camp-van-fridge", "camp-van-cupboard", "camp-van-bedding", "camp-backpack-1",
  ];
  if (mount.attachedTo === "camp-van-floor") mount.solutionAfter = ["camp-van-roof", "camp-van-rug"];
  if (mount.attachedTo === "camp-backpack-1") mount.solutionAfter = ["camp-van-roof"];
  if (mount.attachedTo === "camp-tent-rug") mount.solutionAfter = [
    "camp-tent-roof--1", "camp-tent-roof-1", "camp-tent-curtain--1", "camp-tent-curtain-1",
  ];
  if (mount.attachedTo.startsWith("camp-tent-floor-")) mount.solutionAfter = [
    "camp-tent-roof--1", "camp-tent-roof-1", "camp-tent-rug", "camp-mattress",
  ];
  if (mount.attachedTo === "camp-stack-crate-0-lid") {
    mount.position = [-4.345, .61, -.87]; mount.normal = [-1, 0, 0];
  }
  if (mount.attachedTo === "camp-stack-crate-2") {
    mount.position = [mount.position[0], .29, -2.977]; mount.normal = [0, 0, 1];
  }
  if (mount.attachedTo === "camp-tackle-box") {
    mount.position = [mount.position[0], .014, 4.31]; mount.normal = [0, -1, 0];
  }
}

// Keep rotations baked for the shared display, ray checks and Rapier hulls.
const transform = new Matrix4(), rotation = new Euler(), size = new Vector3();
for (const part of pieces) {
  if (!part.rotation) continue;
  transform.makeRotationFromEuler(rotation.set(...part.rotation)).scale(size.set(...part.size));
  const original = part.geometry ?? (part.kind === "cylinder" ? roundLog : null);
  if (!original) continue;
  part.geometry = original.clone().applyMatrix4(transform);
  part.size = [1, 1, 1];
  part.rotation = undefined;
}

// Fasten the meadow below the scene's actual low objects. Ray tests select
// fixed mount points that are physically covered, without adding gameplay locks.
const material = new MeshBasicMaterial({ side: DoubleSide });
const groundObjects = pieces.filter(({ part }) => !/^camp-(meadow|foundation)/.test(part)).map((part) => {
  const mesh = new Mesh(geometryFor(part), material);
  mesh.position.set(...part.position); mesh.scale.set(...part.size);
  if (part.rotation) mesh.rotation.set(...part.rotation);
  mesh.updateMatrixWorld();
  return { mesh, part: part.part, bounds: new Box3().setFromObject(mesh) };
}).filter(({ bounds }) => bounds.min.y < .18 && bounds.max.y > .01);
const lateScenery = /^camp-(boulder|berry-bush|bank-rock|path-stone|stump|woodpile|log-seat|moss|fishing-rod|lantern-post|picnic-basket|tackle-box|dock-post)/;
const groundCovers = groundObjects.filter(({ part }) => !lateScenery.test(part));
const keepClear = groundObjects.filter(({ part }) => lateScenery.test(part))
  .map(({ bounds }) => bounds.clone().expandByScalar(.13));
const ray = new Raycaster(new Vector3(), new Vector3(0, 1, 0), 0, .23);
for (const { part, x, z } of terrain) {
  const candidates: { point: Vector; owner: CampsitePartId }[] = [];
  for (let row = 0; row < 15; row += 1) for (let column = 0; column < 15; column += 1) {
    const point: Vector = [x - 1.35 + column * .19, .004, z - 1.35 + row * .19];
    if (keepClear.some((bounds) => point[0] > bounds.min.x && point[0] < bounds.max.x &&
      point[2] > bounds.min.z && point[2] < bounds.max.z)) continue;
    ray.ray.origin.set(...point);
    const cover = groundCovers.find(({ mesh, bounds }) => point[0] > bounds.min.x && point[0] < bounds.max.x &&
      point[2] > bounds.min.z && point[2] < bounds.max.z && ray.intersectObject(mesh, false).length);
    if (cover) candidates.push({ point, owner: cover.part as CampsitePartId });
  }
  const selected: Vector[] = [], owners = new Set<CampsitePartId>();
  for (let i = 0; i < 5; i += 1) {
    const options = candidates.filter(({ point }) => selected.every((other) => Math.hypot(point[0] - other[0], point[2] - other[2]) > .34));
    const candidate = options.find(({ owner }) => !owners.has(owner)) ?? options[0];
    if (!candidate) throw new Error(`No covered terrain mount for ${part}`);
    selected.push(candidate.point); owners.add(candidate.owner);
    screw(part, candidate.point);
  }
}
material.dispose();

const CAMPSITE_MODEL = { pieces, pivots, parts: Object.keys(pivots) as CampsitePartId[] };

return { model: CAMPSITE_MODEL, mounts: CAMPSITE_MOUNTS };
}
