import "../src/game/allLevels.ts";
import assert from "node:assert/strict";
import { test } from "node:test";
import { Mesh, MeshBasicMaterial, PerspectiveCamera, Scene, BoxGeometry, InstancedMesh, Matrix4, Object3D, Vector3, Quaternion } from "three";
import { freshAbilities, matchCandidates, settleAbilities } from "../src/game/abilities.ts";
import { createInitialState, removeScrew } from "../src/game/rules.ts";
import { createRun, runReducer } from "../src/animation/run.ts";
import { restoreSoloSave } from "../src/game/soloSave.ts";
import { generateSoloPuzzle } from "../src/game/soloLevels.ts";
import { LEVEL_IDS } from "../src/game/types.ts";
import type { GameState, Screw, ScrewColor } from "../src/game/types.ts";
import { findMatchHint, findHintView, hintVisible } from "../src/scene/matchHint.ts";
import { LEVEL_MODELS } from "../src/scene/levelModels.ts";
import { geometryFor } from "../src/scene/geometry.ts";
import { headGeometry, recessGeometry, shaftGeometry } from "../src/components/screwGeometry.ts";
import { SCREW_SCALE } from "../src/game/allLevels.ts";

function fixture() {
  const screws: Screw[] = ["red", "blue", "yellow", "green"].flatMap((color, c) => Array.from({ length: 6 }, (_, i) => ({
    id: `${color}-${i}`, color: color as ScrewColor, position: [c, i, 0], normal: [0, 0, 1], removed: false,
  })));
  return createInitialState(screws, ["red", "blue", "blue", "yellow", "red", "green", "yellow", "green"]);
}
test("hints prioritize completing a box, ignore blocked/removed/non-matching heads and include the bonus box", () => {
  let game = fixture();
  game = removeScrew(removeScrew(game, "red-0"), "red-1");
  game.screws.find((s) => s.id === "red-2")!.obstructedBy = ["door"];
  assert.equal(matchCandidates(game)[0].id, "red-3");
  assert.ok(matchCandidates(game).every((s) => !["red-0", "red-1", "red-2"].includes(s.id) && s.color !== "yellow"));
  game.boxes.push({ id: "bonus", color: "green", screws: [{ color: "green", screwId: "g1" }, { color: "green", screwId: "g2" }] });
  assert.ok(matchCandidates(game).some((s) => s.color === "green"));
  assert.deepEqual(matchCandidates({ ...game, status: "lost" }), []);
});
test("Find a Match reserves one use, never starts the clock and clears its hint after collection", () => {
  let run = { ...createRun(fixture()), started: true, ready: true };
  assert.equal(runReducer(run, { type: "find", screw: "yellow-0" }), run);
  run = runReducer(run, { type: "find", screw: "red-0" });
  assert.equal(run.abilities.finds, 2); assert.equal(run.timerStartedAt, null);
  assert.equal(runReducer(run, { type: "find", screw: "blue-0" }), run);
  for (let i = 0; i < 3; i++) run = runReducer(run, { type: "select", id: `red-${i}`, now: i * 200 });
  assert.equal(run.abilities.hint, null); assert.equal(run.abilities.finds, 2);
  const reset = runReducer(run, { type: "reset", game: fixture(), seed: 3, enter: true });
  assert.deepEqual(reset.abilities, freshAbilities());
  assert.equal(settleAbilities({ ...freshAbilities(), hint: "blue-0" }, { ...fixture(), status: "lost" }).hint, null);
});

test("old solo saves drop retired actions without losing screw progress, hint charges or elapsed time", () => {
  const puzzle = generateSoloPuzzle("cottage", 245), target = matchCandidates(puzzle.state)[0]; assert.ok(target);
  const moves = [`find:${target.id}`, "peek", target.id];
  const restored = restoreSoloSave("cottage", { seed: puzzle.seed, moves, elapsedMs: 12345 })!; assert.ok(restored);
  assert.deepEqual(restored.checkpoint.abilities, { finds: 2, hint: null });
  assert.deepEqual(restored.checkpoint.moves, [`find:${target.id}`, target.id]);
  assert.equal(restored.checkpoint.elapsedBefore, 12345);
  assert.equal(restored.game.screws.find(s => s.id === target.id)!.removed, true);
  assert.equal(restoreSoloSave("cottage", { seed: puzzle.seed, moves: ["peek","peek","peek","peek"], elapsedMs: 0 }), null);
  assert.equal(restoreSoloSave("cottage", { seed: puzzle.seed, moves: ["find:missing"], elapsedMs: 0 }), null);
  assert.deepEqual(restoreSoloSave("cottage", { seed: puzzle.seed, moves: [], elapsedMs: 0 })!.checkpoint.abilities, freshAbilities());
});

