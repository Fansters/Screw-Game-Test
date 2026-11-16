import { Euler, Quaternion, Vector3 } from "three";
import type { ColliderDesc, RigidBody, World } from "@dimforge/rapier3d-compat";
import type { PartId } from "../game/types.ts";
import { PART_PIVOTS, PIECES } from "./houseModel.ts";
import type { Piece, Vector } from "./houseModel.ts";

export const PILOT_PARTS = ["roof-right-front-eave", "snow-right-front", "roof-bauble"] as const;
export const LOOSE_LIFETIME_MS = 3000;
type PilotPart = typeof PILOT_PARTS[number];
type Rotation = [number, number, number, number];
export type PartPose = { position: Vector; rotation: Rotation };
// Milliseconds since release, followed by world position and rotation.
export type PoseFrame = [number, ...Vector, ...Rotation];
export type PilotMotion = { releasedAt: number; frames?: PoseFrame[]; dismissedAt?: number };
type Engine = typeof import("@dimforge/rapier3d-compat");
const FIXED_STEP = 1 / 60;
const SAMPLE_MS = 2000 * FIXED_STEP;
const IDENTITY: Rotation = [0, 0, 0, 1];
let engine: Engine;
let loading: Promise<void> | undefined;

export function initPilotPhysics() {
  return loading ??= import("@dimforge/rapier3d-compat").then(async (rapier) => {
    await rapier.init();
    engine = rapier;
  });
}

export function isPilotPart(part: PartId): part is PilotPart {
  return PILOT_PARTS.some((pilot) => pilot === part);
}

export function pilotPose(part: PartId, motion: PilotMotion, now: number): PartPose {
  const frames = motion.frames;
  if (!frames?.length || now < motion.releasedAt) return { position: PART_PIVOTS[part], rotation: IDENTITY };
  const elapsed = now - motion.releasedAt;
  const right = frames.findIndex(([at]) => at >= elapsed);
  const b = frames[right < 0 ? frames.length - 1 : right];
  const a = frames[right > 0 ? right - 1 : right < 0 ? frames.length - 1 : 0];
  if (a === b) return { position: [b[1], b[2], b[3]], rotation: [b[4], b[5], b[6], b[7]] };
  const t = (elapsed - a[0]) / (b[0] - a[0]);
  const position = new Vector3(a[1], a[2], a[3]).lerp(new Vector3(b[1], b[2], b[3]), t).toArray();
  const rotation = new Quaternion(a[4], a[5], a[6], a[7]).normalize()
    .slerp(new Quaternion(b[4], b[5], b[6], b[7]).normalize(), t).toArray();
  return { position, rotation };
}

function colliderFor(piece: Piece, pivot: Vector): ColliderDesc {
  const [x, y, z] = piece.size;
  const collider = piece.part === "roof-bauble" ? engine.ColliderDesc.ball(x) :
    piece.kind === "snow-slab" ? engine.ColliderDesc.roundCuboid(x / 2 - 0.03, y / 2 - 0.03, z / 2 - 0.03, 0.03) :
      engine.ColliderDesc.cuboid(x / 2, y / 2, z / 2);
  const [px, py, pz] = piece.position;
  return collider.setTranslation(px - pivot[0], py - pivot[1], pz - pivot[2])
    .setRotation(new Quaternion().setFromEuler(new Euler(...(piece.rotation ?? [0, 0, 0]))))
    .setFriction(piece.part.startsWith("snow-") || piece.part === "roof-bauble" ? 0.09 : 0.46)
    .setFrictionCombineRule(engine.CoefficientCombineRule.Min)
    .setRestitution(piece.part === "roof-bauble" ? 0.36 : 0.10)
    .setRestitutionCombineRule(engine.CoefficientCombineRule.Max);
}

const supports = new Map<PartId, Piece[]>();
for (const piece of PIECES) {
  const { part, kind, size: [x, y, z] } = piece;
  // Keep angled roof and snow slabs, floors, structural surfaces and major props.
  // Exclude narrow trim and ornamental mesh details from the rigid-body world.
  const relevant = part === "roof-bauble" ? kind === "ico" :
    kind === "snow-slab" ? Math.min(x, y, z) > 0.065 && (!part.startsWith("snow-") || x > 1) :
      kind === "box" && Math.min(x, y, z) > 0.044 && x * y * z > 0.021;
  if (!relevant) continue;
  const parts = supports.get(part) ?? [];
  parts.push(piece);
  supports.set(part, parts);
}

function orientBody(body: RigidBody, pose: PartPose) {
  const [x, y, z] = pose.position;
  body.setTranslation({ x, y, z }, true);
  body.setRotation(new Quaternion(...pose.rotation), true);
}

