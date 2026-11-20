import "../src/game/allLevels.ts";
import { ZOO_BLOCKERS, ZOO_EXPOSED_IDS } from "../src/scene/zooAudit.ts";
import { findScrewObstructions } from "../src/scene/obstructions.ts";
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  Raycaster,
  SphereGeometry,
  Vector3,
} from "three";
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
  ZOO_MODEL,
  ZOO_ANIMAL_GEOMETRY,
  ZOO_ANIMAL_BASE_SEGMENTS,
  ZOO_ANIMAL_RINGS,
} from "../src/game/allLevels.ts";
import { findExposedScrews } from "../src/scene/exposure.ts";
import { geometryFor } from "../src/scene/geometry.ts";
import {
  createPartPhysics,
  initPartPhysics,
} from "../src/scene/partPhysics.ts";

test("Zoo Adventure Park uses 231 comfortably spaced fixings and every removable owner, with verified varied-color solutions", () => {
  const baseline = new SphereGeometry(
    1,
    ZOO_ANIMAL_BASE_SEGMENTS,
    ZOO_ANIMAL_RINGS,
  );
  assert.equal(ZOO_ANIMAL_GEOMETRY.index!.count, baseline.index!.count * 1.2);
  baseline.dispose();
  assert.equal(ZOO_MODEL.animalParts.length, 34);
  for (const part of [
    "zoo-lion-body",
    "zoo-lion-cub-body",
    "zoo-giraffe-body",
    "zoo-giraffe-calf-body",
    "zoo-flamingo-0-body",
    "zoo-flamingo-1-body",
    "zoo-flamingo-2-body",
  ] as const)
    assert.ok(ZOO_MODEL.animalParts.includes(part));
  const t = soloLevelTemplate("zoo");
  assert.equal(t.length, 231);
  assert.ok(t.length >= 200 && t.length <= 240);
  assert.equal(t.length % 3, 0);
  for (const part of ZOO_MODEL.parts)
    assert.ok(t.filter((s) => s.attachedTo === part).length <= 3, part);
  assert.deepEqual(
    new Set(t.map((s) => s.attachedTo)),
    new Set(ZOO_MODEL.parts),
  );
  const exposed = new Set(findExposedScrews(createInitialState(t), "zoo"));
  assert.deepEqual(exposed, new Set(ZOO_EXPOSED_IDS));
  assert.deepEqual(
    t.map((s) => findScrewObstructions(s, SCREW_SCALE)),
    ZOO_BLOCKERS,
  );
  assert.ok(exposed.size > 0 && exposed.size < t.length);
  assert.ok(t.filter((s) => s.normal[1] < 0.9).length > t.length / 3);
  const covers = (part: string) =>
    t.find((s) => s.attachedTo === part)!.obstructedBy!;
  assert.ok(covers("zoo-lion-head").includes("zoo-lion-mane"));
  assert.ok(covers("zoo-lion-body").includes("zoo-lion-head"));
  assert.ok(covers("zoo-giraffe-body").includes("zoo-giraffe-neck"));
  assert.ok(covers("zoo-flamingo-0-body").includes("zoo-flamingo-0-wing"));
  assert.ok(covers("zoo-pool-water-0").includes("zoo-lilypad-0"));
  const seeds = new Set<number>();
  for (let seed = 0; seed < 30; seed++) {
    const p = generateSoloPuzzle("zoo", Math.imul(seed + 1, 2654435761) >>> 0);
    seeds.add(p.seed);
    for (const b of p.state.boxes) {
      const n = p.state.screws.filter(
        (s) => exposed.has(s.id) && s.color === b!.color,
      ).length;
      assert.ok(n >= 1 && n <= 2);
    }
    const end = p.solution.reduce(removeScrew, p.state);
    assert.equal(end.status, "won");
    assert.equal(end.removedParts.length, ZOO_MODEL.parts.length);
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
    objects: ZOO_MODEL.pieces.map((p) => {
      const mesh = new Mesh(geometryFor(p), material);
      mesh.position.set(...p.position);
      mesh.scale.set(...p.size);
      if (p.rotation) mesh.rotation.set(...p.rotation);
      mesh.updateMatrixWorld();
      return { mesh, part: p.part };
    }),
  };
}
test("each zoo head is attached to its own object and has a viewing path in a full solution", () => {
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
    const p = generateSoloPuzzle("zoo", seed);
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
test("every zoo assembly has Rapier collisions and the shared one-second poof", async () => {
  await initPartPhysics();
  const physics = createPartPhysics([], "zoo");
  try {
    let now = 1000;
    for (const part of ZOO_MODEL.parts) {
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
test("Zoo Adventure Park heads have physical clearance and comfortable spacing on shared surfaces", () => {
  const screws = soloLevelTemplate("zoo");
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