test("Find a Match stops at three uses without consuming extra-box lifelines", () => {
  let run = { ...createRun(fixture()), started: true, ready: true }, now = 0;
  for (let use = 0; use < 3; use++) {
    const target = matchCandidates(run.logical)[0]; assert.ok(target);
    run = runReducer(run, { type: "find", screw: target.id });
    run = runReducer(run, { type: "select", id: target.id, now: now += 200 });
  }
  assert.equal(run.abilities.finds, 0);
  assert.equal(runReducer(run, { type: "find", screw: matchCandidates(run.logical)[0].id }), run);
  assert.equal(run.lifelines, 3);
});

test("hint camera finds a front-facing actual head and refuses a head enclosed by solid geometry", () => {
  const screw: Screw = { id: "red-0", color: "red", position: [0, 0, 0], normal: [0, 0, 1], removed: false };
  const game: GameState = { ...fixture(), screws: [screw] };
  const scene = new Scene(), geometry = new BoxGeometry(.16, .16, .08), material = new MeshBasicMaterial();
  const head = new InstancedMesh(geometry, material, 1); head.userData.screwIds = [screw.id];
  head.setMatrixAt(0, new Matrix4().makeTranslation(0, 0, .04)); scene.add(head);
  const camera = new PerspectiveCamera(42, .6, .1, 65); camera.position.set(0, 0, -10); camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
  assert.equal(hintVisible(scene, camera, game, screw), false);
  const pose = findHintView(scene, camera, game, screw); assert.ok(pose);
  camera.position.fromArray(pose.position); camera.lookAt(...pose.target); camera.updateMatrixWorld();
  assert.equal(hintVisible(scene, camera, game, screw), true);
  assert.equal(findMatchHint(scene, camera, game, {}, 0)?.screw, screw.id);
  const coverGeometry = new BoxGeometry(2, 2, 2), cover = new Mesh(coverGeometry, material); cover.userData.pickBlocker = true; scene.add(cover);
  assert.equal(findHintView(scene, camera, game, screw), null);
  assert.equal(findMatchHint(scene, camera, game, {}, 0), null);
  geometry.dispose(); coverGeometry.dispose(); material.dispose();
});
test("hints find actual clickable head angles at opening, middle and late stages of every campaign level", () => {
  const material = new MeshBasicMaterial();
  for (const level of LEVEL_IDS) {
    const puzzle = generateSoloPuzzle(level, 245);
    let game = puzzle.state;
    const pieces = LEVEL_MODELS[level].pieces.map((piece) => {
      const mesh = new Mesh(geometryFor(piece), material);
      mesh.position.fromArray(piece.position); mesh.scale.fromArray(piece.size);
      if (piece.rotation) mesh.rotation.fromArray(piece.rotation);
      mesh.userData = { pickBlocker: true, part: piece.part };
      return { mesh, part: piece.part };
    });
    const camera = new PerspectiveCamera(42, .55, .1, 65); camera.position.set(11, 10, 19); camera.lookAt(0, 1.5, 0); camera.updateMatrixWorld();
    for (let i = 0; i < puzzle.solution.length; i++) {
      if ([0, Math.floor(puzzle.solution.length / 2), puzzle.solution.length - 6].includes(i)) {
        const scene = new Scene();
        pieces.filter(({ part }) => !game.removedParts.includes(part)).forEach(({ mesh }) => scene.add(mesh));
        const fields = [headGeometry, recessGeometry, shaftGeometry].map((geometry, index) => {
          const field = new InstancedMesh(geometry, material, game.screws.length);
          field.userData = index < 2 ? { screwIds: game.screws.map((screw) => screw.id) } : { pickBlocker: true };
          const transform = new Object3D();
          game.screws.forEach((screw, index) => {
            transform.position.fromArray(screw.position);
            transform.quaternion.copy(new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), new Vector3(...screw.normal)));
            transform.scale.setScalar(screw.removed ? 0 : SCREW_SCALE); transform.updateMatrix(); field.setMatrixAt(index, transform.matrix);
          });
          field.computeBoundingSphere(); scene.add(field); return field;
        });
        scene.updateMatrixWorld(true);
        const hint = findMatchHint(scene, camera, game, {}, 0);
        assert.ok(hint, `${level} at ${i} removed`);
        camera.position.fromArray(hint.pose.position); camera.lookAt(...hint.pose.target); camera.updateMatrixWorld();
        assert.ok(hintVisible(scene, camera, game, game.screws.find((screw) => screw.id === hint.screw)!));
        fields.forEach((field) => field.dispose());
      }
      game = removeScrew(game, puzzle.solution[i]);
    }
  }
  material.dispose();
});
