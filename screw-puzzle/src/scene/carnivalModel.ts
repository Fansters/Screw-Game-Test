import {
  BoxGeometry,
  CatmullRomCurve3,
  CylinderGeometry,
  Euler,
  ExtrudeGeometry,
  Matrix4,
  Quaternion,
  Shape,
  TubeGeometry,
  Vector3,
} from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { ConvexGeometry } from "three/addons/geometries/ConvexGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { GLYPHS } from "../components/lettering.ts";
import type { CarnivalPartId, Screw } from "../game/types.ts";
import type { Piece, Vector } from "./houseModel.ts";

// Construct only when this level is requested. No live geometry is kept in the module.
export function createCarnivalModel() {

type Mount = Pick<Screw, "position" | "normal" | "solutionAfter"> & {
  attachedTo: CarnivalPartId;
};
const pieces: Piece[] = [],
  pivots: Record<CarnivalPartId, Vector> = {};
const CARNIVAL_MOUNTS: Mount[] = [];
const CARNIVAL_WHEEL_REFERENCE_RADIUS = 1.6;
const CARNIVAL_WHEEL_RADIUS = CARNIVAL_WHEEL_REFERENCE_RADIUS * 2;
const soft = new RoundedBoxGeometry(1, 1, 1, 2, 0.09),
  stone = new RoundedBoxGeometry(1, 1, 1, 1, 0.13),
  cylinder = new CylinderGeometry(1, 1, 1, 24);
const pink = "#e96b96",
  rose = "#d94b77",
  cream = "#fff0ce",
  gold = "#efbd4d",
  yellow = "#ffdc69",
  blue = "#79b3dd",
  purple = "#9679c2",
  wood = "#be8c59",
  green = "#65985b",
  iron = "#41635c",
  pale = "#eee4dc";
function owner(name: string, pivot: Vector): CarnivalPartId {
  const part: CarnivalPartId = `fair-${name}`;
  pivots[part] = pivot;
  return part;
}
function box(
  part: CarnivalPartId,
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
  part: CarnivalPartId,
  kind: Piece["kind"],
  position: Vector,
  size: Vector,
  color: string,
  rotation?: Vector,
) {
  pieces.push({ part, kind, position, size, color, rotation });
}
function ball(part: CarnivalPartId, p: Vector, s: Vector, c: string) {
  shape(part, "ico-detail", p, s, c);
}
function tube(
  part: CarnivalPartId,
  p: Vector,
  r: number,
  h: number,
  c: string,
  rotation?: Vector,
) {
  pieces.push({
    part,
    kind: "cylinder",
    geometry: cylinder,
    position: p,
    size: [r, h, r],
    color: c,
    rotation,
  });
}
function beam(
  part: CarnivalPartId,
  a: Vector,
  b: Vector,
  r: number,
  c: string,
) {
  const start = new Vector3(...a),
    end = new Vector3(...b),
    d = end.clone().sub(start),
    q = new Quaternion().setFromUnitVectors(
      new Vector3(0, 1, 0),
      d.clone().normalize(),
    );
  tube(
    part,
    start.add(end).multiplyScalar(0.5).toArray(),
    r,
    d.length(),
    c,
    new Euler().setFromQuaternion(q).toArray().slice(0, 3) as Vector,
  );
}
function curve(
  part: CarnivalPartId,
  points: Vector[],
  r: number,
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
      Math.max(16, points.length * 4),
      r,
      8,
      false,
    ),
  });
}
function screw(
  part: CarnivalPartId,
  p: Vector,
  n: Vector = [0, 1, 0],
  after?: CarnivalPartId[],
) {
  CARNIVAL_MOUNTS.push({
    attachedTo: part,
    position: p,
    normal: new Vector3(...n).normalize().toArray(),
    solutionAfter: after,
  });
}
function star(
  part: CarnivalPartId,
  p: Vector,
  scale: number,
  color = yellow,
  rotation?: Vector,
) {
  shape(part, "star", p, [scale, scale, scale], color, rotation);
}
function text(
  part: CarnivalPartId,
  word: string,
  [x, y, z]: Vector,
  height: number,
  color = cream,
) {
  const unit = height / 7,
    width = (word.length * 6 - 1) * unit,
    blocks: BoxGeometry[] = [];
  for (let i = 0; i < word.length; i++)
    for (let row = 0; row < 7; row++)
      for (let col = 0; col < 5; col++)
        if (GLYPHS[word[i]]?.[row]?.[col] === "1")
          blocks.push(
            new BoxGeometry(unit * 1.01, unit * 1.01, 0.025).translate(
              x - width / 2 + (i * 6 + col + 0.5) * unit,
              y + (3 - row) * unit,
              z,
            ),
          );
  const geometry = mergeGeometries(blocks);
  blocks.forEach((g) => g.dispose());
  if (geometry)
    pieces.push({
      part,
      kind: "box",
      position: [0, 0, 0],
      size: [1, 1, 1],
      color,
      geometry,
    });
}
function lampBulb(part: CarnivalPartId, p: Vector, r = 0.05) {
  ball(part, p, [r, r, r], "#fff3a0");
}
function plate(part: CarnivalPartId, p: Vector, color = gold) {
  box(part, p, [0.24, 0.24, 0.07], color);
}
function diskSector(
  part: CarnivalPartId,
  c: Vector,
  r: number,
  a: number,
  b: number,
  h: number,
  color: string,
) {
  const s = new Shape();
  s.moveTo(0, 0);
  s.absarc(0, 0, r, a, b, false);
  s.lineTo(0, 0);
  const g = new ExtrudeGeometry(s, {
    depth: h,
    bevelEnabled: false,
    curveSegments: 24,
  })
    .rotateX(-Math.PI / 2)
    .translate(0, -h / 2, 0);
  pieces.push({
    part,
    kind: "box",
    position: c,
    size: [1, 1, 1],
    color,
    geometry: g,
  });
}

// Independent white plinths and pale, cobbled walkways. Props cover individual
// tile heads; no broad object dependency ever locks an exposed head in play.
const terrain: CarnivalPartId[] = [],
  foundations: CarnivalPartId[] = [];
for (let row = 0; row < 3; row++)
  for (let col = 0; col < 3; col++) {
    const x = (col - 1) * 3.9,
      z = (row - 1) * 3.9,
      base = owner(`foundation-${row}-${col}`, [x, -0.49, z]),
      tile = owner(`paving-${row}-${col}`, [x, -0.02, z]);
    terrain.push(tile);
    foundations.push(base);
    box(base, [x, -0.49, z], [3.88, 0.78, 3.88], "#ece4e2");
    box(tile, [x, -0.02, z], [3.88, 0.17, 3.88], "#d8cecb");
    for (let r = 0; r < 7; r++)
      for (let c = 0; c < 7; c++)
        pieces.push({
          part: tile,
          kind: "box",
          geometry: stone,
          position: [
            x - 1.65 + c * 0.55 + (r % 2 ? 0.045 : -0.045),
            0.075,
            z - 1.65 + r * 0.55,
          ],
          size: [0.52, 0.07, 0.52],
          color: ["#e8dfdb", "#e2d7d1", "#eee5df"][(r + c) % 3],
        });
    screw(base, [x, -0.085, z]);
  }

// The panorama wheel uses twice the reference radius, in its own rear-right
// area. The carousel and stalls stay in front/left, away from the gondolas.
const wx = 1.45,
  wy = 5.1,
  wz = -2.65,
  R = CARNIVAL_WHEEL_RADIUS;
const wheelRims: CarnivalPartId[] = [],
  wheelLegs: CarnivalPartId[] = [],
  wheelFeet: CarnivalPartId[] = [];
