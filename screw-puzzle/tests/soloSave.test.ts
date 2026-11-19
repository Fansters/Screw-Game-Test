import assert from "node:assert/strict";
import { test } from "node:test";
import { createRun, elapsedRunTime, runReducer } from "../src/animation/run.ts";
import { clearSoloSave, readSoloSave, restoreSoloSave, soloSaveKey, writeSoloSave } from "../src/game/soloSave.ts";
import { generateSoloPuzzle } from "../src/game/soloLevels.ts";
import { isScrewAccessible, planBonusBox, removeScrew } from "../src/game/rules.ts";

test("solo checkpoints restore the same puzzle, tray, bonus box and playing time", (t) => {
  const storage = new Map<string, string>();
  Object.defineProperty(globalThis, "window", { configurable: true, value: {
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    },
  } });
  t.after(() => Reflect.deleteProperty(globalThis, "window"));

  const { state, seed } = generateSoloPuzzle("campsite", 7);
  const waiting = state.screws.find((screw) => !state.boxes.some((box) => box?.color === screw.color) &&
    !screw.solutionAfter?.length && isScrewAccessible(state, screw))!;
  const expected = planBonusBox(removeScrew(state, waiting.id)).finalState;
  writeSoloSave("campsite", { seed, moves: [waiting.id, "boost"], elapsedMs: 4500 });
  assert.equal(readSoloSave("cottage"), null);
  const restored = restoreSoloSave("campsite", readSoloSave("campsite")!)!;
  assert.deepEqual(restored.game, expected);
  assert.equal(restored.checkpoint.lifelines, 2);
  const run = runReducer(createRun(state), { type: "reset", ...restored, enter: true });
  assert.equal(run.display, run.logical);
  assert.deepEqual(run.jobs, []);
  assert.deepEqual(run.releases, {});
  assert.equal(elapsedRunTime(run, 12000), 4500);
  const resumed = runReducer(run, { type: "resume-clock", round: run.round, now: 12000 });
  assert.equal(elapsedRunTime(resumed, 13500), 6000);

  assert.equal(restoreSoloSave("campsite", { seed, moves: [waiting.id, waiting.id], elapsedMs: 0 }), null);
  storage.set(soloSaveKey("cottage"), "{broken");
  assert.equal(readSoloSave("cottage"), null);
  clearSoloSave("campsite");
  assert.equal(readSoloSave("campsite"), null);

  const desert = generateSoloPuzzle("desert", 245);
  const desertMoves = desert.solution.slice(0, 5);
  writeSoloSave("desert", { seed: desert.seed, moves: desertMoves, elapsedMs: 12345 });
  const desertRestored = restoreSoloSave("desert", readSoloSave("desert")!)!;
  assert.deepEqual(desertRestored.game, desertMoves.reduce(removeScrew, desert.state));
  assert.equal(desertRestored.checkpoint.elapsedBefore, 12345);
  clearSoloSave("desert");
  assert.equal(readSoloSave("desert"), null);

  const construction = generateSoloPuzzle("construction", 245);
  const constructionMoves = construction.solution.slice(0, 5);
  writeSoloSave("construction", { seed: construction.seed, moves: constructionMoves, elapsedMs: 12345 });
  const constructionRestored = restoreSoloSave("construction", readSoloSave("construction")!)!;
  assert.deepEqual(constructionRestored.game, constructionMoves.reduce(removeScrew, construction.state));
  assert.equal(constructionRestored.checkpoint.elapsedBefore, 12345);
  clearSoloSave("construction");
  assert.equal(readSoloSave("construction"), null);

  const carnival = generateSoloPuzzle("carnival", 245);
  const carnivalMoves = carnival.solution.slice(0, 5);
  writeSoloSave("carnival", { seed: carnival.seed, moves: carnivalMoves, elapsedMs: 12345 });
  const carnivalRestored = restoreSoloSave("carnival", readSoloSave("carnival")!)!;
  assert.deepEqual(carnivalRestored.game, carnivalMoves.reduce(removeScrew, carnival.state));
  assert.equal(carnivalRestored.checkpoint.elapsedBefore, 12345);
  clearSoloSave("carnival");
  assert.equal(readSoloSave("carnival"), null);

  const zoo = generateSoloPuzzle("zoo", 245);
  const zooMoves = zoo.solution.slice(0, 5);
  writeSoloSave("zoo", { seed: zoo.seed, moves: zooMoves, elapsedMs: 12345 });
  const zooRestored = restoreSoloSave("zoo", readSoloSave("zoo")!)!;
  assert.deepEqual(zooRestored.game, zooMoves.reduce(removeScrew, zoo.state));
  assert.equal(zooRestored.checkpoint.elapsedBefore, 12345);
  clearSoloSave("zoo");
  assert.equal(readSoloSave("zoo"), null);

  assert.equal(soloSaveKey("desert"), "screw-it:solo-save:desert:v3");
  storage.set("screw-it:solo-save:desert:v2", JSON.stringify({ seed: 245, moves: ["desert-240"], elapsedMs: 12000 }));
  assert.equal(readSoloSave("desert"), null);
  assert.ok(storage.has("screw-it:solo-save:desert:v2"));

  // Checkpoints from the previous screw layout must never replay against new IDs.
  storage.set("screw-it:solo-save:cottage:v1", JSON.stringify({ seed: 245, moves: ["screw-299"], elapsedMs: 12000 }));
  assert.equal(readSoloSave("cottage"), null);
  assert.equal(soloSaveKey("cottage"), "screw-it:solo-save:cottage:v2");
  assert.equal(soloSaveKey("campsite"), "screw-it:solo-save:campsite:v2");
});
