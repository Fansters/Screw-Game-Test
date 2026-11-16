import { Box3, Object3D, Vector3 } from "three";
import { PART_IDS } from "../game/types.ts";
import type { PartId, Screw } from "../game/types.ts";
import { geometryFor } from "./geometry.ts";
import { PART_PIVOTS, PIECES } from "./houseModel.ts";
import { findScrewObstructions } from "./obstructions.ts";
import { isPilotPart, LOOSE_LIFETIME_MS, pilotPose, simulatePilots } from "./pilotPhysics.ts";
import type { PartPose, PilotMotion } from "./pilotPhysics.ts";

export type LooseMotion = PilotMotion & {
  startedAt: number;
  fromY: number;
  toY: number;
  support: PartId | null;
  kick: number;
  floorY?: number;
  poof?: { at: number; position: [number, number, number] };
};
export type LooseParts = Partial<Record<PartId, LooseMotion>>;

const GRAVITY = 9.8;
const OFF_MAP = -5.5;
const CONTACT_MARGIN = 0.045;
export const SMOKE_DURATION_MS = 560;

function overlap(a: Box3, b: Box3) {
  const x = Math.min(a.max.x, b.max.x) - Math.max(a.min.x, b.min.x);
  const z = Math.min(a.max.z, b.max.z) - Math.max(a.min.z, b.min.z);
  if (x <= 0 || z <= 0) return false;
  const areaA = (a.max.x - a.min.x) * (a.max.z - a.min.z);
  const areaB = (b.max.x - b.min.x) * (b.max.z - b.min.z);
  return x * z >= Math.min(0.055, areaA * 0.25, areaB * 0.25);
}

function buildColliders() {
  const bodies = new Map<PartId, Box3>();
  const floors: { part: PartId; bounds: Box3 }[] = [];
  const pose = new Object3D();
  for (const piece of PIECES) {
    const geometry = geometryFor(piece);
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    if (!geometry.boundingBox) continue;
    pose.position.set(...piece.position);
    pose.scale.set(...piece.size);
    pose.rotation.set(...(piece.rotation ?? [0, 0, 0]));
    pose.updateMatrix();
    const bounds = geometry.boundingBox.clone().applyMatrix4(pose.matrix);
    floors.push({ part: piece.part, bounds });
    if (!bodies.has(piece.part)) bodies.set(piece.part, new Box3());
    bodies.get(piece.part)!.union(bounds);
  }
  const staticSupports = new Map<PartId, { part: PartId; top: number }[]>();
  for (const [part, body] of bodies) {
    staticSupports.set(part, floors.filter((surface) => surface.part !== part &&
      surface.bounds.max.y <= body.min.y + CONTACT_MARGIN && overlap(body, surface.bounds))
      .map((surface) => ({ part: surface.part, top: surface.bounds.max.y })).sort((a, b) => b.top - a.top));
  }
  return { bodies, staticSupports };
}
const { bodies, staticSupports } = buildColliders();
const partIds = new Set<string>(PART_IDS);

export function isLevelPart(id: unknown): id is PartId {
  return typeof id === "string" && partIds.has(id);
}

function phase(motion: LooseMotion, now: number) {
  const t = Math.max(0, now - motion.startedAt) / 1000;
  const impactSpeed = Math.sqrt(motion.kick ** 2 + 2 * GRAVITY * (motion.fromY - motion.toY));
  const impactTime = (motion.kick + impactSpeed) / GRAVITY;
  if (t < impactTime) return { y: motion.fromY + motion.kick * t - GRAVITY * t * t / 2, velocity: motion.kick - GRAVITY * t };
  const bounce = motion.support ? Math.min(0.75, impactSpeed * 0.28) : 0;
  const afterImpact = t - impactTime;
  if (afterImpact < 2 * bounce / GRAVITY) {
    return { y: motion.toY + bounce * afterImpact - GRAVITY * afterImpact ** 2 / 2, velocity: bounce - GRAVITY * afterImpact };
  }
  return { y: motion.toY, velocity: 0 };
}