for (const side of [-1, 1])
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4,
      b = a + Math.PI / 4,
      t = (a + b) / 2,
      part = owner(`wheel-rim-${side}-${i}`, [
        wx + R * Math.cos(t),
        wy + R * Math.sin(t),
        wz + side * 0.2,
      ]);
    wheelRims.push(part);
    curve(
      part,
      Array.from(
        { length: 10 },
        (_, j) =>
          [
            wx + R * Math.cos(a + ((b - a) * j) / 9),
            wy + R * Math.sin(a + ((b - a) * j) / 9),
            wz + side * 0.2,
          ] as Vector,
      ),
      0.15,
      cream,
    );
    for (let j = 1; j < 6; j++) {
      const q = a + ((b - a) * j) / 6;
      lampBulb(
        part,
        [wx + R * Math.cos(q), wy + R * Math.sin(q), wz + side * 0.35],
        0.055,
      );
    }
    // Lower joints turn out of the rim edge, away from the A-frame. A visible
    // head must not appear usable while a nearby support catches its edge.
    if (i === 5 || i === 6) {
      screw(
        part,
        [
          wx + (R + 0.17) * Math.cos(t),
          wy + (R + 0.17) * Math.sin(t),
          wz + side * 0.2,
        ],
        [Math.cos(t), Math.sin(t), 0],
      );
    } else {
      screw(
        part,
        [wx + R * Math.cos(t), wy + R * Math.sin(t), wz + side * 0.37],
        [0, 0, side],
      );
    }
  }
for (let i = 0; i < 8; i++) {
  const a = ((i + 0.5) * Math.PI) / 4,
    part = owner(`wheel-spoke-${i}`, [
      wx + 1.65 * Math.cos(a),
      wy + 1.65 * Math.sin(a),
      wz,
    ]);
  beam(
    part,
    [wx, wy, wz],
    [wx + R * Math.cos(a), wy + R * Math.sin(a), wz],
    0.095,
    i % 2 ? purple : pink,
  );
  screw(
    part,
    [wx + 3.18 * Math.cos(a), wy + 3.18 * Math.sin(a), wz + 0.065],
    [0, 0, 1],
  );
}
const axle = owner("wheel-axle", [wx, wy, wz]);
tube(axle, [wx, wy, wz], 0.16, 1.36, iron, [Math.PI / 2, 0, 0]);
screw(axle, [wx, wy, wz + 0.67], [0, 0, 1]);
screw(axle, [wx, wy, wz - 0.67], [0, 0, -1]);
for (const side of [-1, 1]) {
  const p = owner(`wheel-hub-${side}`, [wx, wy, wz + side * 0.8]);
  tube(p, pivots[p], 0.53, 0.18, side === 1 ? pink : purple, [
    Math.PI / 2,
    0,
    0,
  ]);
  tube(p, [wx, wy, wz + side * 0.91], 0.41, 0.045, cream, [Math.PI / 2, 0, 0]);
  star(
    p,
    [wx, wy, wz + side * 0.96],
    0.77,
    gold,
    side < 0 ? [0, Math.PI, 0] : undefined,
  );
  screw(p, [wx + 0.31, wy - 0.28, wz + side * 0.915], [0, 0, side]);
}
for (const side of [-1, 1])
  for (const end of [-1, 1]) {
    const foot: Vector = [wx + end * 1.65, 0.39, wz + side * 0.62],
      top: Vector = [wx, wy, wz + side * 0.62],
      part = owner(`wheel-leg-${side}-${end}`, [
        (foot[0] + wx) / 2,
        2.7,
        foot[2],
      ]);
    wheelLegs.push(part);
    const d = new Vector3(...top).sub(new Vector3(...foot)),
      q = new Quaternion().setFromUnitVectors(
        new Vector3(0, 1, 0),
        d.clone().normalize(),
      );
    box(
      part,
      [(foot[0] + wx) / 2, (foot[1] + wy) / 2, foot[2]],
      [0.32, d.length(), 0.26],
      side > 0 ? pink : purple,
      new Euler().setFromQuaternion(q).toArray().slice(0, 3) as Vector,
    );
    for (const t of [0.2, 0.64]) {
      const x = foot[0] + (wx - foot[0]) * t,
        y = foot[1] + (wy - foot[1]) * t;
      plate(part, [x, y, foot[2] + side * 0.16], side > 0 ? rose : purple);
      screw(part, [x, y, foot[2] + side * 0.215], [0, 0, side]);
    }
    const base = owner(`wheel-foot-${side}-${end}`, foot);
    wheelFeet.push(base);
    box(base, [foot[0], 0.27, foot[2]], [0.84, 0.29, 0.65], cream);
    box(base, [foot[0], 0.44, foot[2]], [0.54, 0.08, 0.39], gold);
    screw(base, [foot[0] + end * 0.31, 0.43, foot[2]]);
    screw(base, [foot[0], 0.27, foot[2] + side * 0.345], [0, 0, side]);
  }
for (const side of [-1, 1]) {
  const p = owner(`wheel-crossbar-${side}`, [wx, 1.1, wz + side * 0.62]);
  box(p, pivots[p], [2.55, 0.19, 0.2], cream);
  screw(p, [wx, 1.1, wz + side * 0.74], [0, 0, side]);
}
for (let i = 0; i < 8; i++) {
  const a = (i * Math.PI) / 4,
    px = wx + R * Math.cos(a),
    ay = wy + R * Math.sin(a),
    color = [pink, blue, gold, pink, blue, gold, pink, blue][i];
  const body = owner(`gondola-${i}`, [px, ay - 0.78, wz + 0.72]),
    roof = owner(`gondola-roof-${i}`, [px, ay - 0.2, wz + 0.72]),
    seat = owner(`gondola-seat-${i}`, [px, ay - 0.91, wz + 0.77]),
    bar = owner(`gondola-bar-${i}`, [px, ay - 0.64, wz + 1.105]);
  beam(body, [px, ay + 0.06, wz], [px, ay - 0.45, wz + 0.45], 0.04, gold);
  box(body, [px, ay - 1.09, wz + 0.72], [0.94, 0.12, 0.77], color);
  box(body, [px, ay - 0.81, wz + 0.37], [0.94, 0.61, 0.08], color);
  for (const x of [px - 0.44, px + 0.44]) {
    box(body, [x, ay - 0.91, wz + 0.72], [0.075, 0.32, 0.73], color);
    box(body, [x, ay - 0.51, wz + 0.72], [0.06, 0.65, 0.06], cream);
  }
  box(body, [px, ay - 1.0, wz + 1.1], [0.94, 0.29, 0.07], color);
  star(body, [px, ay - 0.99, wz + 1.16], 0.39, yellow);
  shape(roof, "cone", [px, ay - 0.19, wz + 0.72], [0.69, 0.32, 0.55], color);
  box(roof, [px, ay - 0.34, wz + 0.72], [1.02, 0.1, 0.95], cream);
  for (let j = 0; j < 5; j++)
    ball(
      roof,
      [px - 0.43 + j * 0.215, ay - 0.385, wz + 1.13],
      [0.115, 0.08, 0.045],
      color,
    );
  screw(roof, [px, ay - 0.015, wz + 0.72]);
  box(seat, [px, ay - 0.91, wz + 0.77], [0.73, 0.12, 0.43], cream);
  box(seat, [px, ay - 0.75, wz + 0.57], [0.73, 0.28, 0.08], cream);
  screw(seat, [px, ay - 0.985, wz + 0.77], [0, -1, 0]);
  beam(
    bar,
    [px - 0.44, ay - 0.64, wz + 1.1],
    [px + 0.44, ay - 0.64, wz + 1.1],
    0.035,
    gold,
  );
  plate(bar, [px - 0.31, ay - 0.64, wz + 1.1], color);
  screw(bar, [px - 0.31, ay - 0.64, wz + 1.15], [0, 0, 1]);
  screw(body, [px + 0.25, ay - 0.445, wz + 0.37]);
}

// An eight-panel striped carousel, with independently fastened horses,
// saddles, poles, fascia sections and four pieces of the decorated platform.
const cx = -2.7,
  cz = 1.3,
  carouselRoof: CarnivalPartId[] = [],
  carouselBase: CarnivalPartId[] = [];
