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
test("high-detail castle geometry loads on demand and is released before rebuilding",async()=>{
  const lease=await acquireLevel("castle"),model=LEVEL_MODELS.castle;
  const geometry=new Set(model.pieces.flatMap(piece=>piece.geometry?[piece.geometry]:[]));let disposed=0;
  geometry.forEach(g=>g.addEventListener("dispose",()=>disposed++));
  const template=levelData("castle").template;assert.equal(template.length,225);
  lease.release();await delay(750);assert.equal(LEVEL_MODELS.castle,undefined);assert.equal(disposed,geometry.size);
  const next=await acquireLevel("castle");assert.notEqual(LEVEL_MODELS.castle,model);assert.deepEqual(levelData("castle").template,template);
  next.release();await delay(750);assert.deepEqual(loadedLevelIds(),[]);
});
test("arctic geometry loads on demand and is released before rebuilding",async()=>{
  const lease=await acquireLevel("arctic"),model=LEVEL_MODELS.arctic;
  const geometry=new Set(model.pieces.flatMap(piece=>piece.geometry?[piece.geometry]:[]));let disposed=0;
  geometry.forEach(g=>g.addEventListener("dispose",()=>disposed++));
  const template=levelData("arctic").template;assert.equal(template.length,150);
  lease.release();await delay(750);assert.equal(LEVEL_MODELS.arctic,undefined);assert.equal(disposed,geometry.size);
  const next=await acquireLevel("arctic");assert.notEqual(LEVEL_MODELS.arctic,model);assert.deepEqual(levelData("arctic").template,template);
  next.release();await delay(750);assert.deepEqual(loadedLevelIds(),[]);
});

test("oasis geometry loads on demand and is released before rebuilding",async()=>{
  const lease=await acquireLevel("oasis"),model=LEVEL_MODELS.oasis;
  const geometry=new Set(model.pieces.flatMap(piece=>piece.geometry?[piece.geometry]:[]));let disposed=0;
  geometry.forEach(g=>g.addEventListener("dispose",()=>disposed++));
  const template=levelData("oasis").template;assert.equal(template.length,198);
  lease.release();await delay(750);assert.equal(LEVEL_MODELS.oasis,undefined);assert.equal(disposed,geometry.size);
  const next=await acquireLevel("oasis");assert.notEqual(LEVEL_MODELS.oasis,model);assert.deepEqual(levelData("oasis").template,template);
  next.release();await delay(750);assert.deepEqual(loadedLevelIds(),[]);
});
