import { PART_IDS, ROOF_SECTIONS } from "../game/types.ts";
import type { PartId } from "../game/types.ts";
import type { RigidBody } from "@dimforge/rapier3d-compat";
import { PART_PIVOTS } from "./houseModel.ts";
import { LOOSE_LIFETIME_MS, loosePartPose, OFF_MAP, POSE_HISTORY_MS, SMOKE_DURATION_MS } from "./loosePhysics.ts";
import type { LooseMotion, LooseParts, PartReleases, PoseFrame } from "./loosePhysics.ts";
import { partColliders } from "./partColliders.ts";

type Engine = typeof import("@dimforge/rapier3d-compat");
const STEP_MS = 1000 / 60;
let engine: Engine;
let loading: Promise<void> | undefined;

export function initPartPhysics() {
  return loading ??= import("@dimforge/rapier3d-compat").then(async (rapier) => {
    await rapier.init();
    engine = rapier;
  });
}

function getFrame(body: RigidBody, at: number): PoseFrame {
  const p = body.translation();
  const q = body.rotation();
  const round = (value: number) => Math.round(value * 10000) / 10000;
  return [at, round(p.x), round(p.y), round(p.z), round(q.x), round(q.y), round(q.z), round(q.w)];
}

const roofSections = new Map<PartId, typeof ROOF_SECTIONS[number]>(ROOF_SECTIONS.map((section) => [section.id, section]));

function releaseBody(part: PartId, body: RigidBody) {
  body.setBodyType(engine.RigidBodyType.Dynamic, true);
  body.enableCcd(true);
  const roof = roofSections.get(part);
  // A small nudge releases tightly fitted wood from the neighboring seams.
  if (roof) {
    const side = roof.side === "left" ? -1 : 1;
    body.setLinvel({ x: 0.60 * side, y: 0.10, z: Math.abs(roof.z) > 1 ? Math.sign(roof.z) * 0.38 : 0.04 }, true);
    body.setAngvel({ x: 0.24, y: 0, z: -0.26 * side }, true);
  } else if (part.startsWith("interior-door-")) {
    const side = part.includes("-left-") ? -1 : 1;
    body.setLinvel({ x: -0.65 * side, y: 0.14, z: 0 }, true);
    body.setAngvel({ x: 0, y: 0.8 * side, z: 0.22 * side }, true);
  } else if (part === "chimney-snow") {
    body.setLinvel({ x: -0.8, y: 0.28, z: 0.55 }, true);
  }
}

type ActivePart = { body: RigidBody; endsAt: number };
export type PartPhysics = ReturnType<typeof createPartPhysics>;

export function createPartPhysics(alreadyRemoved: readonly PartId[] = []) {
  const world = new engine.World({ x: 0, y: -9.81, z: 0 });
  world.timestep = STEP_MS / 1000;
  const standing = new Map<PartId, RigidBody>();
  const active = new Map<PartId, ActivePart>();
  const motions = new Map<PartId, LooseMotion>();
  const removed = new Set(alreadyRemoved);
  for (const part of PART_IDS) {
    if (removed.has(part)) continue;
    const body = world.createRigidBody(engine.RigidBodyDesc.fixed().setTranslation(...PART_PIVOTS[part])
      .setLinearDamping(0.10).setAngularDamping(part === "roof-bauble" ? 0.10 : 0.30));
    for (const collider of partColliders(engine, part)) world.createCollider(collider, body);
    standing.set(part, body);
  }

  let simulatedAt = 0;
  let revision = 0;
  let cached: LooseParts = {};
  let cachedRevision = 0;

  function savePose(part: PartId, body: RigidBody, at: number) {
    const motion = motions.get(part)!;
    const frame = getFrame(body, at);
    const previous = motion.frames.at(-1)!;
    if (previous.slice(1).every((value, i) => value === frame[i + 1])) return;
    const recent = motion.frames.filter(([time]) => time >= at - POSE_HISTORY_MS);
    // A sleeping body can start moving again when a support is removed.
    // Start interpolating from the step immediately before that motion.
    if (at - previous[0] > STEP_MS * 1.5) recent.push([at - STEP_MS, ...previous.slice(1)] as PoseFrame);
    recent.push(frame);
    motions.set(part, { ...motion, frames: recent });
    revision += 1;
  }

  function wakeLooseBodies() {
    for (const { body } of active.values()) if (body.isSleeping()) body.wakeUp();
  }

  function poof(part: PartId, at: number) {
    const motion = motions.get(part)!;
    const body = active.get(part)!.body;
    const { position } = loosePartPose(part, motion, at);
    motions.set(part, { ...motion, poof: { at, position } });
    world.removeRigidBody(body);
    active.delete(part);
    wakeLooseBodies();
    revision += 1;
  }

  function advance(now: number) {
    while (active.size && simulatedAt + STEP_MS <= now + 0.001) {
      // Resolve removal on the first fixed step after expiry. Publish the exact
      // expiry time so appearance and screw clearance share the same boundary.
      simulatedAt += STEP_MS;
      for (const { body } of active.values()) {
        if (!body.isSleeping()) {
          world.step();
          break;
        }
      }
      for (const [part, { body, endsAt }] of active) {
        savePose(part, body, simulatedAt);
        if (simulatedAt >= endsAt - 0.001) poof(part, endsAt);
      }
    }
    for (const [part, motion] of motions) {
      if (motion.poof && now >= motion.poof.at + SMOKE_DURATION_MS + POSE_HISTORY_MS) {
        motions.delete(part);
        revision += 1;
      }
    }
  }

  function release(part: PartId, now: number) {
    const body = standing.get(part);
    if (!body) return;
    advance(now);
    if (!active.size) simulatedAt = now;
    standing.delete(part);
    releaseBody(part, body);
    wakeLooseBodies();
    active.set(part, { body, endsAt: now + LOOSE_LIFETIME_MS });
    motions.set(part, { releasedAt: now, frames: [getFrame(body, now)] });
    revision += 1;
  }

  function dismiss(part: PartId, now: number) {
    advance(now);
    const entry = active.get(part);
    if (!entry || now < motions.get(part)!.releasedAt || now >= entry.endsAt || entry.body.translation().y <= OFF_MAP) return false;
    poof(part, now);
    return true;
  }

  function sync(releases: PartReleases) {
    // React may commit several taps together. Replay their timestamps in order.
    const events = (Object.entries(releases) as [PartId, PartReleases[PartId]][]).flatMap(([part, event]) => {
      if (!event) return [];
      const changes: { part: PartId; at: number; dismiss: boolean }[] = [];
      if (standing.has(part)) changes.push({ part, at: event.releasedAt, dismiss: false });
      if (event.dismissedAt !== undefined && !motions.get(part)?.poof &&
          (standing.has(part) || active.has(part))) changes.push({ part, at: event.dismissedAt, dismiss: true });
      return changes;
    }).sort((a, b) => a.at - b.at || Number(a.dismiss) - Number(b.dismiss));
    for (const event of events) {
      if (event.dismiss) dismiss(event.part, event.at);
      else release(event.part, event.at);
    }
  }

  function read(): LooseParts {
    if (cachedRevision !== revision) {
      cached = Object.fromEntries(motions);
      cachedRevision = revision;
    }
    return cached;
  }

  // Each network packet includes three samples per live body. Clients retain
  // a short history for interpolation; old pose histories stay out of the wire.
  function packet(): LooseParts {
    return Object.fromEntries([...motions].map(([part, motion]) => [part, { ...motion, frames: motion.frames.slice(-3) }]));
  }

  return { advance, release, dismiss, sync, read, packet, revision: () => revision, free: () => world.free() };
}
