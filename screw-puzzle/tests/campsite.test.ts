import "../src/game/allLevels.ts";
import assert from "node:assert/strict";
import { test } from "node:test";
import { DoubleSide, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from "three";
import { generateSoloPuzzle, soloLevelTemplate } from "../src/game/soloLevels.ts";
import { SCREW_SCALE } from "../src/game/allLevels.ts";
import { createInitialState, isScrewAccessible, removeScrew } from "../src/game/rules.ts";
import { CAMPSITE_MODEL } from "../src/game/allLevels.ts";
import { geometryFor } from "../src/scene/geometry.ts";
import { findExposedScrews } from "../src/scene/exposure.ts";
import { createPartPhysics, initPartPhysics } from "../src/scene/partPhysics.ts";

test("the campsite has 240 varied fixings, a layered opening and seeded winning layouts without lifelines", () => {
  const template = soloLevelTemplate("campsite");
  assert.equal(template.length, 240);
  assert.deepEqual(new Set(template.map((screw) => screw.attachedTo)), new Set(CAMPSITE_MODEL.parts));
  assert.ok(template.filter(({ normal }) => normal[1] < .9).length > template.length / 2);
  const visible = new Set(findExposedScrews(createInitialState(template), "campsite"));
  assert.ok(visible.size <= template.length * .12, `${visible.size} opening heads`);
  for (let seed = 0; seed < 25; seed += 1) {
    const puzzle = generateSoloPuzzle("campsite", Math.imul(seed + 1, 2654435761) >>> 0);
    for (const box of puzzle.state.boxes) {
      const opening = puzzle.state.screws.filter((screw) => visible.has(screw.id) && screw.color === box!.color);
      assert.ok(opening.length >= 1 && opening.length <= 2);
    }
    const final = puzzle.solution.reduce(removeScrew, puzzle.state);
    assert.equal(final.status, "won");
    assert.equal(final.removedParts.length, CAMPSITE_MODEL.parts.length);
  }
});

test("every screw in the campsite solution has a physical viewing path before it is selected", () => {
  const material = new MeshBasicMaterial({ side: DoubleSide });
  const meshes = CAMPSITE_MODEL.pieces.map((piece) => {
    const mesh = new Mesh(geometryFor(piece), material);
    mesh.position.set(...piece.position); mesh.scale.set(...piece.size);
    if (piece.rotation) mesh.rotation.set(...piece.rotation);
    mesh.updateMatrixWorld();
    return { mesh, part: piece.part };
  });
  const views: Vector3[] = [];
  for (const elevation of [-1.2, -.65, -.3, -.12, 0, .45, .85, 1.2]) for (let angle = 0; angle < 24; angle += 1) {
    views.push(new Vector3(Math.cos(angle * Math.PI / 12) * Math.cos(elevation) * 9,
      Math.sin(elevation) * 9, Math.sin(angle * Math.PI / 12) * Math.cos(elevation) * 9));
  }
  const ray = new Raycaster(), puzzle = generateSoloPuzzle("campsite", 245);
  let state = puzzle.state;
  for (const id of puzzle.solution) {
    const screw = state.screws.find((screw) => screw.id === id)!;
    assert.ok(isScrewAccessible(state, screw), id);
    const normal = new Vector3(...screw.normal);
    const face = new Vector3(...screw.position).addScaledVector(normal, SCREW_SCALE * .144);
    const standing = meshes.filter(({ part }) => !state.removedParts.includes(part));
    assert.ok(views.some((offset) => {
      if (offset.dot(normal) < offset.length() * .08) return false;
      ray.set(face.clone().add(offset), offset.clone().negate().normalize());
      ray.far = offset.length() - .002;
      return !standing.some(({ mesh }) => ray.intersectObject(mesh, false).length);
    }), `${id} on ${screw.attachedTo} has no view`);
    state = removeScrew(state, id);
  }
  material.dispose();
  assert.equal(state.status, "won");
});

test("the campsite physics releases its own props and clears them after one second", async () => {
  await initPartPhysics();
  const physics = createPartPhysics([], "campsite");
  try {
    let now = 1000;
    for (const part of CAMPSITE_MODEL.parts) {
      physics.release(part, now);
      assert.ok(physics.read()[part], part);
      physics.advance(now + 999);
      assert.equal(physics.read()[part]?.poof, undefined, part);
      physics.advance(now + 1000);
      assert.equal(physics.read()[part]?.poof?.at, now + 1000, part);
      now += 2500;
    }
  } finally {
    physics.free();
  }
});
