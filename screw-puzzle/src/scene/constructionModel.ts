import {
  CatmullRomCurve3,
  CylinderGeometry,
  Euler,
  ExtrudeGeometry,
  LatheGeometry,
  Matrix4,
  Quaternion,
  Shape,
  TubeGeometry,
  Vector2,
  Vector3,
} from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { ConvexGeometry } from "three/addons/geometries/ConvexGeometry.js";
import type { ConstructionPartId, Screw } from "../game/types.ts";
import type { Piece, Vector } from "./houseModel.ts";

// Construct only when this level is requested. No live geometry is kept in the module.
export function createConstructionModel() {
type Mount = Pick<Screw, "position" | "normal" | "solutionAfter"> & {
  attachedTo: ConstructionPartId;
};
const pieces: Piece[] = [],
  pivots: Record<ConstructionPartId, Vector> = {};
const CONSTRUCTION_MOUNTS: Mount[] = [];
const soft = new RoundedBoxGeometry(1, 1, 1, 2, 0.075),
  brick = new RoundedBoxGeometry(1, 1, 1, 1, 0.065),
  cylinder = new CylinderGeometry(1, 1, 1, 20);
const yellow = "#f5bd25",
  lemon = "#ffdc4a",
  red = "#bb5144",
  wood = "#d9ac72",
  timber = "#e9c592",
  concrete = "#d7d3c8",
  steel = "#687685",
  dark = "#35404a",
  blue = "#347fc1",
  green = "#799b4a";
function owner(name: string, pivot: Vector): ConstructionPartId {
  const id: ConstructionPartId = `site-${name}`;
  pivots[id] = pivot;
  return id;
}
function box(
  part: ConstructionPartId,
  position: Vector,
  size: Vector,
  color: string,
  rotation?: Vector,
) {
  pieces.push({
    part,
    kind: "box",
    geometry: soft,
    position,
    size,
    color,
    rotation,
  });
}
function shape(
  part: ConstructionPartId,
  kind: Piece["kind"],
  position: Vector,
  size: Vector,
  color: string,
  rotation?: Vector,
) {
  pieces.push({ part, kind, position, size, color, rotation });
}
function ball(part: ConstructionPartId, p: Vector, s: Vector, c: string) {
  shape(part, "ico-detail", p, s, c);
}
function tube(
  part: ConstructionPartId,
  position: Vector,
  r: number,
  h: number,
  color: string,
  rotation?: Vector,
) {
  pieces.push({
    part,
    kind: "cylinder",
    geometry: cylinder,
    position,
    size: [r, h, r],
    color,
    rotation,
  });
}
function beam(
  part: ConstructionPartId,
  from: Vector,
  to: Vector,
  width: number,
  color: string,
  depth = width,
) {
  const a = new Vector3(...from),
    b = new Vector3(...to),
    d = b.clone().sub(a),
    q = new Quaternion().setFromUnitVectors(
      new Vector3(0, 1, 0),
      d.clone().normalize(),
    );
  box(
    part,
    a.add(b).multiplyScalar(0.5).toArray(),
    [width, d.length(), depth],
    color,
    new Euler().setFromQuaternion(q).toArray().slice(0, 3) as Vector,
  );
}
function curve(
  part: ConstructionPartId,
  points: Vector[],
  radius: number,
  color: string,
) {
  pieces.push({
    part,
    kind: "box",
    position: [0, 0, 0],
    size: [1, 1, 1],
    color,
    geometry: new TubeGeometry(
      new CatmullRomCurve3(points.map((p) => new Vector3(...p))),
      28,
      radius,
      8,
      false,
    ),
  });
}
function screw(
  part: ConstructionPartId,
  position: Vector,
  normal: Vector = [0, 1, 0],
  after?: readonly ConstructionPartId[],
) {
  CONSTRUCTION_MOUNTS.push({
    attachedTo: part,
    position,
    normal: new Vector3(...normal).normalize().toArray(),
    solutionAfter: after ? [...after] : undefined,
  });
}
function plate(part: ConstructionPartId, p: Vector, c = steel) {
  box(part, p, [0.25, 0.25, 0.06], c);
}
function crate(name: string, [x, y, z]: Vector, color = red) {
  const body = owner(name, [x, y + 0.27, z]),
    lid = owner(`${name}-lid`, [x, y + 0.55, z]);
  box(body, [x, y + 0.25, z], [0.78, 0.5, 0.58], color);
  box(lid, [x, y + 0.55, z], [0.82, 0.1, 0.62], color);
  for (const dx of [-0.26, 0.26]) {
    box(body, [x + dx, y + 0.28, z + 0.31], [0.07, 0.18, 0.04], steel);
    box(lid, [x + dx, y + 0.51, z + 0.335], [0.07, 0.12, 0.04], dark);
  }
  curve(
    lid,
    [
      [x - 0.16, y + 0.62, z],
      [x - 0.16, y + 0.72, z],
      [x + 0.16, y + 0.72, z],
      [x + 0.16, y + 0.62, z],
    ],
    0.025,
    dark,
  );
  screw(lid, [x, y + 0.55, z + 0.335], [0, 0, 1]);
  screw(body, [x, y + 0.5, z]);
  return [body, lid];
}
// Square island: independent concrete foundations and sand tiles.
const ground: {
  part: ConstructionPartId;
  base: ConstructionPartId;
  x: number;
  z: number;
}[] = [];
for (let row = 0; row < 3; row++)
  for (let col = 0; col < 3; col++) {
    const x = (col - 1) * 3.3,
      z = (row - 1) * 3.3,
      base = owner(`foundation-${row}-${col}`, [x, -0.48, z]),
      part = owner(`ground-${row}-${col}`, [x, -0.015, z]);
    box(base, [x, -0.48, z], [3.28, 0.76, 3.28], "#e1d9d0");
    box(part, [x, -0.015, z], [3.28, 0.19, 3.28], "#d5b98e");
    screw(base, [x, -0.085, z]);
    ground.push({ part, base, x, z });
    for (let i = 0; i < 13; i++) {
      const dx = Math.sin(i * 7 + col) * 1.42,
        dz = Math.cos(i * 9 + row) * 1.4;
      ball(
        part,
        [x + dx, 0.1, z + dz],
        [0.05 + (i % 3) * 0.025, 0.035, 0.045],
        i % 2 ? "#e7d8b9" : "#bda886",
      );
    }
  }
// Real brick courses on both sides of the wall, with real openings.
function brickWall(
  part: ConstructionPartId,
  [x, z]: [number, number],
  width: number,
  nx: number,
  nz: number,
  holes: { u: number; w: number; bottom: number; top: number }[] = [],
) {
  const rotation: Vector = [0, Math.atan2(nx, nz), 0],
    point = (u: number, y: number, d: number): Vector => [
      x + u * nz + d * nx,
      y,
      z - u * nx + d * nz,
    ];
  for (let row = 0; row < 11; row++) {
    const y = 0.43 + row * 0.17;
    let intervals: [number, number][] = [[-width / 2, width / 2]];
    for (const hole of holes)
      if (y + 0.084 > hole.bottom && y - 0.084 < hole.top) {
        intervals = intervals.flatMap(([a, b]) => {
          const l = hole.u - hole.w / 2,
            r = hole.u + hole.w / 2;
          return r <= a || l >= b
            ? [[a, b] as [number, number]]
            : ([
                [a, Math.max(a, l)],
                [Math.min(b, r), b],
              ].filter(([a, b]) => b - a > 0.015) as [number, number][]);
        });
      }
    for (const [a, b] of intervals) {
      box(
        part,
        point((a + b) / 2, y, 0),
        [b - a, 0.166, 0.21],
        "#d8aa8d",
        rotation,
      );
      for (let u = a; u < b - 0.01;) {
        const length = Math.min(
          b - u,
          0.37 + (row % 2 === 0 && u === a ? 0.15 : 0),
        );
        pieces.push({
          part,
          kind: "box",
          geometry: brick,
          position: point(u + length / 2, y, 0),
          size: [Math.max(0.02, length - 0.018), 0.145, 0.235],
          rotation,
          color: ["#bb6653", "#c87962", "#b95f50", "#ce8167"][
            (row + Math.round(u * 7 + 20)) % 4
          ],
        });
        u += length;
      }
    }
  }
}
const upperFloor: ConstructionPartId[] = [],
  lowerFloor: ConstructionPartId[] = [],
  walls: ConstructionPartId[] = [],
  posts: ConstructionPartId[] = [];
for (let i = 0; i < 3; i++) {
  const x = -3.25 + i * 1.48,
    lower = owner(`floor-lower-${i}`, [x, 0.24, -1.18]),
    upper = owner(`floor-upper-${i}`, [x, 2.28, -1.0]);
  lowerFloor.push(lower);
  upperFloor.push(upper);
  box(lower, [x, 0.24, -1.18], [1.46, 0.25, 3.64], "#d2c7b5");
  box(upper, [x, 2.28, -1.0], [1.46, 0.22, 4.02], concrete);
  for (const z of [-2.65, -1.85, -1.05, -0.25, 0.55])
    box(upper, [x, 2.398, z], [1.4, 0.012, 0.014], "#bab4a5");
  screw(lower, [x - 0.42, 0.38, -0.25]);
  screw(lower, [x + 0.42, 0.38, -2.2]);
  screw(upper, [x - 0.42, 2.405, -0.25]);
  screw(upper, [x + 0.42, 2.405, -2.2]);
}
for (const story of [0, 1])
  for (const x of [-3.98, 0.43])
    for (const z of [-2.93, 0.78]) {
      const part = owner(`column-${story}-${x}-${z}`, [
        x,
        1.3 + story * 2.0,
        z,
      ]);
      posts.push(part);
      box(part, pivots[part], [0.24, 1.91, 0.24], story ? timber : concrete);
      box(part, [x, 0.39 + story * 2.0, z], [0.3, 0.18, 0.3], "#aca99e");
      const n: Vector = [x < 0 ? 1 : -1, 0, 0];
      screw(
        part,
        [x + n[0] * 0.14, 1.67 + story * 2.0, z],
        n,
        story ? upperFloor : [],
      );
    }
for (const [face, x, z, nx, nz] of [
  ["back-left", -2.84, -2.93, 0, -1],
  ["back-right", -0.62, -2.93, 0, -1],
  ["left-back", -3.98, -2.0, -1, 0],
  ["left-front", -3.98, -0.15, -1, 0],
  ["right-back", 0.43, -2.0, 1, 0],
  ["right-front", 0.43, -0.15, 1, 0],
] as const) {
  const w = face.startsWith("back") ? 2.18 : 1.81,
    part = owner(`brick-${face}`, [x, 1.3, z]);
  walls.push(part);
  brickWall(part, [x, z], w, nx, nz);
  for (const [u, y] of [
    [-0.53, 0.65],
    [0.53, 1.87],
  ])
    screw(
      part,
      [x + u * nz - nx * 0.14, y, z - u * nx - nz * 0.14],
      [-nx, 0, -nz],
      upperFloor,
    );
}
const windowWall = owner("brick-window", [-2.74, 1.3, 0.78]),
  doorWall = owner("brick-door", [-0.76, 1.3, 0.78]);
walls.push(windowWall, doorWall);
brickWall(windowWall, [-2.74, 0.78], 2.18, 0, 1, [
  { u: 0, w: 1.06, bottom: 0.78, top: 1.75 },
]);
brickWall(doorWall, [-0.76, 0.78], 1.72, 0, 1, [
  { u: 0.12, w: 0.86, bottom: 0.34, top: 2.17 },
]);
for (const [part, x] of [
  [windowWall, -2.74],
  [doorWall, -0.76],
] as const) {
  screw(part, [x - 0.76, 0.61, 0.64], [0, 0, -1], upperFloor);
  screw(part, [x + 0.72, 1.94, 0.64], [0, 0, -1], upperFloor);
}
const frame = owner("lower-window", [-2.74, 1.29, 0.89]);
for (const x of [-3.33, -2.15])
  box(frame, [x, 1.28, 0.87], [0.14, 1.14, 0.18], timber);
for (const y of [0.74, 1.83])
  box(frame, [-2.74, y, 0.87], [1.32, 0.15, 0.18], timber);
box(frame, [-2.74, 1.28, 0.87], [0.07, 1.0, 0.12], wood);
box(frame, [-2.74, 1.28, 0.87], [1.12, 0.07, 0.12], wood);
screw(frame, [-3.33, 1.28, 0.975], [0, 0, 1]);
// Exposed timber upper walls and detachable plywood sheathing.
const timberFrames: ConstructionPartId[] = [];
for (const [name, x, z, nx, nz, width] of [
  ["back-left", -2.84, -2.93, 0, -1, 2.18],
  ["back-right", -0.62, -2.93, 0, -1, 2.18],
  ["left", -3.98, -1.05, -1, 0, 3.62],
  ["right", 0.43, -1.05, 1, 0, 3.62],
] as const) {
  const part = owner(`studs-${name}`, [x, 3.25, z]);
  timberFrames.push(part);
  const p = (u: number, y: number): Vector => [x + u * nz, y, z - u * nx];
  for (const u of [-width / 2 + 0.08, 0, width / 2 - 0.08])
    box(part, p(u, 3.24), nx ? [0.15, 1.65, 0.14] : [0.14, 1.65, 0.15], wood);
  for (const y of [2.46, 4.06])
    box(part, p(0, y), nx ? [0.15, 0.14, width] : [width, 0.14, 0.15], timber);
  for (const u of [-width * 0.32, width * 0.32])
    box(
      part,
      p(u, 3.6),
      nx ? [0.15, 0.12, width * 0.3] : [width * 0.3, 0.12, 0.15],
      timber,
    );
  for (const u of [-width * 0.32, width * 0.32])
    screw(
      part,
      [x + u * nz - nx * 0.095, 3.6, z - u * nx - nz * 0.095],
      [-nx, 0, -nz],
    );
  const panel = owner(`plywood-${name}`, [x + nx * 0.1, 3.23, z + nz * 0.1]);
  box(
    panel,
    pivots[panel],
    nx ? [0.055, 1.52, width - 0.19] : [width - 0.19, 1.52, 0.055],
    "#d7b282",
  );
  const along = width * 0.25;
  screw(
    panel,
    [x + along * nz + nx * 0.145, 3.46, z - along * nx + nz * 0.145],
    [nx, 0, nz],
  );
}
const rafters: ConstructionPartId[] = [],
  gableParts: ConstructionPartId[] = [];
for (const [name, z] of [
  ["front", 0.78],
  ["back", -2.93],
] as const) {
  const tie = owner(`gable-tie-${name}`, [-1.775, 3.98, z]);
  gableParts.push(tie);
  box(tie, [-1.775, 3.98, z], [4.68, 0.24, 0.22], red);
  screw(tie, [-3.2, 3.98, z + 0.135], [0, 0, 1]);
  screw(tie, [-0.37, 3.98, z - 0.135], [0, 0, -1]);
  for (const side of [-1, 1]) {
    const a: Vector = [-1.775 + side * 2.35, 3.99, z],
      b: Vector = [-1.775, 5.12, z],
      part = owner(`rafter-${name}-${side}`, [-1.775 + side * 1.175, 4.56, z]);
    rafters.push(part);
    gableParts.push(part);
    beam(part, a, b, 0.23, red, 0.22);
    for (const t of [0.22, 0.78]) {
      const x = a[0] + (b[0] - a[0]) * t,
        y = a[1] + (b[1] - a[1]) * t;
      plate(part, [x, y, z + 0.14], "#a7a6a0");
      screw(part, [x, y, z + 0.185], [0, 0, 1]);
    }
  }
  const upright = owner(`gable-upright-${name}`, [-1.775, 4.48, z]);
  gableParts.push(upright);
  box(upright, [-1.775, 4.48, z], [0.21, 1.09, 0.21], red);
  screw(upright, [-1.775, 4.42, z - 0.125], [0, 0, -1]);
}
const ridge = owner("ridge-beam", [-1.775, 5.12, -1.075]);
beam(ridge, [-1.775, 5.12, -2.98], [-1.775, 5.12, 0.83], 0.19, red, 0.19);
screw(ridge, [-1.775, 5.23, -1.6]);
screw(ridge, [-1.775, 5.23, -0.1]);
for (const [i, z] of [-2.1, -0.2].entries()) {
  const part = owner(`ceiling-joist-${i}`, [-1.775, 3.96, z]);
  box(part, [-1.775, 3.96, z], [4.25, 0.17, 0.16], wood);
  screw(part, [-2.8, 3.86, z], [0, -1, 0]);
  screw(part, [-0.65, 3.86, z], [0, -1, 0]);
}
// Working deck: desk, tools, hardhat and an original blueprint drawing.
const desk = owner("workbench-top", [-1.52, 2.99, 0.26]),
  legs = owner("workbench-frame", [-1.52, 2.67, 0.26]);
box(desk, [-1.52, 2.99, 0.26], [1.76, 0.13, 0.66], wood);
for (const x of [-2.23, -0.81])
  for (const z of [0.03, 0.49])
    box(legs, [x, 2.68, z], [0.12, 0.6, 0.12], "#a67c4f");
box(legs, [-1.52, 2.65, 0.47], [1.5, 0.22, 0.1], "#b38a58");
screw(desk, [-2.0, 3.07, 0.26]);
screw(desk, [-1.05, 3.07, 0.26]);
screw(legs, [-1.52, 2.65, 0.535], [0, 0, 1]);
const helmet = owner("hardhat", [-2.0, 3.17, 0.26]);
ball(helmet, [-2.0, 3.23, 0.26], [0.23, 0.2, 0.21], yellow);
box(helmet, [-2.0, 3.1, 0.26], [0.54, 0.045, 0.49], lemon);
box(helmet, [-2.0, 3.34, 0.26], [0.035, 0.12, 0.35], lemon);
screw(helmet, [-2.0, 3.435, 0.26]);
crate("upper-toolbox", [-1.05, 3.06, 0.26]);
for (const z of [0.39, 0.09]) {
  tube(desk, [-1.64, 3.16, z], 0.075, 0.17, "#f8f1df");
  shape(
    desk,
    "ring",
    [-1.56, 3.18, z],
    [0.055, 0.055, 0.055],
    "#f8f1df",
    [Math.PI / 2, 0, 0],
  );
}
const plan = owner("blueprint", [-0.3, 3.22, 0.9]);
box(plan, [-0.3, 3.22, 0.9], [1.0, 0.79, 0.1], wood);
box(plan, [-0.3, 3.22, 0.965], [0.88, 0.67, 0.035], blue);
for (const x of [-0.68, 0.08])
  for (const y of [2.96, 3.48])
    box(plan, [x, y, 0.991], [0.07, 0.012, 0.009], "#d6effc");
const lines: Vector[][] = [
  [
    [-0.61, 3.2, 1.0],
    [-0.3, 3.44, 1.0],
    [0.01, 3.2, 1.0],
  ],
  [
    [-0.55, 3.2, 1.0],
    [-0.55, 3.02, 1.0],
    [-0.05, 3.02, 1.0],
    [-0.05, 3.2, 1.0],
  ],
  [
    [-0.35, 3.02, 1.0],
    [-0.35, 3.16, 1.0],
    [-0.24, 3.16, 1.0],
    [-0.24, 3.02, 1.0],
  ],
];
for (const line of lines)
  for (let i = 1; i < line.length; i++)
    beam(plan, line[i - 1], line[i], 0.012, "#edf6f7");
for (const x of [-0.68, 0.08])
  box(plan, [x, 2.76, 0.91], [0.06, 0.6, 0.06], "#9a794f");
screw(plan, [-0.67, 3.46, 1.035], [0, 0, 1]);
const ladder = owner("ladder", [-0.16, 1.25, 1.22]);
for (const x of [-0.49, 0.17])
  beam(ladder, [x, 0.36, 1.73], [x, 2.24, 0.79], 0.09, steel, 0.07);
for (let i = 0; i < 7; i++)
  box(
    ladder,
    [-0.16, 0.48 + i * 0.25, 1.67 - i * 0.125],
    [0.68, 0.065, 0.1],
    concrete,
  );
screw(ladder, [-0.49, 1.22, 1.34], [0, 0, 1]);
screw(ladder, [0.17, 1.97, 0.96], [0, 0, 1]);
for (const [i, a, b] of [
  [0, -3.87, -2.0],
  [1, -1.8, 0.38],
] as const) {
  const part = owner(`balcony-rail-${i}`, [(a + b) / 2, 2.89, 1.04]);
  for (const x of [a, b]) {
    tube(part, [x, 2.83, 1.04], 0.04, 0.92, steel);
    plate(part, [x, 2.75, 1.08]);
  }
  for (const y of [2.71, 3.17])
    beam(
      part,
      [a, y, 1.04],
      [b, y, 1.04],
      0.075,
      y === 3.17 ? yellow : red,
      0.075,
    );
  screw(part, [i === 0 ? a : b, 2.75, 1.125], [0, 0, 1]);
}
// Scaffolding remains separate from the masonry; its blue tarp reveals fixings.
for (const [side, x] of [
  ["left", -4.77],
  ["right", -3.07],
] as const) {
  const part = owner(`scaffold-${side}`, [x, 1.53, 1.28]);
  for (const z of [0.84, 1.72]) {
    tube(part, [x, 1.53, z], 0.045, 2.86, steel);
    box(part, [x, 0.15, z], [0.29, 0.13, 0.29], dark);
  }
  for (const y of [1.2, 2.48]) {
    beam(part, [x, y, 0.84], [x, y, 1.72], 0.07, yellow);
    plate(part, [x, y, 1.78]);
  }
  screw(part, [x, 1.2, 1.825], [0, 0, 1]);
  screw(part, [x, 2.48, 1.825], [0, 0, 1]);
}
for (const [i, y] of [1.25, 2.52].entries()) {
  const part = owner(`scaffold-deck-${i}`, [-3.92, y, 1.28]);
  for (const z of [0.9, 1.16, 1.42, 1.68])
    box(part, [-3.92, y, z], [1.94, 0.1, 0.245], wood);
  screw(part, [-4.28, y + 0.065, 1.42]);
  screw(part, [-3.48, y + 0.065, 1.16]);
}
for (const [i, z] of [0.84, 1.72].entries()) {
  const part = owner(`scaffold-brace-${i}`, [-3.92, 1.36, z]);
  beam(part, [-4.75, 0.36, z], [-3.09, 2.43, z], 0.045, yellow);
  beam(part, [-3.09, 0.36, z], [-4.75, 2.43, z], 0.045, red);
  plate(part, [-4.4, 0.8, z]);
  screw(part, [-4.4, 0.8, z + (i ? 0.055 : -0.055)], [0, 0, i ? 1 : -1]);
}
const tarp = owner("blue-tarp", [-4.12, 2.12, 1.86]),
  cloth = new Shape();
cloth.moveTo(-0.72, 0.64);
cloth.lineTo(0.74, 0.64);
cloth.quadraticCurveTo(0.73, 0.1, 0.35, -0.1);
cloth.quadraticCurveTo(-0.2, -0.55, -0.68, -0.75);
cloth.closePath();
const fabric = new ExtrudeGeometry(cloth, {
  depth: 0.035,
  bevelEnabled: true,
  bevelThickness: 0.012,
  bevelSize: 0.012,
  bevelSegments: 2,
  curveSegments: 12,
});
const fp = fabric.getAttribute("position");
for (let i = 0; i < fp.count; i++)
  fp.setZ(i, fp.getZ(i) + 0.035 * Math.sin(fp.getX(i) * 5 + fp.getY(i) * 2));
fabric.computeVertexNormals();
pieces.push({
  part: tarp,
  kind: "box",
  geometry: fabric,
  position: [-4.12, 2.12, 1.86],
  size: [1, 1, 1],
  color: blue,
});
screw(tarp, [-4.65, 2.6, 1.925], [0, 0, 1]);
const paint = owner("paint-bucket", [-3.92, 1.52, 1.26]);
tube(paint, [-3.92, 1.49, 1.26], 0.2, 0.38, "#faf0d9");
tube(paint, [-3.92, 1.695, 1.26], 0.205, 0.035, yellow);
curve(
  paint,
  [
    [-4.12, 1.63, 1.26],
    [-4.06, 1.91, 1.26],
    [-3.78, 1.91, 1.26],
    [-3.72, 1.63, 1.26],
  ],
  0.015,
  steel,
);
screw(paint, [-3.92, 1.49, 1.475], [0, 0, 1]);
// Green site office is below the crane, clear of the bulldozer's working area.
const officeRoof: ConstructionPartId[] = [],
  officeWalls: ConstructionPartId[] = [];
const officeFloor = owner("office-floor", [3.15, 0.25, -1.5]);
box(officeFloor, [3.15, 0.25, -1.5], [2.8, 0.25, 2.75], "#85985a");
screw(officeFloor, [2.45, 0.39, -0.75]);
screw(officeFloor, [3.85, 0.39, -2.2]);
for (const [name, x, z, nx, nz, w] of [
  ["left", 1.75, -1.5, -1, 0, 2.75],
  ["right", 4.55, -1.5, 1, 0, 2.75],
  ["back", 3.15, -2.875, 0, -1, 2.8],
] as const) {
  const part = owner(`office-wall-${name}`, [x, 1.13, z]);
  officeWalls.push(part);
  box(part, [x, 1.13, z], nx ? [0.12, 1.53, w] : [w, 1.53, 0.12], green);
  for (let u = -w / 2 + 0.12; u < w / 2; u += 0.18)
    box(
      part,
      [x + u * nz + nx * 0.075, 1.13, z - u * nx + nz * 0.075],
      nx ? [0.025, 1.46, 0.045] : [0.045, 1.46, 0.025],
      "#91aa5a",
    );
  for (const u of [-w * 0.27, w * 0.27])
    screw(
      part,
      [x + u * nz - nx * 0.08, 1.16, z - u * nx - nz * 0.08],
      [-nx, 0, -nz],
    );
}
const officeFront = owner("office-front", [3.15, 1.13, -0.125]);
officeWalls.push(officeFront);
for (const [x, w] of [
  [1.88, 0.25],
  [2.9, 0.25],
  [4.42, 0.25],
])
  box(officeFront, [x, 1.13, -0.125], [w, 1.53, 0.14], green);
box(officeFront, [3.15, 1.84, -0.125], [2.8, 0.15, 0.14], green);
box(officeFront, [3.68, 0.64, -0.125], [1.2, 0.55, 0.14], green);
box(officeFront, [3.68, 1.67, -0.125], [1.2, 0.35, 0.14], green);
screw(officeFront, [2.9, 1.35, -0.215], [0, 0, -1]);
screw(officeFront, [4.42, 0.65, -0.215], [0, 0, -1]);
const officeDoor = owner("office-door", [2.4, 1.1, -0.03]);
box(officeDoor, [2.4, 1.1, -0.03], [0.81, 1.42, 0.09], "#e7cc94");
box(officeDoor, [2.4, 1.29, 0.026], [0.65, 0.87, 0.04], "#f0d9aa");
ball(officeDoor, [2.68, 0.96, 0.071], [0.05, 0.05, 0.035], yellow);
screw(officeDoor, [2.22, 0.64, 0.034], [0, 0, 1]);
const officeWindow = owner("office-window", [3.68, 1.21, -0.015]);
box(officeWindow, [3.68, 1.21, -0.015], [1.0, 0.74, 0.09], "#e0e4dc");
box(officeWindow, [3.68, 1.21, 0.04], [0.83, 0.58, 0.025], "#6a8f9b");
for (const x of [3.4, 3.68, 3.96])
  box(officeWindow, [x, 1.21, 0.08], [0.045, 0.63, 0.035], "#f2efe3");
screw(officeWindow, [3.24, 1.21, 0.045], [0, 0, 1]);
for (let i = 0; i < 2; i++) {
  const x = 2.45 + i * 1.4,
    part = owner(`office-roof-${i}`, [x, 1.96, -1.5]);
  officeRoof.push(part);
  box(part, [x, 1.96, -1.5], [1.39, 0.2, 2.82], "#9bb76a");
  for (const z of [-2.62, -2.06, -1.5, -0.94, -0.38])
    box(part, [x, 2.068, z], [1.35, 0.014, 0.035], "#b5cb7b");
  screw(part, [i === 0 ? 2.86 : 4.04, 2.08, -1.65]);
}
const officeDesk = owner("office-desk", [2.52, 0.83, -1.91]);
box(officeDesk, [2.52, 0.83, -1.91], [1.12, 0.12, 0.58], wood);
for (const x of [2.08, 2.96])
  box(officeDesk, [x, 0.57, -1.91], [0.1, 0.48, 0.47], "#9f794d");
screw(officeDesk, [2.52, 0.91, -1.91], undefined, officeRoof);
const cabinet = owner("office-cabinet", [3.85, 0.88, -2.38]);
box(cabinet, [3.85, 0.88, -2.38], [0.8, 1.0, 0.63], "#a8b28b");
for (const y of [0.62, 0.98, 1.25])
  box(cabinet, [3.85, y, -2.04], [0.7, 0.2, 0.04], "#d5d3ba");
screw(cabinet, [3.85, 1.4, -2.38], undefined, officeRoof);
const ac = owner("office-ac", [4.65, 1.23, -1.55]);
box(ac, [4.67, 1.23, -1.55], [0.3, 0.66, 0.75], "#ebebe1");
for (let i = 0; i < 8; i++)
  box(ac, [4.83, 1.0 + i * 0.065, -1.55], [0.025, 0.025, 0.62], steel);
screw(ac, [4.845, 1.23, -1.55], [1, 0, 0]);
// Segmented lattice crane: cab, jib sections, mast, ballast, stays and hanging load.
const mastX = 3.05,
  mastZ = -1.65,
  craneFoot = owner("crane-foot", [mastX, 2.17, mastZ]);
box(craneFoot, [mastX, 2.18, mastZ], [1.25, 0.22, 1.12], steel);
for (const x of [mastX - 0.48, mastX + 0.48])
  for (const z of [mastZ - 0.4, mastZ + 0.4])
    box(craneFoot, [x, 2.11, z], [0.25, 0.12, 0.25], dark);
screw(craneFoot, [mastX - 0.46, 2.31, mastZ - 0.32]);
screw(craneFoot, [mastX + 0.46, 2.31, mastZ + 0.32]);
const mast: ConstructionPartId[] = [];
for (let section = 0; section < 2; section++) {
  const bottom = 2.3 + section * 0.92,
    top = bottom + 0.91,
    part = owner(`mast-${section}`, [mastX, (bottom + top) / 2, mastZ]);
  mast.push(part);
  for (const dx of [-0.3, 0.3])
    for (const dz of [-0.3, 0.3])
      beam(
        part,
        [mastX + dx, bottom, mastZ + dz],
        [mastX + dx, top, mastZ + dz],
        0.1,
        yellow,
      );
  for (const dz of [-0.3, 0.3]) {
    beam(
      part,
      [mastX - 0.3, bottom, mastZ + dz],
      [mastX + 0.3, top, mastZ + dz],
      0.065,
      lemon,
    );
    beam(
      part,
      [mastX + 0.3, bottom, mastZ + dz],
      [mastX - 0.3, top, mastZ + dz],
      0.065,
      lemon,
    );
  }
  for (const dx of [-0.3, 0.3]) {
    beam(
      part,
      [mastX + dx, bottom, mastZ - 0.3],
      [mastX + dx, top, mastZ + 0.3],
      0.065,
      yellow,
    );
    beam(
      part,
      [mastX + dx, bottom, mastZ + 0.3],
      [mastX + dx, top, mastZ - 0.3],
      0.065,
      yellow,
    );
  }
  for (const [dx, y] of [
    [-0.3, bottom + 0.14],
    [0.3, top - 0.14],
  ]) {
    plate(part, [mastX + dx, y, mastZ + 0.35], "#d59b22");
    screw(part, [mastX + dx, y, mastZ + 0.395], [0, 0, 1]);
  }
}
const turntable = owner("crane-turntable", [mastX, 4.28, mastZ]);
tube(turntable, [mastX, 4.23, mastZ], 0.55, 0.16, dark);
box(turntable, [mastX, 4.39, mastZ], [1.28, 0.25, 0.97], steel);
screw(turntable, [mastX - 0.42, 4.53, mastZ]);
screw(turntable, [mastX + 0.42, 4.39, mastZ + 0.5], [0, 0, 1]);
const cab = owner("crane-cab", [2.76, 4.84, -1.19]),
  cabRoof = owner("crane-cab-roof", [2.76, 5.29, -1.19]);
box(cab, [2.76, 4.78, -1.19], [0.9, 0.78, 0.9], yellow);
box(cab, [2.76, 4.5, -1.19], [1.03, 0.16, 1.0], dark);
const cabGlass = owner("crane-glass", [2.76, 4.91, -0.72]);
box(cabGlass, [2.76, 4.94, -0.72], [0.69, 0.5, 0.045], "#3c9ec1");
box(cabGlass, [2.76, 4.62, -0.72], [0.73, 0.09, 0.06], lemon);
box(cab, [2.29, 4.9, -1.19], [0.04, 0.48, 0.61], "#3489aa");
box(cabRoof, [2.76, 5.29, -1.19], [0.98, 0.13, 0.96], lemon);
screw(cabRoof, [2.76, 5.37, -1.19]);
screw(cabGlass, [2.76, 4.65, -0.674], [0, 0, 1]);
screw(cab, [2.76, 5.185, -1.19]);
screw(cab, [3.23, 4.78, -1.25], [1, 0, 0]);
const engine = owner("crane-engine", [3.55, 4.68, -1.72]);
box(engine, [3.55, 4.68, -1.72], [0.6, 0.66, 0.86], steel);
for (const y of [4.52, 4.63, 4.74])
  box(engine, [3.865, y, -1.72], [0.025, 0.045, 0.59], dark);
screw(engine, [3.87, 4.68, -1.72], [1, 0, 0]);
const jib: ConstructionPartId[] = [];
for (let i = 0; i < 3; i++) {
  const right = 3.03 - i * 1.48,
    left = right - 1.47,
    y = 5.0,
    z = -1.85,
    part = owner(`jib-${i}`, [(left + right) / 2, y, z]);
  jib.push(part);
  for (const dz of [-0.22, 0.22])
    for (const yy of [y - 0.2, y + 0.2])
      beam(part, [left, yy, z + dz], [right, yy, z + dz], 0.09, yellow);
  for (let j = 0; j < 3; j++)
    for (const dz of [-0.22, 0.22]) {
      const a = left + j * 0.49,
        b = a + 0.49;
      beam(part, [a, y - 0.2, z + dz], [b, y + 0.2, z + dz], 0.055, lemon);
      beam(part, [a, y + 0.2, z + dz], [b, y - 0.2, z + dz], 0.055, lemon);
    }
  for (const dx of [left + 0.24, right - 0.24]) {
    plate(part, [dx, y, z + 0.25], "#daa023");
    screw(part, [dx, y, z + 0.295], [0, 0, 1]);
  }
}
const rear = owner("rear-jib", [4.01, 5.0, mastZ]);
box(rear, [4.01, 5.0, mastZ], [1.79, 0.18, 0.44], yellow);
screw(rear, [4.01, 5.105, mastZ]);
const weight = owner("counterweight", [4.65, 4.92, mastZ]);
box(weight, [4.65, 4.92, mastZ], [0.88, 0.91, 0.86], "#e86c40");
screw(weight, [4.65, 5.39, mastZ]);
const aFrame = owner("crane-a-frame", [mastX, 5.49, mastZ]);
for (const dz of [-0.2, 0.2]) {
  beam(
    aFrame,
    [mastX - 0.37, 5.04, mastZ + dz],
    [mastX, 5.93, mastZ + dz],
    0.13,
    yellow,
  );
  beam(
    aFrame,
    [mastX + 0.37, 5.04, mastZ + dz],
    [mastX, 5.93, mastZ + dz],
    0.13,
    yellow,
  );
}
plate(aFrame, [mastX, 5.84, mastZ + 0.25], steel);
screw(aFrame, [mastX, 5.84, mastZ + 0.295], [0, 0, 1]);
const stays = owner("crane-stays", [mastX, 5.7, mastZ]);
curve(
  stays,
  [
    [-1.38, 5.22, -1.85],
    [mastX, 5.94, mastZ],
    [4.68, 5.4, mastZ],
  ],
  0.026,
  dark,
);
box(stays, [mastX, 5.94, mastZ], [0.26, 0.12, 0.3], steel);
screw(stays, [mastX, 6.02, mastZ]);
const trolley = owner("hoist-trolley", [1.15, 4.85, -1.85]);
box(trolley, [1.15, 4.8, -1.85], [0.49, 0.19, 0.49], steel);
for (const x of [0.98, 1.32])
  tube(trolley, [x, 4.88, -1.85], 0.095, 0.1, dark, [Math.PI / 2, 0, 0]);
curve(
  trolley,
  [
    [1.15, 4.75, -1.85],
    [1.15, 4.24, -1.85],
    [1.15, 4.1, -1.85],
  ],
  0.025,
  dark,
);
screw(trolley, [1.15, 4.8, -2.11], [0, 0, -1]);
const load = owner("suspended-load", [1.15, 3.73, -1.85]);
for (let row = 0; row < 4; row++)
  for (let strip = 0; strip < 3; strip++)
    box(
      load,
      [1.15, 3.5 + row * 0.13, -2.1 + strip * 0.25],
      [1.03, 0.115, 0.23],
      row % 2 ? wood : timber,
    );
for (const dx of [-0.39, 0.39]) {
  box(load, [1.15 + dx, 3.71, -1.85], [0.06, 0.57, 0.84], dark);
  beam(load, [1.15 + dx, 4.0, -1.85], [1.15, 4.2, -1.85], 0.035, dark);
}
shape(load, "ring", [1.15, 4.15, -1.85], [0.1, 0.1, 0.1], yellow, [
  Math.PI / 2,
  0,
  0,
]);
screw(load, [0.82, 3.64, -1.465], [0, 0, 1]);
screw(load, [1.48, 3.9, -1.465], [0, 0, 1]);
// Tracked bulldozer: separate cab, roof, engine, tracks, hydraulics and open bucket.
const dx = 2.05,
  dz = 2.01,
  dozerChassis = owner("dozer-chassis", [dx, 0.75, dz]);
box(dozerChassis, [dx, 0.74, dz], [1.45, 0.31, 2.3], yellow);
for (const x of [dx - 0.84, dx + 0.84]) {
  const side = Math.sign(x - dx),
    part = owner(`track-${side}`, [x, 0.44, dz]);
  box(part, [x, 0.44, dz], [0.31, 0.65, 2.17], dark);
  for (let j = 0; j < 12; j++)
    for (const y of [0.13, 0.75])
      box(part, [x, y, dz - 0.96 + j * 0.175], [0.36, 0.065, 0.12], "#50565c");
  for (const z of [dz - 0.88, dz - 0.44, dz, dz + 0.44, dz + 0.88]) {
    tube(part, [x + side * 0.17, 0.44, z], 0.225, 0.045, yellow, [
      0,
      0,
      Math.PI / 2,
    ]);
    tube(part, [x + side * 0.2, 0.44, z], 0.12, 0.055, steel, [
      0,
      0,
      Math.PI / 2,
    ]);
  }
  screw(part, [x - side * 0.18, 0.46, dz - 0.65], [-side, 0, 0]);
  screw(part, [x - side * 0.18, 0.46, dz + 0.65], [-side, 0, 0]);
}
const cabFloor = owner("dozer-cab-floor", [dx, 0.97, 1.6]);
box(cabFloor, [dx, 0.97, 1.6], [1.22, 0.12, 1.28], steel);
screw(cabFloor, [dx - 0.38, 1.045, 1.85]);
const dozerRoof = owner("dozer-roof", [dx, 2.22, 1.6]);
box(dozerRoof, [dx, 2.22, 1.6], [1.41, 0.14, 1.46], lemon);
screw(dozerRoof, [dx, 2.28, 1.6]);
for (const side of [-1, 1]) {
  const part = owner(`dozer-side-${side}`, [dx + side * 0.63, 1.57, 1.6]);
  box(part, [dx + side * 0.63, 1.22, 1.6], [0.1, 0.41, 1.25], yellow);
  for (const z of [1.01, 2.19])
    box(part, [dx + side * 0.63, 1.75, z], [0.09, 0.84, 0.09], steel);
  box(part, [dx + side * 0.63, 2.13, 1.6], [0.1, 0.1, 1.25], steel);
  box(part, [dx + side * 0.645, 1.76, 1.6], [0.035, 0.59, 0.98], "#418ca5");
  screw(part, [dx + side * 0.695, 1.24, 1.6], [side, 0, 0]);
}
for (const [name, z] of [
  ["back", 0.97],
  ["front", 2.23],
] as const) {
  const part = owner(`dozer-glass-${name}`, [dx, 1.73, z]);
  box(part, [dx, 1.75, z], [1.12, 0.71, 0.06], "#4b9ab2");
  box(part, [dx, 1.35, z], [1.19, 0.17, 0.085], steel);
  screw(
    part,
    [dx - 0.39, 1.36, z + (name === "front" ? 0.057 : -0.057)],
    [0, 0, name === "front" ? 1 : -1],
  );
}
const seat = owner("dozer-seat", [dx, 1.31, 1.58]);
box(seat, [dx, 1.27, 1.58], [0.47, 0.18, 0.49], dark);
box(seat, [dx, 1.58, 1.36], [0.47, 0.56, 0.12], dark);
screw(seat, [dx, 1.85, 1.36]);
const wheel = owner("steering-wheel", [dx, 1.52, 1.98]);
beam(wheel, [dx, 1.12, 2.03], [dx, 1.56, 1.96], 0.035, dark);
shape(wheel, "ring", [dx, 1.56, 1.96], [0.17, 0.17, 0.17], dark, [0.3, 0, 0]);
box(wheel, [dx, 1.56, 1.96], [0.34, 0.04, 0.04], steel);
screw(wheel, [dx, 1.59, 1.96]);
const hood = owner("dozer-hood", [dx, 1.13, 2.76]);
box(hood, [dx, 1.13, 2.76], [1.02, 0.47, 0.83], yellow);
box(hood, [dx, 1.38, 2.76], [0.86, 0.08, 0.72], lemon);
for (const x of [dx - 0.53, dx + 0.53])
  for (let i = 0; i < 4; i++)
    box(hood, [x, 1.13, 2.52 + i * 0.14], [0.025, 0.11, 0.055], dark);
screw(hood, [dx, 1.43, 2.76]);
const motor = owner("dozer-engine", [dx, 0.95, 2.76]);
box(motor, [dx, 0.95, 2.76], [0.64, 0.32, 0.62], steel);
for (const x of [dx - 0.22, dx, dx + 0.22])
  tube(motor, [x, 1.14, 2.76], 0.045, 0.4, dark, [Math.PI / 2, 0, 0]);
screw(motor, [dx, 1.17, 2.76]);
screw(dozerChassis, [dx - 0.38, 0.91, 1.4]);
screw(dozerChassis, [dx + 0.38, 0.91, 2.0]);
screw(dozerChassis, [dx, 0.91, 2.86]);
const bucket = owner("dozer-bucket", [dx, 0.55, 3.62]);
box(bucket, [dx, 0.65, 3.4], [1.75, 0.7, 0.1], steel);
box(bucket, [dx, 0.25, 3.69], [1.75, 0.11, 0.7], "#8995a1");
for (const side of [-1, 1]) {
  const points = [];
  for (const x of [dx + side * 0.8, dx + side * 0.89])
    for (const [y, z] of [
      [0.24, 3.36],
      [0.24, 4.04],
      [0.82, 3.36],
      [0.4, 3.9],
    ])
      points.push(new Vector3(x, y, z));
  pieces.push({
    part: bucket,
    kind: "box",
    position: [0, 0, 0],
    size: [1, 1, 1],
    color: steel,
    geometry: new ConvexGeometry(points),
  });
}
for (let i = 0; i < 5; i++)
  box(bucket, [dx - 0.66 + i * 0.33, 0.21, 4.06], [0.17, 0.1, 0.23], "#b2b9bc");
screw(bucket, [dx, 0.75, 3.465], [0, 0, 1]);
for (const side of [-1, 1]) {
  const part = owner(`dozer-arm-${side}`, [dx + side * 0.6, 0.67, 2.88]);
  beam(
    part,
    [dx + side * 0.6, 0.77, 2.28],
    [dx + side * 0.6, 0.49, 3.39],
    0.11,
    yellow,
  );
  ball(part, [dx + side * 0.6, 0.77, 2.35], [0.14, 0.14, 0.14], steel);
  screw(part, [dx + side * 0.76, 0.77, 2.35], [side, 0, 0]);
  const piston = owner(`dozer-piston-${side}`, [dx + side * 0.55, 0.87, 2.97]);
  beam(
    piston,
    [dx + side * 0.55, 1.07, 2.62],
    [dx + side * 0.55, 0.67, 3.31],
    0.075,
    steel,
  );
  tube(piston, [dx + side * 0.55, 1.07, 2.62], 0.11, 0.18, yellow);
  screw(piston, [dx + side * 0.55, 1.175, 2.62]);
}
const beacons = owner("dozer-beacons", [dx, 2.36, 1.6]);
box(beacons, [dx, 2.32, 1.6], [1.2, 0.055, 0.2], steel);
for (const x of [dx - 0.46, dx + 0.46]) {
  tube(beacons, [x, 2.39, 1.6], 0.075, 0.13, "#ef832d");
  ball(beacons, [x, 2.46, 1.6], [0.075, 0.06, 0.075], yellow);
}
screw(beacons, [dx, 2.365, 1.6]);
// Hollow mixer, cable reel, pallets and a few well-separated site supplies.
const mx = -2.65,
  mz = 2.52,
  mixer = owner("mixer-frame", [mx, 0.54, mz]);
for (const x of [mx - 0.38, mx + 0.38])
  beam(mixer, [x, 0.2, mz - 0.35], [x, 0.89, mz], 0.08, steel);
for (const z of [mz - 0.35, mz + 0.28])
  box(mixer, [mx, 0.24, z], [0.9, 0.09, 0.09], steel);
box(mixer, [mx, 0.54, mz - 0.28], [0.4, 0.22, 0.12], steel);
screw(mixer, [mx, 0.54, mz - 0.355], [0, 0, -1]);
for (const side of [-1, 1]) {
  const p = owner(`mixer-wheel-${side}`, [mx + side * 0.48, 0.24, mz - 0.32]);
  tube(p, pivots[p], 0.19, 0.1, dark, [0, 0, Math.PI / 2]);
  tube(p, [mx + side * 0.54, 0.24, mz - 0.32], 0.09, 0.04, yellow, [
    0,
    0,
    Math.PI / 2,
  ]);
  screw(p, [mx + side * 0.575, 0.24, mz - 0.32], [side, 0, 0]);
}
const drum = owner("mixer-drum", [mx, 1.02, mz]),
  profile = [
    [0.08, -0.45],
    [0.32, -0.43],
    [0.48, -0.18],
    [0.49, 0.08],
    [0.34, 0.42],
    [0.31, 0.48],
    [0.275, 0.48],
    [0.29, 0.4],
    [0.425, 0.07],
    [0.42, -0.15],
    [0.26, -0.36],
    [0.08, -0.37],
  ];
pieces.push({
  part: drum,
  kind: "box",
  position: pivots[drum],
  size: [1, 1, 1],
  rotation: [0.75, 0, 0],
  color: yellow,
  geometry: new LatheGeometry(
    profile.map(([r, y]) => new Vector2(r, y)),
    28,
  ),
});
const rim = new Vector3(0, 0.48, 0).applyEuler(new Euler(0.75, 0, 0));
shape(
  drum,
  "ring",
  [mx + rim.x, 1.02 + rim.y, mz + rim.z],
  [0.3, 0.3, 0.3],
  lemon,
  [0.75, 0, 0],
);
screw(drum, [mx - 0.505, 1.02, mz], [-1, 0, 0]);
const handle = owner("mixer-handle", [mx - 0.62, 0.77, mz - 0.04]);
shape(handle, "ring", pivots[handle], [0.25, 0.25, 0.25], dark, [
  0,
  0,
  Math.PI / 2,
]);
box(handle, pivots[handle], [0.05, 0.42, 0.05], steel);
screw(handle, [mx - 0.665, 0.77, mz - 0.04], [-1, 0, 0]);
const reel = owner("cable-reel", [-1.25, 0.67, 1.35]);
tube(reel, [-1.25, 0.67, 1.35], 0.31, 0.76, dark);
for (const y of [0.25, 1.07]) {
  tube(reel, [-1.25, y, 1.35], 0.42, 0.1, wood);
  for (const x of [-1.44, -1.06])
    box(reel, [x, y + 0.055, 1.35], [0.015, 0.008, 0.65], "#b88a53");
}
for (let i = 0; i < 12; i++)
  shape(
    reel,
    "ring",
    [-1.25, 0.3 + i * 0.065, 1.35],
    [0.325, 0.325, 0.325],
    "#4d5255",
  );
screw(reel, [-1.25, 1.135, 1.35]);
crate("ground-toolbox", [0.63, 0.1, 0.69]);
const bags = owner("cement-bags", [-1.48, 0.4, 2.39]);
for (const [i, x] of [-1.68, -1.27, -1.48].entries()) {
  const y = i < 2 ? 0.24 : 0.48;
  box(bags, [x, y, 2.39], [0.69, 0.23, 0.49], "#dbc299", [
    0,
    (i - 1) * 0.12,
    0,
  ]);
  box(bags, [x, y + 0.12, 2.39], [0.28, 0.008, 0.19], "#b9a482");
}
screw(bags, [-1.48, 0.615, 2.39]);
const shovel = owner("shovel", [-0.96, 0.9, 2.4]);
beam(shovel, [-0.96, 0.32, 2.4], [-0.86, 1.55, 2.31], 0.045, wood);
box(shovel, [-0.96, 0.24, 2.4], [0.25, 0.33, 0.055], steel);
shape(shovel, "ring", [-0.86, 1.55, 2.31], [0.11, 0.11, 0.11], steel, [
  Math.PI / 2,
  0,
  0,
]);
screw(shovel, [-0.96, 0.24, 2.445], [0, 0, 1]);
const pallet = owner("block-pallet", [-0.36, 0.22, 3.27]),
  blocks = owner("cinder-blocks", [-0.36, 0.64, 3.27]);
for (const x of [-0.86, -0.61, -0.36, -0.11, 0.14])
  box(pallet, [x, 0.23, 3.27], [0.2, 0.11, 0.94], wood);
for (const x of [-0.76, 0.04])
  box(pallet, [x, 0.13, 3.27], [0.18, 0.14, 0.85], "#b48c5d");
for (let y = 0; y < 2; y++)
  for (let col = 0; col < 3; col++)
    for (const z of [3.03, 3.5]) {
      const x = -0.78 + col * 0.42,
        cy = 0.43 + y * 0.31;
      for (const zz of [z - 0.2, z + 0.2])
        box(blocks, [x, cy, zz], [0.39, 0.29, 0.06], concrete);
      for (const xx of [x - 0.17, x, x + 0.17])
        box(blocks, [xx, cy, z], [0.055, 0.29, 0.4], "#b9bebc");
    }
for (const x of [-0.82, 0.08]) {
  box(blocks, [x, 0.62, 3.72], [0.06, 0.74, 0.035], blue);
  box(blocks, [x, 1.01, 3.27], [0.06, 0.035, 0.94], blue);
}
screw(blocks, [-0.38, 0.7, 3.735], [0, 0, 1]);
screw(pallet, [-0.86, 0.3, 3.27]);
screw(pallet, [0.1, 0.3, 3.27]);
const pipes = owner("drain-pipes", [-3.51, 0.43, 3.85]),
  pipeShape = new Shape();
pipeShape.absarc(0, 0, 0.24, 0, Math.PI * 2, false);
const hole = new Shape();
hole.absarc(0, 0, 0.17, 0, Math.PI * 2, true);
pipeShape.holes.push(hole);
const pipeGeometry = new ExtrudeGeometry(pipeShape, {
  depth: 0.96,
  bevelEnabled: true,
  bevelSize: 0.012,
  bevelThickness: 0.012,
  bevelSegments: 2,
  steps: 1,
  curveSegments: 20,
}).translate(0, 0, -0.48);
for (const [x, y] of [
  [-3.85, 0.35],
  [-3.3, 0.35],
  [-3.57, 0.79],
])
  pieces.push({
    part: pipes,
    kind: "box",
    geometry: pipeGeometry,
    position: [x, y, 3.85],
    size: [1, 1, 1],
    color: concrete,
  });
for (const z of [3.59, 4.1])
  box(pipes, [-3.57, 0.6, z], [1.14, 0.97, 0.1], blue);
screw(pipes, [-3.57, 1.1, 3.59]);
const bricks = owner("brick-pallet", [-1.89, 0.28, 3.61]);
for (let y = 0; y < 2; y++)
  for (let x = 0; x < 3; x++)
    for (const z of [3.43, 3.79])
      box(
        bricks,
        [-2.24 + x * 0.35, 0.2 + y * 0.18, z],
        [0.33, 0.16, 0.33],
        y % 2 ? timber : wood,
      );
box(bricks, [-1.89, 0.1, 3.61], [1.13, 0.09, 0.88], "#b08958");
screw(bricks, [-1.89, 0.475, 3.43]);
const warning = owner("work-sign", [0.03, 0.88, 4.35]);
for (const x of [-0.22, 0.28])
  beam(warning, [x, 0.1, 4.35], [0.03, 1.12, 4.35], 0.055, steel);
shape(warning, "cone", [0.03, 0.9, 4.35], [0.43, 0.76, 0.075], lemon);
box(warning, [0.03, 0.9, 4.425], [0.045, 0.22, 0.014], dark);
ball(warning, [0.03, 0.72, 4.43], [0.035, 0.035, 0.01], dark);
screw(warning, [0.03, 0.6, 4.43], [0, 0, 1]);
for (const [i, [x, z]] of [
  [-4.44, 2.71],
  [-1.04, 4.43],
  [3.8, 3.71],
].entries()) {
  const p = owner(`cone-${i}`, [x, 0.43, z]);
  box(p, [x, 0.14, z], [0.48, 0.08, 0.48], red);
  shape(p, "cone", [x, 0.48, z], [0.19, 0.62, 0.19], "#ed7338");
  tube(p, [x, 0.43, z], 0.14, 0.12, "#fff2db");
  screw(p, [x + 0.18, 0.195, z + 0.18]);
}
for (const [i, x] of [0.75, 2.31].entries()) {
  const p = owner(`barrier-${i}`, [x, 0.6, 4.42]);
  for (const xx of [x - 0.55, x + 0.55]) {
    box(p, [xx, 0.1, 4.42], [0.35, 0.12, 0.48], steel);
    box(p, [xx, 0.52, 4.42], [0.09, 0.8, 0.11], steel);
  }
  box(p, [x, 0.7, 4.42], [1.34, 0.34, 0.1], "#f3ece0");
  for (const xx of [x - 0.49, x, x + 0.49])
    box(p, [xx, 0.7, 4.48], [0.2, 0.34, 0.012], red, [0, 0, -0.42]);
  screw(p, [x - 0.38, 0.7, 4.505], [0, 0, 1]);
}
const fence = owner("safety-fence", [4.72, 0.78, 0.76]);
for (const z of [-0.48, 0.76, 2.0]) {
  box(fence, [4.72, 0.76, z], [0.085, 1.44, 0.085], steel);
  box(fence, [4.72, 0.12, z], [0.34, 0.16, 0.34], steel);
}
for (let i = 0; i < 9; i++)
  box(fence, [4.72, 0.78, -0.48 + i * 0.31], [0.055, 1.15, 0.045], "#e77635");
for (const y of [0.25, 0.51, 0.77, 1.03, 1.29])
  box(fence, [4.72, y, 0.76], [0.055, 0.045, 2.5], "#e77635");
box(fence, [4.77, 0.82, 0.76], [0.04, 0.59, 0.53], "#eee7d8");
shape(fence, "cone", [4.8, 0.84, 0.76], [0.025, 0.34, 0.17], red, [
  0,
  0,
  Math.PI / 2,
]);
screw(fence, [4.785, 1.26, -0.48], [1, 0, 0]);
screw(fence, [4.785, 0.51, 2.0], [1, 0, 0]);
const terrainHeads: Vector[][] = [
  [[-3.25, 0.095, -2.2]],
  [[-0.29, 0.095, -2.2]],
  [[3.15, 0.095, -2.2]],
  [
    [-3.25, 0.095, -0.25],
    [-4.77, 0.095, 0.84],
  ],
  [
    [-0.29, 0.095, -0.25],
    [0.63, 0.095, 0.69],
  ],
  [
    [2.45, 0.095, -0.75],
    [4.55, 0.095, -1.5],
  ],
  [[-3.51, 0.095, 3.85]],
  [
    [-0.36, 0.095, 3.27],
    [-1.48, 0.095, 2.39],
  ],
  [
    [2.05, 0.095, 2.01],
    [3.8, 0.095, 3.71],
  ],
];
for (const [i, tile] of ground.entries()) {
  for (const position of terrainHeads[i]) screw(tile.part, position);
  for (let j = 0; j < 3; j++) {
    const x = tile.x + Math.sin(i * 4 + j * 9) * 1.25,
      z = tile.z + Math.cos(i * 7 + j * 3) * 1.24;
    for (const a of [-0.3, 0, 0.3])
      shape(
        tile.part,
        "cone",
        [x + a * 0.1, 0.18, z],
        [0.025, 0.23, 0.025],
        "#8d9f53",
        [a, 0, a],
      );
  }
}
// These constraints guide the generated winning route; actual mesh clearance
// alone controls what players can remove. No invisible gameplay locks.
for (const mount of CONSTRUCTION_MOUNTS) {
  const id = mount.attachedTo;
  // Start the proof with the tools on the working deck, then branch into the
  // structure. Players remain free to pick any geometrically exposed head.
  if (
    ![
      "site-workbench-top",
      "site-workbench-frame",
      "site-hardhat",
      "site-upper-toolbox",
      "site-upper-toolbox-lid",
    ].includes(id)
  )
    mount.solutionAfter = [desk, ...(mount.solutionAfter ?? [])];
  if (id.startsWith("site-floor-lower-"))
    mount.solutionAfter = [desk, ...upperFloor];
  if (id.startsWith("site-studs-")) mount.solutionAfter = [desk, ...gableParts];
  if (id.startsWith("site-office-wall-") || id === "site-office-front")
    mount.solutionAfter = [desk, ...officeRoof];
  if (id === "site-office-floor")
    mount.solutionAfter = [desk, ...officeRoof, officeDesk, cabinet];
  if (id.startsWith("site-mast-")) mount.solutionAfter = [desk, turntable];
  if (id === "site-crane-foot") mount.solutionAfter = [desk, ...mast];
  if (id.startsWith("site-track-")) mount.solutionAfter = [desk, dozerChassis];
  if (id === "site-dozer-seat" || id === "site-steering-wheel")
    mount.solutionAfter = [desk, dozerRoof];
}
// Bake rotated custom meshes once so picking, rendering and collider bounds
// all consume the exact same geometry.
const transform = new Matrix4(),
  euler = new Euler();
for (const piece of pieces)
  if (piece.rotation) {
    const source = piece.geometry;
    if (source) {
      transform
        .makeRotationFromEuler(euler.set(...piece.rotation))
        .scale(new Vector3(...piece.size));
      piece.geometry = source.clone().applyMatrix4(transform);
      piece.size = [1, 1, 1];
      piece.rotation = undefined;
    }
  }
const CONSTRUCTION_MODEL = {
  pieces,
  pivots,
  parts: Object.keys(pivots) as ConstructionPartId[],
};

return { model: CONSTRUCTION_MODEL, mounts: CONSTRUCTION_MOUNTS };
}
