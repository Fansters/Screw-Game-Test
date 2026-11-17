import { Vector3 } from "three";
import type { LevelId } from "../game/campaign.ts";

export type CameraView = "title" | "house";
export const TITLE_CAMERA: [number, number, number] = [0, 5.6, 6.5];
export const CAMERA_POSES = {
  title: { position: TITLE_CAMERA, target: [0, 4.5, 0] },
  house: { position: [10.5, 8.5, 13.5], target: [0, 0.9, 0] },
} satisfies Record<CameraView, { position: [number, number, number]; target: [number, number, number] }>;

export const PLAY_CAMERA_POSES = {
  cottage: CAMERA_POSES.house,
  titanic: { position: [10.0, 10.2, 20.0], target: [0.5, 0.65, 0] },
} satisfies Record<LevelId, typeof CAMERA_POSES.house>;
const centers = {
  cottage: new Vector3(...PLAY_CAMERA_POSES.cottage.target),
  titanic: new Vector3(...PLAY_CAMERA_POSES.titanic.target),
};
const overviewDistances = {
  cottage: centers.cottage.distanceTo(new Vector3(...PLAY_CAMERA_POSES.cottage.position)),
  titanic: centers.titanic.distanceTo(new Vector3(...PLAY_CAMERA_POSES.titanic.position)),
};

export function recenterZoomOut(position: Vector3, target: Vector3, previousTarget: Vector3, previousDistance: number, level: LevelId = "cottage") {
  const distance = position.distanceTo(target);
  if (distance - previousDistance < 0.00001) return;
  const remaining = overviewDistances[level] - previousDistance;
  const weight = remaining > 0 ? Math.min(1, (distance - previousDistance) / remaining) : 1;
  const center = previousTarget.clone().lerp(centers[level], weight);
  // Translate both together to keep the current view angle and orbit distance.
  position.add(center).sub(target);
  target.copy(center);
}

