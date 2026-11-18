import { Box3, Object3D, Quaternion, Vector3 } from "three";
import type { PartId, Screw } from "../game/types.ts";
import { geometryFor } from "./geometry.ts";
import { LEVEL_MODELS, partLevel, partPivot } from "./levelModels.ts";
import type { Vector } from "./houseModel.ts";
import { findScrewObstructions } from "./obstructions.ts";
import { SCREW_PULL_DISTANCE } from "./screwDimensions.ts";

export const LOOSE_LIFETIME_MS = 1000;
export const SMOKE_DURATION_MS = 560;
export const OFF_MAP = -5.5;
export const POSE_HISTORY_MS = 250;
type Rotation = [number, number, number, number];
export type PartPose = { position: Vector; rotation: Rotation };
// Wall clock or local scene time, followed by world position and rotation.
export type PoseFrame = [number, ...Vector, ...Rotation];
export type PartRelease = { releasedAt: number; dismissedAt?: number };
export type PartReleases = Partial<Record<PartId, PartRelease>>;
export type LooseMotion = { releasedAt: number; frames: readonly PoseFrame[]; poof?: { at: number; position: Vector } };
export type LooseParts = Partial<Record<PartId, LooseMotion>>;

export function mergeLooseParts(previous: LooseParts, incoming: LooseParts): LooseParts {
  return Object.fromEntries((Object.entries(incoming) as [PartId, LooseMotion][]).map(([part, motion]) => {
    const oldest = motion.frames[0][0];
    const earliest = motion.frames.at(-1)![0] - POSE_HISTORY_MS;
    const history = previous[part]?.frames.filter(([at]) => at >= earliest && at < oldest);
    return [part, history?.length ? { ...motion, frames: [...history, ...motion.frames] } : motion];
  }));
}

const partIds = new Set<string>(Object.values(LEVEL_MODELS).flatMap(({ parts }) => [...parts]));
export function isLevelPart(id: unknown): id is PartId {
  return typeof id === "string" && partIds.has(id);
}

const localBounds = new Map<PartId, Box3>();
function partBounds(part: PartId): Box3 {
  const cached = localBounds.get(part);
  if (cached) return cached;
  const bounds = new Box3(), transform = new Object3D();
  for (const piece of LEVEL_MODELS[partLevel(part)].pieces) {
    if (piece.part !== part) continue;
    const geometry = geometryFor(piece);
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    transform.position.set(...piece.position);
    transform.scale.set(...piece.size);
    transform.rotation.set(...(piece.rotation ?? [0, 0, 0]));
    transform.updateMatrix();
    bounds.union(geometry.boundingBox!.clone().applyMatrix4(transform.matrix));
  }
  localBounds.set(part, bounds);
  return bounds;
}

export function loosePartPose(part: PartId, motion: LooseMotion, now: number): PartPose {
  const frames = motion.frames;
  if (!frames.length || now < motion.releasedAt) return { position: partPivot(part), rotation: [0, 0, 0, 1] };
  const right = frames.findIndex(([at]) => at >= now);
  const b = frames[right < 0 ? frames.length - 1 : right];
  const a = right > 0 ? frames[right - 1] : b;
  if (a === b) return { position: [b[1], b[2], b[3]], rotation: [b[4], b[5], b[6], b[7]] };
  const t = (now - a[0]) / (b[0] - a[0]);
  return {
    position: new Vector3(a[1], a[2], a[3]).lerp(new Vector3(b[1], b[2], b[3]), t).toArray(),
    rotation: new Quaternion(a[4], a[5], a[6], a[7]).normalize()
      .slerp(new Quaternion(b[4], b[5], b[6], b[7]).normalize(), t).toArray(),
  };
}

export function isLooseVisible(motion: LooseMotion, now: number, y: number) {
  return now < (motion.poof?.at ?? motion.releasedAt + LOOSE_LIFETIME_MS) && y > OFF_MAP;
}

export function smokeScale(part: PartId) {
  const bounds = partBounds(part);
  return Math.min(2.8, Math.max(0.6, Math.max(bounds.max.x - bounds.min.x, bounds.max.z - bounds.min.z) * 0.7));
}

export function findLooseBlocker(loose: LooseParts, screw: Screw, scale: number, now: number): PartId | undefined {
  const base = new Vector3(...screw.position);
  const tip = base.clone().addScaledVector(new Vector3(...screw.normal), scale * (0.144 + SCREW_PULL_DISTANCE) + 0.01);
  const probe = new Box3().setFromPoints([base, tip]).expandByScalar(scale * 0.26);
  const root = new Object3D();
  const bounds = new Box3();
  const worldPosition = new Vector3();
  for (const [part, motion] of Object.entries(loose) as [PartId, LooseMotion][]) {
    if (now >= (motion.poof?.at ?? motion.releasedAt + LOOSE_LIFETIME_MS)) continue;
    const { position, rotation } = loosePartPose(part, motion, now);
    if (position[1] <= OFF_MAP) continue;
    root.quaternion.set(...rotation).normalize();
    root.position.set(...partPivot(part)).applyQuaternion(root.quaternion).negate().add(worldPosition.set(...position));
    root.updateMatrixWorld();
    if (!probe.intersectsBox(bounds.copy(partBounds(part)).applyMatrix4(root.matrixWorld))) continue;
    if (findScrewObstructions(screw, scale, { root, part }).length) return part;
  }
}