export function looseY(motion: LooseMotion, now: number) { return phase(motion, now).y; }

function poseInPile(loose: LooseParts, part: PartId, now: number): { y: number; velocity: number } {
  const motion = loose[part]!;
  const pose = phase(motion, now);
  if (!motion.support) return pose;
  const support = loose[motion.support];
  if (!support || support.poof) return pose;
  const endsAt = support.releasedAt + LOOSE_LIFETIME_MS;
  if (now >= endsAt && endsAt > motion.startedAt) {
    const last = poseInPile(loose, part, endsAt - 0.001);
    const t = (now - endsAt) / 1000;
    const y = last.y + last.velocity * t - GRAVITY * t * t / 2;
    const floor = motion.floorY ?? OFF_MAP - 1;
    return y > floor ? { y, velocity: last.velocity - GRAVITY * t } : { y: floor, velocity: 0 };
  }
  const beneath = poseInPile(loose, motion.support, now);
  const contactY = motion.toY + beneath.y - support.toY;
  return contactY > pose.y ? { y: contactY, velocity: beneath.velocity } : pose;
}

export function loosePartY(loose: LooseParts, part: PartId, now: number) { return poseInPile(loose, part, now).y; }

export function loosePartPose(loose: LooseParts, part: PartId, now: number): PartPose {
  if (isPilotPart(part)) return pilotPose(part, loose[part]!, now);
  const [x, , z] = PART_PIVOTS[part];
  return { position: [x, loosePartY(loose, part, now), z], rotation: [0, 0, 0, 1] };
}

export function isLooseVisible(motion: LooseMotion, now: number, y = looseY(motion, now)) {
  return !motion.poof && now < motion.releasedAt + LOOSE_LIFETIME_MS && y > OFF_MAP;
}

export function loosePartPoof(loose: LooseParts, part: PartId) {
  const motion = loose[part]!;
  if (motion.poof) return motion.poof;
  const at = motion.releasedAt + LOOSE_LIFETIME_MS;
  return { at, position: loosePartPose(loose, part, at).position };
}

export function trimFinishedPilots(loose: LooseParts, now: number) {
  const next = { ...loose };
  for (const part of PART_IDS.filter(isPilotPart)) {
    const motion = next[part];
    if (motion && now >= (motion.dismissedAt ?? motion.releasedAt + LOOSE_LIFETIME_MS) + SMOKE_DURATION_MS) delete next[part];
  }
  return next;
}

export function smokeScale(part: PartId) {
  const bounds = bodies.get(part)!;
  return Math.min(2.8, Math.max(0.6, Math.max(bounds.max.x - bounds.min.x, bounds.max.z - bounds.min.z) * 0.7));
}

function settlePile(loose: LooseParts, previous: LooseParts, removed: readonly PartId[], now: number): LooseParts {
  const removedSet = new Set(removed);
  const pile = PART_IDS.flatMap((part) => {
    const motion = loose[part];
    if (!motion || isPilotPart(part) || motion.poof || now < motion.releasedAt || now >= motion.releasedAt + LOOSE_LIFETIME_MS) return [];
    const { y, velocity } = previous[part] ? poseInPile(previous, part, now) : phase(motion, now);
    if (y <= OFF_MAP) return [];
    const bounds = bodies.get(part)!;
    return [{ part, motion, y, velocity, bounds, bottom: bounds.min.y + y - PART_PIVOTS[part][1] }];
  }).sort((a, b) => a.bottom - b.bottom);
  const settled: { part: PartId; bounds: Box3; top: number; currentTop: number }[] = [];
  const next = { ...loose };
  for (const body of pile) {
    const { part, motion, y, velocity, bounds, bottom } = body;
    const fixed = staticSupports.get(part)?.find((surface) => !removedSet.has(surface.part) && surface.top <= bottom + CONTACT_MARGIN);
    let landing = fixed;
    // Solve bottom-up so a roof panel can land on a piece that is already loose.
    for (const other of settled) {
      if (other.top <= bottom + CONTACT_MARGIN && other.currentTop <= bottom + CONTACT_MARGIN &&
          (!landing || other.top > landing.top + 0.001) && overlap(bounds, other.bounds)) landing = other;
    }
    const toY = landing ? y + Math.min(0, landing.top - bottom) : OFF_MAP - 1;
    const floorY = fixed ? y + Math.min(0, fixed.top - bottom) : OFF_MAP - 1;
    const support = landing?.part ?? null;
    if (support !== motion.support || Math.abs(toY - motion.toY) > 0.001) {
      next[part] = { ...motion, startedAt: now, fromY: y, toY, support, kick: velocity, floorY };
    } else if (floorY !== motion.floorY) {
      next[part] = { ...motion, floorY };
    }
    if (landing) settled.push({ part, bounds, top: bounds.max.y + toY - PART_PIVOTS[part][1],
      currentTop: bounds.max.y + y - PART_PIVOTS[part][1] });
  }
  return next;
}