function beginMotion(world: World, id: PilotPart, motion: PilotMotion, at: number) {
  const body = world.createRigidBody(engine.RigidBodyDesc.dynamic().setCcdEnabled(true)
    .setLinearDamping(0.10).setAngularDamping(id === "roof-bauble" ? 0.10 : 0.35));
  for (const piece of supports.get(id) ?? []) world.createCollider(colliderFor(piece, PART_PIVOTS[id]), body);
  const pose = pilotPose(id, motion, at);
  orientBody(body, pose);
  if (motion.frames?.length && at > motion.releasedAt) {
    const before = Math.max(at - SAMPLE_MS, motion.releasedAt);
    const prior = pilotPose(id, motion, before);
    const seconds = (at - before) / 1000;
    const linear = new Vector3(...pose.position).sub(new Vector3(...prior.position)).divideScalar(seconds);
    const delta = new Quaternion(...pose.rotation).multiply(new Quaternion(...prior.rotation).invert());
    if (delta.w < 0) delta.set(-delta.x, -delta.y, -delta.z, -delta.w);
    const angular = new Vector3(delta.x, delta.y, delta.z).multiplyScalar(2 / seconds);
    body.setLinvel(linear, true);
    body.setAngvel(angular, true);
  } else if (id === "roof-right-front-eave") {
    // A small release impulse separates the free panel from the tight roof seam.
    body.setLinvel({ x: 0.48, y: 0.10, z: 0.38 }, true);
    body.setAngvel({ x: 0.24, y: 0, z: -0.26 }, true);
  }
  return body;
}

function frameAt(body: RigidBody, releasedAt: number, at: number): PoseFrame {
  const { x, y, z } = body.translation();
  const q = body.rotation();
  const rounded = (value: number) => Math.round(value * 10000) / 10000;
  return [rounded(at - releasedAt), rounded(x), rounded(y), rounded(z), rounded(q.x), rounded(q.y), rounded(q.z), rounded(q.w)];
}

type MotionEvent = PilotMotion & { part: PartId };
// Sample one short shared trajectory after each release/dismissal. The room
// server sends these same poses to both clients, including after a reconnect.
export function simulatePilots(motions: MotionEvent[], removed: readonly PartId[], now: number,
  legacyPose: (part: PartId, at: number) => PartPose | undefined): Map<PartId, PoseFrame[]> {
  const pilots = motions.filter((motion): motion is MotionEvent & { part: PilotPart } => isPilotPart(motion.part) &&
    (motion.dismissedAt ?? motion.releasedAt + LOOSE_LIFETIME_MS) > now);
  const result = new Map<PartId, PoseFrame[]>();
  if (!pilots.length) return result;
  const world = new engine.World({ x: 0, y: -9.81, z: 0 });
  world.timestep = FIXED_STEP;
  try {
    const events = new Map(motions.map((motion) => [motion.part, motion]));
    const gone = new Set(removed);
    const fixed = new Map<PartId, RigidBody>();
    const legacy = new Map<PartId, RigidBody>();
    for (const [part, pieces] of supports) {
      const motion = events.get(part);
      if (!motion && !gone.has(part)) {
        for (const piece of pieces) world.createCollider(colliderFor(piece, [0, 0, 0]));
        continue;
      }
      if (gone.has(part) && (!motion || motion.releasedAt <= now && (isPilotPart(part) || !legacyPose(part, now)))) continue;
      const isLoose = motion && !isPilotPart(part);
      const body = world.createRigidBody(isLoose ? engine.RigidBodyDesc.kinematicPositionBased() : engine.RigidBodyDesc.fixed());
      const pivot = PART_PIVOTS[part];
      orientBody(body, (isLoose && legacyPose(part, now)) || { position: pivot, rotation: IDENTITY });
      for (const piece of pieces) world.createCollider(colliderFor(piece, pivot), body);
      (isLoose ? legacy : fixed).set(part, body);
    }

    const active = new Map<PilotPart, RigidBody>();
    const endsAt = (motion: PilotMotion) => motion.dismissedAt ?? motion.releasedAt + LOOSE_LIFETIME_MS;
    for (const motion of pilots) result.set(motion.part, (motion.frames ?? []).filter(([t]) => t < now - motion.releasedAt));
    const duration = Math.max(...pilots.map(endsAt)) - now;
    for (let step = 0; step <= Math.ceil(duration / (FIXED_STEP * 1000)); step += 1) {
      const at = now + step * FIXED_STEP * 1000;
      for (const motion of pilots) {
        const { part, releasedAt } = motion;
        const original = fixed.get(part);
        if (at < releasedAt) continue;
        if (original) {
          world.removeRigidBody(original);
          fixed.delete(part);
        }
        const body = active.get(part);
        if (at >= endsAt(motion)) {
          if (body) {
            result.get(part)!.push(frameAt(body, releasedAt, endsAt(motion)));
            world.removeRigidBody(body);
            active.delete(part);
          }
        } else {
          const dynamic = body ?? beginMotion(world, part, motion, at);
          active.set(part, dynamic);
          if (!body || step % 2 === 0) result.get(part)!.push(frameAt(dynamic, releasedAt, at));
        }
      }
      if (!active.size) continue;
      if (!legacy.size && active.size === 1 && pilots.every((motion) => motion.releasedAt <= at)) {
        const [part, body] = active.entries().next().value!;
        if (body.isSleeping()) {
          const motion = events.get(part)!;
          result.get(part)!.push(frameAt(body, motion.releasedAt, endsAt(motion)));
          break;
        }
      }
      for (const [part, body] of legacy) {
        const next = legacyPose(part, at + FIXED_STEP * 1000);
        if (next) {
          const [x, y, z] = next.position;
          body.setNextKinematicTranslation({ x, y, z });
        } else {
          world.removeRigidBody(body);
          legacy.delete(part);
        }
      }
      world.step();
    }
  } finally {
    world.free();
  }
  return result;
}
