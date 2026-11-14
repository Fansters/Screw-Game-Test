import { Vector3 } from "three";

export type CameraView = "title" | "house";
export const TITLE_CAMERA: [number, number, number] = [0, 5.6, 6.5];
export const CAMERA_POSES = {
  title: { position: TITLE_CAMERA, target: [0, 4.5, 0] },
  house: { position: [10.5, 8.5, 13.5], target: [0, 0.9, 0] },
} satisfies Record<CameraView, { position: [number, number, number]; target: [number, number, number] }>;

const HOUSE_CENTER = new Vector3(...CAMERA_POSES.house.target);
const OVERVIEW_DISTANCE = HOUSE_CENTER.distanceTo(new Vector3(...CAMERA_POSES.house.position));

export function recenterZoomOut(position: Vector3, target: Vector3, previousTarget: Vector3, previousDistance: number) {
  const distance = position.distanceTo(target);
  if (distance - previousDistance < 0.00001) return;
  const remaining = OVERVIEW_DISTANCE - previousDistance;
  const weight = remaining > 0 ? Math.min(1, (distance - previousDistance) / remaining) : 1;
  const center = previousTarget.clone().lerp(HOUSE_CENTER, weight);
  // Translate both together to keep the current view angle and orbit distance.
  position.add(center).sub(target);
  target.copy(center);
}

