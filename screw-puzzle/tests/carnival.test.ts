import "../src/game/allLevels.ts";
import {
  CARNIVAL_BLOCKERS,
  CARNIVAL_EXPOSED_IDS,
} from "../src/scene/carnivalAudit.ts";
import { findScrewObstructions } from "../src/scene/obstructions.ts";
import assert from "node:assert/strict";
import { test } from "node:test";
import { DoubleSide, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from "three";
import {
  generateSoloPuzzle,
  soloLevelTemplate,
} from "../src/game/soloLevels.ts";
import { SCREW_SCALE } from "../src/game/allLevels.ts";
import {
  createInitialState,
  isScrewAccessible,
  removeScrew,
} from "../src/game/rules.ts";
import {
  CARNIVAL_MODEL,
  CARNIVAL_WHEEL_RADIUS,
  CARNIVAL_WHEEL_REFERENCE_RADIUS,
} from "../src/game/allLevels.ts";
import { findExposedScrews } from "../src/scene/exposure.ts";
import { geometryFor } from "../src/scene/geometry.ts";
import {
  createPartPhysics,
  initPartPhysics,
} from "../src/scene/partPhysics.ts";

test("Carnival Fairground uses 240 comfortably spaced fixings and every removable owner, with verified varied-color solutions", () => {
  assert.equal(CARNIVAL_WHEEL_RADIUS, CARNIVAL_WHEEL_REFERENCE_RADIUS * 2);
  const t = soloLevelTemplate("carnival");
  assert.equal(t.length, 240);
  assert.ok(t.length >= 200 && t.length <= 240);
  assert.equal(t.length % 3, 0);
  for (const part of CARNIVAL_MODEL.parts)
    assert.ok(t.filter((s) => s.attachedTo === part).length <= 3, part);
  assert.deepEqual(
    new Set(t.map((s) => s.attachedTo)),
    new Set(CARNIVAL_MODEL.parts),
  );
  const exposed = new Set(findExposedScrews(createInitialState(t), "carnival"));
  assert.deepEqual(exposed, new Set(CARNIVAL_EXPOSED_IDS));
  assert.deepEqual(
    t.map((s) => findScrewObstructions(s, SCREW_SCALE)),
    CARNIVAL_BLOCKERS,
  );
  assert.ok(exposed.size > 0 && exposed.size < t.length);
  assert.ok(t.filter((s) => s.normal[1] < 0.9).length > t.length / 3);
  for (const s of t.filter((s) =>
    /^fair-wheel-rim-.*-[56]$/.test(s.attachedTo!),
  )) {
    assert.ok(
      !s.obstructedBy?.some((part) => part.startsWith("fair-wheel-leg-")),
      s.id,
    );
  }
  const seeds = new Set<number>();
  for (let seed = 0; seed < 30; seed++) {
    const p = generateSoloPuzzle(
      "carnival",
      Math.imul(seed + 1, 2654435761) >>> 0,
    );
    seeds.add(p.seed);
    for (const b of p.state.boxes) {
      const n = p.state.screws.filter(
        (s) => exposed.has(s.id) && s.color === b!.color,
      ).length;
      assert.ok(n >= 1 && n <= 2);
    }
    const end = p.solution.reduce(removeScrew, p.state);
    assert.equal(end.status, "won");
    assert.equal(end.removedParts.length, CARNIVAL_MODEL.parts.length);
  }
  assert.ok(
    seeds.size > 20,
    "fresh seeds produce varied puzzles rather than a single fallback",
  );
});
function solids() {
  const material = new MeshBasicMaterial({ side: DoubleSide });
  return {
    material,
    objects: CARNIVAL_MODEL.pieces.map((p) => {
      const mesh = new Mesh(geometryFor(p), material);
      mesh.position.set(...p.position);
      mesh.scale.set(...p.size);
      if (p.rotation) mesh.rotation.set(...p.rotation);
      mesh.updateMatrixWorld();
      return { mesh, part: p.part };
    }),
  };
}
test("each carnival head is attached to its own object and has a viewing path in a full solution", () => {
  const { material, objects } = solids(),
    ray = new Raycaster(),
    views: Vector3[] = [];
  for (const e of [
    -1.2, -0.65, -0.3, -0.12, 0, 0.12, 0.3, 0.45, 0.65, 0.85, 1.2,
  ])
    for (let a = 0; a < 32; a++)
      views.push(
        new Vector3(
          Math.cos((a * Math.PI) / 16) * Math.cos(e) * 9,
          Math.sin(e) * 9,
          Math.sin((a * Math.PI) / 16) * Math.cos(e) * 9,
        ),
      );
  const detached: string[] = [],
    hidden: string[] = [];
  for (const seed of [245, 7, 123]) {
    const p = generateSoloPuzzle("carnival", seed);
    let state = p.state;
    for (const id of p.solution) {
      const s = state.screws.find((s) => s.id === id)!,
        normal = new Vector3(...s.normal),
        face = new Vector3(...s.position).addScaledVector(
          normal,
          SCREW_SCALE * 0.144,
        );
      assert.ok(isScrewAccessible(state, s));
      ray.set(face, normal.clone().negate());
      ray.far = 0.26;
      if (
        !objects
          .filter((o) => o.part === s.attachedTo)
          .some((o) => ray.intersectObject(o.mesh, false).length)
      )
        detached.push(`${id} ${s.attachedTo}`);
      const standing = objects.filter(
        (o) => !state.removedParts.includes(o.part),
      );
      if (
        !views.some((offset) => {
          if (offset.dot(normal) < offset.length() * 0.08) return false;
          ray.set(
            face.clone().add(offset),
            offset.clone().negate().normalize(),
          );
          ray.far = offset.length() - 0.002;
          return !standing.some(
            (o) => ray.intersectObject(o.mesh, false).length,
          );
        })
      )
        hidden.push(`${id} ${s.attachedTo}`);
      state = removeScrew(state, id);
    }
    assert.equal(state.status, "won");
  }
  material.dispose();
  assert.deepEqual({ detached, hidden }, { detached: [], hidden: [] });
});
test("every carnival assembly has Rapier collisions and the shared one-second poof", async () => {
  await initPartPhysics();
  const physics = createPartPhysics([], "carnival");
  try {
    let now = 1000;
    for (const part of CARNIVAL_MODEL.parts) {
      physics.release(part, now);
      assert.ok(physics.read()[part], part);
      physics.advance(now + 1050);
      assert.equal(physics.read()[part]?.poof?.at, now + 1000, part);
      now += 2500;
    }
  } finally {
    physics.free();
  }
});

// Cover-to-owner layers are sequential: the hidden fixing appears only after
// its cover (and that cover's screws) have gone. Other neighbors need real room.
test("Carnival Fairground heads have physical clearance and comfortable spacing on shared surfaces", () => {
  const screws = soloLevelTemplate("carnival");
  const headDiameter = 0.5 * SCREW_SCALE;
  for (let i = 0; i < screws.length; i++)
    for (let j = i + 1; j < screws.length; j++) {
      const a = screws[i],
        b = screws[j];
      if (
        a.attachedTo !== b.attachedTo &&
        (a.obstructedBy?.includes(b.attachedTo!) ||
          b.obstructedBy?.includes(a.attachedTo!))
      )
        continue;
      const delta = new Vector3(...b.position).sub(new Vector3(...a.position));
      const normal = new Vector3(...a.normal),
        otherNormal = new Vector3(...b.normal);
      const sameSurface =
        normal.dot(otherNormal) > 0.8 &&
        Math.abs(delta.dot(normal)) < 0.28 * SCREW_SCALE;
      assert.ok(
        delta.length() >= (sameSurface ? 1.8 : 1.1) * headDiameter - 1e-6,
        a.id +
          " (" +
          a.attachedTo +
          ") crowds " +
          b.id +
          " (" +
          b.attachedTo +
          ")",
      );
    }
});