function updatePilotTracks(loose: LooseParts, removed: readonly PartId[], now: number) {
  const motions = PART_IDS.flatMap((part) => loose[part] ? [{ part, ...loose[part] }] : []);
  const tracks = simulatePilots(motions, removed, now, (part, at) => {
    const motion = loose[part];
    if (!motion || motion.poof || at >= motion.releasedAt + LOOSE_LIFETIME_MS) return;
    const [x, y, z] = PART_PIVOTS[part];
    const height = at < motion.releasedAt ? y : loosePartY(loose, part, at);
    if (height > OFF_MAP) return { position: [x, height, z], rotation: [0, 0, 0, 1] };
  });
  for (const [part, frames] of tracks) loose[part] = { ...loose[part]!, frames };
  return trimFinishedPilots(loose, now);
}

export function detachLooseParts(loose: LooseParts, detached: PartId, removed: readonly PartId[], now: number): LooseParts {
  const fromY = PART_PIVOTS[detached][1];
  const bounds = bodies.get(detached)!;
  const height = bounds.max.y - bounds.min.y;
  const next = settlePile({ ...loose, [detached]: { releasedAt: now, startedAt: now, fromY, toY: OFF_MAP - 1,
    support: null, kick: height < 1 ? 1.3 : 0.45 } }, loose, removed, now);
  return updatePilotTracks(next, removed, now);
}

export function dismissLoosePart(loose: LooseParts, part: PartId, removed: readonly PartId[], now: number): LooseParts {
  const motion = loose[part];
  if (!motion || now < motion.releasedAt || motion.poof || now >= motion.releasedAt + LOOSE_LIFETIME_MS) return loose;
  const { position } = loosePartPose(loose, part, now);
  if (position[1] <= OFF_MAP) return loose;
  const next = settlePile({ ...loose, [part]: { ...motion, dismissedAt: now, poof: { at: now, position } } }, loose, removed, now);
  return updatePilotTracks(next, removed, now);
}

export function findLooseBlocker(loose: LooseParts, screw: Screw, scale: number, now: number): PartId | undefined {
  const base = new Vector3(...screw.position);
  const tip = base.clone().addScaledVector(new Vector3(...screw.normal), scale * 0.7);
  const probe = new Box3().setFromPoints([base, tip]).expandByScalar(scale * 0.26);
  for (const part of PART_IDS) {
    const motion = loose[part];
    if (!motion || motion.poof || now >= motion.releasedAt + LOOSE_LIFETIME_MS) continue;
    const { position, rotation } = loosePartPose(loose, part, now);
    if (position[1] <= OFF_MAP) continue;
    const root = new Object3D();
    root.quaternion.set(...rotation).normalize();
    root.position.set(...PART_PIVOTS[part]).applyQuaternion(root.quaternion).negate().add(new Vector3(...position));
    root.updateMatrixWorld();
    if (!probe.intersectsBox(bodies.get(part)!.clone().applyMatrix4(root.matrixWorld))) continue;
    if (findScrewObstructions(screw, scale, { root, part }).length) return part;
  }
}
