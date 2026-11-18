import assert from "node:assert/strict";
import { test } from "node:test";
import { Box3, DoubleSide, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from "three";
import { generateSoloPuzzle, soloLevelTemplate } from "../src/game/soloLevels.ts";
import { SCREW_SCALE } from "../src/game/levels.ts";
import { isScrewAccessible, removeScrew } from "../src/game/rules.ts";
import { TITANIC_MODEL } from "../src/scene/titanicModel.ts";
import { geometryFor } from "../src/scene/geometry.ts";
import { createPartPhysics, initPartPhysics } from "../src/scene/partPhysics.ts";
import { modelBatches } from "../src/scene/modelBatches.ts";

test("Titanic has 312 screws with physical reveals and a playable line of sight for a complete solution", () => {
  const template = soloLevelTemplate("titanic");
  assert.equal(template.length, 312);
  assert.deepEqual(new Set(template.map((screw) => screw.attachedTo)), new Set(TITANIC_MODEL.parts));
  assert.equal(TITANIC_MODEL.parts.filter((part) => /ship-funnel/.test(part)).length, 4);

  const material = new MeshBasicMaterial({ side: DoubleSide });
  const meshes = TITANIC_MODEL.pieces.map((piece) => {
    const mesh = new Mesh(geometryFor(piece), material);
    mesh.position.set(...piece.position);
    mesh.scale.set(...piece.size);
    if (piece.rotation) mesh.rotation.set(...piece.rotation);
    mesh.updateMatrixWorld();
    return { mesh, part: piece.part };
  });
  const ship = meshes.filter(({ part }) => !part.startsWith("ship-water-"));
  const bounds = ship.reduce((box, { mesh }) => box.expandByObject(mesh, true), new Box3());
  const size = bounds.getSize(new Vector3());
  assert.ok(Math.abs(size.x - 13.83) < 0.04 && Math.abs(size.y - 6.44) < 0.04 && Math.abs(size.z - 6.49) < 0.04);
  for (const end of [-1, 1]) for (const y of [-2.10, -1.602, -1.1, -0.66, -0.15, 0.4, 0.89, 1.10, 1.5, 1.94]) {
    const x = end < 0 ? bounds.min.x : bounds.max.x;
    for (const z of [-0.025, 0.025]) {
      const endView = new Raycaster(new Vector3(x + end * 0.5, y, z), new Vector3(-end, 0, 0), 0, 0.62);
      assert.ok(ship.some(({ mesh }) => endView.intersectObject(mesh, false).length), `closed end at ${x}, ${y}, ${z}`);
    }
  }
  const water = meshes.filter(({ part }) => part.startsWith("ship-water-"));
  assert.equal(water.length, 8);
  for (const { part, mesh } of water) {
    const [screw, ...extra] = template.filter((candidate) => candidate.attachedTo === part);
    assert.ok(screw && !extra.length && !screw.obstructedBy?.length, part);
    const mount = new Vector3(...screw.position);
    const above = new Raycaster(mount.clone().add(new Vector3(0, 0.1, 0)), new Vector3(0, -1, 0), 0, 0.15);
    assert.ok(above.intersectObject(mesh, false).length, part);
  }
  const triangles = modelBatches("titanic").reduce((total, { geometry }) => total + geometry.getAttribute("position").count / 3, 0);
  assert.ok(triangles >= 87_424 * 1.3);
  const views = [new Vector3(0, 8, 0)];
  for (const height of [2.8, 6]) for (let step = 0; step < 12; step += 1) {
    const angle = step * Math.PI / 6;
    views.push(new Vector3(Math.cos(angle) * 6, height, Math.sin(angle) * 6));
  }
  const ray = new Raycaster();
  const puzzle = generateSoloPuzzle("titanic", 245);
  let state = puzzle.state;
  for (const id of puzzle.solution) {
    const screw = state.screws.find((candidate) => candidate.id === id)!;
    assert.ok(isScrewAccessible(state, screw), id);
    const face = new Vector3(...screw.position).addScaledVector(new Vector3(...screw.normal), SCREW_SCALE * 0.144);
    const standing = meshes.filter(({ part }) => !state.removedParts.includes(part));
    assert.ok(views.some((offset) => {
      ray.set(face.clone().add(offset), offset.clone().negate().normalize());
      ray.far = offset.length() - 0.002;
      return !standing.some(({ mesh }) => ray.intersectObject(mesh, false).length);
    }), `${screw.attachedTo} / ${id} must be visible before removal`);
    state = removeScrew(state, id);
  }
  material.dispose();
  assert.equal(state.status, "won");
  assert.equal(state.removedParts.length, TITANIC_MODEL.parts.length);
});

test("Titanic arms a separate physics world and releases water and a lifeboat", async () => {
  await initPartPhysics();
  const physics = createPartPhysics([], "titanic");
  try {
    physics.release("planter-right", 1000);
    physics.release("ship-lifeboat-port-2", 1000);
    physics.release("ship-water-bow", 1000);
    physics.advance(1250);
    assert.ok(physics.read()["ship-water-bow"]!.frames.at(-1)![2] < physics.read()["ship-water-bow"]!.frames[0][2]);
    physics.advance(2050);
    const parts = physics.read();
    assert.equal(parts["planter-right"], undefined);
    assert.equal(parts["ship-lifeboat-port-2"]?.poof?.at, 2000);
    assert.equal(parts["ship-water-bow"]?.poof?.at, 2000);
  } finally {
    physics.free();
  }
});