for (let i = 0; i < 4; i++) {
  const a = (i * Math.PI) / 2,
    b = a + Math.PI / 2,
    t = (a + b) / 2,
    p = owner(`carousel-base-${i}`, [cx, 0.41, cz]);
  carouselBase.push(p);
  diskSector(p, [cx, 0.41, cz], 1.94, a, b, 0.32, pink);
  const px = cx + 1.13 * Math.cos(t),
    pz = cz - 1.13 * Math.sin(t);
  screw(p, [px + 0.18, 0.585, pz + 0.15]);
  const nx = Math.cos(t),
    nz = -Math.sin(t);
  screw(p, [cx + 1.96 * nx, 0.41, cz + 1.96 * nz], [nx, 0, nz]);
  for (let j = 0; j < 5; j++) {
    const q = a + ((b - a) * (j + 0.5)) / 5;
    ball(
      p,
      [cx + 1.935 * Math.cos(q), 0.4, cz - 1.935 * Math.sin(q)],
      [0.075, 0.12, 0.075],
      j % 2 ? gold : blue,
    );
  }
}
for (let i = 0; i < 8; i++) {
  const a = (i * Math.PI) / 4,
    b = a + Math.PI / 4,
    t = (a + b) / 2,
    p = owner(`carousel-roof-${i}`, [cx, 2.98, cz]);
  carouselRoof.push(p);
  const points: Vector3[] = [];
  for (const dy of [0, -0.075])
    for (const v of [
      [cx, 3.45 + dy, cz],
      [cx + 1.95 * Math.cos(a), 2.65 + dy, cz + 1.95 * Math.sin(a)],
      [cx + 1.95 * Math.cos(b), 2.65 + dy, cz + 1.95 * Math.sin(b)],
    ])
      points.push(new Vector3(...v));
  pieces.push({
    part: p,
    kind: "box",
    position: [0, 0, 0],
    size: [1, 1, 1],
    color: i % 2 ? cream : pink,
    geometry: new ConvexGeometry(points),
  });
  const radius = 1.95 * Math.cos(Math.PI / 8) * 0.65,
    normal = new Vector3(
      (0.8 / (1.95 * Math.cos(Math.PI / 8))) * Math.cos(t),
      1,
      (0.8 / (1.95 * Math.cos(Math.PI / 8))) * Math.sin(t),
    ).normalize();
  screw(
    p,
    new Vector3(cx + radius * Math.cos(t), 2.93, cz + radius * Math.sin(t))
      .addScaledVector(normal, 0.018)
      .toArray(),
    normal.toArray(),
  );
  const f = owner(`carousel-fascia-${i}`, [
      cx + 1.82 * Math.cos(t),
      2.52,
      cz + 1.82 * Math.sin(t),
    ]),
    rotation: Vector = [0, Math.PI / 2 - t, 0];
  box(f, pivots[f], [1.48, 0.35, 0.12], rose, rotation);
  for (const y of [2.36, 2.69])
    beam(
      f,
      [cx + 1.95 * Math.cos(a), y, cz + 1.95 * Math.sin(a)],
      [cx + 1.95 * Math.cos(b), y, cz + 1.95 * Math.sin(b)],
      0.035,
      gold,
    );
  const center = pivots[f];
  star(
    f,
    [center[0] + 0.08 * Math.cos(t), 2.55, center[2] + 0.08 * Math.sin(t)],
    0.43,
    blue,
    rotation,
  );
  for (let j = 0; j < 5; j++) {
    const q = a + ((b - a) * (j + 0.5)) / 5;
    lampBulb(f, [cx + 1.96 * Math.cos(q), 2.68, cz + 1.96 * Math.sin(q)]);
  }
  const tangent: Vector = [-Math.sin(t), 0, Math.cos(t)];
  screw(
    f,
    [
      center[0] + tangent[0] * 0.39 + Math.cos(t) * 0.085,
      2.49,
      center[2] + tangent[2] * 0.39 + Math.sin(t) * 0.085,
    ],
    [Math.cos(t), 0, Math.sin(t)],
  );
}
const drum = owner("carousel-drum", [cx, 1.53, cz]);
tube(drum, [cx, 1.53, cz], 0.32, 1.9, pink);
for (const y of [0.62, 2.44]) tube(drum, [cx, y, cz], 0.36, 0.08, gold);
screw(drum, [cx + 0.335, 1.55, cz], [1, 0, 0]);
screw(drum, [cx - 0.335, 1.55, cz], [-1, 0, 0]);
for (let i = 0; i < 4; i++) {
  const a = ((i + 0.5) * Math.PI) / 2,
    x = cx + 1.13 * Math.cos(a),
    z = cz - 1.13 * Math.sin(a),
    p = owner(`carousel-horse-${i}`, [x, 1.05, z]),
    saddle = owner(`carousel-saddle-${i}`, [x, 1.42, z]),
    pole = owner(`carousel-pole-${i}`, [x + 0.27, 1.65, z]);
  const accent = [blue, pink, purple, gold][i];
  ball(p, [x, 1.14, z], [0.4, 0.22, 0.21], cream);
  ball(p, [x + 0.3, 1.33, z], [0.15, 0.28, 0.14], cream);
  ball(p, [x + 0.39, 1.52, z], [0.18, 0.15, 0.145], cream);
  ball(p, [x + 0.5, 1.47, z], [0.13, 0.085, 0.11], pink);
  for (const xx of [x - 0.18, x + 0.18])
    for (const zz of [z - 0.15, z + 0.15]) {
      beam(p, [xx, 1.03, zz], [xx, 0.64, zz], 0.055, cream);
      box(p, [xx, 0.62, zz], [0.14, 0.12, 0.14], gold);
    }
  for (const zz of [z - 0.08, z + 0.08])
    shape(p, "cone", [x + 0.36, 1.7, zz], [0.05, 0.16, 0.04], cream);
  for (let j = 0; j < 5; j++)
    ball(p, [x + 0.17, 1.28 + j * 0.08, z], [0.08, 0.07, 0.16], accent);
  ball(p, [x + 0.45, 1.56, z + 0.133], [0.023, 0.025, 0.012], iron);
  curve(
    p,
    [
      [x - 0.34, 1.2, z],
      [x - 0.51, 1.18, z],
      [x - 0.48, 0.91, z],
    ],
    0.045,
    accent,
  );
  box(saddle, [x - 0.08, 1.42, z], [0.45, 0.16, 0.42], accent);
  star(saddle, [x - 0.08, 1.41, z + 0.235], 0.23, gold);
  screw(saddle, [x - 0.08, 1.515, z]);
  screw(p, [x - 0.08, 1.32, z]);
  tube(pole, [x + 0.27, 1.65, z], 0.035, 1.99, gold);
  plate(pole, [x + 0.27, 1.86, z + 0.07], accent);
  screw(pole, [x + 0.27, 1.86, z + 0.125], [0, 0, 1]);
}
const carouselFlag = owner("carousel-flag", [cx, 3.83, cz]);
tube(carouselFlag, [cx, 3.83, cz], 0.035, 0.88, gold);
ball(carouselFlag, [cx, 4.29, cz], [0.09, 0.09, 0.09], gold);
box(
  carouselFlag,
  [cx + 0.26, 4.08, cz],
  [0.52, 0.23, 0.045],
  pink,
  [0, 0, -0.08],
);
plate(carouselFlag, [cx, 3.62, cz + 0.06]);
screw(carouselFlag, [cx, 3.62, cz + 0.115], [0, 0, 1]);

// Three open carnival games with striped roofs, real interior shelves and
// removable games/prizes. Their wall and floor fixings face into the booths.
const stallPanels: CarnivalPartId[] = [],
  stallRoofs: CarnivalPartId[] = [],
  stallCounters: CarnivalPartId[] = [];
