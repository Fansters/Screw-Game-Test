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

  const { state, seed } = generateSoloPuzzle("titanic", 7);
  const waiting = state.screws.find((screw) => !state.boxes.some((box) => box?.color === screw.color) &&
    !screw.solutionAfter?.length && isScrewAccessible(state, screw))!;
  const expected = planBonusBox(removeScrew(state, waiting.id)).finalState;
  writeSoloSave("titanic", { seed, moves: [waiting.id, "boost"], elapsedMs: 4500 });
  assert.equal(readSoloSave("cottage"), null);
  const restored = restoreSoloSave("titanic", readSoloSave("titanic")!)!;
  assert.deepEqual(restored.game, expected);
  assert.equal(restored.checkpoint.lifelines, 2);
  const run = runReducer(createRun(state), { type: "reset", ...restored, enter: true });
  assert.equal(run.display, run.logical);
  assert.deepEqual(run.jobs, []);
  assert.deepEqual(run.releases, {});
  assert.equal(elapsedRunTime(run, 12000), 4500);
  const resumed = runReducer(run, { type: "resume-clock", round: run.round, now: 12000 });
  assert.equal(elapsedRunTime(resumed, 13500), 6000);

  assert.equal(restoreSoloSave("titanic", { seed, moves: [waiting.id, waiting.id], elapsedMs: 0 }), null);
  storage.set(soloSaveKey("cottage"), "{broken");
  assert.equal(readSoloSave("cottage"), null);
  clearSoloSave("titanic");
  assert.equal(readSoloSave("titanic"), null);

  // An earlier Titanic run resumes with its original colors on the redesigned ship.
  const previousKey = "screw-it:solo-save:titanic:v1";
  storage.set(previousKey, JSON.stringify({ seed: 245, moves: ["titanic-131", "titanic-133"], elapsedMs: 12_000 }));
  const previous = readSoloSave("titanic")!;
  assert.equal(previous.legacyTitanicLayout, true);
  const migrated = restoreSoloSave("titanic", previous)!;
  assert.deepEqual(migrated.game.boxes.map((box) => box?.color), ["red", "blue"]);
  assert.equal(migrated.game.screws.find((screw) => screw.id === "titanic-131")!.removed, true);
  assert.equal(migrated.game.screws.find((screw) => screw.id === "titanic-6")!.attachedTo, "ship-water-port-1");
  writeSoloSave("titanic", previous);
  assert.equal(storage.has(previousKey), false);
  assert.deepEqual(readSoloSave("titanic"), previous);
});
