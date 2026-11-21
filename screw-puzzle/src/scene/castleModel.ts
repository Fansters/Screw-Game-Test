import {
  CatmullRomCurve3,
  ConeGeometry,
  CylinderGeometry,
  Euler,
  ExtrudeGeometry,
  Float32BufferAttribute,
  LatheGeometry,
  Path,
  Quaternion,
  Shape,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
} from "three";
import type { BufferGeometry } from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { CastlePartId, Screw } from "../game/types.ts";
import type { Piece, Vector } from "./houseModel.ts";

// Balanced detail targeting roughly 300k scenery triangles instead of the
// original stress-test preset. Keep object dimensions, fixing positions and
// removable owners intact; only primitive subdivisions change.
export const CASTLE_DETAIL = {
  radialSegments: 18,
  sphereRings: 8,
  bevelSegments: 1,
  curveSegments: 12,
  tubeSegments: 12,
  tubeSides: 6,
  ringSegments: 20,
  ringSides: 6,
  arcSegments: 12,
  hexRadius: 6.4,
} as const;
export function createCastleModel() {
  const pieces: Piece[] = [],
    pivots: Record<CastlePartId, Vector> = {};
  const mounts: (Pick<Screw, "position" | "normal" | "solutionAfter"> & {
    attachedTo: CastlePartId;
  })[] = [];
  const cream = "#f4e2c6",
    stone = "#d4c5bd",
    light = "#fff0d6",
    mortar = "#b4a7a4",
    wood = "#ad6739",
    honey = "#db9b52",
    darkWood = "#734624";
  const red = "#ee3943",
    crimson = "#bb243d",
    gold = "#ffd05b",
    blue = "#2962d9",
    green = "#5fa441",
    leafGreen = "#76b53b",
    iron = "#526475",
    steel = "#a9bbc8",
    grass = "#a7c95b";
  function smooth(g: BufferGeometry) {
    g.setAttribute(
      "color",
      new Float32BufferAttribute(
        new Float32Array(g.getAttribute("position").count * 3).fill(1),
        3,
      ),
    );
    return g;
  }
  const rounded = smooth(
    new RoundedBoxGeometry(1, 1, 1, CASTLE_DETAIL.bevelSegments, 0.08),
  );
  const sphere = smooth(
    new SphereGeometry(
      1,
      CASTLE_DETAIL.radialSegments,
      CASTLE_DETAIL.sphereRings,
    ),
  );
  const cylinder = smooth(
      new CylinderGeometry(1, 1, 1, CASTLE_DETAIL.radialSegments),
    ),
    cone = smooth(new ConeGeometry(1, 1, CASTLE_DETAIL.radialSegments));
  const ring = smooth(
    new TorusGeometry(1, 0.1, CASTLE_DETAIL.ringSides, CASTLE_DETAIL.ringSegments),
  );
  const leaves = smooth(new SphereGeometry(1, 12, 6));
  const structural: CastlePartId[] = [],
    roofParts: CastlePartId[] = [],
    courtyard: CastlePartId[] = [];
  function owner(name: string, p: Vector): CastlePartId {
    const id: CastlePartId = `castle-${name}`;
    if (pivots[id]) throw Error(`Duplicate ${id}`);
    pivots[id] = p;
    return id;
  }
  function shape(
    part: CastlePartId,
    g: BufferGeometry,
    p: Vector,
    s: Vector,
    c: string,
    rotation?: Vector,
    kind: Piece["kind"] = "box",
  ) {
    pieces.push({
      part,
      kind,
      geometry: g,
      position: p,
      size: s,
      color: c,
      rotation,
    });
  }
  function box(
    part: CastlePartId,
    p: Vector,
    s: Vector,
    c: string,
    rotation?: Vector,
  ) {
    shape(part, rounded, p, s, c, rotation);
  }
  function ball(part: CastlePartId, p: Vector, s: Vector, c: string) {
    shape(part, sphere, p, s, c, undefined, "ico-detail");
  }
  function cyl(
    part: CastlePartId,
    p: Vector,
    r: number,
    h: number,
    c: string,
    rotation?: Vector,
  ) {
    shape(part, cylinder, p, [r, h, r], c, rotation, "cylinder");
  }
  function hoop(
    part: CastlePartId,
    p: Vector,
    r: number,
    c: string,
    rotation: Vector = [Math.PI / 2, 0, 0],
  ) {
    shape(part, ring, p, [r, r, r], c, rotation, "ring");
  }
  function beam(
    part: CastlePartId,
    a: Vector,
    b: Vector,
    w: number,
    c: string,
  ) {
    const A = new Vector3(...a),
      B = new Vector3(...b),
      d = B.clone().sub(A),
      q = new Quaternion().setFromUnitVectors(
        new Vector3(0, 1, 0),
        d.clone().normalize(),
      );
    box(
      part,
      A.add(B).multiplyScalar(0.5).toArray(),
      [w, d.length(), w],
      c,
      new Euler().setFromQuaternion(q).toArray().slice(0, 3) as Vector,
    );
  }
  function curve(part: CastlePartId, p: Vector[], r: number, c: string) {
    shape(
      part,
      smooth(
        new TubeGeometry(
          new CatmullRomCurve3(p.map((v) => new Vector3(...v))),
          CASTLE_DETAIL.tubeSegments,
          r,
          CASTLE_DETAIL.tubeSides,
          false,
        ),
      ),
      [0, 0, 0],
      [1, 1, 1],
      c,
    );
  }
  function fix(
    part: CastlePartId,
    p: Vector,
    n: Vector = [0, 1, 0],
    after?: CastlePartId[],
  ) {
    mounts.push({
      attachedTo: part,
      position: p,
      normal: new Vector3(...n).normalize().toArray(),
      solutionAfter: after,
    });
  }
  function polygon(
    part: CastlePartId,
    points: [number, number][],
    bottom: number,
    height: number,
    c: string,
    bevel = 0.015,
  ) {
    const s = new Shape();
    points.forEach(([x, z], i) => (i ? s.lineTo(x, -z) : s.moveTo(x, -z)));
    s.closePath();
    const g = smooth(
      new ExtrudeGeometry(s, {
        depth: height,
        steps: 1,
        bevelEnabled: bevel > 0,
        bevelSize: bevel,
        bevelThickness: bevel,
        bevelSegments: CASTLE_DETAIL.bevelSegments,
        curveSegments: CASTLE_DETAIL.curveSegments,
      }).rotateX(-Math.PI / 2),
    );
    shape(part, g, [0, bottom, 0], [1, 1, 1], c);
  }
  function arc(
    part: CastlePartId,
    x: number,
    z: number,
    bottom: number,
    height: number,
    inner: number,
    outer: number,
    a: number,
    b: number,
    c: string,
  ) {
    const pts: [number, number][] = [];
    for (let i = 0; i <= CASTLE_DETAIL.arcSegments; i++) {
      const t = a + ((b - a) * i) / CASTLE_DETAIL.arcSegments;
      pts.push([x + outer * Math.cos(t), z + outer * Math.sin(t)]);
    }
    for (let i = CASTLE_DETAIL.arcSegments; i >= 0; i--) {
      const t = a + ((b - a) * i) / CASTLE_DETAIL.arcSegments;
      pts.push([x + inner * Math.cos(t), z + inner * Math.sin(t)]);
    }
    polygon(part, pts, bottom, height, c, 0);
  }
  function planks(
    part: CastlePartId,
    x: number,
    y: number,
    z: number,
    w: number,
    d: number,
    c = wood,
  ) {
    for (let i = 0; i < 5; i++) {
      box(
        part,
        [x - w / 2 + ((i + 0.5) * w) / 5, y, z],
        [w / 5 - 0.012, 0.13, d],
        i % 2 ? c : honey,
      );
      for (const end of [-1, 1])
        cyl(
          part,
          [
            x - w / 2 + ((i + 0.5) * w) / 5,
            y + 0.072,
            z + end * (d / 2 - 0.07),
          ],
          0.017,
          0.012,
          iron,
        );
    }
  }
  function flag(name: string, x: number, y: number, z: number) {
    const p = owner(name, [x, y, z]);
    cyl(p, [x, y + 0.4, z], 0.045, 0.85, honey);
    ball(p, [x, y + 0.88, z], [0.11, 0.11, 0.11], gold);
    const s = new Shape();
    s.moveTo(0, 0.68);
    s.bezierCurveTo(0.28, 0.8, 0.55, 0.54, 0.9, 0.69);
    s.lineTo(0.7, 0.37);
    s.bezierCurveTo(0.4, 0.32, 0.25, 0.52, 0, 0.4);
    s.closePath();
    shape(
      p,
      smooth(
        new ExtrudeGeometry(s, {
          depth: 0.035,
          bevelEnabled: true,
          bevelSize: 0.01,
          bevelThickness: 0.006,
          bevelSegments: CASTLE_DETAIL.bevelSegments,
          curveSegments: CASTLE_DETAIL.curveSegments,
        }),
      ),
      [x, y, z],
      [1, 1, 1],
      red,
    );
    ball(p, [x + 0.27, y + 0.59, z + 0.044], [0.055, 0.08, 0.02], gold);
    fix(p, [x, y + 0.23, z + 0.055], [0, 0, 1]);
    return p;
  }
  function stoneWall(
    name: string,
    p: Vector,
    size: Vector,
    normal: Vector = [0, 0, 1],
  ) {
    const id = owner(name, p);
    structural.push(id);
    box(id, p, size, mortar);
    const columns = Math.max(2, Math.round(size[0] / 0.48)),
      rows = Math.max(2, Math.round(size[1] / 0.32));
    for (let row = 0; row < rows; row++)
      for (let col = 0; col < columns; col++) {
        const px = p[0] - size[0] / 2 + ((col + 0.5) * size[0]) / columns;
        for (const side of [-1, 1])
          box(
            id,
            [
              px,
              p[1] - size[1] / 2 + ((row + 0.5) * size[1]) / rows,
              p[2] + side * (size[2] / 2 + 0.016),
            ],
            [size[0] / columns - 0.026, size[1] / rows - 0.026, 0.055],
            [cream, stone, light][(row * 3 + col) % 3],
          );
      }
    fix(id, [p[0], p[1], p[2] + normal[2] * (size[2] / 2 + 0.052)], normal);
    return id;
  }
  // Twelve large removable layers form an unmistakable hexagon, not a square.
  const R = CASTLE_DETAIL.hexRadius,
    vertices = Array.from(
      { length: 6 },
      (_, i) =>
        [Math.cos((i * Math.PI) / 3) * R, Math.sin((i * Math.PI) / 3) * R] as [
          number,
          number,
        ],
    );
  const terrain: CastlePartId[] = [];
  for (let i = 0; i < 6; i++) {
    const a = vertices[i],
      b = vertices[(i + 1) % 6],
      x = (a[0] + b[0]) / 3,
      z = (a[1] + b[1]) / 3,
      t = ((i + 0.5) * Math.PI) / 3;
    const base = owner(`foundation-${i}`, [x, -0.42, z]);
    polygon(
      base,
      [[0, 0], a, b],
      -0.75,
      0.57,
      [stone, cream, light][i % 3],
      0.025,
    );
    fix(
      base,
      [Math.cos(t) * R * 0.8663, -0.43, Math.sin(t) * R * 0.8663],
      [Math.cos(t), 0, Math.sin(t)],
    );
    const ground = owner(`courtyard-${i}`, [x, -0.05, z]);
    terrain.push(ground);
    polygon(ground, [[0, 0], a, b], -0.17, 0.2, grass, 0.008);
    fix(
      ground,
      [Math.cos(t) * R * 0.8663, -0.045, Math.sin(t) * R * 0.8663],
      [Math.cos(t), 0, Math.sin(t)],
    );
    // Hand-set cobbles and grass tufts follow their ground owner when released.
    for (let row = 0; row < 9; row++)
      for (let col = 0; col <= row; col++) {
        const u = (row + 0.8) / 10,
          v = (col + 0.5) / (row + 1);
        const px = u * (a[0] * (1 - v) + b[0] * v),
          pz = u * (a[1] * (1 - v) + b[1] * v);
        if (
          Math.abs(px) < 1.1 ||
          pz < -0.8 ||
          (px + 2.6) ** 2 + (pz - 2.5) ** 2 < 1.9
        )
          box(
            ground,
            [px, 0.052, pz],
            [0.38, 0.045, 0.29],
            [cream, light, "#e4cbb1"][(row + col) % 3],
            [0, ((row % 3) - 0.8) * 0.17, 0],
          );
      }
    mounts.find((m) => m.attachedTo === base)!.solutionAfter = [ground];
  }
  // Lower front fences leave the courtyard readable; rear walls enclose it.
  for (let edge = 0; edge < 6; edge++) {
    const a = vertices[edge],
      b = vertices[(edge + 1) % 6];
    for (let j = 0; j < 3; j++) {
      const u = (j + 0.5) / 3,
        x = (a[0] * (1 - u) + b[0] * u) * 0.91,
        z = (a[1] * (1 - u) + b[1] * u) * 0.91;
      const dx = ((b[0] - a[0]) * 0.91) / 3,
        dz = ((b[1] - a[1]) * 0.91) / 3,
        L = Math.hypot(dx, dz),
        rotation: Vector = [0, -Math.atan2(dz, dx), 0];
      const id = owner(`boundary-${edge}-${j}`, [x, 0.6, z]);
      if (edge < 3) {
        for (const end of [-0.45, 0.45]) {
          box(id, [x + dx * end, 0.59, z + dz * end], [0.18, 1.15, 0.18], wood);
          box(
            id,
            [x + dx * end, 1.19, z + dz * end],
            [0.25, 0.13, 0.25],
            cream,
          );
        }
        for (const y of [0.39, 0.88])
          box(id, [x, y, z], [L, 0.12, 0.12], honey, rotation);
        fix(
          id,
          [
            x + Math.sin(rotation[1]) * 0.075,
            0.88,
            z + Math.cos(rotation[1]) * 0.075,
          ],
          [Math.sin(rotation[1]), 0, Math.cos(rotation[1])],
        );
      } else {
        box(id, [x, 0.85, z], [L, 1.6, 0.36], mortar, rotation);
        for (let row = 0; row < 5; row++)
          for (let k = 0; k < 4; k++) {
            const along = ((k - 1.5) * L) / 4;
            box(
              id,
              [x + (dx / L) * along, 0.22 + row * 0.3, z + (dz / L) * along],
              [L / 4 - 0.02, 0.28, 0.41],
              (row + k) % 2 ? cream : stone,
              rotation,
            );
          }
        const top = owner(`battlement-${edge}-${j}`, [x, 1.75, z]);
        box(top, [x, 1.69, z], [L + 0.04, 0.15, 0.49], light, rotation);
        for (const k of [-1, 0, 1])
          box(
            top,
            [x + dx * k * 0.34, 1.96, z + dz * k * 0.34],
            [0.29, 0.42, 0.49],
            cream,
            rotation,
          );
        fix(
          top,
          edge === 5 && j === 2
            ? [x + dx * 0.34, 2.18, z + dz * 0.34]
            : [x, 2.18, z],
        );
        fix(id, [x, 1.64, z], [0, 1, 0], [top]);
      }
    }
  }
  const wallLeft = stoneWall(
    "gate-wall-left",
    [-2.48, 1.62, -1.95],
    [2.28, 3.15, 0.46],
    [0, 0, -1],
  );
  const wallRight = stoneWall(
    "gate-wall-right",
    [2.48, 1.62, -1.95],
    [2.28, 3.15, 0.46],
    [0, 0, -1],
  );
  for (const side of [-1, 1])
    for (let k = 0; k < 3; k++) {
      const x = side * (1.66 + k * 0.76),
        p = owner(`gate-parapet-${side}-${k}`, [x, 3.28, -1.95]);
      box(p, [x, 3.24, -1.95], [0.78, 0.18, 0.67], light);
      box(p, [x, 3.52, -1.95], [0.35, 0.43, 0.62], cream);
      fix(p, [x, 3.75, -1.95]);
    }
  for (const side of [-1, 1]) {
    const jamb = stoneWall(
      `gate-jamb-${side}`,
      [side * 1.2, 1.1, -1.9],
      [0.38, 2.18, 0.73],
    );
    mounts.find((m) => m.attachedTo === jamb)!.position = [
      side * 1.2,
      0.94,
      -1.48,
    ];
  }
  // Separate radial arch stones leave a genuine opening all the way through.
  for (let i = 0; i < 9; i++) {
    const a = (i * Math.PI) / 9,
      b = ((i + 1) * Math.PI) / 9,
      t = (a + b) / 2;
    const p = owner(`arch-stone-${i}`, [
      1.29 * Math.cos(t),
      2.13 + 1.29 * Math.sin(t),
      -1.95,
    ]);
    const s = new Shape();
    s.absarc(0, 0, 1.45, a, b, false);
    s.lineTo(1.1 * Math.cos(b), 1.1 * Math.sin(b));
    s.absarc(0, 0, 1.1, b, a, true);
    s.closePath();
    shape(
      p,
      smooth(
        new ExtrudeGeometry(s, {
          depth: 0.71,
          bevelEnabled: true,
          bevelSize: 0.018,
          bevelThickness: 0.018,
          bevelSegments: CASTLE_DETAIL.bevelSegments,
          curveSegments: CASTLE_DETAIL.curveSegments,
        }),
      ),
      [0, 2.13, -2.32],
      [1, 1, 1],
      i % 2 ? cream : light,
    );
    fix(p, [1.29 * Math.cos(t), 2.13 + 1.29 * Math.sin(t), -1.585], [0, 0, 1]);
  }
  const doors: CastlePartId[] = [];
  for (const side of [-1, 1]) {
    const p = owner(`gate-door-${side}`, [side * 0.54, 1.25, -2.05]);
    doors.push(p);
    const s = new Shape();
    s.moveTo(side < 0 ? -1.08 : 0, 0);
    s.lineTo(side < 0 ? 0 : 1.08, 0);
    for (let i = 0; i <= 24; i++) {
      const x = side < 0 ? (-i * 1.08) / 24 : 1.08 - (i * 1.08) / 24;
      s.lineTo(x, 2.1 + Math.sqrt(Math.max(0, 1.08 ** 2 - x * x)));
    }
    s.closePath();
    shape(
      p,
      smooth(
        new ExtrudeGeometry(s, {
          depth: 0.13,
          bevelEnabled: true,
          bevelThickness: 0.015,
          bevelSize: 0.015,
          bevelSegments: CASTLE_DETAIL.bevelSegments,
          curveSegments: CASTLE_DETAIL.curveSegments,
        }),
      ),
      [0, 0.05, -2.16],
      [1, 1, 1],
      wood,
    );
    for (const y of [0.55, 1.75])
      box(p, [side * 0.54, y, -2.015], [1.03, 0.1, 0.035], iron);
    fix(p, [side * 0.52, 1.15, -2.19], [0, 0, -1]);
  }
  const grille = owner("portcullis", [0, 1.6, -1.68]);
  for (let i = -3; i <= 3; i++) {
    const x = i * 0.31,
      h = 2.05 + Math.sqrt(Math.max(0, 1.05 ** 2 - x * x));
    box(grille, [x, h / 2 + 0.08, -1.68], [0.085, h, 0.09], iron);
    shape(
      grille,
      cone,
      [x, 0.03, -1.68],
      [0.09, 0.26, 0.09],
      iron,
      [Math.PI, 0, 0],
      "cone",
    );
  }
  for (const y of [0.57, 1.48, 2.34])
    box(grille, [0, y, -1.68], [2.03, 0.09, 0.1], iron);
  fix(grille, [0, 2.34, -1.615], [0, 0, 1]);
  for (let i = 0; i < 3; i++) {
    const p = owner(`drawbridge-${i}`, [0, 0.15, -0.9 + i * 0.65]);
    courtyard.push(p);
    planks(p, 0, 0.12, -0.9 + i * 0.65, 2.08, 0.63);
    for (const x of [-1, 1])
      box(p, [x, 0.13, -0.9 + i * 0.65], [0.11, 0.19, 0.65], iron);
    fix(p, [-0.65, 0.203, -0.9 + i * 0.65]);
    if (i === 1) fix(p, [0.65, 0.203, -0.9 + i * 0.65]);
  }
  for (const side of [-1, 1]) {
    const p = owner(`bridge-chain-${side}`, [side * 1.2, 1.2, -0.7]);
    for (let i = 0; i < 15; i++) {
      const t = i / 14;
      shape(
        p,
        ring,
        [side * (1.26 - 0.16 * t), 2.22 - 1.99 * t, -1.47 + 1.92 * t],
        [0.085, 0.12, 0.085],
        steel,
        [i % 2 ? Math.PI / 2 : 0, 0, 0.12],
        "ring",
      );
    }
    box(p, [side * 1.26, 2.3, -1.47], [0.28, 0.32, 0.1], iron);
    fix(p, [side * 1.26, 2.3, -1.405], [0, 0, 1]);
  }

  function tower(
    name: string,
    x: number,
    z: number,
    r: number,
    h: number,
    rows: number,
    roof: boolean,
  ) {
    const rings: CastlePartId[][] = [];
    const sectors = 4;
    for (let row = 0; row < rows; row++) {
      rings[row] = [];
      for (let sector = 0; sector < sectors; sector++) {
        const a = (sector * Math.PI) / 2 + 0.025,
          b = ((sector + 1) * Math.PI) / 2 - 0.025,
          t = (a + b) / 2,
          y = 0.08 + (row * h) / rows;
        const p = owner(`${name}-wall-${row}-${sector}`, [
          x,
          y + h / rows / 2,
          z,
        ]);
        rings[row].push(p);
        const window =
          name === "royal-keep" &&
          row === rows - 1 &&
          (sector === 0 || sector === 2);
        if (window) {
          arc(p, x, z, y, h / rows - 0.025, r - 0.24, r, a, t - 0.25, stone);
          arc(p, x, z, y, h / rows - 0.025, r - 0.24, r, t + 0.25, b, stone);
          arc(p, x, z, y, 0.43, r - 0.24, r, t - 0.25, t + 0.25, stone);
          arc(
            p,
            x,
            z,
            y + 1.3,
            h / rows - 1.325,
            r - 0.24,
            r,
            t - 0.25,
            t + 0.25,
            stone,
          );
          const pane = owner(`${name}-arched-window-${sector}`, [
            x + r * Math.cos(t),
            y + 0.87,
            z + r * Math.sin(t),
          ]);
          const frame = new Shape();
          frame.moveTo(-0.29, -0.43);
          frame.lineTo(0.29, -0.43);
          frame.lineTo(0.29, 0.14);
          frame.absarc(0, 0.14, 0.29, 0, Math.PI, false);
          frame.closePath();
          const hole = new Path();
          hole.moveTo(-0.19, -0.32);
          hole.lineTo(-0.19, 0.14);
          hole.absarc(0, 0.14, 0.19, Math.PI, 0, true);
          hole.lineTo(0.19, -0.32);
          hole.closePath();
          frame.holes.push(hole);
          const at: Vector = [
              x + (r + 0.025) * Math.cos(t),
              y + 0.87,
              z + (r + 0.025) * Math.sin(t),
            ],
            rotation: Vector = [0, Math.PI / 2 - t, 0];
          shape(
            pane,
            smooth(
              new ExtrudeGeometry(frame, {
                depth: 0.09,
                bevelEnabled: true,
                bevelSize: 0.018,
                bevelThickness: 0.018,
                bevelSegments: CASTLE_DETAIL.bevelSegments,
                curveSegments: CASTLE_DETAIL.curveSegments,
              }),
            ),
            at,
            [1, 1, 1],
            cream,
            rotation,
          );
          // The removable stone window insert seals the entire wall aperture,
          // including the corners around the arch and the bottom sill.
          box(
            pane,
            [at[0] - 0.065 * Math.cos(t), at[1], at[2] - 0.065 * Math.sin(t)],
            [0.64, 0.96, 0.055],
            cream,
            rotation,
          );
          box(
            pane,
            [
              at[0] - 0.02 * Math.cos(t),
              at[1] - 0.08,
              at[2] - 0.02 * Math.sin(t),
            ],
            [0.43, 0.66, 0.035],
            "#ffcb4e",
            rotation,
          );
          for (const j of [-1, 0, 1]) {
            const tangent: Vector = [
              Math.sin(t) * 0.12 * j,
              0,
              -Math.cos(t) * 0.12 * j,
            ];
            box(
              pane,
              [
                at[0] + tangent[0] + 0.05 * Math.cos(t),
                at[1] - 0.06,
                at[2] + tangent[2] + 0.05 * Math.sin(t),
              ],
              [0.025, 0.62, 0.025],
              darkWood,
              rotation,
            );
          }
          fix(
            pane,
            [
              at[0] + 0.12 * Math.cos(t),
              at[1] + 0.39,
              at[2] + 0.12 * Math.sin(t),
            ],
            [Math.cos(t), 0, Math.sin(t)],
          );
        } else arc(p, x, z, y, h / rows - 0.025, r - 0.24, r, a, b, stone);
        for (let line = 0; line < 4; line++)
          for (let k = 0; k < 5; k++) {
            const angle = a + ((k + 0.5) * (b - a)) / 5;
            if (window && Math.abs(angle - t) < 0.35 && line > 0 && line < 3)
              continue;
            box(
              p,
              [
                x + (r + 0.005) * Math.cos(angle),
                y + ((line + 0.5) * (h / rows - 0.025)) / 4,
                z + (r + 0.005) * Math.sin(angle),
              ],
              [
                2 * r * Math.sin((b - a) / 10) - 0.015,
                (h / rows - 0.025) / 4 - 0.025,
                0.045,
              ],
              (line + k) % 3 ? cream : light,
              [0, Math.PI / 2 - angle, 0],
            );
          }
        const inward = window || sector !== 0;
        const rr = inward ? r - 0.255 : r + 0.04;
        fix(
          p,
          [
            x + rr * Math.cos(t),
            y + (window ? 0.22 : (h / rows) * 0.52),
            z + rr * Math.sin(t),
          ],
          [Math.cos(t) * (inward ? -1 : 1), 0, Math.sin(t) * (inward ? -1 : 1)],
        );
      }
    }
    const caps: CastlePartId[] = [];
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 2 + 0.02,
        b = ((k + 1) * Math.PI) / 2 - 0.02,
        t = (a + b) / 2,
        p = owner(`${name}-crown-${k}`, [x, h + 0.1, z]);
      caps.push(p);
      arc(p, x, z, h + 0.065, 0.18, r - 0.34, r + 0.12, a, b, light);
      for (let j = 0; j < 3; j++) {
        const angle = a + ((j + 0.5) * (b - a)) / 3;
        box(
          p,
          [
            x + (r - 0.03) * Math.cos(angle),
            h + 0.45,
            z + (r - 0.03) * Math.sin(angle),
          ],
          [0.32, 0.5, 0.34],
          cream,
          [0, Math.PI / 2 - angle, 0],
        );
      }
      fix(p, [
        x + (r - 0.03) * Math.cos(t),
        h + 0.715,
        z + (r - 0.03) * Math.sin(t),
      ]);
    }
    const floor = owner(`${name}-deck`, [x, h + 0.12, z]);
    cyl(floor, [x, h + 0.09, z], r - 0.24, 0.14, honey);
    fix(floor, [x + 0.36, h + 0.17, z + 0.14]);
    const roofs: CastlePartId[] = [];
    if (roof) {
      for (let k = 0; k < 8; k++) {
        const t = ((k + 0.5) * Math.PI) / 4,
          a = (k * Math.PI) / 4,
          p = owner(`${name}-roof-${k}`, [x, h + 0.94, z]);
        roofs.push(p);
        roofParts.push(p);
        const g = smooth(
          new CylinderGeometry(
            0.025,
            r - 0.18,
            1.6,
            CASTLE_DETAIL.curveSegments,
            1,
            false,
            a,
            Math.PI / 4,
          ),
        );
        shape(p, g, [x, h + 1.04, z], [1, 1, 1], k % 2 ? crimson : red);
        for (let band = 1; band < 5; band++) {
          const v = band / 5,
            br = (r - 0.18) * (1 - v);
          const strip = smooth(
            new CylinderGeometry(
              br + 0.01,
              br + 0.03,
              0.045,
              CASTLE_DETAIL.curveSegments,
              1,
              false,
              a,
              Math.PI / 4,
            ),
          );
          shape(p, strip, [x, h + 0.24 + 1.6 * v, z], [1, 1, 1], red);
        }
        const radius = (r - 0.18) * 0.66;
        fix(
          p,
          [
            x + Math.sin(t) * radius,
            h + 0.24 + 1.6 * 0.34 + 0.025,
            z + Math.cos(t) * radius,
          ],
          [Math.sin(t), 0.63, Math.cos(t)],
        );
      }
      flag(`${name}-royal-flag`, x, h + 1.84, z);
    }
    for (let row = 0; row < rows; row++)
      for (const p of rings[row]) {
        const m = mounts.find((m) => m.attachedTo === p)!;
        m.solutionAfter =
          row === rows - 1 ? [...roofs, ...caps, floor] : rings[row + 1];
      }
    mounts.find((m) => m.attachedTo === floor)!.solutionAfter = roofs;
    return { body: rings.flat(), caps, floor, roofs };
  }
  const leftTower = tower("west-tower", -4.22, -1.75, 0.88, 3.12, 2, false);
  const keep = tower("royal-keep", 2.6, -3.0, 1.13, 5.15, 3, true);
  const eastTower = tower("east-tower", 4.55, -0.9, 0.84, 2.87, 2, false);
  // The open watch platform, red canopy and long ladder echo the reference.
  const watch = owner("watch-platform", [-3.35, 3.24, -2.05]);
  planks(watch, -3.35, 3.24, -2.05, 1.55, 1.45);
  fix(watch, [-3.35, 3.15, -2.05], [0, -1, 0]);
  for (const dx of [-0.65, 0.65])
    for (const dz of [-0.55, 0.55]) {
      const p = owner(`watch-post-${dx}-${dz}`, [-3.35 + dx, 3.87, -2.05 + dz]);
      box(p, pivots[p], [0.12, 1.3, 0.12], honey);
      fix(p, [-3.35 + dx, 3.7, -2.05 + dz + 0.07], [0, 0, 1]);
    }
  for (const side of [-1, 1]) {
    const p = owner(`watch-canopy-${side}`, [-3.35 + side * 0.4, 4.55, -2.05]);
    box(p, pivots[p], [0.9, 0.1, 1.65], red, [0, 0, -side * 0.3]);
    box(p, [-3.35 + side * 0.75, 4.4, -2.05], [0.05, 0.18, 1.68], gold);
    fix(p, [-3.35 + side * 0.42, 4.615, -2.05], [side * 0.3, 0.95, 0]);
  }
  flag("watch-flag", -3.3, 4.68, -2.0);
  const ladder = owner("siege-ladder", [-2.75, 1.76, -0.74]);
  for (const side of [-1, 1])
    beam(
      ladder,
      [-2.75 + side * 0.31, 0.13, 0.22],
      [-2.75 + side * 0.31, 3.5, -1.65],
      0.12,
      honey,
    );
  for (let i = 0; i < 10; i++)
    box(
      ladder,
      [-2.75, 0.25 + i * 0.32, 0.15 - i * 0.178],
      [0.72, 0.08, 0.1],
      wood,
    );
  fix(ladder, [-2.36, 1.85, -0.7], [1, 0, 0]);
  function banner(
    name: string,
    x: number,
    y: number,
    z: number,
    c: string,
    w = 0.62,
    h = 1.1,
  ) {
    const p = owner(name, [x, y, z]);
    const s = new Shape();
    s.moveTo(-w / 2, h / 2);
    s.lineTo(w / 2, h / 2);
    s.lineTo(w / 2, -h * 0.32);
    s.lineTo(0, -h / 2);
    s.lineTo(-w / 2, -h * 0.32);
    s.closePath();
    shape(
      p,
      smooth(
        new ExtrudeGeometry(s, {
          depth: 0.035,
          bevelEnabled: true,
          bevelThickness: 0.007,
          bevelSize: 0.012,
          bevelSegments: CASTLE_DETAIL.bevelSegments,
          curveSegments: CASTLE_DETAIL.curveSegments,
        }),
      ),
      [x, y, z],
      [1, 1, 1],
      gold,
    );
    shape(
      p,
      smooth(new ExtrudeGeometry(s, { depth: 0.04, bevelEnabled: false })),
      [x, y + 0.025, z + 0.025],
      [0.85, 0.87, 1],
      c,
    );
    box(p, [x, y + h / 2 + 0.04, z], [w + 0.16, 0.08, 0.1], darkWood);
    ball(p, [x, y + 0.1, z + 0.08], [0.09, 0.18, 0.035], gold);
    fix(p, [x, y + h * 0.36, z + 0.09], [0, 0, 1]);
    return p;
  }
  banner("lion-banner-left", -2.13, 2.12, -1.6, red);
  banner("lion-banner-right", 2.13, 2.12, -1.6, red);
  banner("west-blue-pennant", -4.22, 2.0, -0.83, blue, 0.49, 1.2);
  banner("east-gold-pennant", 4.55, 2.0, -0.04, blue, 0.49, 1.2);
  function shield(name: string, x: number, y: number, z: number, c: string) {
    const p = banner(name, x, y, z, c, 0.62, 0.76);
    for (const side of [-1, 1])
      beam(
        p,
        [x - side * 0.17, y - 0.15, z + 0.095],
        [x + side * 0.17, y + 0.22, z + 0.095],
        0.055,
        steel,
      );
    return p;
  }
  shield("royal-shield", 0, 3.62, -1.48, blue);
  shield("armour-shield", 3.28, 1.48, -1.5, red);
  for (const side of [-1, 1]) {
    const x = side * 1.76,
      p = owner(`wall-brazier-${side}`, [x, 1.4, -1.52]);
    beam(p, [x, 1.0, -1.58], [x, 1.4, -1.25], 0.075, iron);
    cyl(p, [x, 1.43, -1.25], 0.15, 0.16, iron);
    for (let i = 0; i < 3; i++)
      ball(
        p,
        [x + (i - 1) * 0.055, 1.65 + (i % 2) * 0.06, -1.25],
        [0.075, 0.22, 0.075],
        i % 2 ? "#ffe477" : "#ff8d24",
      );
    fix(p, [x, 1.02, -1.5], [0, 0, 1]);
  }
  // A roofed room behind the gate provides a second natural interior layer.
  const roomFloor = owner("hall-floor", [-0.85, 0.12, -3.62]);
  planks(roomFloor, -0.85, 0.08, -3.62, 2.9, 1.65);
  fix(roomFloor, [-0.85, 0.155, -3.62]);
  const hallWalls: CastlePartId[] = [];
  for (const side of [-1, 1]) {
    const p = owner(`hall-side-${side}`, [-0.85 + side * 1.48, 1.05, -3.62]);
    hallWalls.push(p);
    box(p, pivots[p], [0.17, 1.8, 1.75], cream);
    fix(p, [-0.85 + side * 1.38, 1.45, -3.62], [-side, 0, 0]);
  }
  hallWalls.push(
    stoneWall("hall-back", [-0.85, 1.02, -4.46], [2.9, 1.78, 0.19]),
  );
  const hallRoofs: CastlePartId[] = [];
  for (const side of [-1, 1])
    for (let k = 0; k < 3; k++) {
      const p = owner(`hall-roof-${side}-${k}`, [
        -0.85 + side * 0.76,
        2.15,
        -4.16 + k * 0.55,
      ]);
      hallRoofs.push(p);
      roofParts.push(p);
      box(p, pivots[p], [1.65, 0.12, 0.56], k % 2 ? red : crimson, [
        0,
        0,
        -side * 0.3,
      ]);
      for (let j = 0; j < 5; j++)
        box(
          p,
          [-0.85 + side * (0.14 + j * 0.3), 2.39 - j * 0.09, -4.16 + k * 0.55],
          [0.3, 0.045, 0.57],
          red,
          [0, 0, -side * 0.3],
        );
      fix(
        p,
        [-0.85 + side * 0.8, 2.24, -4.16 + k * 0.55],
        [side * 0.3, 0.95, 0],
      );
    }
  hallWalls.forEach(
    (id) =>
      (mounts.find((m) => m.attachedTo === id)!.solutionAfter = hallRoofs),
  );
  const throne = owner("throne-frame", [-1.55, 0.65, -4.05]);
  box(throne, [-1.55, 0.48, -4.05], [0.63, 0.18, 0.52], honey);
  box(throne, [-1.55, 0.95, -4.24], [0.66, 1.15, 0.14], gold);
  for (const dx of [-0.25, 0.25]) {
    box(throne, [-1.55 + dx, 0.27, -4.05], [0.1, 0.45, 0.1], wood);
    ball(throne, [-1.55 + dx, 1.56, -4.24], [0.075, 0.075, 0.075], gold);
  }
  fix(throne, [-1.55, 0.98, -4.33], [0, 0, -1]);
  const cushion = owner("throne-cushion", [-1.55, 0.62, -4.01]);
  box(cushion, pivots[cushion], [0.52, 0.16, 0.4], crimson);
  fix(cushion, [-1.55, 0.71, -4.01]);
  const table = owner("hall-table", [-0.15, 0.57, -3.47]);
  box(table, [-0.15, 0.62, -3.47], [0.88, 0.12, 0.63], honey);
  for (const dx of [-0.31, 0.31])
    box(table, [-0.15 + dx, 0.31, -3.47], [0.11, 0.56, 0.46], wood);
  fix(table, [0.3, 0.6, -3.47], [1, 0, 0]);
  const map = owner("royal-map", [-0.15, 0.7, -3.47]);
  box(map, pivots[map], [0.61, 0.045, 0.42], light);
  for (const x of [-0.43, 0.13])
    cyl(map, [x, 0.735, -3.47], 0.04, 0.49, cream, [Math.PI / 2, 0, 0]);
  fix(map, [-0.15, 0.731, -3.47]);
  const candle = owner("hall-candle", [-1.02, 0.43, -3.12]);
  cyl(candle, [-1.02, 0.25, -3.12], 0.17, 0.28, honey);
  cyl(candle, [-1.02, 0.46, -3.12], 0.055, 0.25, light);
  ball(candle, [-1.02, 0.63, -3.12], [0.035, 0.08, 0.035], gold);
  fix(candle, [-1.02, 0.22, -2.94], [0, 0, 1]);
  const weaponBox = owner("armour-box", [0.43, 0.29, -4.07]);
  box(weaponBox, pivots[weaponBox], [0.59, 0.43, 0.54], wood);
  for (const x of [0.2, 0.66])
    beam(weaponBox, [x, 0.46, -4.07], [x, 0.99, -4.03], 0.065, steel);
  fix(weaponBox, [0.43, 0.29, -3.79], [0, 0, 1]);

  // Courtyard market: striped canvas, produce and small hand-crafted wares.
  const sx = -3.9,
    sz = 1.26,
    stallFloor = owner("market-floor", [sx, 0.16, sz]);
  planks(stallFloor, sx, 0.12, sz, 1.65, 1.65);
  fix(stallFloor, [sx, 0.03, sz], [0, -1, 0]);
  for (const dx of [-0.68, 0.68])
    for (const dz of [-0.68, 0.68]) {
      const p = owner(`market-post-${dx}-${dz}`, [sx + dx, 1.02, sz + dz]);
      box(p, pivots[p], [0.11, 1.8, 0.11], wood);
      fix(p, [sx + dx, 1.1, sz + dz + 0.068], [0, 0, 1]);
    }
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4,
      t = a + Math.PI / 8,
      p = owner(`market-canopy-${k}`, [sx, 2.16, sz]);
    roofParts.push(p);
    shape(
      p,
      smooth(
        new CylinderGeometry(
          0.03, 1.2, 0.63, CASTLE_DETAIL.curveSegments, 1, false, a, Math.PI / 4,
        ),
      ),
      [sx, 2.16, sz],
      [1, 1, 1],
      k % 2 ? light : red,
    );
    ball(
      p,
      [sx + 1.1 * Math.sin(t), 1.87, sz + 1.1 * Math.cos(t)],
      [0.2, 0.11, 0.13],
      k % 2 ? light : red,
    );
    fix(
      p,
      [sx + 0.8 * Math.sin(t), 2.08, sz + 0.8 * Math.cos(t)],
      [Math.sin(t), 1.85, Math.cos(t)],
    );
  }
  const finial = owner("market-finial", [sx, 2.58, sz]);
  cyl(finial, [sx, 2.54, sz], 0.055, 0.2, gold);
  ball(finial, [sx, 2.69, sz], [0.08, 0.11, 0.08], gold);
  fix(finial, [sx, 2.58, sz + 0.064], [0, 0, 1]);
  const counter = owner("market-counter", [sx, 0.75, sz + 0.1]);
  box(counter, pivots[counter], [1.35, 0.13, 0.67], honey);
  box(counter, [sx, 0.45, sz + 0.1], [1.17, 0.5, 0.5], wood);
  fix(counter, [sx, 0.73, sz + 0.45], [0, 0, 1]);
  for (let k = 0; k < 3; k++) {
    const x = sx + (k - 1) * 0.43,
      p = owner(`market-wares-${k}`, [x, 0.91, sz + 0.08]);
    box(p, [x, 0.85, sz + 0.08], [0.35, 0.065, 0.47], darkWood);
    if (k === 0) {
      for (let j = 0; j < 4; j++)
        ball(
          p,
          [
            x + ((j % 2) - 0.5) * 0.11,
            0.94,
            sz + 0.02 + Math.floor(j / 2) * 0.16,
          ],
          [0.09, 0.09, 0.09],
          "#d99d5e",
        );
    } else if (k === 1) {
      cyl(p, [x, 0.97, sz + 0.08], 0.1, 0.24, "#428da9");
      cyl(p, [x, 1.14, sz + 0.08], 0.042, 0.12, "#64c7c7");
    } else
      for (let j = 0; j < 3; j++)
        ball(
          p,
          [x, 0.95 + j * 0.08, sz + 0.08],
          [0.11, 0.08, 0.11],
          j % 2 ? "#d84a43" : "#f3bc41",
        );
    fix(p, [x, 0.85, sz + 0.33], [0, 0, 1]);
  }
  const bell = owner("market-bell", [sx - 0.67, 1.57, sz + 0.64]);
  shape(bell, cone, pivots[bell], [0.15, 0.2, 0.15], gold, undefined, "cone");
  ball(bell, [sx - 0.67, 1.44, sz + 0.64], [0.045, 0.045, 0.045], gold);
  fix(bell, [sx - 0.67, 1.7, sz + 0.64]);

  function wheel(
    name: string,
    x: number,
    y: number,
    z: number,
    r = 0.34,
    outward = 1,
  ) {
    const p = owner(name, [x, y, z]);
    cyl(p, [x, y, z], r, 0.15, darkWood, [0, 0, Math.PI / 2]);
    cyl(p, [x + outward * 0.085, y, z], r * 0.8, 0.04, honey, [
      0,
      0,
      Math.PI / 2,
    ]);
    for (let k = 0; k < 8; k++) {
      const t = (k * Math.PI) / 4;
      beam(
        p,
        [x + outward * 0.115, y, z],
        [
          x + outward * 0.115,
          y + Math.sin(t) * r * 0.73,
          z + Math.cos(t) * r * 0.73,
        ],
        0.045,
        wood,
      );
    }
    cyl(p, [x + outward * 0.12, y, z], 0.085, 0.08, iron, [0, 0, Math.PI / 2]);
    fix(p, [x + outward * 0.165, y, z], [outward, 0, 0]);
    return p;
  }
  const cx = -2.3,
    cz = 3.0,
    catapult = owner("catapult-bed", [cx, 0.48, cz]);
  courtyard.push(catapult);
  planks(catapult, cx, 0.45, cz, 1.25, 1.65);
  for (const side of [-1, 1])
    beam(
      catapult,
      [cx + side * 0.52, 0.42, cz - 0.68],
      [cx + side * 0.52, 0.42, cz + 0.68],
      0.18,
      wood,
    );
  box(catapult, [cx, 0.42, cz - 0.71], [1.2, 0.25, 0.2], wood);
  fix(catapult, [cx, 0.42, cz - 0.82], [0, 0, -1]);
  for (const side of [-1, 1])
    for (const end of [-1, 1])
      wheel(
        `catapult-wheel-${side}-${end}`,
        cx + side * 0.74,
        0.36,
        cz + end * 0.55,
        0.34,
        side,
      );
  for (const side of [-1, 1]) {
    const p = owner(`catapult-frame-${side}`, [cx + side * 0.46, 1.0, cz]);
    beam(
      p,
      [cx + side * 0.46, 0.51, cz - 0.62],
      [cx + side * 0.46, 1.56, cz],
      0.17,
      honey,
    );
    beam(
      p,
      [cx + side * 0.46, 0.51, cz + 0.62],
      [cx + side * 0.46, 1.56, cz],
      0.17,
      honey,
    );
    box(p, [cx + side * 0.46, 1.48, cz], [0.25, 0.27, 0.3], iron);
    fix(p, [cx + side * 0.56, 0.85, cz + 0.42], [side, 0, 0]);
  }
  const arm = owner("catapult-throwing-arm", [cx, 1.54, cz]);
  beam(arm, [cx, 0.95, cz + 0.6], [cx, 2.13, cz - 0.9], 0.2, honey);
  cyl(arm, [cx, 1.54, cz], 0.17, 1.12, wood, [0, 0, Math.PI / 2]);
  fix(arm, [cx + 0.58, 1.54, cz], [1, 0, 0]);
  const cup = owner("catapult-spoon", [cx, 2.13, cz - 0.9]);
  shape(
    cup,
    smooth(
      new LatheGeometry(
        [
          [0, -0.08],
          [0.16, -0.07],
          [0.28, 0],
          [0.34, 0.16],
          [0.3, 0.16],
          [0.25, 0.02],
          [0.13, -0.03],
          [0, -0.03],
        ].map((p) => new Vector2(...p)),
        CASTLE_DETAIL.radialSegments,
      ),
    ),
    pivots[cup],
    [1, 1, 1],
    steel,
  );
  fix(cup, [cx, 2.115, cz - 0.9]);
  const winch = owner("catapult-winch", [cx, 0.72, cz + 0.54]);
  cyl(winch, pivots[winch], 0.13, 0.65, wood, [0, 0, Math.PI / 2]);
  for (let i = 0; i < 10; i++)
    hoop(winch, [cx - 0.27 + i * 0.06, 0.72, cz + 0.54], 0.135, cream, [
      0,
      Math.PI / 2,
      0,
    ]);
  fix(winch, [cx, 0.72, cz + 0.69], [0, 0, 1]);
  const basket = owner("stone-basket", [-3.82, 0.3, 3.87]);
  cyl(basket, pivots[basket], 0.4, 0.4, honey);
  for (let i = 0; i < 20; i++) {
    const t = (i * Math.PI) / 10;
    box(
      basket,
      [-3.82 + 0.39 * Math.cos(t), 0.31, 3.87 + 0.39 * Math.sin(t)],
      [0.042, 0.4, 0.042],
      wood,
    );
  }
  for (const y of [0.16, 0.43]) hoop(basket, [-3.82, y, 3.87], 0.4, honey);
  for (let i = 0; i < 8; i++)
    ball(
      basket,
      [
        -3.82 + ((i % 3) - 1) * 0.19,
        0.49 + Math.floor(i / 4) * 0.12,
        3.87 + (Math.floor(i / 3) - 1) * 0.16,
      ],
      [0.13, 0.13, 0.13],
      steel,
    );
  fix(basket, [-3.82, 0.3, 4.29], [0, 0, 1]);

  const wx = 2.98,
    wz = 2.82,
    bed = owner("hay-wagon-bed", [wx, 0.59, wz]);
  courtyard.push(bed);
  planks(bed, wx, 0.59, wz, 1.34, 1.75);
  fix(bed, [wx, 0.665, wz], [0, 1, 0]);
  for (const side of [-1, 1]) {
    const p = owner(`hay-wagon-side-${side}`, [wx + side * 0.68, 0.87, wz]);
    for (let j = 0; j < 3; j++)
      box(
        p,
        [wx + side * 0.68, 0.71 + j * 0.16, wz],
        [0.12, 0.14, 1.81],
        j % 2 ? wood : honey,
      );
    for (const end of [-1, 1])
      box(
        p,
        [wx + side * 0.7, 0.84, wz + end * 0.74],
        [0.15, 0.67, 0.13],
        honey,
      );
    fix(p, [wx + side * 0.76, 0.87, wz], [side, 0, 0]);
  }
  for (const end of [-1, 1]) {
    const p = owner(`hay-wagon-end-${end}`, [wx, 0.86, wz + end * 0.86]);
    box(p, pivots[p], [1.25, 0.49, 0.12], wood);
    fix(p, [wx, 0.86, wz + end * 0.93], [0, 0, end]);
  }
  for (const side of [-1, 1])
    for (const end of [-1, 1])
      wheel(
        `wagon-wheel-${side}-${end}`,
        wx + side * 0.84,
        0.38,
        wz + end * 0.6,
        0.36,
        side,
      );
  const tow = owner("wagon-tow-bar", [wx, 0.44, wz + 0.98]);
  beam(tow, [wx, 0.43, wz + 0.6], [wx, 0.48, wz + 1.45], 0.1, honey);
  fix(tow, [wx, 0.54, wz + 1.35]);
  for (let k = 0; k < 3; k++) {
    const z = wz + (k - 1) * 0.49,
      p = owner(`hay-bale-${k}`, [wx, 1.18, z]);
    box(p, pivots[p], [1.19, 0.44, 0.47], gold);
    for (let i = 0; i < 15; i++)
      curve(
        p,
        [
          [wx - 0.57, 1.16 + (i % 3) * 0.03, z + ((i % 5) - 2) * 0.075],
          [wx, 1.42, z + ((i % 5) - 2) * 0.075],
          [wx + 0.57, 1.16 + (i % 3) * 0.03, z + ((i % 5) - 2) * 0.075],
        ],
        0.008,
        "#ffe99a",
      );
    for (const x of [wx - 0.31, wx + 0.31])
      box(p, [x, 1.4, z], [0.035, 0.02, 0.48], honey);
    fix(p, [wx + 0.6, 1.2, z], [1, 0, 0]);
  }
  for (let k = 0; k < 2; k++) {
    const x = 2.03 + k * 1.23,
      z = 0.28 + k * 0.33,
      body = owner(`training-dummy-${k}`, [x, 0.83, z]);
    courtyard.push(body);
    cyl(body, [x, 0.76, z], 0.22, 0.69, honey);
    beam(body, [x - 0.33, 1.1, z], [x + 0.33, 1.1, z], 0.1, wood);
    beam(body, [x, 0.11, z], [x, 1.26, z], 0.1, darkWood);
    box(body, [x, 0.11, z], [0.58, 0.1, 0.41], wood);
    fix(body, [x, 0.77, z + 0.23], [0, 0, 1]);
    const target = owner(`training-target-${k}`, [x, 0.87, z + 0.29]);
    cyl(target, pivots[target], 0.34, 0.11, gold, [Math.PI / 2, 0, 0]);
    cyl(target, [x, 0.87, z + 0.355], 0.24, 0.022, red, [Math.PI / 2, 0, 0]);
    cyl(target, [x, 0.87, z + 0.374], 0.14, 0.023, gold, [Math.PI / 2, 0, 0]);
    fix(target, [x, 0.87, z + 0.4], [0, 0, 1]);
    const head = owner(`training-head-${k}`, [x, 1.42, z]);
    ball(head, pivots[head], [0.19, 0.21, 0.18], "#f7c68d");
    for (const dx of [-0.065, 0.065])
      ball(head, [x + dx, 1.45, z + 0.17], [0.025, 0.03, 0.014], darkWood);
    fix(head, [x, 1.42, z - 0.2], [0, 0, -1]);
    const helmet = owner(`training-helmet-${k}`, [x, 1.53, z]);
    shape(
      helmet,
      smooth(
        new SphereGeometry(
          1, CASTLE_DETAIL.radialSegments, CASTLE_DETAIL.sphereRings,
          0, Math.PI * 2, 0, Math.PI / 2,
        ),
      ),
      pivots[helmet],
      [0.23, 0.22, 0.22],
      steel,
    );
    box(helmet, [x, 1.56, z + 0.21], [0.32, 0.1, 0.04], iron);
    beam(helmet, [x, 1.52, z - 0.2], [x, 1.77, z], 0.035, iron);
    fix(helmet, [x, 1.75, z]);
  }
  const rack = owner("spear-rack", [4.4, 0.8, 0.75]);
  for (const dx of [-0.52, 0.52])
    box(rack, [4.4 + dx, 0.69, 0.75], [0.11, 1.18, 0.15], wood);
  box(rack, [4.4, 1.1, 0.75], [1.18, 0.13, 0.16], honey);
  for (let k = 0; k < 5; k++) {
    const x = 3.98 + k * 0.21;
    beam(rack, [x, 0.17, 0.7], [x, 1.72, 0.7], 0.035, wood);
    shape(
      rack,
      cone,
      [x, 1.83, 0.7],
      [0.07, 0.25, 0.05],
      steel,
      undefined,
      "cone",
    );
  }
  fix(rack, [4.4, 1.1, 0.85], [0, 0, 1]);
  function barrel(name: string, x: number, z: number, r: number, h: number) {
    const p = owner(`${name}-staves`, [x, h / 2, z]);
    cyl(p, [x, 0.1, z], r, 0.09, wood);
    for (let i = 0; i < 24; i++) {
      const t = (i * Math.PI) / 12;
      box(
        p,
        [
          x + (r - 0.04) * Math.cos(t),
          h / 2 + 0.1,
          z + (r - 0.04) * Math.sin(t),
        ],
        [0.075, h, 0.12],
        i % 2 ? wood : honey,
        [0, Math.PI / 2 - t, 0],
      );
    }
    for (const y of [0.2, h * 0.53, h + 0.02]) hoop(p, [x, y, z], r, iron);
    fix(p, [x, 0.15, z]);
    const lid = owner(`${name}-lid`, [x, h + 0.13, z]);
    cyl(lid, pivots[lid], r - 0.035, 0.09, honey);
    for (let i = -2; i <= 2; i++)
      box(
        lid,
        [x + i * r * 0.32, h + 0.18, z],
        [
          0.012,
          0.01,
          Math.sqrt(Math.max(0, r * r - (i * r * 0.32) ** 2)) * 1.8,
        ],
        wood,
      );
    fix(lid, [x, h + 0.185, z]);
    mounts.find((m) => m.attachedTo === p)!.solutionAfter = [lid];
    return [p, lid];
  }
  barrel("ale-barrel", 4.72, 1.86, 0.39, 0.77);
  barrel("courtyard-barrel", 1.17, 2.25, 0.36, 0.67);
  const chest = owner("treasure-body", [0.7, 0.4, 3.83]);
  box(chest, pivots[chest], [1.08, 0.53, 0.67], wood);
  for (const x of [0.26, 1.14])
    box(chest, [x, 0.41, 3.83], [0.1, 0.57, 0.74], iron);
  fix(chest, [0.7, 0.4, 3.47], [0, 0, -1]);
  const lid = owner("treasure-lid", [0.7, 0.75, 3.83]);
  box(lid, pivots[lid], [1.12, 0.22, 0.72], honey);
  box(lid, [0.7, 0.88, 3.83], [0.4, 0.055, 0.75], red);
  for (const x of [0.26, 1.14])
    box(lid, [x, 0.88, 3.83], [0.1, 0.045, 0.75], iron);
  fix(lid, [0.7, 0.89, 3.66]);
  const lock = owner("treasure-lock", [0.7, 0.6, 4.2]);
  box(lock, pivots[lock], [0.2, 0.27, 0.075], iron);
  ball(lock, [0.7, 0.62, 4.245], [0.025, 0.05, 0.01], darkWood);
  fix(lock, [0.7, 0.52, 4.25], [0, 0, 1]);
  for (const [k, x, z] of [
    [0, -4.9, 2.53],
    [1, -4.35, 0.2],
    [2, 3.52, 4.3],
    [3, 4.83, -0.16],
  ]) {
    const p = owner(`flower-planter-${k}`, [x, 0.24, z]);
    box(p, [x, 0.2, z], [0.82, 0.32, 0.59], wood);
    for (const dx of [-0.3, 0.3])
      box(p, [x + dx, 0.22, z], [0.06, 0.38, 0.64], honey);
    for (let j = 0; j < 7; j++) {
      const px = x + Math.sin(j * 2.4) * 0.27,
        pz = z + Math.cos(j * 2.4) * 0.19;
      beam(p, [px, 0.31, pz], [px, 0.52 + (j % 2) * 0.1, pz], 0.025, leafGreen);
      shape(p, leaves, [px, 0.44, pz], [0.17, 0.07, 0.12], green);
      for (let t = 0; t < 5; t++)
        ball(
          p,
          [
            px + Math.cos((t * Math.PI * 2) / 5) * 0.07,
            0.59 + (j % 2) * 0.1,
            pz + Math.sin((t * Math.PI * 2) / 5) * 0.07,
          ],
          [0.075, 0.036, 0.06],
          k < 2 ? "#b263ef" : "#ef4359",
        );
      ball(p, [px, 0.62 + (j % 2) * 0.1, pz], [0.038, 0.025, 0.038], gold);
    }
    fix(p, [x, 0.21, z + 0.32], [0, 0, 1]);
  }
  for (const [k, x, z] of [
    [0, -1.45, 4.37],
    [1, 4.56, 3.3],
  ]) {
    const p = owner(`supply-crate-${k}`, [x, 0.36, z]);
    box(p, pivots[p], [0.65, 0.63, 0.62], honey);
    for (const side of [-1, 1])
      beam(
        p,
        [x - side * 0.26, 0.12, z + 0.325],
        [x + side * 0.26, 0.61, z + 0.325],
        0.065,
        wood,
      );
    box(p, [x, 0.71, z], [0.7, 0.09, 0.67], wood);
    fix(p, [x, 0.36, z + 0.37], [0, 0, 1]);
  }
  // Ivy grows on the tall keep; it is one removable living layer per vine.
  for (let k = 0; k < 2; k++) {
    const x = 2.6 + (k ? -0.72 : 0.66),
      z = -2.1,
      p = owner(`keep-ivy-${k}`, [x, 3.2, z]);
    curve(
      p,
      [
        [x, 0.4, z],
        [x - 0.1, 2, z],
        [x + 0.1, 3.7, z - 0.12],
        [x, 4.85, z - 0.15],
      ],
      0.025,
      green,
    );
    for (let j = 0; j < 18; j++)
      shape(
        p,
        leaves,
        [x + Math.sin(j * 1.8) * 0.13, 0.52 + j * 0.23, z + Math.cos(j) * 0.03],
        [0.12, 0.18, 0.06],
        j % 2 ? leafGreen : green,
        [0, 0, (j % 2 ? 1 : -1) * 0.55],
      );
    box(p, [x, 0.73, z + 0.045], [0.17, 0.18, 0.035], green);
    fix(p, [x, 0.73, z + 0.09], [0, 0, 1]);
  }
  // Lantern, shields and flowering borders bring life without adding covers
  // that have no architectural reason to be there.
  const lamp = owner("courtyard-lantern", [4.98, 1.32, 0.12]);
  box(lamp, [4.98, 1.03, 0.12], [0.28, 0.35, 0.28], gold);
  for (const dx of [-0.14, 0.14])
    for (const dz of [-0.14, 0.14])
      box(lamp, [4.98 + dx, 1.03, 0.12 + dz], [0.035, 0.39, 0.035], iron);
  shape(
    lamp,
    cone,
    [4.98, 1.29, 0.12],
    [0.23, 0.19, 0.23],
    iron,
    undefined,
    "cone",
  );
  beam(lamp, [4.98, 1.44, 0.12], [4.98, 1.44, -0.25], 0.09, wood);
  beam(lamp, [4.98, 0.1, -0.25], [4.98, 1.49, -0.25], 0.13, wood);
  fix(lamp, [4.98, 0.74, -0.175], [0, 0, 1]);
  // Bind roofs to their supports only for the generator's conservative peel.
  // Actual mesh/extraction tests, not this list, decide what players may click.
  mounts.find((m) => m.attachedTo === wallLeft)!.solutionAfter = leftTower.caps;
  mounts.find((m) => m.attachedTo === wallRight)!.solutionAfter =
    eastTower.caps;
  fix(wallLeft, [-2.0, 0.6, -2.232], [0, 0, -1]);
  fix(wallRight, [2.0, 0.6, -1.668], [0, 0, 1]);
  mounts.find((m) => m.attachedTo === wallRight)!.solutionAfter = [
    ...keep.roofs,
    ...keep.caps,
    keep.floor,
    ...keep.body.filter((id) => id.includes("-wall-2-")),
  ];
  mounts.find((m) => m.attachedTo === roomFloor)!.solutionAfter = [
    ...hallWalls,
    ...hallRoofs,
    throne,
    table,
  ];
  for (const id of doors)
    mounts.find((m) => m.attachedTo === id)!.solutionAfter = [...hallRoofs];
  for (const id of [throne, cushion, table, map, candle, weaponBox])
    mounts.find((m) => m.attachedTo === id)!.solutionAfter = [...hallRoofs];
  mounts.find((m) => m.attachedTo === bed)!.solutionAfter = [
    "castle-hay-bale-0",
    "castle-hay-bale-1",
    "castle-hay-bale-2",
  ];
  const gateWinch = owner("gate-winch", [-1.62, 2.94, -1.48]);
  for (const sector of [0, 2]) {
    const mount = mounts.find(
      (m) => m.attachedTo === `castle-royal-keep-wall-2-${sector}`,
    )!;
    mount.solutionAfter = [
      ...(mount.solutionAfter ?? []),
      `castle-royal-keep-arched-window-${sector}`,
    ];
  }
  cyl(gateWinch, [-1.62, 2.94, -1.48], 0.15, 0.22, honey, [Math.PI / 2, 0, 0]);
  beam(gateWinch, [-1.62, 2.94, -1.33], [-1.43, 3.08, -1.33], 0.045, iron);
  fix(gateWinch, [-1.62, 2.94, -1.35], [0, 0, 1]);
  return {
    model: {
      pieces,
      pivots,
      parts: Object.keys(pivots) as CastlePartId[],
      structural,
      roofParts,
      courtyard,
      terrain,
    },
    mounts,
    detail: CASTLE_DETAIL,
  };
}