for (let i = 0; i < 3; i++) {
  const x = -4.75 + i * 1.33,
    z = -3.85,
    color = [blue, gold, purple][i],
    floor = owner(`game-floor-${i}`, [x, 0.2, z]),
    back = owner(`game-back-${i}`, [x, 1.65, z - 0.65]);
  box(floor, [x, 0.2, z], [1.25, 0.16, 1.42], wood);
  screw(floor, [x, 0.295, z - 0.2]);
  box(back, pivots[back], [1.25, 2.83, 0.1], wood);
  for (const [dx, y] of [
    [-0.38, 1.02],
    [0.38, 2.5],
  ])
    screw(back, [x + dx, y, z - 0.585], [0, 0, 1]);
  stallPanels.push(back);
  for (const side of [-1, 1]) {
    const p = owner(`game-side-${i}-${side}`, [x + side * 0.63, 1.65, z]);
    box(p, pivots[p], [0.1, 2.83, 1.36], wood);
    for (const y of [0.38, 2.92])
      box(p, [x + side * 0.63, y, z], [0.14, 0.12, 1.42], gold);
    screw(p, [x + side * 0.565, side > 0 ? 2.66 : 2.15, z], [-side, 0, 0]);
    stallPanels.push(p);
  }
  const lower = owner(`game-front-${i}`, [x, 0.78, z + 0.65]),
    counter = owner(`game-counter-${i}`, [x, 1.38, z + 0.59]);
  stallCounters.push(counter);
  box(lower, pivots[lower], [1.25, 1.0, 0.1], color);
  for (let j = 0; j < 5; j++)
    box(
      lower,
      [x - 0.48 + j * 0.24, 0.78, z + 0.715],
      [0.12, 0.8, 0.025],
      j % 2 ? pink : gold,
      [0, 0, 0.22],
    );
  screw(lower, [x, 0.78, z + 0.585], [0, 0, -1]);
  box(counter, pivots[counter], [1.37, 0.13, 0.54], wood);
  screw(counter, [x, 1.46, z + 0.59]);
  for (const side of [-1, 1]) {
    const p = owner(`game-roof-${i}-${side}`, [x + side * 0.35, 3.31, z]);
    stallRoofs.push(p);
    for (let j = 0; j < 5; j++) {
      const zz = z - 0.82 + j * 0.33,
        points: Vector3[] = [];
      for (const dy of [0, -0.07])
        for (const [xx, yy] of [
          [x, 3.55],
          [x + side * 0.72, 3.07],
        ])
          for (const z0 of [zz, zz + 0.33])
            points.push(new Vector3(xx, yy + dy, z0));
      pieces.push({
        part: p,
        kind: "box",
        position: [0, 0, 0],
        size: [1, 1, 1],
        color: j % 2 ? cream : color,
        geometry: new ConvexGeometry(points),
      });
    }
    for (let j = 0; j < 5; j++) {
      ball(
        p,
        [x + side * 0.69, 3.04, z - 0.66 + j * 0.33],
        [0.11, 0.09, 0.17],
        j % 2 ? cream : color,
      );
      lampBulb(p, [x + side * 0.73, 3.0, z - 0.66 + j * 0.33], 0.045);
    }
    const n = new Vector3((side * 0.48) / 0.72, 1, 0).normalize();
    screw(
      p,
      new Vector3(x + side * 0.36, 3.31, z - 0.2)
        .addScaledVector(n, 0.02)
        .toArray(),
      n.toArray(),
    );
    if (side === 1) star(p, [x, 3.48, z + 0.88], 0.48, gold);
  }
  const rack = owner(`prize-rack-${i}`, [x, 1.65, z - 0.24]);
  box(rack, [x, 0.41, z - 0.2], [0.66, 0.27, 0.4], wood);
  for (const xx of [x - 0.43, x + 0.43])
    box(rack, [xx, 1.68, z - 0.24], [0.13, 2.27, 0.16], gold);
  for (const y of [1.63, 2.27])
    box(rack, [x, y, z - 0.24], [0.97, 0.09, 0.49], wood);
  screw(rack, [x - 0.43, 1.88, z - 0.135], [0, 0, 1]);
  function toy(tx: number, y: number, tz: number, kind: number) {
    if (kind === 1) {
      ball(rack, [tx, y, tz], [0.15, 0.12, 0.12], yellow);
      ball(rack, [tx + 0.08, y + 0.13, tz], [0.085, 0.085, 0.085], yellow);
      box(rack, [tx + 0.17, y + 0.11, tz], [0.1, 0.035, 0.055], "#ef9b3c");
    } else {
      ball(rack, [tx, y, tz], [0.12, 0.17, 0.1], cream);
      ball(rack, [tx, y + 0.21, tz], [0.12, 0.12, 0.1], cream);
      for (const xx of [tx - 0.07, tx + 0.07])
        ball(rack, [xx, y + 0.4, tz], [0.045, 0.15, 0.04], cream);
      for (const xx of [tx - 0.045, tx + 0.045])
        ball(rack, [xx, y + 0.23, tz + 0.09], [0.012, 0.015, 0.01], iron);
      ball(rack, [tx, y + 0.18, tz + 0.105], [0.025, 0.02, 0.02], pink);
    }
  }
  if (i < 2)
    for (const y of [1.81, 2.45])
      for (const tx of [x - 0.25, x + 0.25]) toy(tx, y, z - 0.2, i);
  else
    for (let row = 0; row < 3; row++)
      for (let col = 0; col < 3 - row; col++) {
        tube(
          rack,
          [x - 0.26 + col * 0.26 + row * 0.13, 1.81 + row * 0.28, z - 0.2],
          0.11,
          0.25,
          pale,
        );
        star(
          rack,
          [x - 0.26 + col * 0.26 + row * 0.13, 1.81 + row * 0.28, z - 0.075],
          0.11,
          gold,
        );
      }
  const game = owner(`game-display-${i}`, [x, 1.8, z + 0.59]);
  box(game, [x, 1.59, z + 0.59], [0.48, 0.25, 0.36], color);
  screw(game, [x, 1.59, z + 0.795], [0, 0, 1]);
  if (i === 0) {
    beam(game, [x, 1.65, z + 0.59], [x, 2.12, z + 0.59], 0.03, gold);
    for (const [r, c] of [
      [0.32, pink],
      [0.24, cream],
      [0.16, pink],
      [0.08, cream],
    ] as const)
      tube(game, [x, 2.12, z + 0.65 + (0.32 - r) * 0.12], r, 0.035, c, [
        Math.PI / 2,
        0,
        0,
      ]);
    beam(
      game,
      [x + 0.06, 2.16, z + 0.72],
      [x + 0.32, 2.31, z + 0.97],
      0.018,
      purple,
    );
  } else if (i === 1) {
    for (const xx of [x - 0.13, x + 0.13]) {
      ball(game, [xx, 1.8, z + 0.59], [0.12, 0.11, 0.1], yellow);
      ball(game, [xx + 0.07, 1.92, z + 0.59], [0.075, 0.075, 0.075], yellow);
      box(game, [xx + 0.15, 1.89, z + 0.59], [0.09, 0.03, 0.05], "#e98e3c");
    }
  } else
    for (let row = 0; row < 3; row++)
      for (let col = 0; col < 3 - row; col++)
        tube(
          game,
          [x - 0.22 + col * 0.22 + row * 0.11, 1.83 + row * 0.24, z + 0.59],
          0.095,
          0.22,
          pale,
        );
}

// Ticket kiosk and its striped awning occupy the open front-right corner.
const tx = 3.75,
  tz = 1.65,
  ticketFloor = owner("ticket-floor", [tx, 0.2, tz]),
  ticketBack = owner("ticket-back", [tx, 1.47, tz - 0.68]);
box(ticketFloor, pivots[ticketFloor], [2.12, 0.16, 1.44], wood);
screw(ticketFloor, [tx, 0.295, tz - 0.25]);
box(ticketBack, pivots[ticketBack], [2.08, 2.46, 0.1], cream);
for (const [x, y] of [
  [tx - 0.73, 0.85],
  [tx + 0.73, 1.95],
])
  screw(ticketBack, [x, y, tz - 0.615], [0, 0, 1]);
