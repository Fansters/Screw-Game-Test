import { Vector3 } from "three";
import type { Camera, Object3D } from "three";
import { SCREW_SCALE } from "../game/screwScale.ts";
import { SCREW_HEAD_FACE_Z } from "./screwDimensions.ts";
import { matchCandidates } from "../game/abilities.ts";
import { isScrewAccessible } from "../game/rules.ts";
import type { GameState, Screw } from "../game/types.ts";
import { findLooseBlocker } from "./loosePhysics.ts";
import type { LooseParts } from "./loosePhysics.ts";
import { pickSceneTarget } from "./picking.ts";

export type HintView = { position: [number, number, number]; target: [number, number, number] };
const rect = { left: 0, top: 0, width: 1000, height: 1000 };
export function hintFace(screw: Screw) {
  return new Vector3(...screw.position).addScaledVector(new Vector3(...screw.normal), SCREW_SCALE * SCREW_HEAD_FACE_Z);
}
export function hintVisible(scene: Object3D, camera: Camera, game: GameState, screw: Screw) {
  const face = hintFace(screw), point = face.clone().project(camera);
  if (Math.abs(point.x) > .88 || Math.abs(point.y) > .72 || Math.abs(point.z) > 1 ||
      new Vector3(...screw.normal).dot(camera.position.clone().sub(face)) <= .1) return false;
  const hit = pickSceneTarget(scene, camera, rect, [(point.x + 1) * 500, (1 - point.y) * 500], game, 0);
  return hit?.kind === "screw" && hit.id === screw.id;
}

// Use the live scene (including falling covers), and the same head ray as a real
// tap. Sample only when asked; never run a whole-level visibility audit per frame.
export function findHintView(scene: Object3D, camera: Camera, game: GameState, screw: Screw): HintView | null {
  scene.updateMatrixWorld(true);
  const face = hintFace(screw), normal = new Vector3(...screw.normal);
  const target = face.clone().add(new Vector3(0, .5, 0));
  const currentDirection = camera.position.clone().sub(face).normalize();
  const directions = [currentDirection, normal];
  for (const elevation of [-.65, -.25, .2, .65, 1.1]) for (let step = 0; step < 16; step++) {
    const angle = step * Math.PI / 8;
    directions.push(new Vector3(Math.cos(angle) * Math.cos(elevation), Math.sin(elevation), Math.sin(angle) * Math.cos(elevation)));
  }
  directions.sort((a, b) => b.dot(currentDirection) - a.dot(currentDirection));
  const probe = camera.clone();
  for (const direction of directions) {
    if (normal.dot(direction) < .18) continue;
    probe.position.copy(target).addScaledVector(direction, 7.2);
    probe.lookAt(target); probe.updateMatrixWorld(true);
    if (hintVisible(scene, probe, game, screw)) return { position: probe.position.toArray(), target: target.toArray() };
  }
  return null;
}
export function findMatchHint(scene: Object3D, camera: Camera, game: GameState, parts: LooseParts, now: number) {
  const candidates = matchCandidates(game).filter((screw) => !findLooseBlocker(parts, screw, SCREW_SCALE, now));
  // Within the same priority prefer one already in sight. Still check that a
  // clear close-up angle exists before spending a charge.
  const fullness = (screw: Screw) => game.boxes.find((box) => box?.color === screw.color)!.screws.length;
  candidates.sort((a, b) => fullness(b) - fullness(a) || Number(hintVisible(scene, camera, game, b)) - Number(hintVisible(scene, camera, game, a)));
  for (const screw of candidates) {
    const pose = findHintView(scene, camera, game, screw);
    if (pose) return { screw: screw.id, pose };
  }
  return null;
}
export function hintRemovable(game: GameState, screw: Screw, parts: LooseParts, now: number) {
  return !screw.removed && isScrewAccessible(game, screw) && !findLooseBlocker(parts, screw, SCREW_SCALE, now);
}
