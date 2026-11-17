import type { FURNISHING_IDS, PartId } from "../game/types.ts";
import type { Piece, Vector } from "./houseModel.ts";

type FurnishingId = typeof FURNISHING_IDS[number];
type Mount = { id: FurnishingId; story: "upper" | "lower"; position: Vector; normal: Vector };

const paintings = [
  { id: "bedroom-painting", story: "upper", pivot: [-2.246, 1.51, 0.97], normal: [1, 0, 0], sky: "#a7cad2", hill: "#4c7d73", sun: "#ffdd88" },
  { id: "landing-painting", story: "upper", pivot: [-0.32, 1.55, -1.746], normal: [0, 0, 1], sky: "#c5bad9", hill: "#746a99", sun: "#f7deae" },
  { id: "dining-painting", story: "lower", pivot: [2.246, -0.27, 1.18], normal: [-1, 0, 0], sky: "#eabba9", hill: "#628a70", sun: "#ffd677" },
] satisfies { id: FurnishingId; story: Mount["story"]; pivot: Vector; normal: Vector; sky: string; hill: string; sun: string }[];
const rugs = [
  { id: "living-carpet", story: "lower", pivot: [-1.46, -1.552, 1.38], width: 0.90, depth: 0.68, color: "#9b5675", trim: "#d5a47c" },
  { id: "bedside-runner", story: "upper", pivot: [-0.77, 0.357, 1.22], width: 0.46, depth: 0.75, color: "#4a8688", trim: "#e0b885" },
] satisfies { id: FurnishingId; story: Mount["story"]; pivot: Vector; width: number; depth: number; color: string; trim: string }[];

export const WINDOW_BLINDS = (["upper", "lower"] as const).flatMap((story) =>
  (["left", "right"] as const).map((side) => ({
    id: `blind-${story}-${side}` as const, story, x: side === "left" ? -1.5 : 1.5, y: story === "upper" ? 1.15 : -0.65,
  })));

function paintingPoint(pivot: Vector, [nx, , nz]: Vector, [u, y, depth]: Vector): Vector {
  return [pivot[0] + u * nz + depth * nx, pivot[1] + y, pivot[2] - u * nx + depth * nz];
}

export const FURNISHING_MOUNTS: Mount[] = [
  ...paintings.map(({ id, story, pivot, normal }) => ({ id, story, normal, position: paintingPoint(pivot, normal, [0, -0.185, 0.053]) })),
  ...rugs.map(({ id, story, pivot: [x, y, z], width }) => ({
    id, story, normal: [0, 1, 0] as Vector, position: [x - width * 0.24, y + 0.061, z + 0.16] as Vector,
  })),
  ...WINDOW_BLINDS.map(({ id, story, x, y }) => ({
    id, story, normal: [0, 0, -1] as Vector, position: [x - 0.27, y + 0.515, 1.55] as Vector,
  })),
];

export function addFurnishings(pieces: Piece[], pivots: Record<PartId, Vector>) {
  const box = (part: FurnishingId, position: Vector, size: Vector, color: string, rotation?: Vector) =>
    pieces.push({ part, position, size, color, rotation, kind: "box" });
  for (const { id, pivot, normal, sky, hill, sun } of paintings) {
    pivots[id] = pivot;
    const rotation: Vector = [0, Math.atan2(normal[0], normal[2]), 0];
    const at = (offset: Vector) => paintingPoint(pivot, normal, offset);
    box(id, pivot, [0.59, 0.47, 0.096], "#916148", rotation);
    box(id, at([0, 0.017, 0.05]), [0.51, 0.35, 0.014], "#f5dbad", rotation);
    box(id, at([0, 0.017, 0.06]), [0.45, 0.291, 0.012], sky, rotation);
    pieces.push({ part: id, kind: "ico", position: at([0.113, 0.095, 0.069]), size: [0.047, 0.047, 0.011], color: sun, rotation });
    for (const [x, y, size] of [[-0.11, -0.025, 0.16], [0.06, -0.045, 0.12]]) {
      pieces.push({ part: id, kind: "cone", position: at([x, y, 0.069]), size: [size * 0.65, size, 0.013], color: hill, rotation });
    }
    box(id, at([0, -0.109, 0.071]), [0.45, 0.027, 0.017], "#f8eadb", rotation);
  }
  for (const { id, pivot: [x, y, z], width, depth, color, trim } of rugs) {
    pivots[id] = [x, y, z];
    pieces.push({ part: id, kind: "snow-slab", position: pivots[id], size: [width, 0.096, depth], color });
    for (const side of [-1, 1]) {
      box(id, [x + side * (width / 2 - 0.041), y + 0.048, z], [0.021, 0.011, depth - 0.06], trim);
      box(id, [x, y + 0.048, z + side * (depth / 2 - 0.039)], [width - 0.062, 0.011, 0.022], trim);
      for (const fringe of [-0.34, -0.17, 0, 0.17, 0.34]) {
        box(id, [x + width * fringe, y - 0.012, z + side * depth / 2], [0.022, 0.023, 0.081], "#ead0aa");
      }
    }
    for (const stripe of [-0.23, 0, 0.23]) {
      box(id, [x, y + 0.049, z + stripe], [0.13, 0.015, 0.13], trim, [0, Math.PI / 4, 0]);
    }
  }
  for (const { id, x, y, story } of WINDOW_BLINDS) {
    pivots[id] = [x, y + 0.1, 1.68];
    const upper = story === "upper";
    pieces.push({ part: id, kind: "curtain", position: [x, y + 0.115, 1.665],
      size: [1.12, 0.77, 0.11], color: upper ? "#82abab" : "#bf7d77" });
    pieces.push({ part: id, kind: "curtain", position: [x, y - 0.285, 1.665],
      size: [1.12, 0.03, 0.11], color: upper ? "#c4d5c6" : "#edc2a2" });
    box(id, [x, y + 0.515, 1.64], [1.16, 0.098, 0.16], upper ? "#668d81" : "#a96967");
  }
}
