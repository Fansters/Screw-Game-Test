import {
  BoxGeometry,
  CatmullRomCurve3,
  CylinderGeometry,
  Euler,
  ExtrudeGeometry,
  Float32BufferAttribute,
  LatheGeometry,
  Matrix4,
  Quaternion,
  Shape,
  SphereGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
} from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { ConvexGeometry } from "three/addons/geometries/ConvexGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { GLYPHS } from "../components/lettering.ts";
import type { ZooPartId, Screw } from "../game/types.ts";
import type { Piece, Vector } from "./houseModel.ts";

type Mount = Pick<Screw, "position" | "normal" | "solutionAfter"> & {
  attachedTo: ZooPartId;
};
const pieces: Piece[] = [],
  pivots: Record<ZooPartId, Vector> = {};
export const ZOO_MOUNTS: Mount[] = [];
export const ZOO_ANIMAL_BASE_SEGMENTS = 20,
  ZOO_ANIMAL_SEGMENTS = 24,
  ZOO_ANIMAL_RINGS = 12;
export const ZOO_ANIMAL_GEOMETRY = new SphereGeometry(
  1,
  ZOO_ANIMAL_SEGMENTS,
  ZOO_ANIMAL_RINGS,
);
// White vertex colors preserve smooth normals through the existing batching
// path. Curved animal surfaces have exactly 20% more faces than a 20x12 sphere.
ZOO_ANIMAL_GEOMETRY.setAttribute(
  "color",
  new Float32BufferAttribute(
    new Float32Array(
      ZOO_ANIMAL_GEOMETRY.getAttribute("position").count * 3,
    ).fill(1),
    3,
  ),
);
const soft = new RoundedBoxGeometry(1, 1, 1, 2, 0.09),
  stone = new RoundedBoxGeometry(1, 1, 1, 1, 0.13),
  cylinder = new CylinderGeometry(1, 1, 1, 24),
  leafGeometry = new SphereGeometry(1, 12, 6);
const cream = "#f2d9ac",
  pale = "#ffeccb",
  wood = "#b88653",
  woodLight = "#d9ad72",
  woodDark = "#8d603d",
  red = "#b95146",
  roofRed = "#cb6454",
  green = "#6fa94d",
  darkGreen = "#39845e",
  lime = "#9ec958",
  rockColor = "#b8aea2",
  water = "#55c8ce",
  iron = "#466168",
  gold = "#efc450",
  lionGold = "#eab85d",
  maneColor = "#ac6435",
  giraffeGold = "#edb955",
  spotColor = "#a8682f",
  pink = "#ed8fad";