const ticketWalls: CarnivalPartId[] = [ticketBack],
  ticketRoofs: CarnivalPartId[] = [];
for (const side of [-1, 1]) {
  const p = owner(`ticket-side-${side}`, [tx + side * 1.01, 1.47, tz]);
  ticketWalls.push(p);
  box(p, pivots[p], [0.1, 2.46, 1.36], cream);
  for (const y of [0.4, 2.56])
    box(p, [tx + side * 1.01, y, tz], [0.14, 0.15, 1.45], gold);
  screw(p, [tx + side * 0.945, 1.8, tz - 0.15], [-side, 0, 0]);
  const roof = owner(`ticket-roof-${side}`, [tx + side * 0.56, 2.66, tz]);
  ticketRoofs.push(roof);
  box(roof, pivots[roof], [1.11, 0.16, 1.75], rose);
  for (let j = 0; j < 3; j++)
    box(
      roof,
      [tx + side * 0.56, 2.75, tz - 0.6 + j * 0.6],
      [1.05, 0.02, 0.025],
      pink,
    );
  screw(roof, [tx + side * 0.6, 2.755, tz - 0.3]);
}
const ticketFront = owner("ticket-front", [tx, 0.78, tz + 0.67]),
  ticketFrame = owner("ticket-frame", [tx, 1.88, tz + 0.7]),
  ticketCounter = owner("ticket-counter", [tx, 1.27, tz + 0.61]);
box(ticketFront, pivots[ticketFront], [2.08, 1.02, 0.1], pink);
for (const x of [tx - 0.69, tx, tx + 0.69])
  star(ticketFront, [x, 0.8, tz + 0.75], 0.43, gold);
screw(ticketFront, [tx, 0.78, tz + 0.605], [0, 0, -1]);
for (const x of [tx - 0.96, tx + 0.96])
  box(ticketFrame, [x, 1.91, tz + 0.7], [0.13, 1.33, 0.13], cream);
box(ticketFrame, [tx, 2.5, tz + 0.7], [2.05, 0.14, 0.15], gold);
plate(ticketFrame, [tx - 0.96, 2.13, tz + 0.79], gold);
screw(ticketFrame, [tx - 0.96, 2.13, tz + 0.845], [0, 0, 1]);
box(ticketCounter, pivots[ticketCounter], [2.21, 0.12, 0.58], wood);
screw(ticketCounter, [tx, 1.345, tz + 0.6]);
const till = owner("ticket-till", [tx, 1.55, tz + 0.6]);
box(till, pivots[till], [0.5, 0.35, 0.43], gold);
box(till, [tx, 1.75, tz + 0.52], [0.38, 0.16, 0.11], iron, [0.25, 0, 0]);
box(till, [tx, 1.77, tz + 0.59], [0.29, 0.07, 0.025], cream);
screw(till, [tx, 1.55, tz + 0.835], [0, 0, 1]);
for (let i = 0; i < 3; i++)
  box(
    till,
    [tx - 0.14 + i * 0.14, 1.62, tz + 0.825],
    [0.07, 0.035, 0.025],
    pink,
  );
for (const side of [-1, 1]) {
  const p = owner(`ticket-awning-${side}`, [tx + side * 0.56, 2.4, tz + 1.1]);
  for (let j = 0; j < 4; j++) {
    const x = tx + side * 0.56 - 0.405 + j * 0.27;
    box(
      p,
      [x, 2.46, tz + 1.0],
      [0.265, 0.075, 1.03],
      j % 2 ? cream : rose,
      [0.35, 0, 0],
    );
    ball(p, [x, 2.25, tz + 1.49], [0.14, 0.14, 0.06], j % 2 ? cream : rose);
  }
  plate(p, [tx + side * 0.73, 2.29, tz + 1.49], gold);
  screw(p, [tx + side * 0.73, 2.29, tz + 1.545], [0, 0, 1]);
}
const ticketSign = owner("ticket-sign", [tx, 3.03, tz]);
box(ticketSign, pivots[ticketSign], [2.32, 0.59, 0.13], rose);
box(ticketSign, [tx, 3.03, tz + 0.085], [2.13, 0.43, 0.055], cream);
text(ticketSign, "TICKETS", [tx, 3.03, tz + 0.13], 0.29, "#975545");
for (const x of [-1.02, -0.76, -0.5, -0.24, 0.02, 0.28, 0.54, 0.8, 1.03])
  for (const y of [2.78, 3.28])
    lampBulb(ticketSign, [tx + x, y, tz + 0.09], 0.035);
screw(ticketSign, [tx - 0.99, 3.03, tz + 0.14], [0, 0, 1]);
screw(ticketSign, [tx + 0.99, 3.03, tz + 0.14], [0, 0, 1]);

// Popcorn cart: open glazing frames show individual kernels and a removable tray.
const px = -4.65,
  pz = 4.25,
  popBody = owner("popcorn-body", [px, 0.65, pz]),
  popFrame = owner("popcorn-frame", [px, 1.57, pz]),
  popTray = owner("popcorn-tray", [px, 1.14, pz]);
box(popBody, [px, 0.65, pz], [1.3, 0.65, 0.91], rose);
for (const x of [px - 0.48, px + 0.48])
  box(popBody, [x, 0.65, pz + 0.48], [0.1, 0.55, 0.04], gold);
star(popBody, [px, 0.65, pz + 0.5], 0.43, gold);
screw(popBody, [px, 0.99, pz]);
for (const x of [px - 0.6, px + 0.6])
  for (const z of [pz - 0.39, pz + 0.39])
    box(popFrame, [x, 1.58, z], [0.065, 1.13, 0.065], cream);
for (const y of [1.03, 2.12])
  box(popFrame, [px, y, pz], [1.32, 0.07, 0.91], gold);
plate(popFrame, [px - 0.6, 1.58, pz + 0.43], gold);
screw(popFrame, [px - 0.6, 1.58, pz + 0.485], [0, 0, 1]);
box(popTray, [px, 1.07, pz], [1.11, 0.15, 0.73], gold);
box(popTray, [px, 1.1, pz + 0.38], [1.15, 0.17, 0.055], cream);
for (let i = 0; i < 65; i++) {
  const x = px + Math.sin(i * 11.3) * 0.45,
    z = pz + Math.cos(i * 7.7) * 0.27,
    y = 1.2 + (i % 5) * 0.095;
  ball(popTray, [x, y, z], [0.075, 0.07, 0.065], i % 3 ? "#ffdb7c" : cream);
}
screw(popTray, [px, 1.1, pz + 0.425], [0, 0, 1]);
const popRoof = owner("popcorn-roof", [px, 2.2, pz]);
box(popRoof, pivots[popRoof], [1.54, 0.15, 1.15], rose);
for (let i = 0; i < 6; i++)
  box(popRoof, [px - 0.63 + i * 0.25, 2.285, pz], [0.12, 0.035, 1.08], cream);
screw(popRoof, [px + 0.38, 2.31, pz - 0.2]);
const popAwning = owner("popcorn-awning", [px, 2.03, pz + 0.64]);
for (let i = 0; i < 6; i++) {
  const x = px - 0.63 + i * 0.25;
  box(
    popAwning,
    [x, 2.06, pz + 0.6],
    [0.245, 0.075, 0.54],
    i % 2 ? cream : pink,
    [0.34, 0, 0],
  );
  ball(
    popAwning,
    [x, 1.96, pz + 0.86],
    [0.13, 0.11, 0.055],
    i % 2 ? cream : pink,
  );
}
plate(popAwning, [px, 1.99, pz + 0.88], gold);
screw(popAwning, [px, 1.99, pz + 0.935], [0, 0, 1]);
const popSign = owner("popcorn-sign", [px, 2.48, pz]);
box(popSign, pivots[popSign], [1.5, 0.4, 0.1], rose);
text(popSign, "POPCORN", [px, 2.48, pz + 0.075], 0.205);
for (let i = 0; i < 7; i++)
  lampBulb(popSign, [px - 0.65 + i * 0.215, 2.66, pz + 0.06], 0.035);
