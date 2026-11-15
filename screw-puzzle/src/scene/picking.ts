import { Raycaster, Vector2, Vector3 } from "three";
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
  point: [number, number], game: GameState, radius = 22, preferExact = false): { id: string; blocked: boolean } | null {
  const origin = camera.getWorldPosition(new Vector3());
  const candidates = game.screws.filter((screw) => !screw.removed).map((screw) => {
    const normal = new Vector3(...screw.normal);
    const face = new Vector3(...screw.position).addScaledVector(normal, SCREW_SCALE * 0.144);
    const projected = face.clone().project(camera);
    const distance = Math.hypot(rect.left + (projected.x + 1) * rect.width / 2 - point[0], rect.top + (1 - projected.y) * rect.height / 2 - point[1]);
    return { screw, face, distance, facing: normal.dot(origin.clone().sub(face)) > 0 && Math.abs(projected.z) <= 1 };
  }).filter((candidate) => candidate.facing && (preferExact || candidate.distance <= radius));
  const ray = new Raycaster();
  const firstHit = () => ray.intersectObjects(scene.children, true).map(hitTarget).find((target) => target !== null);
  if (preferExact) {
    // A screw's rim can be visible even when the ray through its centre is covered.
    ray.setFromCamera(new Vector2(2 * (point[0] - rect.left) / rect.width - 1,
      1 - 2 * (point[1] - rect.top) / rect.height), camera);
    const hit = firstHit();
    const exact = candidates.find(({ screw }) => screw.id === hit);
    if (exact) return { id: exact.screw.id, blocked: !isScrewAccessible(game, exact.screw) };
  }
  for (const candidate of candidates.filter(({ distance }) => distance <= radius).sort((a, b) => a.distance - b.distance)) {
    ray.set(origin, candidate.face.clone().sub(origin).normalize());
    const first = firstHit();
    if (first === candidate.screw.id) return { id: first, blocked: !isScrewAccessible(game, candidate.screw) };
  }
  return null;
}

export function pickNearbyScrew(...args: Parameters<typeof pickNearbyHead>): string | null {
  const result = pickNearbyHead(...args);
  return result && !result.blocked ? result.id : null;
}
