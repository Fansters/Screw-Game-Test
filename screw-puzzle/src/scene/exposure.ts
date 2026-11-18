import { DoubleSide, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from "three";
import type { GameState } from "../game/types.ts";
import type { LevelId } from "../game/types.ts";
import { isScrewAccessible } from "../game/rules.ts";
import { SCREW_SCALE } from "../game/levels.ts";
import { LEVEL_MODELS } from "./levelModels.ts";
import { geometryFor } from "./geometry.ts";

// An orbit-wide difficulty audit, not a gameplay lock. Colors never affect it.
export function findExposedScrews(game: GameState, level: LevelId = "cottage"): string[] {
  const material = new MeshBasicMaterial({ side: DoubleSide });
  const meshes = LEVEL_MODELS[level].pieces.filter((piece) => !game.removedParts.includes(piece.part)).map((piece) => {
    const mesh = new Mesh(geometryFor(piece), material);
    mesh.position.set(...piece.position); mesh.scale.set(...piece.size);
    if (piece.rotation) mesh.rotation.set(...piece.rotation);
    mesh.updateMatrixWorld();
    return mesh;
  });
  const views: Vector3[] = [];
  for (const elevation of [-0.4, 0.15, 0.6, 1, 1.35]) for (let step = 0; step < 16; step += 1) {
    const angle = step * Math.PI / 8;
    views.push(new Vector3(Math.cos(angle) * Math.cos(elevation) * 18, 0.9 + Math.sin(elevation) * 18, Math.sin(angle) * Math.cos(elevation) * 18));
  }
  const ray = new Raycaster(), exposed: string[] = [];
  for (const screw of game.screws.filter((screw) => isScrewAccessible(game, screw))) {
    const normal = new Vector3(...screw.normal);
    const face = new Vector3(...screw.position).addScaledVector(normal, SCREW_SCALE * 0.144);
    const visible = views.some((camera) => {
      const direction = face.clone().sub(camera), distance = direction.length();
      if (normal.dot(direction) >= -distance * 0.08) return false;
      ray.set(camera, direction.normalize()); ray.far = distance - 0.002;
      return !ray.intersectObjects(meshes, false).length;
    });
    if (visible) exposed.push(screw.id);
  }
  material.dispose();
  return exposed;
}