screw(popSign, [px + 0.64, 2.48, pz + 0.075], [0, 0, 1]);
for (const side of [-1, 1]) {
  const p = owner(`popcorn-wheel-${side}`, [px + side * 0.71, 0.39, pz]);
  tube(p, pivots[p], 0.28, 0.11, gold, [0, 0, Math.PI / 2]);
  tube(p, [px + side * 0.78, 0.39, pz], 0.2, 0.04, iron, [0, 0, Math.PI / 2]);
  for (let j = 0; j < 6; j++) {
    const a = (j * Math.PI) / 3;
    beam(
      p,
      [px + side * 0.81, 0.39, pz],
      [px + side * 0.81, 0.39 + 0.23 * Math.cos(a), pz + 0.23 * Math.sin(a)],
      0.016,
      gold,
    );
  }
  screw(p, [px + side * 0.85, 0.39, pz], [side, 0, 0]);
}
const menu = owner("popcorn-menu", [-2.78, 0.7, 4.18]);
for (const x of [-3.09, -2.47])
  beam(menu, [x, 0.12, 4.32], [x, 1.31, 4.12], 0.045, wood);
box(menu, [-2.78, 0.76, 4.17], [0.65, 1.02, 0.08], wood);
box(menu, [-2.78, 0.79, 4.225], [0.52, 0.82, 0.035], iron);
for (let i = 0; i < 3; i++)
  box(menu, [-2.95 + i * 0.17, 0.68, 4.253], [0.09, 0.39, 0.02], cream);
for (const x of [-2.94, -2.78, -2.62])
  ball(menu, [x, 1.01, 4.26], [0.095, 0.08, 0.025], yellow);
screw(menu, [-2.78, 0.38, 4.26], [0, 0, 1]);

// Balloon-and-toy cart, separate from the ticket kiosk and wheel cabins.
const bx = 4.65,
  bz = -0.7,
  balloonBody = owner("balloon-cart", [bx, 0.64, bz]),
  balloonCounter = owner("balloon-counter", [bx, 1.0, bz]),
  balloonRoof = owner("balloon-roof", [bx, 2.08, bz]);
box(balloonBody, [bx, 0.64, bz], [1.24, 0.63, 0.85], purple);
for (const x of [bx - 0.56, bx + 0.56])
  for (const z of [bz - 0.35, bz + 0.35])
    tube(balloonBody, [x, 1.47, z], 0.035, 1.08, gold);
for (const x of [bx - 0.39, bx, bx + 0.39])
  star(balloonBody, [x, 0.65, bz + 0.46], 0.28, gold);
screw(balloonBody, [bx, 0.97, bz]);
box(balloonCounter, pivots[balloonCounter], [1.39, 0.12, 1.02], wood);
screw(balloonCounter, [bx, 1.075, bz]);
for (let i = 0; i < 6; i++) {
  const x = bx - 0.6 + i * 0.24;
  box(balloonRoof, [x, 2.07, bz], [0.235, 0.1, 1.12], i % 2 ? cream : blue);
  ball(
    balloonRoof,
    [x, 2.0, bz + 0.58],
    [0.125, 0.11, 0.055],
    i % 2 ? cream : blue,
  );
}
box(balloonRoof, [bx, 2.14, bz], [0.23, 0.1, 0.24], gold);
screw(balloonRoof, [bx, 2.205, bz]);
for (const side of [-1, 1]) {
  const p = owner(`balloon-wheel-${side}`, [bx + side * 0.68, 0.36, bz]);
  tube(p, pivots[p], 0.25, 0.1, gold, [0, 0, Math.PI / 2]);
  tube(p, [bx + side * 0.75, 0.36, bz], 0.17, 0.045, purple, [
    0,
    0,
    Math.PI / 2,
  ]);
  screw(p, [bx + side * 0.79, 0.36, bz], [side, 0, 0]);
}
for (const side of [-1, 1]) {
  const part = owner(`balloon-bouquet-${side}`, [
    bx + side * 0.28,
    2.55,
    bz - 0.12,
  ]);
  for (let i = 0; i < 3; i++) {
    const x = bx + side * 0.24 + (i - 1) * 0.27,
      y = 3.18 + (i % 2) * 0.43,
      z = bz - 0.08 + (i % 2) * 0.22;
    curve(
      part,
      [
        [bx + side * 0.29, 1.35, bz + 0.59],
        [x, 2.45, z],
        [x, y - 0.24, z],
      ],
      0.009,
      gold,
    );
    ball(
      part,
      [x, y, z],
      [0.27, 0.34, 0.25],
      [pink, blue, purple, gold, yellow, blue][i + (side > 0 ? 3 : 0)],
    );
    shape(part, "cone", [x, y - 0.34, z], [0.035, 0.07, 0.035], pink, [
      Math.PI,
      0,
      0,
    ]);
  }
  plate(part, [bx + side * 0.29, 1.4, bz + 0.59], gold);
  screw(part, [bx + side * 0.29, 1.4, bz + 0.645], [0, 0, 1]);
}
const bear = owner("balloon-bear", [bx, 1.32, bz]);
ball(bear, [bx, 1.28, bz], [0.18, 0.21, 0.14], "#ce9a58");
ball(bear, [bx, 1.58, bz], [0.19, 0.17, 0.15], "#d8ac68");
for (const x of [bx - 0.15, bx + 0.15]) {
  ball(bear, [x, 1.72, bz], [0.075, 0.075, 0.06], "#ce9a58");
  ball(bear, [x, 1.12, bz + 0.08], [0.1, 0.08, 0.1], "#ce9a58");
}
for (const x of [bx - 0.065, bx + 0.065])
  ball(bear, [x, 1.6, bz + 0.14], [0.016, 0.02, 0.012], iron);
ball(bear, [bx, 1.53, bz + 0.15], [0.045, 0.035, 0.03], cream);
box(bear, [bx, 1.41, bz + 0.14], [0.23, 0.065, 0.03], pink);
screw(bear, [bx, 1.27, bz + 0.16], [0, 0, 1]);

// An open entrance arch with bulb-lined lettering and blue/gold pillars.
const ex = 0.2,
  ez = 4.85,
  entryPosts: CarnivalPartId[] = [];
for (const side of [-1, 1]) {
  const x = ex + side * 1.35,
    p = owner(`entry-pillar-${side}`, [x, 0.96, ez]);
  entryPosts.push(p);
  box(p, [x, 0.96, ez], [0.53, 1.69, 0.53], gold);
  box(p, [x, 0.95, ez + 0.285], [0.36, 1.28, 0.055], blue);
  star(p, [x, 0.99, ez + 0.34], 0.43, cream);
  for (const y of [0.4, 0.67, 0.94, 1.21, 1.48])
    for (const dx of [-0.225, 0.225]) lampBulb(p, [x + dx, y, ez + 0.3], 0.035);
  box(p, [x, 1.84, ez], [0.66, 0.14, 0.64], cream);
  screw(p, [x, 1.925, ez]);
}
const arch = owner("entry-arch", [ex, 2.26, ez]),
  outline = new Shape();