function owner(name: string, pivot: Vector): ZooPartId {
  const id: ZooPartId = `zoo-${name}`;
  pivots[id] = pivot;
  return id;
}
function box(
  part: ZooPartId,
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
  part: ZooPartId,
  kind: Piece["kind"],
  position: Vector,
  size: Vector,
  color: string,
  rotation?: Vector,
) {
  pieces.push({ part, kind, position, size, color, rotation });
}
function ball(
  part: ZooPartId,
  position: Vector,
  size: Vector,
  color: string,
  rotation?: Vector,
) {
  pieces.push({
    part,
    kind: "ico-detail",
    geometry: ZOO_ANIMAL_GEOMETRY,
    position,
    size,
    color,
    rotation,
  });
}
function leaf(
  part: ZooPartId,
  p: Vector,
  s: Vector,
  c = green,
  rotation?: Vector,
) {
  pieces.push({
    part,
    kind: "ico",
    geometry: leafGeometry,
    position: p,
    size: s,
    color: c,
    rotation,
  });
}
function tube(
  part: ZooPartId,
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
function beam(part: ZooPartId, a: Vector, b: Vector, r: number, c: string) {
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
function curve(part: ZooPartId, p: Vector[], r: number, c: string) {
  pieces.push({
    part,
    kind: "box",
    position: [0, 0, 0],
    size: [1, 1, 1],
    color: c,
    geometry: new TubeGeometry(
      new CatmullRomCurve3(p.map((v) => new Vector3(...v))),
      24,
      r,
      8,
      false,
    ),
  });
}
function screw(
  part: ZooPartId,
  p: Vector,
  n: Vector = [0, 1, 0],
  after?: ZooPartId[],
) {
  ZOO_MOUNTS.push({
    attachedTo: part,
    position: p,
    normal: new Vector3(...n).normalize().toArray(),
    solutionAfter: after,
  });
}
function plate(part: ZooPartId, p: Vector, c = woodLight) {
  box(part, p, [0.24, 0.24, 0.07], c);
}
function text(
  part: ZooPartId,
  word: string,
  [x, y, z]: Vector,
  height: number,
  c = woodDark,
) {
  const u = height / 7,
    w = (word.length * 6 - 1) * u,
    blocks: BoxGeometry[] = [];
  for (let i = 0; i < word.length; i++)
    for (let row = 0; row < 7; row++)
      for (let col = 0; col < 5; col++)
        if (GLYPHS[word[i]]?.[row]?.[col] === "1")
          blocks.push(
            new BoxGeometry(u * 1.015, u * 1.015, 0.025).translate(
              x - w / 2 + (i * 6 + col + 0.5) * u,
              y + (3 - row) * u,
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
      color: c,
      geometry,
    });
}
function paw(part: ZooPartId, [x, y, z]: Vector, s: number, c = gold) {
  ball(part, [x, y, z], [s * 0.22, s * 0.18, s * 0.045], c);
  for (const [dx, dy] of [
    [-0.23, 0.2],
    [-0.08, 0.29],
    [0.09, 0.29],
    [0.24, 0.19],
  ])
    ball(part, [x + dx * s, y + dy * s, z], [s * 0.075, s * 0.1, s * 0.04], c);
}
function eyes(part: ZooPartId, x: number, y: number, z: number, s: number) {
  for (const dx of [-0.105, 0.105]) {
    ball(part, [x + dx * s, y, z], [0.037 * s, 0.045 * s, 0.025 * s], woodDark);
    ball(
      part,
      [x + (dx - 0.008) * s, y + 0.015 * s, z + 0.022 * s],
      [0.011 * s, 0.012 * s, 0.007 * s],
      pale,
    );
  }
}

// Nine separately removable foundation/path pairs. The raised habitats, river,
// kiosk and planting beds hide individual heads rather than locking whole tiles.
const pathTiles: ZooPartId[] = [],
  habitatTurfs: { part: ZooPartId; x: number; kind: string }[] = [];
for (let r = 0; r < 3; r++)
  for (let c = 0; c < 3; c++) {
    const x = (c - 1) * 3.8,
      z = (r - 1) * 3.8,
      base = owner(`foundation-${r}-${c}`, [x, -0.47, z]),
      path = owner(`path-${r}-${c}`, [x, -0.025, z]);
    pathTiles.push(path);
    box(base, [x, -0.47, z], [3.78, 0.76, 3.78], cream);
    box(path, [x, -0.025, z], [3.78, 0.16, 3.78], "#d4bd9c");
    for (let j = 0; j < 6; j++)
      for (let k = 0; k < 6; k++)
        pieces.push({
          part: path,
          kind: "box",
          geometry: stone,
          position: [
            x - 1.55 + k * 0.62 + (j % 2 ? 0.06 : -0.04),
            0.07,
            z - 1.55 + j * 0.62,
          ],
          size: [0.55, 0.065, 0.53],
          rotation: [0, Math.sin(j * 7 + k * 3) * 0.06, 0],
          color: ["#edd9bd", "#e3ccb1", "#f4e1c5"][(j + k) % 3],
        });
    screw(base, [x, -0.075, z]);
  }
for (const [kind, cx] of [
  ["lion", -3.2],
  ["giraffe", 3.2],
] as const) {
  for (let col = 0; col < 3; col++) {
    const x = cx + (col - 1) * 1.43,
      turf = owner(`${kind}-turf-${col}`, [x, 1.0, -2.6]);
    habitatTurfs.push({ part: turf, x, kind });
    box(turf, [x, 1.0, -2.6], [1.41, 0.2, 3.56], lime);
    for (let row = 0; row < 2; row++) {
      const z = -2.6 + (row ? 0.9 : -0.9),
        base = owner(`${kind}-terrace-${col}-${row}`, [x, 0.46, z]);
      box(base, pivots[base], [1.41, 0.89, 1.77], cream);
      for (const dx of [-0.46, 0, 0.46])
        box(base, [x + dx, 0.46, z + 0.9], [0.015, 0.72, 0.012], "#d4b894");
      screw(base, [x, 0.92, z]);
    }
  }
}

// Lions are sculpted toy assemblies: mane -> head -> body -> forelegs. The cub
// uses a single paired-paw piece, avoiding tiny neighboring fasteners.
const animalParts: ZooPartId[] = [];
function lion(name: string, [x, floor, z]: Vector, s: number, adult: boolean) {
  const p = (a: number, b: number, c: number): Vector => [
      x + a * s,
      floor + b * s,
      z + c * s,
    ],
    sz = (a: number, b: number, c: number): Vector => [a * s, b * s, c * s],
    body = owner(`${name}-body`, p(0, 0.5, -0.12)),
    head = owner(`${name}-head`, p(0, 1.16, 0.45));
  animalParts.push(body, head);
  ball(body, p(0, 0.48, -0.14), sz(0.53, 0.45, 0.42), lionGold);
  ball(body, p(0, 0.55, 0.16), sz(0.33, 0.48, 0.3), lionGold);
  ball(body, p(0, 0.88, 0.4), sz(0.21, 0.23, 0.2), lionGold);
  for (const dx of [-0.38, 0.38])
    ball(body, p(dx, 0.18, -0.22), sz(0.25, 0.27, 0.28), lionGold);
  ball(head, p(0, 1.16, 0.45), sz(0.3, 0.29, 0.24), lionGold);
  for (const dx of [-0.23, 0.23]) {
    ball(head, p(dx, 1.39, 0.44), sz(0.105, 0.105, 0.065), lionGold);
    ball(head, p(dx, 1.4, 0.49), sz(0.065, 0.065, 0.025), "#d9925d");
  }
  for (const dx of [-0.11, 0.11])
    ball(head, p(dx, 1.06, 0.64), sz(0.14, 0.105, 0.09), pale);
  ball(head, p(0, 1.13, 0.735), sz(0.065, 0.045, 0.03), woodDark);
  eyes(head, x, floor + 1.22 * s, z + 0.665 * s, s);
  curve(
    head,
    [p(0, 1.08, 0.73), p(0, 1.01, 0.73), p(-0.1, 0.98, 0.72)],
    0.009 * s,
    woodDark,
  );
  curve(head, [p(0, 1.01, 0.73), p(0.1, 0.98, 0.72)], 0.009 * s, woodDark);
  for (const side of [-1, 1])
    for (let j = 0; j < 3; j++)
      beam(
        head,
        p(side * 0.12, 1.06 - j * 0.035, 0.715),
        p(side * (0.26 + j * 0.015), 1.08 - j * 0.06, 0.73),
        0.006 * s,
        woodDark,
      );
  if (adult) {
    const mane = owner(`${name}-mane`, p(0, 1.1, 0.34));
    animalParts.push(mane);
    tube(mane, p(0, 1.1, 0.34), 0.49 * s, 0.21 * s, maneColor, [
      Math.PI / 2,
      0,
      0,
    ]);
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      ball(
        mane,
        p(0.43 * Math.cos(a), 1.1 + 0.43 * Math.sin(a), 0.34),
        sz(0.14, 0.15, 0.12),
        i % 3 ? maneColor : "#bc7541",
        [0, 0, a],
      );
    }
    screw(mane, p(-0.58, 1.1, 0.34), [-1, 0, 0]);
    screw(head, p(0, 1.475, 0.43));
    const tail = owner(`${name}-tail`, p(-0.28, 0.4, -0.54));
    animalParts.push(tail);
    curve(
      tail,
      [
        p(-0.28, 0.4, -0.5),
        p(-0.7, 0.2, -0.55),
        p(-0.77, 0.45, -0.7),
        p(-0.55, 0.51, -0.74),
      ],
      0.035 * s,
      lionGold,
    );
    ball(tail, p(-0.55, 0.51, -0.74), sz(0.09, 0.1, 0.08), maneColor);
    ball(tail, p(-0.28, 0.4, -0.5), sz(0.12, 0.12, 0.12), lionGold);
    screw(tail, p(-0.415, 0.4, -0.5), [-1, 0, 0]);
    for (const side of [-1, 1]) {
      const leg = owner(`${name}-paw-${side}`, p(side * 0.21, 0.25, 0.32));
      animalParts.push(leg);
      ball(leg, p(side * 0.21, 0.12, 0.32), sz(0.12, 0.37, 0.14), lionGold);
      ball(leg, p(side * 0.21, -0.2, 0.49), sz(0.16, 0.1, 0.24), lionGold);
      for (const dx of [-0.07, 0, 0.07])
        beam(
          leg,
          p(side * 0.21 + dx, -0.17, 0.67),
          p(side * 0.21 + dx, -0.24, 0.68),
          0.007 * s,
          woodDark,
        );
      screw(leg, p(side * 0.21, 0.5, 0.32));
    }
  } else {
    screw(head, p(0, 1.475, 0.43));
    const paws = owner(`${name}-paws`, p(0, 0.12, 0.32));
    animalParts.push(paws);
    box(paws, p(0, 0.27, 0.32), sz(0.44, 0.08, 0.16), lionGold);
    for (const side of [-1, 1]) {
      ball(paws, p(side * 0.21, 0.12, 0.32), sz(0.12, 0.37, 0.14), lionGold);
      ball(paws, p(side * 0.21, -0.2, 0.49), sz(0.16, 0.1, 0.24), lionGold);
    }
    screw(paws, p(0, 0.325, 0.32));
    curve(
      body,
      [p(-0.28, 0.4, -0.5), p(-0.7, 0.2, -0.55), p(-0.77, 0.45, -0.7)],
      0.035 * s,
      lionGold,
    );
    ball(body, p(-0.77, 0.45, -0.7), sz(0.09, 0.1, 0.08), maneColor);
  }
  screw(body, p(0, 1.085, 0.4));
}
lion("lion", [-3.65, 1.4, -3.15], 1, true);
lion("lion-cub", [-1.98, 1.292, -1.87], 0.64, false);

// Giraffes: spotted shoulders, separate long necks and expressive heads, knees,
// hooves, ossicones and tufts. Calf legs are paired to keep their fixings apart.
function giraffe(
  name: string,
  [x, floor, z]: Vector,
  s: number,
  adult: boolean,
) {
  const p = (a: number, b: number, c: number): Vector => [
      x + a * s,
      floor + b * s,
      z + c * s,
    ],
    sz = (a: number, b: number, c: number): Vector => [a * s, b * s, c * s],
    body = owner(`${name}-body`, p(0, 1.35, -0.12)),
    neck = owner(`${name}-neck`, p(-0.35, 2.5, 0.06)),
    head = owner(`${name}-head`, p(-0.55, 3.46, 0.08));
  animalParts.push(body, neck, head);
  ball(body, p(0, 1.35, -0.12), sz(0.55, 0.61, 0.38), giraffeGold);
  ball(body, p(-0.2, 1.75, 0.04), sz(0.29, 0.3, 0.27), giraffeGold);
  ball(body, p(0, 1.25, 0), sz(0.52, 0.4, 0.48), giraffeGold);
  for (const side of [-1, 1])
    for (let j = 0; j < 12; j++) {
      const xx = -0.36 + (j % 4) * 0.23,
        yy = 1.05 + Math.floor(j / 4) * 0.27,
        original =
          Math.sqrt(
            Math.max(0, 1 - (xx / 0.55) ** 2 - ((yy - 1.35) / 0.61) ** 2),
          ) * 0.38,
        belly =
          Math.sqrt(
            Math.max(0, 1 - (xx / 0.52) ** 2 - ((yy - 1.25) / 0.4) ** 2),
          ) * 0.48,
        zz =
          (side > 0
            ? Math.max(-0.12 + original, belly)
            : Math.min(-0.12 - original, -belly)) +
          side * 0.012;
      ball(body, p(xx, yy, zz), sz(0.09, 0.115, 0.018), spotColor, [
        0,
        0,
        ((j % 3) - 1) * 0.28,
      ]);
    }
  // A continuous tapered surface blends the shoulder into the long neck.
  const neckDirection = new Vector3(-0.26, 1.43, 0.03),
    neckLength = neckDirection.length();
  const profile = [
    new Vector2(0, 0),
    ...Array.from(
      { length: 7 },
      (_, j) => new Vector2(0.3 - (0.15 * j) / 6, (neckLength * j) / 6),
    ),
    new Vector2(0, neckLength),
  ];
  const neckGeometry = new LatheGeometry(profile, ZOO_ANIMAL_SEGMENTS);
  neckGeometry.setAttribute(
    "color",
    new Float32BufferAttribute(
      new Float32Array(neckGeometry.getAttribute("position").count * 3).fill(1),
      3,
    ),
  );
  pieces.push({
    part: neck,
    kind: "cylinder",
    position: p(-0.22, 1.82, 0.05),
    size: [s, s, s],
    rotation: new Euler()
      .setFromQuaternion(
        new Quaternion().setFromUnitVectors(
          new Vector3(0, 1, 0),
          neckDirection.normalize(),
        ),
      )
      .toArray()
      .slice(0, 3) as Vector,
    geometry: neckGeometry,
    color: giraffeGold,
  });
  for (let i = 0; i < 7; i++) {
    const t = (i + 0.5) / 7,
      xx = -0.22 - 0.26 * t,
      yy = 1.82 + 1.43 * t,
      radius = 0.3 - 0.15 * t,
      spotRadius = Math.sqrt(radius * radius - 0.055 * 0.055);
    ball(
      neck,
      p(
        xx + (i % 2 ? 0.055 : -0.055),
        yy,
        0.05 + 0.03 * t + spotRadius + 0.012,
      ),
      sz(0.065, 0.085, 0.018),
      spotColor,
    );
    ball(
      neck,
      p(xx, yy, 0.05 + 0.03 * t - radius - 0.012),
      sz(0.065, 0.08, 0.018),
      spotColor,
    );
    beam(
      neck,
      p(xx + radius, yy - 0.07, 0.05),
      p(xx + radius + 0.05, yy + 0.07, 0.05),
      0.025 * s,
      woodDark,
    );
  }
  ball(head, p(-0.55, 3.46, 0.08), sz(0.27, 0.25, 0.23), giraffeGold);
  ball(head, p(-0.88, 3.4, 0.08), sz(0.3, 0.17, 0.18), giraffeGold);
  ball(head, p(-1.07, 3.41, 0.08), sz(0.11, 0.13, 0.16), "#e8ad55");
  for (const zz of [-0.17, 0.28]) {
    ball(head, p(-0.49, 3.66, zz), sz(0.18, 0.055, 0.095), giraffeGold, [
      0.15,
      0,
      zz < 0 ? -0.2 : 0.2,
    ]);
    beam(
      head,
      p(-0.57, 3.62, zz * 0.45),
      p(-0.59, 3.91, zz * 0.45),
      0.025 * s,
      giraffeGold,
    );
    ball(head, p(-0.59, 3.92, zz * 0.45), sz(0.055, 0.055, 0.055), woodDark);
  }
  for (const zz of [-0.135, 0.295]) {
    ball(head, p(-0.63, 3.5, zz), sz(0.047, 0.058, 0.025), pale);
    ball(
      head,
      p(-0.65, 3.5, zz + (zz > 0 ? 0.015 : -0.015)),
      sz(0.025, 0.035, 0.015),
      woodDark,
    );
  }
  for (const zz of [-0.02, 0.18])
    ball(head, p(-1.165, 3.43, zz), sz(0.015, 0.025, 0.02), woodDark);
  curve(
    head,
    [p(-1.09, 3.32, 0.23), p(-0.95, 3.29, 0.24), p(-0.84, 3.31, 0.24)],
    0.008 * s,
    woodDark,
  );
  screw(head, p(-0.27, 3.42, 0.08), [1, 0, 0]);
  screw(neck, p(-0.48, 3.275, 0.08));
  screw(body, p(-0.22, 2.065, 0.05));
  const limb = (part: ZooPartId, xx: number, zz: number) => {
    beam(part, p(xx, 0.18, zz), p(xx, 1.3, zz), 0.07 * s, giraffeGold);
    ball(part, p(xx, 0.64, zz), sz(0.095, 0.1, 0.09), giraffeGold);
    box(part, p(xx, 0.1, zz + 0.025), sz(0.18, 0.16, 0.22), woodDark);
    for (const y of [0.38, 0.88])
      ball(
        part,
        p(xx + 0.055, y, zz + 0.035),
        sz(0.025, 0.07, 0.06),
        spotColor,
      );
  };
  if (adult) {
    for (const xx of [-0.3, 0.3])
      for (const zz of [-0.22, 0.22]) {
        const leg = owner(`${name}-leg-${xx}-${zz}`, p(xx, 0.75, zz));
        animalParts.push(leg);
        limb(leg, xx, zz);
        screw(leg, p(xx, 1.32, zz));
      }
    const tail = owner(`${name}-tail`, p(0.25, 1.4, -0.5));
    animalParts.push(tail);
    curve(
      tail,
      [p(0.25, 1.5, -0.45), p(0.46, 1.22, -0.61), p(0.47, 0.7, -0.66)],
      0.025 * s,
      giraffeGold,
    );
    ball(tail, p(0.47, 0.65, -0.66), sz(0.08, 0.14, 0.07), woodDark);
    ball(tail, p(0.25, 1.5, -0.45), sz(0.12, 0.12, 0.12), giraffeGold);
    screw(tail, p(0.25, 1.5, -0.585), [0, 0, -1]);
  } else
    for (const side of [-1, 1]) {
      const legs = owner(`${name}-legs-${side}`, p(0, 0.75, side * 0.22));
      animalParts.push(legs);
      for (const xx of [-0.3, 0.3]) limb(legs, xx, side * 0.22);
      box(legs, p(0, 1.15, side * 0.22), sz(0.72, 0.2, 0.18), giraffeGold);
      screw(legs, p(0, side > 0 ? 1.27 : 1.02, side * 0.22), [
        0,
        side > 0 ? 1 : -1,
        0,
      ]);
    }
}
giraffe("giraffe", [3.2, 1.08, -2.0], 1, true);
giraffe("giraffe-calf", [1.85, 1.089, -1.6], 0.56, false);

function flamingo(name: string, [x, floor, z]: Vector, s: number) {
  const p = (a: number, b: number, c: number): Vector => [
      x + a * s,
      floor + b * s,
      z + c * s,
    ],
    sz = (a: number, b: number, c: number): Vector => [a * s, b * s, c * s],
    body = owner(`${name}-body`, p(0, 0.85, 0)),
    wing = owner(`${name}-wing`, p(0, 0.85, 0.18)),
    neck = owner(`${name}-neck`, p(0.2, 1.35, 0)),
    legs = owner(`${name}-legs`, p(0, 0.4, 0));
  animalParts.push(body, wing, neck, legs);
  ball(body, p(0, 0.85, 0), sz(0.33, 0.27, 0.2), pink);
  ball(body, p(-0.27, 0.88, 0), sz(0.16, 0.14, 0.15), pink);
  ball(wing, p(0, 0.85, 0.18), sz(0.27, 0.18, 0.06), "#e47e9e");
  for (let i = 0; i < 4; i++)
    curve(
      wing,
      [
        p(-0.19 + i * 0.06, 0.93, 0.23),
        p(-0.1 + i * 0.06, 0.81, 0.245),
        p(0.04 + i * 0.06, 0.77, 0.23),
      ],
      0.01 * s,
      "#f4b0c3",
    );
  screw(wing, p(0, 0.85, 0.26), [0, 0, 1]);
  screw(body, p(0, 0.85, 0.155), [0, 0, 1]);
  curve(
    neck,
    [
      p(0.2, 1.04, 0),
      p(0.33, 1.35, 0),
      p(0.2, 1.65, 0),
      p(-0.05, 1.68, 0),
      p(-0.18, 1.53, 0),
    ],
    0.065 * s,
    pink,
  );
  ball(neck, p(0.2, 1.04, 0), sz(0.12, 0.12, 0.11), pink);
  ball(neck, p(-0.13, 1.63, 0), sz(0.13, 0.14, 0.115), pink);
  ball(neck, p(-0.23, 1.51, 0), sz(0.09, 0.13, 0.07), pale);
  ball(neck, p(-0.27, 1.43, 0), sz(0.07, 0.085, 0.055), woodDark);
  ball(neck, p(-0.15, 1.66, 0.107), sz(0.029, 0.035, 0.014), pale);
  ball(neck, p(-0.16, 1.66, 0.119), sz(0.015, 0.02, 0.008), woodDark);
  screw(neck, p(0.335, 1.04, 0), [1, 0, 0]);
  box(legs, p(0, 0.75, 0), sz(0.38, 0.11, 0.13), pink);
  beam(legs, p(0.11, 0.73, 0), p(0.11, 0.08, 0.04), 0.018 * s, "#d67582");
  beam(legs, p(-0.1, 0.73, 0), p(-0.2, 0.43, 0.05), 0.018 * s, "#d67582");
  beam(legs, p(-0.2, 0.43, 0.05), p(0.02, 0.36, 0.12), 0.018 * s, "#d67582");
  for (const xx of [0.05, 0.11, 0.17])
    beam(legs, p(0.11, 0.08, 0.04), p(xx, 0.07, 0.18), 0.012 * s, "#d67582");
  screw(legs, p(0, 0.82, 0));
}
flamingo("flamingo-0", [2.35, 0.24, 1.15], 1);
flamingo("flamingo-1", [4.05, 0.233, 1.35], 1.1);
flamingo("flamingo-2", [3.35, 0.257, 2.35], 0.76);

function rock(
  name: string,
  [x, y, z]: Vector,
  [w, h, d]: Vector,
  seed: number,
  c = rockColor,
) {
  const part = owner(name, [x, y, z]),
    points: Vector3[] = [];
  for (const [height, r] of [
    [-0.5, 0.79],
    [0, 1],
    [0.5, 0.62],
  ])
    for (let j = 0; j < 8; j++) {
      const a = (j * Math.PI) / 4,
        radius = r * (0.96 + 0.04 * Math.sin(seed + j * 7));
      points.push(
        new Vector3(
          x + Math.cos(a) * w * 0.5 * radius,
          y + h * height,
          z + Math.sin(a) * d * 0.5 * radius,
        ),
      );
    }
  pieces.push({
    part,
    kind: "box",
    position: [0, 0, 0],
    size: [1, 1, 1],
    color: c,
    geometry: new ConvexGeometry(points),
  });
  if (seed % 2) screw(part, [x, y + h * 0.5 + 0.02, z]);
  else screw(part, [x + w * 0.52, y, z], [1, 0, 0]);
  return part;
}
function foliage(part: ZooPartId, [x, y, z]: Vector, r: number) {
  for (let j = 0; j < 7; j++) {
    const a = (j * Math.PI * 2) / 7;
    leaf(
      part,
      [
        x + Math.cos(a) * r * 0.55,
        y + 0.08 * (j % 3),
        z + Math.sin(a) * r * 0.45,
      ],
      [r * 0.53, r * 0.35, r * 0.45],
      j % 3 ? green : lime,
      [0, a, 0],
    );
  }
  for (let j = 0; j < 4; j++) {
    const a = (j * Math.PI) / 2;
    leaf(
      part,
      [x + r * 0.3 * Math.cos(a), y + r * 0.24, z + r * 0.3 * Math.sin(a)],
      [r * 0.4, r * 0.22, r * 0.3],
      lime,
      [0, -a, 0],
    );
  }
}
function plant(part: ZooPartId, [x, y, z]: Vector, s = 0.5) {
  for (let j = 0; j < 5; j++) {
    const a = j * 2.4;
    leaf(
      part,
      [x + Math.cos(a) * s * 0.18, y + s * 0.33, z + Math.sin(a) * s * 0.18],
      [s * 0.085, s * 0.45, s * 0.16],
      j % 2 ? green : lime,
      [Math.sin(a) * 0.45, 0, Math.cos(a) * 0.45],
    );
  }
}
function fence(
  name: string,
  x: number,
  z: number,
  length: number,
  y: number,
  angle = 0,
) {
  const part = owner(name, [x, y + 0.43, z]),
    p = (u: number, h: number, v: number): Vector => [
      x + u * Math.cos(angle) + v * Math.sin(angle),
      y + h,
      z - u * Math.sin(angle) + v * Math.cos(angle),
    ],
    count = Math.ceil(length / 0.7);
  for (let i = 0; i <= count; i++) {
    const u = -length / 2 + (length * i) / count;
    tube(part, p(u, 0.45, 0), 0.075, 0.88, wood);
    tube(part, p(u, 0.92, 0), 0.105, 0.07, woodLight);
  }
  for (const h of [0.27, 0.65])
    box(part, p(0, h, 0), [length, 0.1, 0.085], wood, [0, angle, 0]);
  box(part, p(0, 0.47, 0), [0.17, 0.88, 0.17], wood);
  box(part, p(0, 0.5, 0.095), [0.24, 0.24, 0.07], woodLight, [0, angle, 0]);
  screw(part, p(0, 0.5, 0.15), [Math.sin(angle), 0, Math.cos(angle)]);
  return part;
}
const habitatFences: ZooPartId[] = [];
for (const [kind, cx] of [
  ["lion", -3.2],
  ["giraffe", 3.2],
] as const) {
  for (const [j, x] of [cx - 1.08, cx + 1.08].entries())
    habitatFences.push(fence(`${kind}-fence-front-${j}`, x, -0.64, 2.12, 1.08));
  for (const side of [-1, 1])
    habitatFences.push(
      fence(
        `${kind}-fence-side-${side}`,
        cx + side * 2.16,
        -2.6,
        3.8,
        1.08,
        Math.PI / 2,
      ),
    );
  habitatFences.push(fence(`${kind}-fence-back`, cx, -4.52, 4.32, 1.08));
}

// The grotto is a real arched opening, not a solid box behind the lion.
const caveParts: ZooPartId[] = [];
for (let i = 0; i < 7; i++) {
  const a = (i * Math.PI) / 7,
    b = a + Math.PI / 7,
    t = (a + b) / 2,
    part = owner(`cave-arch-${i}`, [
      -3.65 + 1.42 * Math.cos(t),
      1.15 + 1.42 * Math.sin(t),
      -3.43,
    ]),
    points: Vector3[] = [];
  for (const z of [-3.8, -3.06])
    for (const r of [1.24, 1.6])
      for (const q of [a, b])
        points.push(
          new Vector3(-3.65 + r * Math.cos(q), 1.15 + r * Math.sin(q), z),
        );
  pieces.push({
    part,
    kind: "box",
    position: [0, 0, 0],
    size: [1, 1, 1],
    color: i % 2 ? rockColor : "#c4b9a8",
    geometry: new ConvexGeometry(points),
  });
  screw(
    part,
    [-3.65 + 1.42 * Math.cos(t), 1.15 + 1.42 * Math.sin(t), -3.035],
    [0, 0, 1],
  );
  caveParts.push(part);
}
for (const [i, x] of [-4.32, -3.0].entries()) {
  const p = owner(`cave-back-${i}`, [x, 1.88, -4.01]);
  box(p, pivots[p], [1.3, 1.5, 0.21], "#9c9488");
  screw(p, [x, 1.95, -3.89], [0, 0, 1]);
  caveParts.push(p);
}
caveParts.push(rock("cave-ledge", [-3.65, 1.21, -3.95], [2.2, 0.22, 0.62], 1));
rock("lion-front-rock", [-4.65, 1.34, -1.55], [0.78, 0.46, 0.75], 2);
rock("lion-left-back-rock", [-5.05, 1.72, -3.25], [0.7, 1.22, 0.86], 3);
rock("lion-back-rock", [-2.32, 1.47, -4.1], [0.82, 0.72, 0.72], 4);
for (const [i, x, z] of [
  [0, -4.8, -0.94],
  [1, -2.35, -3.98],
  [2, -1.43, -2.7],
] as const) {
  const p = owner(`lion-shrub-${i}`, [x, 1.25, z]);
  foliage(p, [x, 1.3, z], 0.43);
  plant(p, [x, 1.1, z], 0.4);
  box(p, [x, 1.22, z + 0.27], [0.24, 0.24, 0.07], green);
  screw(p, [x, 1.22, z + 0.325], [0, 0, 1]);
}

// Giraffe shelter: four posts, two cross beams and three separately fastened
// slatted roof sections. It sits behind the animals, away from their necks.
const shelterPosts: ZooPartId[] = [],
  shelterRoofs: ZooPartId[] = [];
for (const x of [2.85, 4.95])
  for (const z of [-4.4, -2.78]) {
    const p = owner(`shelter-post-${x}-${z}`, [x, 2.07, z]);
    shelterPosts.push(p);
    box(p, [x, 2.07, z], [0.16, 1.91, 0.16], wood);
    box(p, [x, 1.2, z], [0.4, 0.2, 0.4], woodLight);
    plate(p, [x, 2.22, z + 0.105]);
    screw(p, [x, 2.22, z + 0.16], [0, 0, 1]);
  }
for (const [i, z] of [-4.4, -2.78].entries()) {
  const p = owner(`shelter-beam-${i}`, [3.9, 3.02, z]);
  box(p, pivots[p], [2.44, 0.22, 0.2], woodDark);
  screw(p, [3.9, 3.02, z + 0.12], [0, 0, 1]);
}
for (let i = 0; i < 3; i++) {
  const x = 3.02 + i * 0.88,
    p = owner(`shelter-roof-${i}`, [x, 3.18, -3.59]);
  shelterRoofs.push(p);
  for (let j = 0; j < 4; j++)
    box(p, [x - 0.31 + j * 0.21, 3.18, -3.59], [0.2, 0.16, 2.14], woodLight);
  for (const z of [-4.46, -2.72])
    box(p, [x, 3.28, z], [0.8, 0.04, 0.045], gold);
  screw(p, [x + 0.11, 3.285, -3.59]);
}
const basket = owner("giraffe-basket", [2.33, 2.25, -2.7]);
curve(
  basket,
  [
    [2.85, 3.2, -2.78],
    [2.54, 2.62, -2.74],
    [2.14, 2.47, -2.7],
  ],
  0.025,
  woodLight,
);
tube(basket, [2.33, 2.23, -2.7], 0.3, 0.3, woodLight);
for (let i = 0; i < 8; i++) {
  const a = (i * Math.PI) / 4;
  beam(
    basket,
    [2.33 + 0.27 * Math.cos(a), 2.08, -2.7 + 0.27 * Math.sin(a)],
    [2.33 + 0.31 * Math.cos(a), 2.4, -2.7 + 0.31 * Math.sin(a)],
    0.022,
    woodDark,
  );
}
shape(basket, "ring", [2.33, 2.4, -2.7], [0.3, 0.3, 0.3], gold);
plant(basket, [2.33, 2.38, -2.7], 0.3);
plate(basket, [2.33, 2.22, -2.38]);
screw(basket, [2.33, 2.22, -2.325], [0, 0, 1]);
const trough = owner("giraffe-trough", [1.8, 1.35, -3.45]);
box(trough, pivots[trough], [0.82, 0.42, 0.61], woodLight);
box(trough, [1.8, 1.57, -3.45], [0.88, 0.07, 0.67], woodDark);
for (const x of [1.58, 1.8, 2.02]) plant(trough, [x, 1.58, -3.45], 0.28);
screw(trough, [1.8, 1.35, -3.78], [0, 0, -1]);
function feedBowl(name: string, [x, y, z]: Vector, c: string) {
  const part = owner(name, [x, y, z]);
  tube(part, [x, y, z], 0.25, 0.16, c);
  shape(part, "ring", [x, y + 0.1, z], [0.25, 0.25, 0.25], pale);
  for (let j = 0; j < 5; j++)
    ball(
      part,
      [x + Math.sin(j * 5) * 0.13, y + 0.105, z + Math.cos(j * 7) * 0.13],
      [0.075, 0.025, 0.065],
      name.startsWith("lion") ? "#bd5b44" : green,
    );
  screw(part, [x + 0.15, y + 0.12, z]);
  return part;
}
feedBowl("lion-bowl", [-2.8, 1.23, -1.02], red);
feedBowl("giraffe-bowl", [3.2, 1.23, -1.08], woodLight);

// The turquoise pond has removable water, lily pads and a stone base, with
// ample room between the three birds. Shore plants never intersect the animals.
const pondWater: ZooPartId[] = [],
  pondBases: ZooPartId[] = [];
for (let i = 0; i < 3; i++) {
  const x = 2.1 + i,
    p = owner(`pool-base-${i}`, [x, 0.13, 1.6]),
    w = owner(`pool-water-${i}`, [x, 0.275, 1.6]);
  pondBases.push(p);
  pondWater.push(w);
  box(p, pivots[p], [0.98, 0.2, 3.2], cream);
  box(w, pivots[w], [0.98, 0.1, 3.2], water);
  screw(p, [x, 0.245, 1.6]);
  const z = i === 1 ? 0.3 : 2.8;
  screw(w, [x, 0.31, z]);
  for (let j = 0; j < 6; j++) {
    const zz = 0.15 + j * 0.54;
    curve(
      w,
      [
        [x - 0.28, 0.332, zz],
        [x - 0.08, 0.334, zz + 0.05],
        [x + 0.15, 0.332, zz],
      ],
      0.008,
      "#a4e7df",
    );
  }
  const pad = owner(`lilypad-${i}`, [x, 0.37, z]);
  tube(pad, pivots[pad], 0.28, 0.035, lime);
  for (let j = 0; j < 7; j++) {
    const a = (j * Math.PI * 2) / 7;
    ball(
      pad,
      [x + 0.065 * Math.cos(a), 0.43, z + 0.065 * Math.sin(a)],
      [0.1, 0.045, 0.055],
      pink,
      [0, -a, 0],
    );
  }
  ball(pad, [x, 0.45, z], [0.05, 0.035, 0.05], gold);
  screw(pad, [x + 0.15, 0.405, z - 0.08]);
}
for (const [i, x, z, w, h] of [
  [0, 1.53, 0.55, 0.58, 0.62],
  [1, 4.73, 0.35, 0.68, 0.88],
  [2, 4.72, 2.86, 0.63, 0.62],
  [3, 1.6, 2.98, 0.58, 0.55],
  [4, 3.4, -0.1, 0.7, 0.55],
] as const)
  rock(`pond-rock-${i}`, [x, h / 2 + 0.1, z], [w, h, 0.65], i * 2 + 11);
const pondFences = [
  fence("pond-fence-front", 3.1, 3.4, 3.3, 0.22),
  fence("pond-fence-left", 1.43, 1.65, 3.35, 0.22, Math.PI / 2),
  fence("pond-fence-right", 4.78, 1.65, 3.35, 0.22, Math.PI / 2),
  fence("pond-fence-back", 3.1, -0.05, 3.3, 0.22),
];
for (const [i, x, z] of [
  [0, 1.25, 0.3],
  [1, 4.92, 2.5],
  [2, 4.92, -0.22],
] as const) {
  const p = owner(`pond-reeds-${i}`, [x, 0.45, z]);
  for (let j = 0; j < 5; j++) {
    const xx = x + (j - 2) * 0.055,
      zz = z + Math.sin(j) * 0.08;
    beam(
      p,
      [xx, 0.18, zz],
      [xx + 0.06, 0.88 + (j % 2) * 0.16, zz],
      0.01,
      green,
    );
    ball(
      p,
      [xx + 0.06, 0.91 + (j % 2) * 0.16, zz],
      [0.035, 0.12, 0.035],
      woodDark,
    );
  }
  plant(p, [x, 0.16, z], 0.5);
  box(p, [x, 0.3, z + 0.16], [0.24, 0.2, 0.08], green);
  screw(p, [x, 0.3, z + 0.215], [0, 0, 1]);
}

function feedingSign(name: string, [x, y, z]: Vector, kind: number) {
  const p = owner(name, [x, y, z]);
  box(p, pivots[p], [1.05, 0.6, 0.11], woodLight);
  box(p, [x, y, z + 0.07], [0.92, 0.48, 0.035], pale);
  text(p, "FEEDING", [x, y + 0.12, z + 0.11], 0.145);
  if (kind === 0) {
    ball(p, [x, y - 0.09, z + 0.12], [0.2, 0.09, 0.03], red);
    shape(p, "ring", [x, y - 0.09, z + 0.15], [0.11, 0.055, 0.06], cream, [
      Math.PI / 2,
      0,
      0,
    ]);
  } else if (kind === 1) {
    for (let j = 0; j < 3; j++)
      leaf(
        p,
        [x + (j - 1) * 0.08, y - 0.11, z + 0.13],
        [0.06, 0.12, 0.025],
        green,
        [0, 0, (j - 1) * -0.4],
      );
  } else {
    ball(p, [x - 0.025, y - 0.08, z + 0.13], [0.15, 0.065, 0.025], red);
    shape(p, "cone", [x + 0.15, y - 0.08, z + 0.13], [0.07, 0.12, 0.025], red, [
      0,
      0,
      -Math.PI / 2,
    ]);
  }
  screw(p, [x - 0.34, y + 0.19, z + 0.12], [0, 0, 1]);
  return p;
}
feedingSign("lion-feeding", [-3.2, 1.75, -0.43], 0);
feedingSign("giraffe-feeding", [3.2, 1.75, -0.43], 1);
feedingSign("flamingo-feeding", [3.1, 0.87, 3.56], 2);

// Cascade and four river sections lead down through the centre of the zoo.
const riverParts: ZooPartId[] = [];
for (let i = 0; i < 4; i++) {
  const z = -3.0 + i * 1.4,
    x = 0.08 * Math.sin(i * 1.5),
    p = owner(`stream-${i}`, [x, 0.22, z]);
  riverParts.push(p);
  box(p, pivots[p], [1.04, 0.14, 1.38], water);
  screw(p, [x, 0.305, z]);
  for (let j = 0; j < 4; j++)
    curve(
      p,
      [
        [x - 0.25, 0.299, z - 0.4 + j * 0.25],
        [x, 0.301, z - 0.33 + j * 0.25],
        [x + 0.23, 0.299, z - 0.39 + j * 0.25],
      ],
      0.009,
      "#b4ede2",
    );
}
rock("waterfall-wall-left", [-1.08, 1.3, -3.13], [0.66, 2.35, 1.1], 21);
rock("waterfall-wall-right", [0.37, 1.2, -3.13], [0.6, 2.16, 1.08], 22);
rock("waterfall-crown", [-0.35, 2.43, -3.4], [1.3, 0.35, 0.55], 23);
rock("river-bank", [-0.62, 0.44, -0.94], [0.65, 0.7, 0.64], 24);
for (let i = 0; i < 2; i++) {
  const x = -0.59 + i * 0.42,
    p = owner(`cascade-${i}`, [x, 1.23, -2.89]);
  const positions: Vector[] = [
    [x, 2.38, -3.43],
    [x, 2.27, -3.02],
    [x, 1.9, -2.92],
    [x, 0.8, -2.91],
    [x, 0.32, -2.7],
  ];
  curve(p, positions, 0.18, water);
  for (let j = 0; j < 3; j++)
    curve(
      p,
      positions.map(
        ([a, b, c]) => [a + (j - 1) * 0.085, b, c + 0.13] as Vector,
      ),
      0.013,
      "#adede6",
    );
  for (let j = 0; j < 5; j++)
    ball(
      p,
      [
        x + Math.sin(j * 7) * 0.15,
        0.37 + (j % 2) * 0.08,
        -2.61 + Math.cos(j * 9) * 0.15,
      ],
      [0.1, 0.08, 0.1],
      pale,
    );
  box(p, [x, 2.35, -3.31], [0.33, 0.13, 0.39], water);
  screw(p, [x, 2.435, -3.31]);
}

const bridgeParts: ZooPartId[] = [];
for (let i = 0; i < 3; i++) {
  const x = (i - 1) * 0.49,
    p = owner(`bridge-deck-${i}`, [x, 0.43, 0.37]);
  bridgeParts.push(p);
  for (let j = 0; j < 9; j++) {
    const z = -0.42 + j * 0.2,
      y = 0.43 + 0.16 * Math.sin((Math.PI * j) / 8);
    box(p, [x, y, z], [0.47, 0.1, 0.19], woodLight, [0, 0, (i - 1) * 0.012]);
  }
  const z = i % 2 ? 0.18 : 0.58,
    y = 0.43 + 0.16 * Math.sin(Math.PI * ((z + 0.42) / 1.6));
  screw(p, [x, y + 0.067, z]);
}
for (const side of [-1, 1]) {
  const p = owner(`bridge-rail-${side}`, [side * 0.83, 0.85, 0.38]);
  bridgeParts.push(p);
  for (const z of [-0.46, 0.38, 1.22]) {
    tube(p, [side * 0.83, 0.83, z], 0.055, 0.8, wood);
    tube(p, [side * 0.83, 1.25, z], 0.08, 0.06, woodLight);
  }
  curve(
    p,
    [
      [side * 0.83, 1.12, -0.46],
      [side * 0.83, 1.27, 0.38],
      [side * 0.83, 1.12, 1.22],
    ],
    0.045,
    woodLight,
  );
  plate(p, [side * 0.83, 0.9, 1.22]);
  screw(p, [side * 0.83, 0.9, 1.275], [0, 0, 1]);
}
const bridgeSupport = owner("bridge-support", [0, 0.31, 0.38]);
for (const z of [-0.4, 1.15])
  box(bridgeSupport, [0, 0.31, z], [1.7, 0.18, 0.15], woodDark);
screw(bridgeSupport, [0.69, 0.31, 1.25], [0, 0, 1]);

// Timber observation tower, kept behind the animals. Four hip roof panels,
// corner posts, rails, decking and braces can all be dismantled independently.
const towerZ = -3.95,
  towerRoof: ZooPartId[] = [],
  towerDeck: ZooPartId[] = [],
  towerRails: ZooPartId[] = [];
for (const x of [-0.8, 0.8])
  for (const z of [towerZ - 0.8, towerZ + 0.8]) {
    const p = owner(`tower-post-${x}-${z}`, [x, 1.84, z]);
    box(p, pivots[p], [0.15, 3.37, 0.15], wood);
    box(p, [x, 0.24, z], [0.36, 0.26, 0.36], woodDark);
    plate(p, [x, 2.1, z + 0.11]);
    screw(p, [x, 2.1, z + 0.165], [0, 0, 1]);
  }
for (const side of [-1, 1]) {
  const z = towerZ + side * 0.8,
    p = owner(`tower-brace-${side}`, [0, 1.8, z]);
  beam(p, [-0.8, 0.44, z], [0.8, 3.3, z], 0.055, woodDark);
  beam(p, [0.8, 0.44, z], [-0.8, 3.3, z], 0.055, woodDark);
  plate(p, [0, 1.87, z + side * 0.08], wood);
  screw(p, [0, 1.87, z + side * 0.135], [0, 0, side]);
}
for (const x of [-0.44, 0.44])
  for (const z of [towerZ - 0.44, towerZ + 0.44]) {
    const p = owner(`tower-deck-${x}-${z}`, [x, 3.43, z]);
    towerDeck.push(p);
    box(p, pivots[p], [0.86, 0.17, 0.86], woodLight);
    for (let j = 0; j < 3; j++)
      box(p, [x, 3.522, z - 0.26 + j * 0.26], [0.8, 0.012, 0.012], wood);
    screw(p, [x, 3.535, z]);
  }
for (const [i, x, z, length, angle] of [
  [0, 0, towerZ + 1.0, 2.02, 0],
  [1, 0, towerZ - 1.0, 2.02, 0],
  [2, -1.0, towerZ, 2.02, Math.PI / 2],
  [3, 1.0, towerZ, 2.02, Math.PI / 2],
] as const) {
  const p = fence(`tower-rail-${i}`, x, z, length, 3.52, angle);
  towerRails.push(p);
}
for (let i = 0; i < 4; i++) {
  const a = (i * Math.PI) / 2,
    b = a + Math.PI / 2,
    t = (a + b) / 2,
    p = owner(`tower-roof-${i}`, [0, 5.04, towerZ]),
    points: Vector3[] = [];
  towerRoof.push(p);
  const e1: Vector = [
      1.18 * Math.cos(a) - 1.18 * Math.sin(a),
      4.76,
      towerZ + 1.18 * Math.sin(a) + 1.18 * Math.cos(a),
    ],
    e2: Vector = [
      1.18 * Math.cos(b) - 1.18 * Math.sin(b),
      4.76,
      towerZ + 1.18 * Math.sin(b) + 1.18 * Math.cos(b),
    ];
  for (const dy of [0, -0.08])
    for (const v of [
      [0, 5.6 + dy, towerZ],
      [e1[0], e1[1] + dy, e1[2]],
      [e2[0], e2[1] + dy, e2[2]],
    ])
      points.push(new Vector3(...v));
  pieces.push({
    part: p,
    kind: "box",
    position: [0, 0, 0],
    size: [1, 1, 1],
    color: i % 2 ? red : roofRed,
    geometry: new ConvexGeometry(points),
  });
  for (const q of [0.3, 0.6, 0.88])
    beam(
      p,
      [e1[0] * q, 5.6 - 0.84 * q + 0.035, towerZ + (e1[2] - towerZ) * q],
      [e2[0] * q, 5.6 - 0.84 * q + 0.035, towerZ + (e2[2] - towerZ) * q],
      0.018,
      red,
    );
  const mx = (e1[0] + e2[0]) * 0.5,
    mz = (e1[2] + e2[2]) * 0.5 - towerZ,
    n = new Vector3(
      (mx * 0.84) / 1.18 ** 2,
      1,
      (mz * 0.84) / 1.18 ** 2,
    ).normalize();
  screw(
    p,
    new Vector3(mx * 0.7, 5.6 - 0.84 * 0.7, towerZ + mz * 0.7)
      .addScaledVector(n, 0.025)
      .toArray(),
    n.toArray(),
  );
  for (const corner of [e1, e2])
    box(p, [corner[0], 4.78, corner[2]], [0.2, 0.12, 0.2], wood);
  void t;
}
const ridge = owner("tower-roof-cap", [0, 5.56, towerZ]);
for (const x of [-1.18, 1.18])
  for (const z of [towerZ - 1.18, towerZ + 1.18])
    beam(ridge, [0, 5.64, towerZ], [x, 4.83, z], 0.045, roofRed);
box(ridge, [0, 5.64, towerZ], [0.3, 0.1, 0.3], red);
screw(ridge, [0, 5.705, towerZ]);
const flag = owner("tower-flag", [0, 5.99, towerZ]);
box(flag, [0, 5.75, towerZ], [0.37, 0.16, 0.32], gold);
tube(flag, [0, 6.02, towerZ], 0.035, 0.67, woodDark);
ball(flag, [0, 6.38, towerZ], [0.065, 0.065, 0.065], gold);
box(flag, [0.32, 6.2, towerZ], [0.64, 0.28, 0.035], gold, [0, 0, -0.08]);
paw(flag, [0.33, 6.14, towerZ + 0.035], 0.38, woodDark);
screw(flag, [0.215, 5.75, towerZ], [1, 0, 0]);
const telescope = owner("tower-telescope", [0.44, 3.89, towerZ + 0.44]);
box(telescope, [0.44, 3.6, towerZ + 0.44], [0.36, 0.17, 0.36], iron);
tube(telescope, [0.44, 3.91, towerZ + 0.44], 0.045, 0.56, iron);
tube(telescope, [0.44, 4.21, towerZ + 0.44], 0.12, 0.55, iron, [
  0,
  0,
  Math.PI / 2,
]);
tube(telescope, [0.12, 4.21, towerZ + 0.44], 0.14, 0.08, gold, [
  0,
  0,
  Math.PI / 2,
]);
tube(telescope, [0.075, 4.21, towerZ + 0.44], 0.1, 0.025, "#40677e", [
  0,
  0,
  Math.PI / 2,
]);
plate(telescope, [0.44, 3.82, towerZ + 0.52], iron);
screw(telescope, [0.44, 3.82, towerZ + 0.575], [0, 0, 1]);
const map = owner("tower-map", [-0.44, 3.95, towerZ + 0.44]);
box(map, [-0.44, 3.61, towerZ + 0.44], [0.36, 0.18, 0.36], wood);
beam(
  map,
  [-0.44, 3.61, towerZ + 0.44],
  [-0.44, 4.15, towerZ + 0.44],
  0.035,
  wood,
);
box(map, [-0.44, 4.18, towerZ + 0.44], [0.72, 0.48, 0.08], woodLight);
box(map, [-0.44, 4.18, towerZ + 0.49], [0.61, 0.37, 0.025], pale);
curve(
  map,
  [
    [-0.63, 4.08, towerZ + 0.51],
    [-0.57, 4.2, towerZ + 0.51],
    [-0.35, 4.14, towerZ + 0.51],
    [-0.24, 4.28, towerZ + 0.51],
  ],
  0.018,
  green,
);
ball(map, [-0.33, 4.14, towerZ + 0.53], [0.045, 0.05, 0.015], red);
screw(map, [-0.67, 4.32, towerZ + 0.51], [0, 0, 1]);
const ladder = owner("tower-ladder", [0, 1.78, -5.1]);
for (const x of [-0.32, 0.32])
  beam(ladder, [x, 0.17, -5.47], [x, 3.44, -4.8], 0.035, wood);
for (let j = 0; j < 10; j++)
  beam(
    ladder,
    [-0.32, 0.38 + j * 0.3, -5.427 + j * 0.0615],
    [0.32, 0.38 + j * 0.3, -5.427 + j * 0.0615],
    0.028,
    woodLight,
  );
for (const [x, y] of [
  [-0.32, 1.1],
  [0.32, 2.6],
]) {
  const z = -5.47 + ((y - 0.17) / 3.27) * 0.67;
  plate(ladder, [x, y, z - 0.05]);
  screw(ladder, [x, y, z - 0.105], [0, 0, -1]);
}

// Front gate: cream towers, red caps, green arch, separate sign and swinging
// gate leaves. They keep the central path open through the zoo entrance.
const gateZ = 4.8,
  gateBases: ZooPartId[] = [],
  gatePillars: ZooPartId[] = [],
  gateCaps: ZooPartId[] = [],
  archParts: ZooPartId[] = [];
for (const side of [-1, 1]) {
  const x = side * 1.55,
    base = owner(`gate-base-${side}`, [x, 0.26, gateZ]),
    pillar = owner(`gate-pillar-${side}`, [x, 1.1, gateZ]),
    cap = owner(`gate-cap-${side}`, [x, 1.99, gateZ]);
  gateBases.push(base);
  gatePillars.push(pillar);
  gateCaps.push(cap);
  box(base, pivots[base], [0.78, 0.4, 0.76], cream);
  box(base, [x, 0.48, gateZ], [0.65, 0.08, 0.65], pale);
  screw(base, [x, 0.535, gateZ]);
  box(pillar, pivots[pillar], [0.54, 1.18, 0.54], cream);
  for (const y of [0.7, 1.06, 1.42, 1.73])
    box(pillar, [x, y, gateZ], [0.57, 0.065, 0.57], pale);
  plate(pillar, [x, 1.6, gateZ + 0.31], gold);
  screw(pillar, [x, 1.6, gateZ + 0.365], [0, 0, 1]);
  box(cap, [x, 1.84, gateZ], [0.72, 0.12, 0.72], woodLight);
  pieces.push({
    part: cap,
    kind: "box",
    position: [0, 0, 0],
    size: [1, 1, 1],
    color: red,
    geometry: new ConvexGeometry([
      new Vector3(x, 2.26, gateZ),
      ...[-1, 1].flatMap((a) =>
        [-1, 1].map((b) => new Vector3(x + a * 0.44, 1.89, gateZ + b * 0.44)),
      ),
    ]),
  });
  box(cap, [x, 2.23, gateZ], [0.18, 0.1, 0.19], roofRed);
  screw(cap, [x, 2.295, gateZ]);
  const banner = owner(`gate-banner-${side}`, [
    x + side * 0.48,
    1.1,
    gateZ + 0.03,
  ]);
  beam(banner, [x, 1.64, gateZ], [x + side * 0.79, 1.64, gateZ], 0.025, iron);
  box(banner, pivots[banner], [0.45, 0.98, 0.045], pink);
  paw(banner, [x + side * 0.48, 1.18, gateZ + 0.065], 0.43, gold);
  plate(banner, [x + side * 0.48, 1.56, gateZ + 0.065], "#9c76b9");
  screw(banner, [x + side * 0.48, 1.56, gateZ + 0.12], [0, 0, 1]);
}
for (const side of [-1, 1]) {
  const p = owner(`entrance-arch-${side}`, [side * 0.82, 2.45, gateZ]);
  archParts.push(p);
  const arch = new Shape();
  arch.moveTo(side * 1.64, 0);
  arch.quadraticCurveTo(side * 1.2, 0.9, 0, 1.02);
  arch.lineTo(0, 0.77);
  arch.quadraticCurveTo(side * 1.06, 0.65, side * 1.4, -0.12);
  arch.closePath();
  pieces.push({
    part: p,
    kind: "box",
    position: [0, 2.06, gateZ],
    size: [1, 1, 1],
    color: darkGreen,
    geometry: new ExtrudeGeometry(arch, {
      depth: 0.22,
      bevelEnabled: true,
      bevelThickness: 0.025,
      bevelSize: 0.025,
      bevelSegments: 2,
      curveSegments: 24,
    }),
  });
  screw(p, [side * 1.32, 2.29, gateZ + 0.265], [0, 0, 1]);
  for (const dx of [0.43, 0.61])
    leaf(p, [side * dx, 2.62, gateZ + 0.28], [0.2, 0.075, 0.045], lime, [
      0,
      0,
      side * 0.75,
    ]);
}
const zooSign = owner("entrance-zoo-sign", [0, 2.69, gateZ + 0.24]);
box(zooSign, pivots[zooSign], [1.85, 0.65, 0.13], woodDark);
box(zooSign, [0, 2.69, gateZ + 0.32], [1.74, 0.54, 0.06], wood);
text(zooSign, "ZOO", [0, 2.67, gateZ + 0.37], 0.43, pale);
paw(zooSign, [0, 3.02, gateZ + 0.34], 0.44, gold);
screw(zooSign, [-0.77, 2.7, gateZ + 0.37], [0, 0, 1]);
screw(zooSign, [0.77, 2.7, gateZ + 0.37], [0, 0, 1]);
const welcome = owner("entrance-welcome", [0, 2.17, gateZ + 0.36]);
box(welcome, pivots[welcome], [2.31, 0.36, 0.11], woodLight);
text(welcome, "ADVENTURE", [0, 2.17, gateZ + 0.43], 0.24, woodDark);
screw(welcome, [0.96, 2.17, gateZ + 0.435], [0, 0, 1]);
for (const side of [-1, 1]) {
  const p = owner(`gate-leaf-${side}`, [side * 0.86, 0.83, gateZ + 0.34]),
    cx = side * 0.86;
  for (const x of [cx - 0.42, cx + 0.42])
    box(p, [x, 0.83, gateZ + 0.34], [0.07, 1.3, 0.08], darkGreen);
  for (const y of [0.23, 1.42])
    box(p, [cx, y, gateZ + 0.34], [0.91, 0.07, 0.08], darkGreen);
  for (let j = 0; j < 5; j++)
    box(
      p,
      [cx - 0.3 + j * 0.15, 0.83, gateZ + 0.34],
      [0.035, 1.13, 0.045],
      darkGreen,
    );
  tube(p, [cx, 0.83, gateZ + 0.405], 0.22, 0.045, gold, [Math.PI / 2, 0, 0]);
  paw(p, [cx, 0.8, gateZ + 0.445], 0.48, woodDark);
  plate(p, [cx + side * 0.38, 0.39, gateZ + 0.405], gold);
  screw(p, [cx + side * 0.38, 0.39, gateZ + 0.46], [0, 0, 1]);
}

// Compact ticket hut, with a genuine open serving window and removable sides.
const kx = -4.23,
  kz = 3.65,
  kioskFloor = owner("ticket-floor", [kx, 0.2, kz]),
  kioskBack = owner("ticket-back", [kx, 1.12, kz - 0.58]),
  kioskCounter = owner("ticket-counter", [kx, 1.1, kz + 0.44]),
  kioskRoofs: ZooPartId[] = [],
  kioskWalls: ZooPartId[] = [kioskBack];
box(kioskFloor, pivots[kioskFloor], [1.66, 0.16, 1.28], wood);
screw(kioskFloor, [kx, 0.295, kz]);
box(kioskBack, pivots[kioskBack], [1.58, 1.67, 0.1], cream);
for (const [dx, y] of [
  [-0.53, 0.7],
  [0.53, 1.5],
])
  screw(kioskBack, [kx + dx, y, kz - 0.515], [0, 0, 1]);
for (const side of [-1, 1]) {
  const p = owner(`ticket-side-${side}`, [kx + side * 0.75, 1.12, kz]);
  kioskWalls.push(p);
  box(p, pivots[p], [0.1, 1.67, 1.16], cream);
  box(p, [kx + side * 0.75, 1.12, kz], [0.13, 0.1, 1.2], gold);
  screw(p, [kx + side * 0.685, 1.36, kz], [-side, 0, 0]);
  const roof = owner(`ticket-roof-${side}`, [kx + side * 0.43, 2.12, kz]);
  kioskRoofs.push(roof);
  const a: Vector = [kx, 2.48, kz],
    b: Vector = [kx + side * 0.94, 1.93, kz],
    points: Vector3[] = [];
  for (const dy of [0, -0.08])
    for (const [x, y] of [
      [a[0], a[1]],
      [b[0], b[1]],
    ])
      for (const z of [kz - 0.76, kz + 0.76])
        points.push(new Vector3(x, y + dy, z));
  pieces.push({
    part: roof,
    kind: "box",
    position: [0, 0, 0],
    size: [1, 1, 1],
    color: red,
    geometry: new ConvexGeometry(points),
  });
  for (let j = 0; j < 5; j++)
    beam(
      roof,
      [kx + side * 0.05, 2.49, kz - 0.62 + j * 0.31],
      [kx + side * 0.95, 1.95, kz - 0.62 + j * 0.31],
      0.022,
      roofRed,
    );
  const n = new Vector3((side * 0.55) / 0.94, 1, 0).normalize();
  screw(
    roof,
    new Vector3(kx + side * 0.47, 2.205, kz - 0.19)
      .addScaledVector(n, 0.025)
      .toArray(),
    n.toArray(),
  );
}
const kioskFront = owner("ticket-front", [kx, 0.65, kz + 0.58]);
box(kioskFront, pivots[kioskFront], [1.58, 0.75, 0.1], red);
paw(kioskFront, [kx, 0.63, kz + 0.66], 0.45, gold);
screw(kioskFront, [kx, 0.65, kz + 0.515], [0, 0, -1]);
box(kioskCounter, pivots[kioskCounter], [1.76, 0.13, 0.58], woodLight);
box(kioskCounter, [kx, 0.42, kz], [0.42, 0.25, 0.38], wood);
screw(kioskCounter, [kx, 1.18, kz + 0.44]);
const register = owner("ticket-till", [kx, 1.37, kz + 0.44]);
box(register, pivots[register], [0.43, 0.35, 0.37], iron);
box(register, [kx, 1.59, kz + 0.36], [0.34, 0.17, 0.1], iron, [0.15, 0, 0]);
box(register, [kx, 1.59, kz + 0.425], [0.27, 0.11, 0.025], "#b7c9ba");
screw(register, [kx, 1.37, kz + 0.645], [0, 0, 1]);
const awning = owner("ticket-awning", [kx, 1.76, kz + 0.77]);
for (let j = 0; j < 6; j++) {
  const x = kx - 0.75 + j * 0.3;
  box(
    awning,
    [x, 1.81, kz + 0.76],
    [0.295, 0.07, 0.75],
    j % 2 ? pale : red,
    [0.33, 0, 0],
  );
  ball(awning, [x, 1.65, kz + 1.1], [0.155, 0.13, 0.06], j % 2 ? pale : red);
}
plate(awning, [kx + 0.6, 1.66, kz + 1.12], gold);
screw(awning, [kx + 0.6, 1.66, kz + 1.175], [0, 0, 1]);
const ticketSign = owner("ticket-sign", [kx, 2.27, kz + 0.76]);
box(ticketSign, pivots[ticketSign], [1.59, 0.51, 0.1], woodLight);
box(ticketSign, [kx, 2.27, kz + 0.825], [1.43, 0.36, 0.04], pale);
text(ticketSign, "TICKETS", [kx, 2.27, kz + 0.86], 0.23);
screw(ticketSign, [kx - 0.61, 2.43, kz + 0.87], [0, 0, 1]);

// Trees sit at the outside corners; their crowns leave the animal silhouettes
// and the giraffes' long necks clear. All foliage belongs to removable owners.
for (const [i, x, z] of [
  [0, -4.85, -5.05],
  [1, 4.8, -5.0],
  [2, -5.18, 0.7],
  [3, 5.15, -0.05],
] as const) {
  const p = owner(`tree-${i}`, [x, 1.5, z]);
  tube(p, [x, 1.15, z], 0.105, 1.98, woodDark);
  for (const [dx, dz] of [
    [-0.37, -0.12],
    [0.36, 0.13],
    [0.05, 0.3],
  ])
    beam(p, [x, 0.95, z], [x + dx, 2.15, z + dz], 0.065, wood);
  foliage(p, [x, 2.28, z], 0.82);
  foliage(p, [x - 0.36, 2.03, z + 0.17], 0.54);
  foliage(p, [x + 0.4, 2.12, z - 0.1], 0.55);
  plate(p, [x, 0.48, z + 0.15], green);
  screw(p, [x, 0.48, z + 0.205], [0, 0, 1]);
  for (let j = 0; j < 3; j++) {
    const xx = x + (j - 1) * 0.31,
      zz = z + 0.4;
    for (let k = 0; k < 5; k++) {
      const a = (k * Math.PI * 2) / 5;
      leaf(
        p,
        [xx + 0.055 * Math.cos(a), 2.31, zz + 0.055 * Math.sin(a)],
        [0.055, 0.025, 0.05],
        pale,
      );
    }
    ball(p, [xx, 2.33, zz], [0.035, 0.03, 0.035], gold);
  }
}
function bench(name: string, x: number, z: number) {
  const seat = owner(`${name}-seat`, [x, 0.45, z]),
    back = owner(`${name}-back`, [x, 0.82, z]);
  for (const xx of [x - 0.56, x + 0.56]) {
    box(seat, [xx, 0.17, z], [0.3, 0.12, 0.48], iron);
    for (const zz of [z - 0.17, z + 0.17])
      beam(seat, [xx, 0.17, zz], [xx, 0.51, zz], 0.03, iron);
  }
  for (const zz of [z - 0.17, z, z + 0.17])
    box(seat, [x, 0.52, zz], [1.48, 0.08, 0.14], woodLight);
  screw(seat, [x + 0.3, 0.575, z]);
  for (const xx of [x - 0.61, x + 0.61])
    beam(back, [xx, 0.5, z - 0.22], [xx, 1.1, z - 0.22], 0.03, iron);
  for (const y of [0.77, 1.0])
    box(back, [x, y, z - 0.22], [1.48, 0.15, 0.07], woodLight);
  screw(back, [x - 0.49, 1.0, z - 0.17], [0, 0, 1]);
}
bench("bench-west", -2.6, 1.35);
bench("bench-south", 0.45, 3.25);
for (const [i, x, z] of [
  [0, -3.1, 2.62],
  [1, 0.91, 1.32],
  [2, 3.48, 4.23],
] as const) {
  const p = owner(`lamp-${i}`, [x, 1.21, z]);
  tube(p, [x, 0.24, z], 0.15, 0.28, iron);
  tube(p, [x, 1.11, z], 0.04, 1.58, iron);
  box(p, [x, 2.05, z], [0.28, 0.41, 0.28], "#fff1a0");
  for (const xx of [x - 0.16, x + 0.16])
    for (const zz of [z - 0.16, z + 0.16])
      beam(p, [xx, 1.82, zz], [xx, 2.31, zz], 0.022, iron);
  for (const y of [1.82, 2.31]) box(p, [x, y, z], [0.39, 0.06, 0.39], iron);
  shape(p, "cone", [x, 2.42, z], [0.29, 0.24, 0.29], iron);
  ball(p, [x, 2.58, z], [0.055, 0.055, 0.055], iron);
  plate(p, [x, 0.47, z + 0.13], iron);
  screw(p, [x, 0.47, z + 0.185], [0, 0, 1]);
}
for (const [i, x, z, s] of [
  [0, 4.45, 4.36, 0.78],
  [1, 4.88, 3.62, 0.57],
  [2, 3.98, 3.78, 0.54],
] as const) {
  const p = owner(`supply-crate-${i}`, [x, 0.13 + s * 0.5, z]);
  box(p, pivots[p], [s, s, s], wood);
  for (const xx of [x - s * 0.4, x + s * 0.4])
    for (const zz of [z - s * 0.4, z + s * 0.4])
      box(
        p,
        [xx, 0.13 + s * 0.5, zz],
        [s * 0.12, s * 1.03, s * 0.12],
        woodLight,
      );
  for (const y of [0.13 + s * 0.1, 0.13 + s * 0.9])
    box(p, [x, y, z + s * 0.51], [s * 0.97, s * 0.1, 0.05], woodLight);
  beam(
    p,
    [x - s * 0.37, 0.13 + s * 0.18, z + s * 0.52],
    [x + s * 0.37, 0.13 + s * 0.82, z + s * 0.52],
    0.025,
    woodDark,
  );
  screw(p, [x, 0.13 + s * 0.55, z + s * 0.55], [0, 0, 1]);
}
const crateLid = owner("large-crate-lid", [4.45, 0.97, 4.36]);
box(crateLid, pivots[crateLid], [0.84, 0.11, 0.84], woodLight);
for (const x of [4.2, 4.45, 4.7])
  box(crateLid, [x, 1.032, 4.36], [0.015, 0.012, 0.79], wood);
screw(crateLid, [4.45, 1.04, 4.36]);
for (const [i, x, z] of [
  [0, -2.76, 5.18],
  [1, 2.76, 5.18],
  [2, -1.45, 2.17],
  [3, 5.08, 4.98],
] as const) {
  const p = owner(`flower-planter-${i}`, [x, 0.34, z]);
  box(p, pivots[p], [0.94, 0.4, 0.59], wood);
  for (const y of [0.17, 0.5]) box(p, [x, y, z], [1.0, 0.07, 0.65], woodLight);
  for (let j = 0; j < 8; j++) {
    const xx = x + Math.sin(j * 7) * 0.34,
      zz = z + Math.cos(j * 11) * 0.17;
    leaf(p, [xx, 0.57, zz], [0.14, 0.065, 0.1], green);
    for (let k = 0; k < 5; k++) {
      const a = (k * Math.PI * 2) / 5;
      ball(
        p,
        [xx + 0.045 * Math.cos(a), 0.65, zz + 0.045 * Math.sin(a)],
        [0.045, 0.027, 0.04],
        j % 3 ? pink : pale,
      );
    }
    ball(p, [xx, 0.675, zz], [0.025, 0.02, 0.025], gold);
  }
  screw(p, [x, 0.34, z + 0.32], [0, 0, 1]);
}
const wayfinding = owner("wayfinding", [-4.38, 0.65, 5.05]);
for (const x of [-4.68, -4.08])
  beam(wayfinding, [x, 0.12, 5.16], [x, 1.3, 5.0], 0.04, wood);
box(wayfinding, [-4.38, 0.78, 5.06], [0.69, 1.02, 0.09], woodLight);
box(wayfinding, [-4.38, 0.81, 5.12], [0.56, 0.83, 0.025], pale);
paw(wayfinding, [-4.38, 0.97, 5.15], 0.48, woodDark);
box(wayfinding, [-4.38, 0.59, 5.155], [0.3, 0.05, 0.025], woodDark);
shape(wayfinding, "cone", [-4.18, 0.59, 5.16], [0.08, 0.15, 0.02], woodDark, [
  0,
  0,
  -Math.PI / 2,
]);
screw(wayfinding, [-4.38, 0.38, 5.14], [0, 0, 1]);
for (const [i, x, z] of [
  [0, -0.96, 2.73],
  [1, 1.26, 3.75],
  [2, 5.18, 3.65],
] as const) {
  const p = owner(`garden-rock-${i}`, [x, 0.29, z]);
  leaf(p, [x, 0.19, z], [0.46, 0.13, 0.37], green);
  foliage(p, [x, 0.36, z], 0.4);
  box(p, [x, 0.24, z + 0.25], [0.24, 0.2, 0.07], green);
  screw(p, [x, 0.24, z + 0.305], [0, 0, 1]);
  plant(p, [x - 0.2, 0.12, z], 0.42);
}

// Corner grasses belong to the path tile below them. They add detail without
// creating fasteners that have no room on a tiny blade or flower.
for (let r = 0; r < 3; r++)
  for (let c = 0; c < 3; c++) {
    const part = pathTiles[r * 3 + c],
      x = (c - 1) * 3.8,
      z = (r - 1) * 3.8;
    for (const [dx, dz] of [
      [-1.65, -1.65],
      [1.65, 1.65],
    ])
      plant(part, [x + dx, 0.09, z + dz], 0.32);
  }
const turfHeads: Vector[] = [
  [-4.65, 1.12, -1.55],
  [-3.2, 1.12, -3.1],
  [-1.77, 1.12, -1.85],
  [1.8, 1.12, -3.45],
  [3.2, 1.12, -1.08],
  [4.95, 1.12, -2.78],
];
for (const [i, t] of habitatTurfs.entries()) screw(t.part, turfHeads[i]);
const pathHeads: Vector[][] = [
  [
    [-4.63, 0.13, -3.5],
    [-3.2, 0.13, -3.5],
  ],
  [
    [0, 0.13, -3.0],
    [0.8, 0.13, -3.15],
  ],
  [
    [3.2, 0.13, -3.5],
    [4.63, 0.13, -3.5],
  ],
  [
    [-4.63, 0.13, -1.7],
    [-2.6, 0.13, 1.35],
  ],
  [[0, 0.13, -0.2]],
  [
    [3.1, 0.13, 1.6],
    [4.1, 0.13, 1.6],
  ],
  [
    [-4.23, 0.13, 3.65],
    [-2.76, 0.13, 5.18],
  ],
  [
    [-1.55, 0.13, 4.8],
    [1.55, 0.13, 4.8],
  ],
  [
    [4.45, 0.13, 4.36],
    [2.76, 0.13, 5.18],
  ],
];
for (const [i, p] of pathTiles.entries())
  for (const head of pathHeads[i]) screw(p, head);

// Only the constructor follows these conservative viewing orders. Real mesh
// clearance and camera rays remain the sole eligibility checks during play.
for (const m of ZOO_MOUNTS) {
  const id = m.attachedTo;
  if (id.startsWith("zoo-cave-back-"))
    m.solutionAfter = caveParts.filter((p) => p.startsWith("zoo-cave-arch-"));
  if (id.startsWith("zoo-tower-deck-"))
    m.solutionAfter = [...towerRoof, ...towerRails];
  if (id.startsWith("zoo-tower-post-") || id.startsWith("zoo-tower-brace-"))
    m.solutionAfter = towerDeck;
  if (id.startsWith("zoo-shelter-beam-") || id.startsWith("zoo-shelter-post-"))
    m.solutionAfter = shelterRoofs;
  if (
    id.startsWith("zoo-ticket-side-") ||
    id === "zoo-ticket-back" ||
    id === "zoo-ticket-front"
  )
    m.solutionAfter = [...kioskRoofs, kioskCounter];
  if (id === "zoo-ticket-floor")
    m.solutionAfter = [...kioskWalls, kioskCounter];
}
const matrix = new Matrix4(),
  euler = new Euler();
for (const p of pieces)
  if (p.rotation && p.geometry) {
    matrix
      .makeRotationFromEuler(euler.set(...p.rotation))
      .scale(new Vector3(...p.size));
    p.geometry = p.geometry.clone().applyMatrix4(matrix);
    p.size = [1, 1, 1];
    p.rotation = undefined;
  }
export const ZOO_MODEL = {
  pieces,
  pivots,
  parts: Object.keys(pivots) as ZooPartId[],
  animalParts,
  habitatFences: [...habitatFences, ...pondFences],
};
if (import.meta.hot)
  import.meta.hot.dispose(() => {
    for (const g of new Set([
      ...pieces.map((p) => p.geometry),
      soft,
      stone,
      cylinder,
      leafGeometry,
      ZOO_ANIMAL_GEOMETRY,
    ]))
      g?.dispose();
  });
