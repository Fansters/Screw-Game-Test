import {
  CatmullRomCurve3,
  CylinderGeometry,
  Euler,
  ExtrudeGeometry,
  BufferGeometry,
  Float32BufferAttribute,
  IcosahedronGeometry,
  Matrix3,
  Mesh,
  MeshBasicMaterial,
  DoubleSide,
  Quaternion,
  Raycaster,
  Shape,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector3,
} from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { createOasisPlan, OASIS_COLORS } from "./oasisPlan.ts";
import type { OasisNode } from "./oasisPlan.ts";
import type { OasisPartId, Screw } from "../game/types.ts";
import type { Piece, Vector } from "./houseModel.ts";
export const OASIS_DETAIL = {
  radialSegments: 20,
  sphereRings: 10,
  bevelSegments: 1,
} as const;
export function createOasisModel() {
  const plan = createOasisPlan(),
    pieces: Piece[] = [],
    pivots: Partial<Record<OasisPartId, Vector>> = {},
    anchors = new Map<string, Piece>(),
    tenons = new Map<string, Piece>(),
    C = OASIS_COLORS;
  const smooth = (g: BufferGeometry) => {
    g.setAttribute(
      "color",
      new Float32BufferAttribute(
        new Float32Array(g.getAttribute("position").count * 3).fill(1),
        3,
      ),
    );
    return g;
  };
  const rounded = smooth(new RoundedBoxGeometry(1, 1, 1, 1, 0.085)),
    sphere = smooth(new SphereGeometry(1, 20, 10)),
    cylinder = smooth(new CylinderGeometry(1, 1, 1, 24)),
    ring = smooth(new TorusGeometry(1, 0.065, 8, 28)),
    rock = new IcosahedronGeometry(1, 1);
  function shape(
    n: OasisNode,
    g: BufferGeometry,
    at: Vector,
    size: Vector,
    color: string,
    rotation?: Vector,
    kind: Piece["kind"] = "box",
  ) {
    const p: Piece = {
      part: `oasis-${n.key}`,
      geometry: g,
      kind,
      position: at,
      size,
      color,
      rotation,
    };
    pieces.push(p);
    if (!anchors.has(n.key)) anchors.set(n.key, p);
    return p;
  }
  const box = (
    n: OasisNode,
    at: Vector,
    size: Vector,
    color: string,
    rot?: Vector,
  ) => shape(n, rounded, at, size, color, rot);
  const ball = (n: OasisNode, at: Vector, size: Vector, color: string) =>
    shape(n, sphere, at, size, color, undefined, "ico-detail");
  const cyl = (
    n: OasisNode,
    at: Vector,
    r: number,
    h: number,
    color: string,
    rot?: Vector,
  ) => shape(n, cylinder, at, [r, h, r], color, rot, "cylinder");
  function beam(n: OasisNode, a: Vector, b: Vector, w: number, color: string) {
    const A = new Vector3(...a),
      B = new Vector3(...b),
      d = B.clone().sub(A),
      q = new Quaternion().setFromUnitVectors(
        new Vector3(0, 1, 0),
        d.clone().normalize(),
      );
    box(
      n,
      A.add(B).multiplyScalar(0.5).toArray(),
      [w, d.length(), w],
      color,
      new Euler().setFromQuaternion(q).toArray().slice(0, 3) as Vector,
    );
  }
  function curve(n: OasisNode, points: Vector[], r: number, color: string) {
    shape(
      n,
      smooth(
        new TubeGeometry(
          new CatmullRomCurve3(points.map((p) => new Vector3(...p))),
          16,
          r,
          8,
          false,
        ),
      ),
      [0, 0, 0],
      [1, 1, 1],
      color,
    );
  }
  function hoop(
    n: OasisNode,
    at: Vector,
    r: number,
    color: string,
    rot: Vector = [Math.PI / 2, 0, 0],
  ) {
    shape(n, ring, at, [r, r, r], color, rot, "ring");
  }
  function flower(
    n: OasisNode,
    x: number,
    y: number,
    z: number,
    s: number,
    color: string,
  ) {
    for (let i = 0; i < 5; i++) {
      const a = (i * Math.PI * 2) / 5;
      ball(
        n,
        [x + Math.cos(a) * s * 0.7, y + 0.04, z + Math.sin(a) * s * 0.7],
        [s * 0.55, s * 0.27, s * 0.55],
        color,
      );
    }
    ball(n, [x, y + 0.095, z], [s * 0.38, s * 0.28, s * 0.38], C.gold);
  }
  function face(
    n: OasisNode,
    x: number,
    y: number,
    z: number,
    s: number,
    fox = false,
  ) {
    for (const side of [-1, 1]) {
      ball(
        n,
        [x + side * s * 0.19, y + s * 0.06, z + s * 0.37],
        [s * 0.09, s * 0.1, s * 0.045],
        "#67462e",
      );
      ball(
        n,
        [x + side * s * 0.17, y + s * 0.09, z + s * 0.412],
        [s * 0.026, s * 0.029, s * 0.015],
        C.cream,
      );
      if (fox) {
        const ear = new Shape();
        ear.moveTo(-0.16, 0);
        ear.quadraticCurveTo(-0.23, 0.24, 0, 0.63);
        ear.quadraticCurveTo(0.2, 0.27, 0.16, 0);
        ear.closePath();
        shape(
          n,
          new ExtrudeGeometry(ear, {
            depth: 0.1,
            bevelEnabled: true,
            bevelSegments: 2,
            bevelSize: 0.025,
            bevelThickness: 0.025,
            curveSegments: 12,
          }),
          [x + side * s * 0.22, y + s * 0.17, z - 0.05 * s],
          [s, s, s],
          C.cream,
          [0, side * 0.25, side * -0.25],
        );
        ball(
          n,
          [x + side * s * 0.24, y + s * 0.45, z + s * 0.045],
          [s * 0.08, s * 0.18, s * 0.025],
          "#efa6a3",
        );
      } else
        ball(
          n,
          [x + side * s * 0.28, y + s * 0.24, z],
          [s * 0.12, s * 0.13, s * 0.08],
          "#c5914e",
        );
    }
    ball(
      n,
      [x, y - s * 0.1, z + s * 0.34],
      [s * 0.28, s * 0.17, s * 0.16],
      C.cream,
    );
    ball(
      n,
      [x, y - s * 0.025, z + s * 0.47],
      [s * 0.065, s * 0.045, s * 0.035],
      "#684735",
    );
    curve(
      n,
      [
        [x - s * 0.12, y - s * 0.18, z + s * 0.45],
        [x, y - s * 0.21, z + s * 0.47],
        [x + s * 0.12, y - s * 0.18, z + s * 0.45],
      ],
      s * 0.012,
      "#8c6243",
    );
  }
  function clothPattern(n: OasisNode) {
    const [x, y, z] = n.at,
      [w, h, d] = n.size,
      rotation = n.rotation;
    const transform = (p: Vector) =>
      new Vector3(...p)
        .applyEuler(new Euler(...(rotation ?? [0, 0, 0])))
        .add(new Vector3(x, y, z))
        .toArray();
    // Stripes and stitched zigzags follow the cloth's actual orientation.
    for (const side of [-1, 1])
      box(
        n,
        transform([0, h / 2 + 0.012, side * d * 0.36]),
        [w * 0.96, 0.016, d * 0.095],
        C.red,
        rotation,
      );
    for (let i = 0; i < 5; i++) {
      const lx = ((i - 2) * w) / 5;
      for (const side of [-1, 1]) {
        const a = transform([lx - w * 0.065, h / 2 + 0.027, side * d * 0.36]),
          b = transform([lx, h / 2 + 0.027, side * d * 0.36 + d * 0.035]),
          c = transform([lx + w * 0.065, h / 2 + 0.027, side * d * 0.36]);
        beam(n, a, b, 0.017, C.cream);
        beam(n, b, c, 0.017, C.cream);
      }
    }
    // Both faces are finished fabric: no cardboard-looking reverse plane.
    for (const side of [-1, 1])
      box(
        n,
        transform([0, side * (h / 2 + 0.01), -d * 0.46]),
        [w * 0.95, 0.014, 0.025],
        C.gold,
        rotation,
      );
  }
  const artwork = [
    ...plan,
    ...[-1, 1].map(
      (side) =>
        ({
          key: "gate-pier-" + side + "-3",
          group: "gate",
          kind: "ivy",
          at: [side * 1.34, 2.39, -3.18],
          size: [0.3, 1.3, 0.14],
          color: C.green,
          covers: [],
        }) as OasisNode,
    ),
  ];
  for (const n of artwork) {
    const [x, y, z] = n.at,
      [w, h, d] = n.size;
    pivots[`oasis-${n.key}`] ??= n.at;
    switch (n.kind) {
      case "foundation": {
        shape(
          n,
          smooth(new RoundedBoxGeometry(1, 1, 1, 3, 0.09)),
          n.at,
          n.size,
          n.color,
        );
        box(n, [x, y + 0.08, z], [w * 0.997, h * 0.47, d * 0.997], C.sand);
        for (let i = 0; i < 14; i++) {
          const px = -5.1 + i * 0.78;
          shape(
            n,
            rock,
            [px, y - 0.15, 5.38],
            [0.32, 0.13, 0.08],
            i % 2 ? C.sandstone : C.rust,
          );
        }
        break;
      }
      case "floor": {
        box(n, n.at, n.size, n.color);
        // Integral stone keys enter broad support feet. Their side bolts are
        // completely concealed by the supported object until it is removed.
        for (const key of n.covers) {
          const root = plan.find((p) => p.key === key)!;
          if (
            root.kind === "floor" ||
            root.size[0] <= 0.55 ||
            root.size[1] < 0.26 ||
            root.size[2] <= 0.55
          )
            continue;
          const peg = box(
            n,
            [root.at[0] - 0.1, y + h / 2 + 0.13, root.at[2]],
            [0.2, 0.2, 0.2],
            n.color,
          );
          tenons.set(`${n.key}:${key}`, peg);
        }
        // Polished irregular pavers are one removable floor panel, not loose decoration owners.
        for (let i = 0; i < 4; i++)
          for (let j = 0; j < 4; j++) {
            const px = x + ((i - 1.5) * w) / 4,
              pz = z + ((j - 1.5) * d) / 4;
            if (Math.abs(px) < 1.05 || (pz < -2.2 && Math.abs(px) < 2.1))
              box(
                n,
                [px, y + h / 2 + 0.014, pz],
                [0.7, 0.035, 0.61],
                (i + j) % 2 ? "#f9d9a0" : "#f0c285",
                [0, 0.12 * Math.sin(i * 3 + j), 0],
              );
          }
        break;
      }
      case "stone":
      case "arch": {
        box(n, n.at, n.size, n.color, n.rotation);
        // Hewn overlapping rear rebates conceal the next course's side fixing.
        for (const lower of plan.filter(
          (p) => p.kind === "stone" && p.covers[0] === n.key && p.contact,
        ))
          box(
            n,
            [
              lower.at[0],
              lower.at[1] + lower.size[1] * 0.38,
              lower.at[2] - lower.size[2] / 2 - 0.03,
            ],
            [Math.min(0.65, lower.size[0] * 0.65), 0.19, 0.22],
            n.color,
          );
        if (n.kind === "stone" && w > 1) {
          for (let i = 0; i < 2; i++) {
            const p = [
              x + (i - 0.5) * w * 0.48,
              y - h * 0.06,
              z + d * 0.38,
            ] as Vector;
            shape(
              n,
              rock,
              p,
              [w * 0.28, h * 0.48, d * 0.19],
              i % 2 ? C.sandstone : n.color,
            );
          }
        }
        if (n.group.startsWith("gate-pier") && /-(1|3)$/.test(n.key)) {
          // Recess-like ochre carvings: recognisable temple masonry, no fake screws.
          for (let k = 0; k < 3; k++)
            box(
              n,
              [x + (k - 1) * 0.115, y, z + d / 2 + 0.008],
              [0.025, h * 0.42, 0.012],
              "#c28c46",
            );
          cyl(n, [x, y + h * 0.27, z + d / 2 + 0.025], 0.055, 0.02, C.gold, [
            Math.PI / 2,
            0,
            0,
          ]);
        }
        break;
      }
      case "palm-trunk": {
        cyl(n, n.at, w / 2, h, n.color, n.rotation);
        for (let i = 0; i < 4; i++) {
          const yy = y + ((i - 1.5) * h) / 4;
          hoop(n, [x, yy, z], w * 0.5, i % 2 ? "#c8994e" : "#805b34");
        }
        break;
      }
      case "palm-crown":
        ball(n, n.at, [w / 2, h / 2, d / 2], n.color);
        break;
      case "fronds": {
        ball(n, n.at, [0.2 * w, 0.11 * w, 0.2 * w], n.color);
        const angle = n.rotation?.[1] ?? 0;
        const crown = plan.find(
          (p) => p.key === n.key.replace(/leaves-[0-2]$/, "crown"),
        )!;
        const layer = Number(n.key.at(-1));
        ball(
          n,
          [crown.at[0], crown.at[1] + 0.2 + layer * 0.075, crown.at[2]],
          [0.32 * w, 0.11 * w, 0.32 * w],
          n.color,
        );
        for (let j = 0; j < 3; j++) {
          const a = angle + (j - 1) * 0.46,
            points: Vector[] = [];
          for (let k = 0; k <= 12; k++) {
            const t = k / 12,
              r = t * 1.7 * w,
              yy = y + Math.sin(t * Math.PI) * 0.44 * w - t * t * 0.57 * w;
            points.push([x + Math.cos(a) * r, yy, z + Math.sin(a) * r]);
          }
          curve(n, points, 0.025 * w, "#799f23");
          const vertices: number[] = [],
            indices: number[] = [];
          for (let k = 0; k <= 18; k++) {
            const t = k / 18,
              r = t * 1.7 * w,
              yy = y + Math.sin(t * Math.PI) * 0.44 * w - t * t * 0.57 * w,
              breadth =
                (0.025 + Math.sin(t * Math.PI) * 0.28) * (k % 2 ? 0.89 : 1) * w;
            for (const depth of [0, -0.035 * w])
              for (const side of [-1, 1])
                vertices.push(
                  x + Math.cos(a) * r - Math.sin(a) * breadth * side,
                  yy + depth,
                  z + Math.sin(a) * r + Math.cos(a) * breadth * side,
                );
          }
          for (let k = 0; k < 18; k++) {
            const q = k * 4;
            indices.push(
              q,
              q + 4,
              q + 1,
              q + 1,
              q + 4,
              q + 5,
              q + 2,
              q + 3,
              q + 6,
              q + 3,
              q + 7,
              q + 6,
              q,
              q + 2,
              q + 4,
              q + 2,
              q + 6,
              q + 4,
              q + 1,
              q + 5,
              q + 3,
              q + 3,
              q + 5,
              q + 7,
            );
          }
          for (let i = 0; i < indices.length; i += 3)
            [indices[i + 1], indices[i + 2]] = [indices[i + 2], indices[i + 1]];
          const blade = new BufferGeometry();
          blade.setAttribute(
            "position",
            new Float32BufferAttribute(vertices, 3),
          );
          blade.setIndex(indices);
          blade.computeVertexNormals();
          shape(
            n,
            smooth(blade),
            [0, 0, 0],
            [1, 1, 1],
            j % 2 ? "#8bb934" : "#659e27",
          );
        }
        break;
      }
      case "coconuts": {
        ball(n, n.at, [w / 2, h / 2, d / 2], n.color);
        for (const leaf of plan.filter((p) =>
          p.key.startsWith(n.key.replace("coconuts", "leaves-")),
        ))
          ball(
            n,
            [leaf.at[0], leaf.at[1] - 0.29, leaf.at[2]],
            [(0.22 * w) / 0.48, (0.22 * w) / 0.48, (0.22 * w) / 0.48],
            n.color,
          );
        for (const side of [-1, 1])
          ball(
            n,
            [x + side * w * 0.45, y + 0.06, z - 0.14],
            [w * 0.34, h * 0.44, d * 0.4],
            side < 0 ? "#bc8238" : "#a16a2a",
          );
        break;
      }
      case "camel-leg": {
        ball(n, n.at, [w / 2, h / 2, d / 2], n.color);
        ball(
          n,
          [x, y - h * 0.38, z + 0.035],
          [w * 0.64, h * 0.16, d * 0.68],
          "#bc873f",
        );
        ball(n, [x, y - 0.04, z], [w * 0.56, w * 0.53, d * 0.52], n.color);
        break;
      }
      case "camel-body": {
        ball(n, n.at, [w / 2, h / 2, d / 2], n.color);
        for (const a of [-1, 1])
          for (const b of [-1, 1])
            ball(
              n,
              [x + a * 0.65, y - 0.19, z + b * 0.3],
              [0.2, 0.25, 0.18],
              n.color,
            );
        for (const side of [-1, 1])
          ball(
            n,
            [x + side * 0.38, y + h * 0.28, z],
            [0.36, 0.39, 0.32],
            n.color,
          );
        curve(
          n,
          [
            [x - w * 0.44, y + 0.07, z - 0.12],
            [x - w * 0.64, y - 0.13, z - 0.15],
            [x - w * 0.66, y - 0.43, z - 0.16],
          ],
          0.04,
          "#c18c41",
        );
        ball(
          n,
          [x - w * 0.65, y - 0.47, z - 0.16],
          [0.07, 0.13, 0.07],
          "#8b6336",
        );
        break;
      }
      case "camel-neck": {
        shape(
          n,
          sphere,
          n.at,
          [w / 2, h / 2, d / 2],
          n.color,
          n.rotation,
          "ico-detail",
        );
        curve(
          n,
          [
            [x - 0.03, y - h * 0.35, z + 0.25],
            [x + 0.08, y - h * 0.25, z + 0.28],
            [x + 0.22, y + 0.04, z + 0.26],
          ],
          0.035,
          C.red,
        );
        for (let i = 0; i < 6; i++)
          ball(
            n,
            [x + 0.08, y - 0.31 + i * 0.045, z + 0.265],
            [0.035, 0.035, 0.03],
            i % 2 ? C.teal : C.gold,
          );
        break;
      }
      case "camel-head": {
        ball(n, n.at, [w * 0.43, h * 0.5, d * 0.48], n.color);
        ball(
          n,
          [x + w * 0.37, y - h * 0.13, z],
          [w * 0.36, h * 0.28, d * 0.42],
          n.color,
        );
        for (const side of [-1, 1]) {
          ball(
            n,
            [x - w * 0.13, y + h * 0.4, z + side * d * 0.34],
            [0.12, 0.2, 0.07],
            n.color,
          );
          ball(
            n,
            [x + w * 0.02, y + h * 0.12, z + side * d * 0.47],
            [0.055, 0.06, 0.026],
            "#62432c",
          );
          ball(
            n,
            [x + w * 0.39, y - h * 0.04, z + side * d * 0.34],
            [0.035, 0.026, 0.018],
            "#9f7138",
          );
        }
        curve(
          n,
          [
            [x + w * 0.22, y - h * 0.29, z + 0.2],
            [x + w * 0.49, y - h * 0.28, z + 0.13],
            [x + w * 0.56, y - h * 0.2, z],
          ],
          0.013,
          "#a67a43",
        );
        break;
      }
      case "blanket":
        box(n, n.at, n.size, n.color);
        clothPattern(n);
        for (const side of [-1, 1]) {
          box(n, [x, y - 0.14, z + side * d * 0.45], [w, 0.35, 0.08], n.color);
          for (let k = 0; k < 5; k++) {
            const xx = x + ((k - 2) * w) / 5;
            curve(
              n,
              [
                [xx, y - 0.29, z + side * d * 0.48],
                [xx, y - 0.47, z + side * d * 0.5],
              ],
              0.013,
              C.gold,
            );
            ball(
              n,
              [xx, y - 0.5, z + side * d * 0.5],
              [0.04, 0.08, 0.04],
              C.teal,
            );
          }
        }
        break;
      case "roll": {
        shape(
          n,
          cylinder,
          n.at,
          [h / 2, w, h / 2],
          n.color,
          [0, 0, Math.PI / 2],
          "cylinder",
        );
        for (const side of [-1, 1]) {
          box(
            n,
            [x + side * w * 0.31, y, z],
            [0.08, h * 1.02, d * 1.04],
            C.cream,
          );
          hoop(n, [x + side * w * 0.51, y, z], h * 0.34, C.cream, [
            0,
            Math.PI / 2,
            0,
          ]);
        }
        break;
      }
      case "post": {
        box(n, n.at, n.size, n.color, n.rotation);
        if (n.key.startsWith("tent-pole-"))
          box(n, [x, 0.47, z], [0.26, 0.22, 0.26], C.wood);
        if (h > w * 3) {
          for (const a of [-0.3, 0.2])
            box(
              n,
              [x + w * 0.51, y + h * a, z],
              [0.018, h * 0.12, d * 0.7],
              "#916133",
            );
        }
        break;
      }
      case "canvas": {
        if (n.key === "tent-back") {
          const t = new Shape();
          t.moveTo(-0.5, -0.5);
          t.lineTo(0.5, -0.5);
          t.lineTo(0, 0.5);
          t.closePath();
          shape(
            n,
            new ExtrudeGeometry(t, { depth: 1, bevelEnabled: false }),
            [x, y, z - d / 2],
            n.size,
            n.color,
          );
          for (const side of [-1, 1])
            beam(
              n,
              [x + side * w * 0.46, y - h * 0.46, z + d * 0.6],
              [x, y + h * 0.46, z + d * 0.6],
              0.025,
              C.red,
            );
        } else {
          box(n, n.at, n.size, n.color, n.rotation);
          clothPattern(n);
          if (n.group === "shade")
            for (let i = 0; i < 5; i++) {
              const xx = x + ((i - 2) * w) / 5;
              ball(
                n,
                [xx, y - 0.05, z + d * 0.47],
                [w / 9, 0.12, 0.04],
                i % 2 ? C.red : C.cream,
              );
            }
        }
        break;
      }
      case "sun": {
        box(n, n.at, [w * 0.7, h * 0.7, d], C.sandstone);
        cyl(n, [x, y, z + d * 0.6], w * 0.35, 0.07, C.gold, [
          Math.PI / 2,
          0,
          0,
        ]);
        for (let j = 0; j < 12; j++) {
          const a = (j * Math.PI) / 6;
          beam(
            n,
            [
              x + Math.cos(a) * w * 0.43,
              y + Math.sin(a) * w * 0.43,
              z + d * 0.65,
            ],
            [
              x + Math.cos(a) * w * 0.64,
              y + Math.sin(a) * w * 0.64,
              z + d * 0.65,
            ],
            0.04,
            C.gold,
          );
        }
        break;
      }
      case "lantern": {
        if (n.key === "gate-lantern") {
          box(n, [0, 3.99, -3.47], [0.24, 0.06, 0.24], C.wood);
          for (let i = 0; i < 3; i++)
            hoop(n, [0, 3.82 + i * 0.07, -3.47], 0.065, C.wood, [
              0,
              i % 2 ? Math.PI / 2 : 0,
              0,
            ]);
        }
        box(n, n.at, [w * 0.56, h * 0.62, d * 0.56], C.gold);
        box(n, [x, y, z], [w * 0.45, h * 0.49, d * 0.48], "#fff5aa");
        for (const a of [-1, 1])
          for (const b of [-1, 1])
            beam(
              n,
              [x + a * w * 0.38, y - h * 0.31, z + b * d * 0.38],
              [x + a * w * 0.38, y + h * 0.31, z + b * d * 0.38],
              0.035,
              "#8d6234",
            );
        box(n, [x, y - h * 0.35, z], [w, 0.07, d], "#9d7036");
        box(n, [x, y + h * 0.35, z], [w, 0.08, d], "#9d7036");
        hoop(n, [x, y + h * 0.57, z], w * 0.24, "#765331", [0, 0, 0]);
        break;
      }
      case "ivy": {
        box(n, n.at, [0.06, h, 0.05], C.green);
        for (let i = 0; i < 9; i++) {
          const yy = y + ((i - 4) * h) / 9,
            xx = x + Math.sin(i * 2) * w * 0.42;
          ball(
            n,
            [xx, yy, z],
            [w * 0.35, 0.11, 0.06],
            i % 2 ? "#85b333" : "#4a942b",
          );
          if (i % 4 === 0) flower(n, xx, yy, z + 0.055, 0.08, "#ee85b4");
        }
        break;
      }
      case "water": {
        box(n, n.at, n.size, n.color);
        for (let i = 0; i < 9; i++) {
          const zz = z + ((i - 4) * d) / 10;
          curve(
            n,
            [
              [x - w * 0.43, y + h / 2 + 0.016, zz],
              [x, y + h / 2 + 0.016, zz + 0.055],
              [x + w * 0.43, y + h / 2 + 0.016, zz],
            ],
            0.01,
            i % 2 ? "#82e9d5" : "#56d8d0",
          );
        }
        break;
      }
      case "waterfall": {
        box(n, n.at, n.size, n.color);
        for (let i = 0; i < 8; i++) {
          const xx = x + ((i - 3.5) * w) / 9;
          curve(
            n,
            [
              [xx, y + h * 0.48, z - 0.07],
              [xx, y + h * 0.2, z + 0.09],
              [xx, y - h * 0.42, z + 0.15],
            ],
            0.032,
            i % 2 ? "#80e6d9" : "#43d7d0",
          );
        }
        for (let i = 0; i < 7; i++)
          ball(
            n,
            [x + ((i - 3) * w) / 7, y - h * 0.47, z + 0.12],
            [0.1, 0.08, 0.12],
            C.cream,
          );
        break;
      }
      case "lotus": {
        cyl(n, [x, y - 0.04, z], w * 0.5, 0.05, "#79b937");
        for (let i = 0; i < 9; i++) {
          const a = (i * Math.PI * 2) / 9;
          shape(
            n,
            sphere,
            [x + Math.cos(a) * w * 0.2, y + 0.04, z + Math.sin(a) * w * 0.2],
            [w * 0.13, 0.18, w * 0.085],
            n.color,
            [Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6],
            "ico-detail",
          );
        }
        ball(n, [x, y + 0.11, z], [0.07, 0.09, 0.07], C.gold);
        break;
      }
      case "reeds": {
        ball(n, [x, y - h * 0.22, z], [w * 0.4, h * 0.25, d * 0.35], n.color);
        for (let i = 0; i < 7; i++) {
          const a = (i * Math.PI * 2) / 7;
          curve(
            n,
            [
              [x, y - h * 0.4, z],
              [x + Math.cos(a) * w * 0.3, y, z + Math.sin(a) * d * 0.3],
              [
                x + Math.cos(a) * w * 0.6,
                y + h * (0.3 + 0.05 * (i % 3)),
                z + Math.sin(a) * d * 0.6,
              ],
            ],
            0.022,
            n.color,
          );
          if (i % 3 === 0)
            ball(
              n,
              [
                x + Math.cos(a) * w * 0.5,
                y + h * 0.3,
                z + Math.sin(a) * d * 0.5,
              ],
              [0.035, 0.13, 0.035],
              "#c87846",
            );
        }
        break;
      }
      case "animal-feet": {
        box(n, n.at, [w * 0.65, h, d * 0.65], n.color);
        for (const side of [-1, 1])
          ball(
            n,
            [x + side * w * 0.29, y - h * 0.12, z + d * 0.12],
            [w * 0.22, h * 0.4, d * 0.35],
            n.color,
          );
        break;
      }
      case "animal-body": {
        shape(
          n,
          sphere,
          n.at,
          [w / 2, h / 2, d / 2],
          n.color,
          n.rotation,
          "ico-detail",
        );
        ball(
          n,
          [x, y - 0.015, z + d * 0.38],
          [w * 0.3, h * 0.35, 0.035],
          C.cream,
        );
        for (const side of [-1, 1])
          ball(
            n,
            [x + side * w * 0.4, y - h * 0.07, z + d * 0.12],
            [w * 0.14, h * 0.26, d * 0.16],
            n.color,
          );
        break;
      }
      case "animal-head":
        ball(n, n.at, [w / 2, h / 2, d / 2], n.color);
        face(
          n,
          x,
          y,
          z,
          w,
          n.key.includes("fox") || n.key.startsWith("fennec"),
        );
        break;
      case "animal-tail": {
        shape(
          n,
          sphere,
          n.at,
          [w / 2, h / 2, d / 2],
          n.color,
          n.rotation,
          "ico-detail",
        );
        ball(
          n,
          [x - w * 0.34, y + 0.015, z],
          [w * 0.18, h * 0.45, d * 0.45],
          C.cream,
        );
        break;
      }
      case "crate":
      case "chest": {
        box(n, n.at, n.size, n.color);
        for (const side of [-1, 1]) {
          for (let i = 0; i < 3; i++)
            box(
              n,
              [x, y + (i - 1) * h * 0.28, z + side * d * 0.51],
              [w * 0.92, h * 0.22, 0.035],
              C.wood,
            );
          for (const a of [-1, 1])
            box(
              n,
              [x + a * w * 0.37, y, z + side * d * 0.54],
              [0.09, h, 0.04],
              "#8e5c35",
            );
        }
        for (const side of [-1, 1])
          beam(
            n,
            [x - w * 0.3, y - h * 0.34, z + side * d * 0.55],
            [x + w * 0.3, y + h * 0.34, z + side * d * 0.55],
            0.06,
            "#b88750",
          );
        break;
      }
      case "crate-lid":
      case "chest-lid": {
        box(n, n.at, n.size, n.color);
        for (let i = 0; i < 4; i++)
          box(
            n,
            [x + ((i - 1.5) * w) / 4, y + h * 0.54, z],
            [w / 4 - 0.02, 0.025, d * 0.96],
            "#d09a5d",
          );
        for (const side of [-1, 1])
          box(
            n,
            [x + side * w * 0.32, y, z],
            [0.09, h * 1.2, d * 1.03],
            "#7d694f",
          );
        break;
      }
      case "jug": {
        ball(n, [x, y - h * 0.1, z], [w * 0.5, h * 0.42, d * 0.5], n.color);
        cyl(n, [x, y + h * 0.32, z], w * 0.19, h * 0.26, n.color);
        hoop(n, [x, y + h * 0.47, z], w * 0.23, C.gold);
        hoop(n, [x + w * 0.4, y + h * 0.13, z], h * 0.2, n.color, [0, 0, 0]);
        break;
      }
      case "rug": {
        box(n, n.at, n.size, n.color);
        for (const side of [-1, 1]) {
          box(
            n,
            [x + side * w * 0.43, y + h * 0.6, z],
            [0.045, 0.015, d * 0.94],
            C.cream,
          );
          box(
            n,
            [x, y + h * 0.6, z + side * d * 0.42],
            [w * 0.87, 0.015, 0.045],
            C.cream,
          );
          for (let i = 0; i < 9; i++)
            box(
              n,
              [x + ((i - 4) * w) / 10, y, z + side * d * 0.55],
              [0.018, 0.02, 0.16],
              C.cream,
            );
        }
        for (let i = 0; i < 5; i++)
          box(
            n,
            [x + ((i - 2) * w) / 6, y + h * 0.65, z],
            [0.16, 0.012, 0.16],
            C.gold,
            [0, Math.PI / 4, 0],
          );
        break;
      }
      case "cushion":
        box(n, n.at, n.size, n.color);
        for (const side of [-1, 1])
          curve(
            n,
            [
              [x - w * 0.4, y, z + side * d * 0.46],
              [x, y + 0.04, z + side * d * 0.49],
              [x + w * 0.4, y, z + side * d * 0.46],
            ],
            0.018,
            C.cream,
          );
        break;
      case "cactus": {
        shape(
          n,
          cylinder,
          n.at,
          [w / 2, h, w / 2],
          n.color,
          n.rotation,
          "cylinder",
        );
        ball(n, [x, y + h * 0.45, z], [w / 2, w * 0.5, w / 2], n.color);
        for (let i = 0; i < 7; i++) {
          const a = (i * Math.PI * 2) / 7;
          curve(
            n,
            [
              [
                x + Math.cos(a) * w * 0.5,
                y - h * 0.43,
                z + Math.sin(a) * w * 0.5,
              ],
              [
                x + Math.cos(a) * w * 0.52,
                y + h * 0.3,
                z + Math.sin(a) * w * 0.52,
              ],
            ],
            0.009,
            "#bdd15b",
          );
        }
        break;
      }
      case "flowers": {
        ball(n, [x, y - 0.07, z], [w * 0.43, 0.12, d * 0.43], "#68a936");
        if (n.key.startsWith("cactus-flower-")) {
          const arm = plan.find(
            (p) => p.key === n.key.replace("flower", "arm"),
          )!;
          flower(
            n,
            arm.at[0] + (Math.sin(0.3) * arm.size[1]) / 2,
            arm.at[1] + (Math.cos(0.3) * arm.size[1]) / 2 + 0.01,
            arm.at[2],
            0.15,
            n.color,
          );
        }
        flower(n, x, y, z, w * 0.27, n.color);
        for (let j = 0; j < 3; j++) {
          const a = j * 2.1;
          flower(
            n,
            x + Math.cos(a) * w * 0.34,
            y - 0.04,
            z + Math.sin(a) * d * 0.34,
            w * 0.18,
            n.color,
          );
        }
        break;
      }
      case "sign": {
        box(n, n.at, n.size, n.color);
        box(n, [x, y, z + d * 0.55], [w * 0.92, h * 0.8, 0.02], "#e2b270");
        if (n.key.endsWith("1")) {
          box(n, [x, y - 0.03, z + 0.1], [0.25, 0.1, 0.03], "#94633a");
          beam(
            n,
            [x + 0.1, y, z + 0.1],
            [x + 0.19, y + 0.15, z + 0.1],
            0.045,
            "#94633a",
          );
          for (const side of [-1, 1])
            beam(
              n,
              [x + side * 0.08, y - 0.05, z + 0.1],
              [x + side * 0.1, y - 0.14, z + 0.1],
              0.035,
              "#94633a",
            );
        } else {
          beam(
            n,
            [x, y - 0.12, z + 0.11],
            [x + 0.07, y + 0.08, z + 0.11],
            0.035,
            "#5d8d35",
          );
          for (const side of [-1, 1])
            curve(
              n,
              [
                [x + 0.06, y + 0.08, z + 0.11],
                [x + side * 0.13, y + 0.17, z + 0.11],
                [x + side * 0.27, y + 0.06, z + 0.11],
              ],
              0.025,
              "#5d8d35",
            );
        }
        break;
      }
      case "rope": {
        curve(
          n,
          [
            [x - w / 2, y + 0.12, z],
            [x, y - 0.13, z],
            [x + w / 2, y + 0.12, z],
          ],
          0.05,
          n.color,
        );
        const cap = plan.find(
          (p) => p.key === "rope-cap-" + (Number(n.key.at(-1)) + 1),
        )!;
        ball(
          n,
          [cap.at[0] - 0.22, cap.at[1], cap.at[2]],
          [0.13, 0.13, 0.13],
          C.cream,
        );
        for (let i = 0; i < 3; i++)
          hoop(
            n,
            [cap.at[0] - 0.22 + i * 0.025, cap.at[1], cap.at[2]],
            0.1,
            "#d7b77f",
            [0, Math.PI / 2, 0],
          );
        for (let i = 0; i < 12; i++)
          hoop(
            n,
            [
              x + ((i - 5.5) * w) / 12,
              y - 0.1 + 0.2 * ((i - 5.5) / 5.5) ** 2,
              z,
            ],
            0.052,
            "#d8b987",
            [0, 0, Math.PI / 2],
          );
        break;
      }
      case "skull": {
        ball(n, n.at, [w / 2, h / 2, d / 2], n.color);
        ball(
          n,
          [x, y - 0.14, z + 0.19],
          [w * 0.22, h * 0.24, d * 0.35],
          n.color,
        );
        for (const side of [-1, 1]) {
          ball(
            n,
            [x + side * w * 0.22, y + 0.04, z + d * 0.39],
            [0.09, 0.11, 0.04],
            "#775c40",
          );
          curve(
            n,
            [
              [x + side * w * 0.3, y + 0.09, z - 0.04],
              [x + side * w * 0.65, y + 0.29, z - 0.08],
              [x + side * w * 0.68, y + 0.54, z - 0.11],
            ],
            0.06,
            C.cream,
          );
        }
        break;
      }
      case "bones": {
        cyl(n, n.at, 0.07, w, n.color, [0, 0, Math.PI / 2]);
        for (const side of [-1, 1]) {
          ball(n, [x + side * w * 0.45, y, z], [0.1, 0.09, 0.08], n.color);
          curve(
            n,
            [
              [x - 0.12, y, z],
              [x, y + h * 0.8, z - 0.18],
              [x + 0.12, y, z - 0.3],
            ],
            0.035,
            n.color,
          );
        }
        break;
      }
      default:
        box(n, n.at, n.size, n.color, n.rotation);
    }
  }
  // Planned contact surfaces are projected onto the actual primary mesh. This
  // avoids floating fasteners and retains real outward normals on curved parts.
  const material = new MeshBasicMaterial({ side: DoubleSide }),
    ray = new Raycaster();
  const mounts: (Pick<Screw, "position" | "normal" | "solutionAfter"> & {
    attachedTo: OasisPartId;
  })[] = [];
  for (const n of plan) {
    const p = anchors.get(n.key)!,
      m = new Mesh(p.geometry!, material);
    m.position.set(...p.position);
    m.scale.set(...p.size);
    if (p.rotation) m.rotation.set(...p.rotation);
    m.updateMatrixWorld();
    const multiple =
      n.kind === "foundation" ||
      n.kind === "floor" ||
      n.key === "camel-body" ||
      n.key === "shade-crossbar" ||
      n.key === "tent-back" ||
      n.key === "western-cliff-2" ||
      n.key === "tent-deck";
    const contactInset =
      n.kind === "floor" || n.key === "tent-deck"
        ? 0.48
        : p.kind === "box"
          ? 0.4
          : 0.24;
    const targets = multiple && n.covers.length ? n.covers : [n.covers[0]];
    for (const cover of targets) {
      const c = plan.find((a) => a.key === cover);
      const peg = tenons.get(`${n.key}:${cover}`);
      let mountingMesh = m;
      if (peg) {
        mountingMesh = new Mesh(peg.geometry!, material);
        mountingMesh.position.set(...peg.position);
        mountingMesh.scale.set(...peg.size);
        mountingMesh.updateMatrixWorld();
      }
      let origin = new Vector3(...n.at),
        direction: Vector;
      if (peg) {
        origin.set(...peg.position);
        direction = [1, 0, 0];
      } else if (n.key === "tent-deck" && c?.key === "tent-back") {
        origin.set(n.at[0] - 0.65, n.at[1], c.at[2]);
        direction = [0, 1, 0];
      } else if (n.key === "western-cliff-2" && c?.kind === "palm-trunk") {
        origin.set(c.at[0], n.at[1], c.at[2]);
        direction = [0, 1, 0];
      } else if (n.contact) {
        origin.set(...(n.contact.at ?? n.at));
        direction = n.contact.normal;
      } else if (n.key === "tent-back") {
        origin.set(n.at[0] + (c!.at[0] > n.at[0] ? 0.75 : -0.75), 1.3, n.at[2]);
        direction = [0, 0, -1];
      } else if (
        c &&
        (n.kind === "foundation" ||
          (n.kind === "floor" && c.kind !== "floor") ||
          (n.size[1] < 0.4 && c.at[1] > n.at[1] && c.kind !== "floor"))
      ) {
        origin.set(
          Math.max(
            n.at[0] - n.size[0] * contactInset,
            Math.min(n.at[0] + n.size[0] * contactInset, c.at[0]),
          ),
          n.at[1],
          Math.max(
            n.at[2] - n.size[2] * contactInset,
            Math.min(n.at[2] + n.size[2] * contactInset, c.at[2]),
          ),
        );
        direction = [0, 1, 0];
      } else if (c)
        direction = new Vector3(...c.at).sub(origin).normalize().toArray();
      else
        direction =
          n.outward ??
          (n.group === "gate"
            ? [0, 0, -1]
            : n.kind === "stone"
              ? [0, 0, -1]
              : [0, 0.25, 1]);
      const normal = new Vector3(...direction).normalize();
      ray.set(
        origin.clone().addScaledVector(normal, 8),
        normal.clone().negate(),
      );
      ray.far = 16;
      const detailed =
        n.kind === "cactus" ||
        n.kind === "flowers" ||
        n.kind === "reeds" ||
        n.kind === "jug" ||
        n.kind === "camel-body" ||
        n.kind === "animal-tail" ||
        n.kind === "bones";
      const own = detailed
        ? pieces
            .filter((p) => p.part === "oasis-" + n.key)
            .map((p) => {
              const mesh = new Mesh(p.geometry!, material);
              mesh.position.set(...p.position);
              mesh.scale.set(...p.size);
              if (p.rotation) mesh.rotation.set(...p.rotation);
              mesh.updateMatrixWorld();
              return mesh;
            })
        : [mountingMesh];
      const hit = ray.intersectObjects(own, false)[0];
      if (!hit)
        throw Error(`No attachment surface for ${n.key} toward ${cover}`);
      const surface = hit
        .face!.normal.clone()
        .applyMatrix3(new Matrix3().getNormalMatrix(hit.object.matrixWorld))
        .normalize();
      mounts.push({
        attachedTo: `oasis-${n.key}`,
        position: hit.point.addScaledVector(surface, 0.008).toArray(),
        normal: surface.toArray(),
        solutionAfter: [...new Set([...n.covers, ...(n.proofAfter ?? [])])].map(
          (k) => `oasis-${k}` as OasisPartId,
        ),
      });
    }
  }
  material.dispose();
  return {
    model: {
      pieces,
      pivots,
      parts: plan.map((n) => `oasis-${n.key}` as OasisPartId),
    },
    mounts,
    plan,
    detail: OASIS_DETAIL,
  };
}