outline.moveTo(-1.73, -0.23);
outline.quadraticCurveTo(-1.55, 0.47, 0, 0.61);
outline.quadraticCurveTo(1.55, 0.47, 1.73, -0.23);
outline.lineTo(1.43, -0.4);
outline.quadraticCurveTo(0, 0.02, -1.43, -0.4);
outline.closePath();
pieces.push({
  part: arch,
  kind: "box",
  position: [ex, 2.26, ez],
  size: [1, 1, 1],
  color: rose,
  geometry: new ExtrudeGeometry(outline, {
    depth: 0.15,
    bevelEnabled: true,
    bevelSize: 0.035,
    bevelThickness: 0.025,
    bevelSegments: 2,
    curveSegments: 20,
  }),
});
text(arch, "CARNIVAL", [ex, 2.61, ez + 0.19], 0.24);
text(arch, "FAIRGROUND", [ex, 2.32, ez + 0.19], 0.22);
for (let i = 0; i < 13; i++) {
  const x = -1.55 + (i * 3.1) / 12,
    y = 2.26 + 0.5 - 0.45 * Math.pow(x / 1.55, 2);
  lampBulb(arch, [ex + x, y, ez + 0.2], 0.045);
}
screw(arch, [ex - 1.47, 2.17, ez + 0.19], [0, 0, 1]);
screw(arch, [ex + 1.47, 2.17, ez + 0.19], [0, 0, 1]);
const entryAwning = owner("entry-valance", [ex, 1.96, ez]);
box(entryAwning, [ex, 1.98, ez], [2.19, 0.1, 0.3], gold);
for (let i = 0; i < 7; i++)
  ball(
    entryAwning,
    [ex - 0.93 + i * 0.31, 1.82, ez + 0.13],
    [0.16, 0.2, 0.1],
    i % 2 ? cream : pink,
  );
screw(entryAwning, [ex, 2.045, ez]);

// White perimeter fencing with pink swags; the entry and main walking routes
// remain open. Each long section has its own hidden-side mounting plate.
for (const [i, x, z, length, angle] of [
  [0, -4.2, 5.55, 2.4, 0],
  [1, 3.8, 5.55, 2.8, 0],
  [2, -5.55, 2.2, 2.3, Math.PI / 2],
  [3, -5.55, -1.0, 2.3, Math.PI / 2],
  [4, 5.55, 2.7, 2.4, Math.PI / 2],
  [5, 5.55, -0.3, 2.4, Math.PI / 2],
  [6, -3.8, -5.55, 3.0, 0],
  [7, 1.2, -5.55, 5.0, 0],
] as const) {
  const p = owner(`fence-${i}`, [x, 0.59, z]),
    u = new Vector3(Math.cos(angle), 0, Math.sin(angle)),
    normal = new Vector3(
      z > 5 ? 0 : x > 5 ? -1 : x < -5 ? 1 : 0,
      0,
      z > 5 ? -1 : z < -5 ? 1 : 0,
    );
  const count = Math.round(length / 0.5);
  for (let j = 0; j <= count; j++) {
    const v = u.clone().multiplyScalar(-length / 2 + (length * j) / count);
    tube(p, [x + v.x, 0.57, z + v.z], 0.035, 0.9, cream);
    ball(p, [x + v.x, 1.045, z + v.z], [0.07, 0.07, 0.07], gold);
  }
  for (const y of [0.33, 0.86])
    beam(
      p,
      [x - (u.x * length) / 2, y, z - (u.z * length) / 2],
      [x + (u.x * length) / 2, y, z + (u.z * length) / 2],
      0.035,
      cream,
    );
  const points: Vector[] = [];
  for (let j = 0; j < 9; j++) {
    const q = -length / 2 + (length * j) / 8;
    points.push([
      x + u.x * q,
      0.88 - 0.2 * Math.sin((Math.PI * j) / 8),
      z + u.z * q + 0.045,
    ]);
  }
  curve(p, points, 0.045, pink);
  box(p, [x, 0.65, z], [0.22, 0.25, 0.22], gold);
  screw(
    p,
    new Vector3(x, 0.65, z).addScaledVector(normal, 0.125).toArray(),
    normal.toArray(),
  );
}

function bench(name: string, x: number, z: number, angle: number) {
  const p = owner(`${name}-seat`, [x, 0.48, z]),
    back = owner(`${name}-back`, [x, 0.9, z]);
  const point = (u: number, y: number, v: number): Vector => [
    x + Math.cos(angle) * u + Math.sin(angle) * v,
    y,
    z - Math.sin(angle) * u + Math.cos(angle) * v,
  ];
  for (const u of [-0.61, 0.61]) {
    box(p, point(u, 0.15, 0), [0.3, 0.1, 0.52], iron, [0, angle, 0]);
    for (const v of [-0.17, 0.17])
      beam(p, point(u, 0.18, v), point(u, 0.55, v), 0.035, iron);
  }
  for (const v of [-0.17, 0, 0.17])
    box(p, point(0, 0.56, v), [1.62, 0.08, 0.145], wood, [0, angle, 0]);
  screw(p, point(0.3, 0.615, 0));
  for (const u of [-0.65, 0.65])
    beam(back, point(u, 0.54, -0.22), point(u, 1.18, -0.22), 0.035, iron);
  for (const y of [0.85, 1.1])
    box(back, point(0, y, -0.22), [1.62, 0.17, 0.07], wood, [0, angle, 0]);
  const n: Vector = [Math.sin(angle), 0, Math.cos(angle)];
  screw(back, point(-0.55, 1.1, -0.17), n);
}
bench("bench-left", -5.07, 0.55, Math.PI / 2);
bench("bench-front", 2.0, 3.95, 0);
for (const [i, x, z] of [
  [0, -5.3, 2.65],
  [1, -0.15, 2.2],
  [2, 5.15, 3.7],
] as const) {
  const p = owner(`streetlamp-${i}`, [x, 1.45, z]);
  tube(p, [x, 0.22, z], 0.16, 0.3, iron);
  tube(p, [x, 1.2, z], 0.047, 1.9, iron);
  box(p, [x, 2.3, z], [0.31, 0.45, 0.31], "#fff3a0");
  for (const xx of [x - 0.19, x + 0.19])
    for (const zz of [z - 0.19, z + 0.19])
      beam(p, [xx, 2.02, zz], [xx, 2.59, zz], 0.025, iron);
  for (const y of [2.02, 2.59]) box(p, [x, y, z], [0.46, 0.07, 0.46], iron);
  shape(p, "cone", [x, 2.73, z], [0.35, 0.26, 0.35], iron);
  ball(p, [x, 2.9, z], [0.07, 0.07, 0.07], gold);
  plate(p, [x, 0.49, z + 0.14], iron);
  screw(p, [x, 0.49, z + 0.195], [0, 0, 1]);
}
for (const [i, x, z] of [
  [0, -2.2, 5.2],
  [1, 2.7, 5.2],
  [2, -5.2, -4.9],
  [3, 4.8, -4.8],
] as const) {
  const p = owner(`flowerbed-${i}`, [x, 0.35, z]);
  box(p, [x, 0.13, z], [1.05, 0.1, 0.9], green);
  box(p, [x, 0.31, z], [0.79, 0.35, 0.66], wood);
  box(p, [x, 0.51, z], [0.87, 0.08, 0.73], gold);
  for (let j = 0; j < 9; j++) {
    const xx = x + Math.sin(j * 7) * 0.27,
      zz = z + Math.cos(j * 11) * 0.22,
      y = 0.6 + (j % 3) * 0.04;
    for (let k = 0; k < 5; k++) {
      const a = (k * Math.PI * 2) / 5;
      ball(
        p,
        [xx + 0.055 * Math.cos(a), y, zz + 0.055 * Math.sin(a)],
        [0.053, 0.035, 0.05],
        j % 2 ? pink : yellow,
      );
    }
    ball(p, [xx, y + 0.025, zz], [0.03, 0.03, 0.03], cream);
  }
  screw(p, [x, 0.31, z + 0.35], [0, 0, 1]);
}
for (const [i, x, z] of [
  [0, -5.12, -1.9],
  [1, -0.2, -4.9],
  [2, 5.1, -3.55],
] as const) {
  const p = owner(`fair-tree-${i}`, [x, 1.1, z]);
  tube(p, [x, 0.42, z], 0.11, 0.62, wood);
  for (const [y, r, h] of [
    [0.75, 0.48, 0.85],
    [1.2, 0.4, 0.82],
    [1.65, 0.31, 0.73],
    [2.02, 0.18, 0.56],
  ])
    shape(p, "cone", [x, y, z], [r, h, r], green);
  curve(
    p,
    Array.from({ length: 24 }, (_, j) => {
      const a = (j * Math.PI) / 4,
        r = 0.46 - j * 0.012;
      return [
        x + r * Math.cos(a),
        0.52 + j * 0.064,
        z + r * Math.sin(a),
      ] as Vector;
    }),
    0.012,
    gold,
  );
  for (let j = 0; j < 12; j++) {
    const a = j * Math.PI * 0.75,
      r = 0.43 - j * 0.025;
    lampBulb(
      p,
      [x + r * Math.cos(a), 0.57 + j * 0.115, z + r * Math.sin(a)],
      0.035,
    );
  }
  plate(p, [x, 0.92, z + 0.39], gold);
  screw(p, [x, 0.92, z + 0.445], [0, 0, 1]);
}
const wayfinding = owner("wayfinding", [0.55, 0.88, 2.7]);
tube(wayfinding, [0.55, 0.88, 2.7], 0.055, 1.58, wood);
for (const [i, y, color] of [
  [0, 1.7, purple],
  [1, 1.4, gold],
  [2, 1.1, blue],
  [3, 0.8, pink],
] as const) {
  const direction = i % 2 ? 1 : -1;
  box(wayfinding, [0.55, y, 2.7], [0.87, 0.22, 0.08], color);
  const arrow = new Shape();
  arrow.moveTo(0, -0.15);
  arrow.lineTo(direction * 0.2, 0);
  arrow.lineTo(0, 0.15);
  arrow.closePath();
  pieces.push({
    part: wayfinding,
    kind: "box",
    position: [0.55 + direction * 0.43, y, 2.67],
    size: [1, 1, 1],
    color,
    geometry: new ExtrudeGeometry(arrow, { depth: 0.08, bevelEnabled: false }),
  });
  star(wayfinding, [0.55, y, 2.76], 0.18, cream);
}
plate(wayfinding, [0.55, 0.43, 2.77]);
screw(wayfinding, [0.55, 0.43, 2.825], [0, 0, 1]);
const bin = owner("pink-bin", [3.25, 0.48, 4.7]);
tube(bin, pivots[bin], 0.28, 0.72, pink);
for (let j = 0; j < 10; j++) {
  const a = (j * Math.PI) / 5;
  box(
    bin,
    [3.25 + 0.28 * Math.cos(a), 0.48, 4.7 + 0.28 * Math.sin(a)],
    [0.06, 0.66, 0.035],
    cream,
    [0, Math.PI / 2 - a, 0],
  );
}
shape(bin, "ring", [3.25, 0.85, 4.7], [0.27, 0.27, 0.27], cream);
tube(bin, [3.25, 0.82, 4.7], 0.22, 0.025, iron);
screw(bin, [3.25, 0.48, 5.01], [0, 0, 1]);

