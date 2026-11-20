import { Raycaster, Vector2, Vector3 } from "three";
import type { Camera, Intersection, Object3D } from "three";
import type { GameState, PartId } from "../game/types.ts";
import { SCREW_SCALE } from "../game/screwScale.ts";
import { isScrewAccessible } from "../game/rules.ts";

type CanvasRect = { left: number; top: number; width: number; height: number };
type Point = [number, number];
type Target = { kind: "screw"; id: string } | { kind: "part" | "loose"; id: PartId };
type Surface = Target | { kind: "blocked" };

function hitTarget(hit: Intersection): Surface | undefined {
  for (let object: Object3D | null = hit.object; object; object = object.parent) {
    if (object.userData.pickBlocker) {
      const part: PartId | undefined = object.userData.part;
      if (part && object.userData.loose) return object.parent?.visible ? { kind: "loose", id: part } : undefined;
      return part ? { kind: "part", id: part } : { kind: "blocked" };
    }
    const screw: string | undefined = hit.instanceId === undefined ? object.userData.screwId : object.userData.screwIds?.[hit.instanceId];
    if (screw) return { kind: "screw", id: screw };
  }
}

function firstHit(ray: Raycaster, scene: Object3D) {
  for (const hit of ray.intersectObjects(scene.children, true)) {
    const target = hitTarget(hit);
    if (target) return target;
  }
}

function pointRay(ray: Raycaster, camera: Camera, rect: CanvasRect, [x, y]: Point) {
  ray.setFromCamera(new Vector2(2 * (x - rect.left) / rect.width - 1, 1 - 2 * (y - rect.top) / rect.height), camera);
}

export function pickSceneTarget(scene: Object3D, camera: Camera, rect: CanvasRect, point: Point, game: GameState,
  radius: number, transparentPart?: PartId): Target | null {
  const ray = new Raycaster();
  pointRay(ray, camera, rect, point);
  const hit = firstHit(ray, scene);
  if (hit?.kind === "loose") return hit;
  if (hit?.kind === "screw") {
    const screw = game.screws.find((screw) => screw.id === hit.id);
    return screw && !screw.removed && ray.ray.direction.dot(new Vector3(...screw.normal)) < 0 ? hit : null;
  }
  // A faded cover stays solid for picking. Tap its surface to restore it
  // without snapping to another screw near the one visible through the cover.
  if (hit?.kind === "part" && hit.id === transparentPart) return hit;
  const nearby = radius > 0 ? pickNearbyHead(scene, camera, rect, point, game, radius) : null;
  if (nearby) return { kind: "screw", id: nearby.id };
  return hit?.kind === "part" ? hit : null;
}

// A 44 CSS-pixel touch target, without enlarging visible screws or permitting
// selections through walls. Confirm a real, front-facing head along its own ray.
export function pickNearbyHead(scene: Object3D, camera: Camera, rect: CanvasRect,
  point: Point, game: GameState, radius = 22, preferExact = false): { id: string; blocked: boolean } | null {
  const origin = camera.getWorldPosition(new Vector3());
  const candidates = game.screws.filter((screw) => !screw.removed).map((screw) => {
    const normal = new Vector3(...screw.normal);
    const face = new Vector3(...screw.position).addScaledVector(normal, SCREW_SCALE * 0.144);
    const projected = face.clone().project(camera);
    const distance = Math.hypot(rect.left + (projected.x + 1) * rect.width / 2 - point[0], rect.top + (1 - projected.y) * rect.height / 2 - point[1]);
    return { screw, face, distance, facing: normal.dot(origin.clone().sub(face)) > 0 && Math.abs(projected.z) <= 1 };
  }).filter((candidate) => candidate.facing && (preferExact || candidate.distance <= radius));
  const ray = new Raycaster();
  if (preferExact) {
    // A screw's rim can be visible even when the ray through its centre is covered.
    pointRay(ray, camera, rect, point);
    const hit = firstHit(ray, scene);
    const exact = hit?.kind === "screw" && candidates.find(({ screw }) => screw.id === hit.id);
    if (exact) return { id: exact.screw.id, blocked: !isScrewAccessible(game, exact.screw) };
  }
  for (const candidate of candidates.filter(({ distance }) => distance <= radius).sort((a, b) => a.distance - b.distance)) {
    ray.set(origin, candidate.face.clone().sub(origin).normalize());
    const first = firstHit(ray, scene);
    if (first?.kind === "screw" && first.id === candidate.screw.id) {
      return { id: first.id, blocked: !isScrewAccessible(game, candidate.screw) };
    }
  }
  return null;
}

export function pickNearbyScrew(...args: Parameters<typeof pickNearbyHead>): string | null {
  const result = pickNearbyHead(...args);
  return result && !result.blocked ? result.id : null;
}
