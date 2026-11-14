import { Raycaster, Vector3 } from "three";
import type { Camera, Intersection, Object3D } from "three";
import type { GameState } from "../game/types.ts";
import { SCREW_SCALE } from "../game/levels.ts";
import { isScrewAccessible } from "../game/rules.ts";

function hitTarget(hit: Intersection): string | "blocked" | null {
  for (let object: Object3D | null = hit.object; object; object = object.parent) {
    if (object.userData.pickBlocker) return "blocked";
    if (hit.instanceId !== undefined && object.userData.screwIds) return object.userData.screwIds[hit.instanceId];
    if (object.userData.screwId) return object.userData.screwId;
  }
  return null;
}

// A 44 CSS-pixel touch target, without enlarging visible screws or permitting
// selections through walls. Confirm a real, front-facing head along its own ray.
export function pickNearbyHead(scene: Object3D, camera: Camera, rect: { left: number; top: number; width: number; height: number },
  point: [number, number], game: GameState, radius = 22): { id: string; blocked: boolean } | null {
  const origin = camera.getWorldPosition(new Vector3());
  const candidates = game.screws.filter((screw) => !screw.removed).map((screw) => {
    const normal = new Vector3(...screw.normal);
    const face = new Vector3(...screw.position).addScaledVector(normal, SCREW_SCALE * 0.144);
    const projected = face.clone().project(camera);
    const distance = Math.hypot(rect.left + (projected.x + 1) * rect.width / 2 - point[0], rect.top + (1 - projected.y) * rect.height / 2 - point[1]);
    return { screw, face, distance, facing: normal.dot(origin.clone().sub(face)) > 0 && Math.abs(projected.z) <= 1 };
  }).filter((candidate) => candidate.facing && candidate.distance <= radius).sort((a, b) => a.distance - b.distance);
  const ray = new Raycaster();
  for (const candidate of candidates) {
    ray.set(origin, candidate.face.clone().sub(origin).normalize());
    const first = ray.intersectObjects(scene.children, true).map(hitTarget).find((target) => target !== null);
    if (first === candidate.screw.id) return { id: first, blocked: !isScrewAccessible(game, candidate.screw) };
  }
  return null;
}

export function pickNearbyScrew(...args: Parameters<typeof pickNearbyHead>): string | null {
  const result = pickNearbyHead(...args);
  return result && !result.blocked ? result.id : null;
}