// Flagpoles own their adjacent string of bulbs and triangular bunting.
for (const [i, x] of [-5.45, -1.85, 2.65].entries()) {
  const z = -5.12,
    p = owner(`bunting-${i}`, [x, 2.05, z]);
  tube(p, [x, 2.08, z], 0.035, 4.1, wood);
  tube(p, [x, 0.22, z], 0.14, 0.28, iron);
  ball(p, [x, 4.19, z], [0.085, 0.085, 0.085], gold);
  box(
    p,
    [x + 0.26, 3.97, z],
    [0.52, 0.24, 0.035],
    [pink, purple, gold][i],
    [0, 0, -0.1],
  );
  plate(p, [x, 0.46, z - 0.13], gold);
  screw(p, [x, 0.46, z - 0.185], [0, 0, -1]);
  if (i < 2) {
    const end = [-1.85, 2.65][i],
      length = end - x,
      points = Array.from(
        { length: 19 },
        (_, j) =>
          [
            x + (length * j) / 18,
            4.08 - 0.47 * Math.sin((Math.PI * j) / 18),
            z,
          ] as Vector,
      );
    curve(p, points, 0.018, iron);
    for (let j = 1; j < 12; j++) {
      const q = j / 12,
        xx = x + length * q,
        yy = 4.08 - 0.47 * Math.sin(Math.PI * q);
      if (j % 2 === 0) lampBulb(p, [xx, yy - 0.07, z], 0.055);
      else {
        const pennant = new Shape();
        pennant.moveTo(-0.13, 0);
        pennant.lineTo(0.13, 0);
        pennant.lineTo(0, -0.28);
        pennant.closePath();
        pieces.push({
          part: p,
          kind: "box",
          position: [xx, yy, z],
          size: [1, 1, 1],
          color: [pink, blue, gold, purple][j % 4],
          geometry: new ExtrudeGeometry(pennant, {
            depth: 0.015,
            bevelEnabled: false,
          }),
        });
      }
    }
  }
}

const pavingHeads: Vector[][] = [
  [
    [-4.75, 0.13, -4.05],
    [-3.42, 0.13, -4.05],
  ],
  [
    [-0.2, 0.13, -4.9],
    [-0.2, 0.13, -3.27],
  ],
  [
    [3.1, 0.13, -3.27],
    [4.8, 0.13, -4.8],
  ],
  [
    [-5.07, 0.13, -0.06],
    [-2.7, 0.13, 1.3],
  ],
  [
    [0.65, -0.02, -1.955],
    [-1.4, 0.13, 1.3],
  ],
  [
    [4.65, 0.13, -0.7],
    [3.75, 0.13, 1.4],
  ],
  [
    [-4.65, 0.13, 4.25],
    [-2.2, 0.13, 5.2],
  ],
  [
    [-1.15, 0.13, 4.85],
    [1.55, 0.13, 4.85],
  ],
  [[3.25, 0.13, 4.7]],
];
for (const [i, tile] of terrain.entries())
  for (const [j, p] of pavingHeads[i].entries())
    screw(tile, p, i === 4 && j === 0 ? [0, 0, -1] : [0, 1, 0]);

// Conservative viewing order for the generated proof. Gameplay always uses
// real head clearance and camera rays, never these planning-only constraints.
for (const mount of CARNIVAL_MOUNTS) {
  const id = mount.attachedTo;
  if (
    id.startsWith("fair-game-back-") ||
    id.startsWith("fair-game-side-") ||
    id.startsWith("fair-game-front-")
  )
    mount.solutionAfter = [
      ...stallRoofs,
      ...stallCounters,
      ...pieces
        .filter((p) => p.part.startsWith("fair-prize-rack-"))
        .map((p) => p.part),
    ].filter((p, i, a) => a.indexOf(p) === i);

  if (id.startsWith("fair-wheel-foot-")) mount.solutionAfter = wheelLegs;
  if (id.startsWith("fair-carousel-pole-") || id === "fair-carousel-drum")
    mount.solutionAfter = carouselRoof;
  if (
    id.startsWith("fair-ticket-side-") ||
    id === "fair-ticket-back" ||
    id === "fair-ticket-front"
  )
    mount.solutionAfter = [...ticketRoofs, ticketCounter];
  if (id === "fair-ticket-floor")
    mount.solutionAfter = [...ticketWalls, ticketCounter];
}
// Custom rotated meshes are baked once so rendering, picking and collision
// generation all share the same shape. Primitive rotations stay on the Piece.
const matrix = new Matrix4(),
  rotation = new Euler();
for (const piece of pieces)
  if (piece.rotation && piece.geometry) {
    matrix
      .makeRotationFromEuler(rotation.set(...piece.rotation))
      .scale(new Vector3(...piece.size));
    piece.geometry = piece.geometry.clone().applyMatrix4(matrix);
    piece.size = [1, 1, 1];
    piece.rotation = undefined;
  }
const CARNIVAL_MODEL = {
  pieces,
  pivots,
  parts: Object.keys(pivots) as CarnivalPartId[],
};

return { model: CARNIVAL_MODEL, mounts: CARNIVAL_MOUNTS, CARNIVAL_WHEEL_REFERENCE_RADIUS, CARNIVAL_WHEEL_RADIUS };
}
