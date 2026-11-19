import { Vector3 } from "three";
import type { LevelId } from "../game/campaign.ts";

export type CameraView = "title" | "house";
export const TITLE_CAMERA: [number, number, number] = [0, 5.6, 6.5];
export const CAMERA_POSES = {
  title: { position: TITLE_CAMERA, target: [0, 4.5, 0] },
  house: { position: [10.5, 8.5, 13.5], target: [0, 0.9, 0] },
} satisfies Record<CameraView, { position: [number, number, number]; target: [number, number, number] }>;

export const PLAY_CAMERA_POSES = {
  zoo: { position: [11.0, 11.4, 20.6], target: [0, 2.0, 0] },
  carnival: { position: [11.8, 12.0, 21.2], target: [0, 3.0, 0] },
  construction: { position: [11.5, 10.5, 18], target: [0, 1.7, 0] },
  desert: { position: [-8.0, 9.6, 18.4], target: [0, 1.25, 0] },
  cottage: CAMERA_POSES.house,
  titanic: { position: [10.0, 10.2, 20.0], target: [0.5, 0.65, 0] },
  campsite: { position: [11.8, 10.4, 16.7], target: [0, 1.1, 0] },
} satisfies Record<LevelId, typeof CAMERA_POSES.house>;
const centers = {
  zoo: new Vector3(...PLAY_CAMERA_POSES.zoo.target),
  carnival: new Vector3(...PLAY_CAMERA_POSES.carnival.target),
  construction: new Vector3(...PLAY_CAMERA_POSES.construction.target),
  desert: new Vector3(...PLAY_CAMERA_POSES.desert.target),
  cottage: new Vector3(...PLAY_CAMERA_POSES.cottage.target),
  titanic: new Vector3(...PLAY_CAMERA_POSES.titanic.target),
  campsite: new Vector3(...PLAY_CAMERA_POSES.campsite.target),
};
const overviewDistances = {
  zoo: centers.zoo.distanceTo(new Vector3(...PLAY_CAMERA_POSES.zoo.position)),
  carnival: centers.carnival.distanceTo(new Vector3(...PLAY_CAMERA_POSES.carnival.position)),
  construction: centers.construction.distanceTo(new Vector3(...PLAY_CAMERA_POSES.construction.position)),
  desert: centers.desert.distanceTo(new Vector3(...PLAY_CAMERA_POSES.desert.position)),
  cottage: centers.cottage.distanceTo(new Vector3(...PLAY_CAMERA_POSES.cottage.position)),
  titanic: centers.titanic.distanceTo(new Vector3(...PLAY_CAMERA_POSES.titanic.position)),
  campsite: centers.campsite.distanceTo(new Vector3(...PLAY_CAMERA_POSES.campsite.position)),
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

