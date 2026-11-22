import "../src/game/allLevels.ts";
import assert from "node:assert/strict";
import { test } from "node:test";
import { DoubleSide, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from "three";
import { OASIS_MODEL, OASIS_MOUNTS } from "../src/game/allLevels.ts";
import { OASIS_DETAIL } from "../src/scene/oasisModel.ts";
import { OASIS_BLOCKERS, OASIS_EXPOSED_IDS } from "../src/scene/oasisAudit.ts";
import { geometryFor } from "../src/scene/geometry.ts";
import { findScrewObstructions } from "../src/scene/obstructions.ts";
import { SCREW_SCALE } from "../src/game/screwScale.ts";
import {
  generateSoloPuzzle,
  soloLevelTemplate,
} from "../src/game/soloLevels.ts";
import { isScrewAccessible, removeScrew } from "../src/game/rules.ts";
import {
  createPartPhysics,
  initPartPhysics,
} from "../src/scene/partPhysics.ts";
import { restoreSoloSave } from "../src/game/soloSave.ts";
import { newRunId } from "../src/game/runId.ts";

test("oasis has layered sandstone paving, animal assemblies, 198 fixings and a 250k–350k triangle budget", () => {
  const t = soloLevelTemplate("oasis"),
    parts = OASIS_MODEL.parts;
  assert.equal(t.length, 198);
  assert.equal(parts.length, 170);
  assert.equal(OASIS_DETAIL.radialSegments, 20);
  for (const name of [
    "foundation",
    "paving-2-2",
    "camel-body",
    "tall-palm-crown",
    "sun-relief",
    "tent-door-1",
    "pool-water",
    "fennec-head",
  ])
    assert.ok(parts.includes(`oasis-${name}`));
  assert.deepEqual(new Set(t.map((s) => s.attachedTo)), new Set(parts));
  const triangles = OASIS_MODEL.pieces.reduce(
    (sum, p) =>
      sum +
      (p.geometry!.index?.count ?? p.geometry!.getAttribute("position").count) /
        3,
    0,
  );
  assert.ok(
    triangles >= 250_000 && triangles <= 350_000,
    `${triangles} scenery triangles`,
  );
  for (const part of parts)
    assert.ok(
      t.filter((s) => s.attachedTo === part).length <=
        (part.includes("paving") || part === "oasis-tent-deck" ? 5 : 3),
      part,
    );
  assert.ok(t.filter((s) => s.normal[1] < 0.9).length > t.length / 2);
  assert.equal(t.filter((s) => s.attachedTo === "oasis-foundation").length, 3);
  const seeds = new Set<number>();
  for (let i = 0; i < 30; i++) {
    const p = generateSoloPuzzle("oasis", Math.imul(i + 1, 2654435761) >>> 0);
    seeds.add(p.seed);
    const end = p.solution.reduce(removeScrew, p.state);
    assert.equal(end.status, "won");
    assert.equal(end.removedParts.length, parts.length);
  }
  assert.ok(seeds.size > 20);
  assert.deepEqual(
    t.map((s) => s.obstructedBy),
    OASIS_BLOCKERS,
  );
  assert.ok(
    OASIS_EXPOSED_IDS.length > 0 && OASIS_EXPOSED_IDS.length < t.length,
  );
});
test("oasis fixing attachments and full seeded solutions have real viewing paths", () => {
  const material = new MeshBasicMaterial({ side: DoubleSide }),
    ray = new Raycaster();
  const objects = OASIS_MODEL.pieces.map((p) => {
    const mesh = new Mesh(geometryFor(p), material);
    mesh.position.set(...p.position);
    mesh.scale.set(...p.size);
    if (p.rotation) mesh.rotation.set(...p.rotation);
    mesh.updateMatrixWorld();
    return { mesh, part: p.part };
  });
  const offsets: Vector3[] = [];
  for (const e of [-1.45, -1.2, -0.65, -0.3, 0, 0.3, 0.65, 1, 1.2, 1.45])
    for (let a = 0; a < 32; a++)
      offsets.push(
        new Vector3(
          Math.cos((a * Math.PI) / 16) * Math.cos(e) * 10,
          Math.sin(e) * 10,
          Math.sin((a * Math.PI) / 16) * Math.cos(e) * 10,
        ),
      );
  const detached: string[] = [],
    hidden: string[] = [];
  for (const seed of [245, 7, 123, 1, 2, 17, 999, 42]) {
    const p = generateSoloPuzzle("oasis", seed);
    let state = p.state;
    for (const id of p.solution) {
      const s = state.screws.find((s) => s.id === id)!,
        n = new Vector3(...s.normal),
        face = new Vector3(...s.position).addScaledVector(
          n,
          SCREW_SCALE * 0.144,
        );
      assert.ok(isScrewAccessible(state, s));
      ray.set(face, n.clone().negate());
      ray.far = 0.26;
      if (
        !objects
          .filter((o) => o.part === s.attachedTo)
          .some((o) => ray.intersectObject(o.mesh, false).length)
      )
        detached.push(`${s.id} ${s.attachedTo}`);
      const standing = objects.filter(
        (o) => !state.removedParts.includes(o.part),
      );
      if (
        !offsets.some((d) => {
          if (d.dot(n) < d.length() * 0.08) return false;
          ray.set(face.clone().add(d), d.clone().negate().normalize());
          ray.far = d.length() - 0.002;
          return !standing.some(
            (o) => ray.intersectObject(o.mesh, false).length,
          );
        })
      )
        hidden.push(`${s.id} ${s.attachedTo}`);
      state = removeScrew(state, id);
    }
    assert.equal(state.status, "won");
  }
  material.dispose();
  assert.deepEqual({ detached, hidden }, { detached: [], hidden: [] });
});
test("oasis heads have comfortable spacing and cached physical blockers", () => {
  const t = soloLevelTemplate("oasis"),
    crowded: string[] = [];
  for (let i = 0; i < t.length; i++)
    for (let j = i + 1; j < t.length; j++) {
      const a = t[i],
        b = t[j];
      if (
        a.attachedTo !== b.attachedTo &&
        (a.obstructedBy?.includes(b.attachedTo!) ||
          b.obstructedBy?.includes(a.attachedTo!))
      )
        continue;
      const d = new Vector3(...a.position).sub(new Vector3(...b.position)),
        n = new Vector3(...a.normal),
        onSame =
          n.dot(new Vector3(...b.normal)) > 0.8 &&
          Math.abs(d.dot(n)) < 0.28 * SCREW_SCALE;
      if (d.length() < (onSame ? 1.8 : 1.1) * 0.5 * SCREW_SCALE - 1e-6)
        crowded.push(`${a.id} ${a.attachedTo} / ${b.id} ${b.attachedTo}`);
    }
  assert.deepEqual(crowded, []);
  assert.equal(OASIS_MOUNTS.length, t.length);
  assert.deepEqual(
    t.map((s) => findScrewObstructions(s, SCREW_SCALE)),
    OASIS_BLOCKERS,
  );
});
test("all oasis assemblies use Rapier collision and the one-second automatic poof", async () => {
  await initPartPhysics();
  const physics = createPartPhysics([], "oasis");
  try {
    let now = 1000;
    for (const part of OASIS_MODEL.parts) {
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
test("oasis checkpoints restore the same layout, inventory, run identity and elapsed time", () => {
  const puzzle = generateSoloPuzzle("oasis", 42),
    moves = puzzle.solution.slice(0, 90),
    runId = newRunId();
  const restored = restoreSoloSave("oasis", {
    seed: puzzle.seed,
    moves,
    runId,
    elapsedMs: 65000,
  })!;
  assert.ok(restored);
  assert.deepEqual(restored.game, moves.reduce(removeScrew, puzzle.state));
  assert.equal(restored.checkpoint.runId, runId);
  assert.equal(restored.checkpoint.elapsedBefore, 65000);
  assert.equal(restored.checkpoint.resumed, true);
});

test("oasis support graph protects major structures and verified routes finish with paving and base", () => {
  const t = soloLevelTemplate("oasis"),
    required = new Set<string>();
  function visit(part: string) {
    for (const s of t.filter((s) => s.attachedTo === part))
      for (const cover of s.obstructedBy ?? [])
        if (!required.has(cover)) {
          required.add(cover);
          visit(cover);
        }
  }
  visit("oasis-foundation");
  const topOrFront = t.filter((s) => {
    const [x, y, z] = s.normal;
    return (
      y >= Math.max(Math.abs(x), Math.abs(z)) ||
      z >= Math.max(Math.abs(x), Math.abs(y))
    );
  });
  assert.ok(
    topOrFront.length < t.length / 2,
    "most fixings must require side/rear/underside inspection",
  );
  for (const key of [
    "gate-pier--1-0",
    "gate-pier-1-0",
    "sun-relief",
    "tall-palm-trunk-0",
    "tall-palm-crown",
    "tall-palm-leaves-0",
    "tall-palm-leaves-2",
    "rear-palm-crown",
    "camel-body",
    "camel-head",
    "tent-deck",
    "tent-pole-1",
    "tent-roof--1",
    "tent-roof-1",
    "western-cliff-4",
    "meerkat-ledge-3",
  ])
    assert.ok(
      required.has("oasis-" + key),
      key + " must precede releasing the base",
    );
  for (const seed of [245, 7, 42]) {
    const p = generateSoloPuzzle("oasis", seed);
    const owner = (id: string) => t.find((s) => s.id === id)!.attachedTo!;
    assert.ok(
      p.solution.findIndex((id) => owner(id).startsWith("oasis-paving")) >= 160,
    );
    assert.ok(
      p.solution.slice(-3).every((id) => owner(id) === "oasis-foundation"),
    );
  }
});
