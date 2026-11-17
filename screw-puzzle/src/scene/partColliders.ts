import { Euler, Quaternion } from "three";
import type { ColliderDesc } from "@dimforge/rapier3d-compat";
import type { PartId } from "../game/types.ts";
import { geometryFor } from "./geometry.ts";
import { LEVEL_MODELS, partLevel, partPivot } from "./levelModels.ts";
import type { Piece, Vector } from "./houseModel.ts";
import { WATER_COLLIDERS } from "./titanicWater.ts";

type Engine = typeof import("@dimforge/rapier3d-compat");
const MAX_SHAPES = 12;
type Shape = { kind: "box" | "rounded" | "ball" | "cylinder" | "cone" | "hull";
  offset: Vector; rotation: Quaternion; size: Vector; vertices?: Float32Array };

function collisionPieces(part: PartId, pieces: Piece[]): Piece[] {
  const main = pieces[0];
  const water = WATER_COLLIDERS.get(part);
  if (water) return [water];
  // Sculpted snow overlaps its support in the render model. Use the load-bearing mass.
  if (part === "chimney-snow") return [{ ...main, position: [-0.8, 4.39, 0.6], size: [0.78, 0.30, 0.78] }];
  if (part.startsWith("snowbank-")) return [{ ...main, position: [main.position[0], -1.48, main.position[2]],
    size: [main.size[0], 0.59, main.size[2]] }];
  if (part.startsWith("snow-") || part === "roof-bauble" || part === "porch-snow") return [main];
  if (part.startsWith("roof-") && !part.startsWith("roof-lights-")) return [main];
  if (part === "candy-left" || part === "candy-right") {
    const shaft = pieces.filter((piece) => piece.kind === "cylinder");
    const last = shaft.at(-1)!;
    const height = last.position[1] - main.position[1] + main.size[1];
    return [{ ...main, position: [main.position[0], (main.position[1] + last.position[1]) / 2, main.position[2]],
      size: [main.size[0], height, main.size[2]] },
    ...pieces.filter((piece) => piece.kind === "ico").filter((_, index) => index % 2 === 0)];
  }

  const ranked = pieces.map((piece) => {
    const geometry = geometryFor(piece);
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    const { min, max } = geometry.boundingBox!;
    const volume = (max.x - min.x) * (max.y - min.y) * (max.z - min.z) * piece.size.reduce((a, b) => a * b, 1);
    return { piece, volume };
  }).sort((a, b) => b.volume - a.volume);
  return ranked.filter(({ piece, volume }, index) => index === 0 ||
    (piece.kind !== "ring" && Math.min(...piece.size) >= 0.035 && volume >= ranked[0].volume * 0.075))
    .slice(0, MAX_SHAPES).map(({ piece }) => piece);
}

function makeShape(piece: Piece): Shape {
  const pivot = partPivot(piece.part);
  const offset: Vector = piece.position.map((value, i) => value - pivot[i]) as Vector;
  const rotation = new Quaternion().setFromEuler(new Euler(...(piece.rotation ?? [0, 0, 0])));
  const size = piece.size;
  if (!piece.geometry) switch (piece.kind) {
    case "box":
    case "curtain": return { kind: "box", offset, rotation, size };
    case "snow-slab": return { kind: "rounded", offset, rotation, size };
    case "cylinder":
    case "cone":
      if (Math.abs(size[0] - size[2]) <= 0.003) return { kind: piece.kind, offset, rotation, size };
      break;
    case "snow-drift":
    case "ico-detail":
    case "ico": {
      if (Math.max(...size) - Math.min(...size) < 0.01) return { kind: "ball", offset, rotation, size };
      const [x, y, z] = size;
      const points = [x, 0, 0, -x, 0, 0, 0, y, 0, 0, -y, 0, 0, 0, z, 0, 0, -z];
      for (const a of [-1, 1]) for (const b of [-1, 1]) for (const c of [-1, 1]) points.push(a * x * 0.577, b * y * 0.577, c * z * 0.577);
      return { kind: "hull", offset, rotation, size, vertices: new Float32Array(points) };
    }
  }
  const positions = geometryFor(piece).getAttribute("position");
  const vertices = new Float32Array(positions.count * 3);
  for (let i = 0; i < positions.count; i += 1) {
    vertices.set([positions.getX(i) * size[0], positions.getY(i) * size[1], positions.getZ(i) * size[2]], i * 3);
  }
  return { kind: "hull", offset, rotation, size, vertices };
}

const shapesByPart = new Map<PartId, Shape[]>();

function colliderFor(engine: Engine, shape: Shape): ColliderDesc {
  const [x, y, z] = shape.size;
  const bevel = Math.min(0.035, x * 0.16, y * 0.16, z * 0.16);
  switch (shape.kind) {
    case "rounded": return engine.ColliderDesc.roundCuboid(x / 2 - bevel, y / 2 - bevel, z / 2 - bevel, bevel);
    case "ball": return engine.ColliderDesc.ball(x);
    case "cylinder": return engine.ColliderDesc.cylinder(y / 2, x);
    case "cone": return engine.ColliderDesc.cone(y / 2, x);
    case "hull": {
      const hull = engine.ColliderDesc.convexHull(shape.vertices!);
      if (!hull) throw new Error("Collision mesh has no volume");
      return hull;
    }
    case "box": return engine.ColliderDesc.cuboid(x * 0.49, y * 0.49, z * 0.49);
  }
}

export function partColliders(engine: Engine, part: PartId) {
  const snow = part.includes("snow") || part.startsWith("icicles");
  const ornament = part === "roof-bauble";
  const roofPanel = /^roof-(left|right)-/.test(part);
  const heavy = /^(tile-|ground-|plinth-)/.test(part) || part === "chimney" || part === "steps";
  let shapes = shapesByPart.get(part);
  if (!shapes) {
    const pieces = LEVEL_MODELS[partLevel(part)].pieces.filter((piece) => piece.part === part);
    if (!pieces.length) throw new Error(`Missing collision geometry for ${part}`);
    shapes = collisionPieces(part, pieces).map(makeShape);
    shapesByPart.set(part, shapes);
  }
  return shapes.map((shape) => colliderFor(engine, shape).setTranslation(...shape.offset).setRotation(shape.rotation)
    .setDensity(snow || part.startsWith("ship-water-") ? 0.25 : heavy ? 2 : ornament ? 0.16 : 0.8)
    .setFriction(snow || ornament ? 0.09 : roofPanel ? 0.32 : 0.53)
    .setFrictionCombineRule(engine.CoefficientCombineRule.Min)
    .setRestitution(ornament ? 0.36 : 0.10)
    .setRestitutionCombineRule(engine.CoefficientCombineRule.Max));
}
