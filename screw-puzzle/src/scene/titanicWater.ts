import { BufferGeometry, Color, Float32BufferAttribute } from "three";
import type { PartId, TitanicPartId } from "../game/types.ts";
import type { Piece, Vector } from "./houseModel.ts";

const WATER_BOTTOM = -2.48;
const WATERLINE = 0.89;
const TILE_SEAM = 0.012;
const deep = new Color("#1766a3");
const surface = new Color("#40bace");
const foam = new Color("#b0f2ee");

function wave(x: number, z: number) {
  return Math.sin(x * 2.4 + z * 2.9) * 0.037 + Math.sin(z * 5.8 - x * 1.3) * 0.022;
}

type Shore = (x: number) => [min: number, max: number];

function waterMesh(first: number, last: number, shore: Shore, center: Vector, inside: -1 | 0 | 1) {
  const positions: number[] = [], colors: number[] = [], indices: number[] = [];
  const color = new Color();
  function face(columns: number, rows: number, point: (u: number, v: number) => Vector, reverse = false, top = false) {
    const start = positions.length / 3;
    for (let row = 0; row <= rows; row += 1) for (let column = 0; column <= columns; column += 1) {
      const [u, v, depth] = point(column / columns, row / rows);
      const x = first + (last - first) * u;
      const [min, max] = shore(x);
      const z = min + (max - min) * v;
      const crest = wave(x, z);
      const y = WATER_BOTTOM + depth * (WATERLINE + crest - WATER_BOTTOM);
      positions.push(x - center[0], y - center[1], z - center[2]);
      color.copy(deep).lerp(surface, depth ** 0.85);
      if (top) {
        const wash = inside === 0 ? 0 : Math.max(0, 1 - Math.abs(v - (inside > 0 ? 0 : 1)) * 9);
        color.lerp(foam, Math.max(0, crest - 0.008) * 6 + wash * 0.32);
      }
      colors.push(color.r, color.g, color.b);
    }
    for (let row = 0; row < rows; row += 1) for (let column = 0; column < columns; column += 1) {
      const a = start + row * (columns + 1) + column, b = a + 1, c = a + columns + 1, d = c + 1;
      if (reverse) indices.push(a, c, b, b, c, d);
      else indices.push(a, b, c, b, d, c);
    }
  }
  face(38, 24, (x, z) => [x, z, 1], true, true);
  face(38, 1, (x, z) => [x, z, 0]);
  face(38, 4, (x, y) => [x, 0, y], true);
  face(38, 4, (x, y) => [x, 1, y]);
  face(24, 4, (z, y) => [0, z, y]);
  face(24, 4, (z, y) => [1, z, y], true);
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  return geometry;
}

export const WATER_COLLIDERS = new Map<PartId, Piece>();

export function makeWaterBlocks(halfLength: number, hullWidthAt: (x: number) => number) {
  const tiles: { piece: Piece & { part: TitanicPartId }; screw: Vector }[] = [];
  function add(part: TitanicPartId, left: number, right: number, shore: Shore, outside: [number, number], inside: -1 | 0 | 1) {
    const first = left + TILE_SEAM, last = right - TILE_SEAM;
    const x = (first + last) / 2, z = (outside[0] + outside[1]) / 2;
    const pivot: Vector = [x, (WATERLINE + WATER_BOTTOM) / 2, z];
    tiles.push({
      piece: { part, kind: "box", color: "#ffffff", position: pivot, size: [1, 1, 1], geometry: waterMesh(first, last, shore, pivot, inside) },
      screw: [x, WATERLINE + wave(x, z) + 0.003, z],
    });
    // A simple outer collision volume lets the chipped edges move past the hull.
    WATER_COLLIDERS.set(part, {
      part, kind: "box", color: "#ffffff", position: pivot,
      size: [last - first, WATERLINE - WATER_BOTTOM - 0.09, outside[1] - outside[0]],
    });
  }
  const edge = 5.0;
  const inner = (x: number) => hullWidthAt(x) + 0.045;
  for (let index = 0; index < 3; index += 1) {
    const left = halfLength * (index * 2 / 3 - 1), right = halfLength * ((index + 1) * 2 / 3 - 1);
    const clearance = Math.max(...Array.from({ length: 17 }, (_, i) => inner(left + (right - left) * i / 16))) + 0.09;
    add(`ship-water-port-${index + 1}`, left, right, (x) => [-edge, -inner(x)], [-edge, -clearance], -1);
    add(`ship-water-starboard-${index + 1}`, left, right, (x) => [inner(x), edge], [clearance, edge], 1);
  }
  add("ship-water-stern", -halfLength - 2.65, -halfLength, () => [-3.35, 3.35], [-3.35, 3.35], 0);
  add("ship-water-bow", halfLength, halfLength + 2.65, () => [-3.35, 3.35], [-3.35, 3.35], 0);
  return tiles;
}
