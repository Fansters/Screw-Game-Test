import assert from "node:assert/strict";
import { test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { acquireLevel } from "../src/game/levelLoader.ts";
import { loadedLevelIds, levelData } from "../src/game/levelData.ts";
import { LEVEL_MODELS } from "../src/scene/levelModels.ts";
import { modelBatches } from "../src/scene/modelBatches.ts";
import { generateSoloPuzzle } from "../src/game/soloLevels.ts";

// Deliberately do not preload the server/audit fixtures in this process.
test("levels load independently, share concurrent requests and release/rebuild graphics safely", async () => {
  assert.deepEqual(loadedLevelIds(), []);
  assert.deepEqual(Object.keys(LEVEL_MODELS), []);
  const stages: string[] = [];
  const [first, second] = await Promise.all([acquireLevel("zoo", stage => stages.push(stage)), acquireLevel("zoo")]);
  assert.deepEqual(loadedLevelIds(), ["zoo"]);
  assert.deepEqual(Object.keys(LEVEL_MODELS), ["zoo"]);
  assert.ok(stages.includes("Building geometry"));
  const model = LEVEL_MODELS.zoo, template = levelData("zoo").template;
  const buffers = new Set([...model.pieces.flatMap(p => p.geometry ? [p.geometry] : []), ...modelBatches("zoo").map(b => b.geometry)]);
  const disposed = new Set();
  for (const buffer of buffers) buffer.addEventListener("dispose", () => disposed.add(buffer));
  first.release(); first.release(); // Repeated cleanup must not decrement another user.
  await delay(750);
  assert.equal(LEVEL_MODELS.zoo, model);
  assert.equal(disposed.size, 0);
  second.release();
  // Strict Mode/re-entry during deferred R3F cleanup must retain the instance.
  const third = await acquireLevel("zoo");
  await delay(750);
  assert.equal(LEVEL_MODELS.zoo, model);
  third.release();
  await delay(750);
  assert.deepEqual(loadedLevelIds(), []);
  assert.deepEqual(Object.keys(LEVEL_MODELS), []);
  assert.equal(disposed.size, buffers.size);
  const revisit = await acquireLevel("zoo");
  assert.notEqual(LEVEL_MODELS.zoo, model);
  assert.ok(LEVEL_MODELS.zoo.pieces.every(p => !p.geometry || !buffers.has(p.geometry)), "source buffers must also be rebuilt, not retained in the module");
  assert.deepEqual(levelData("zoo").template, template);
  assert.ok(modelBatches("zoo").every(b => !buffers.has(b.geometry)));
  assert.equal(generateSoloPuzzle("zoo", 245).solution.length, 231);
  const cottage = await acquireLevel("cottage");
  assert.equal(levelData("cottage").template.length, 240);
  revisit.release(); cottage.release();
  await delay(750);
  assert.deepEqual(loadedLevelIds(), []);
});
