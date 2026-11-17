import { test } from "node:test";
import assert from "node:assert/strict";
import { DoubleSide, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from "three";
import { BONUS_SLOT, createInitialState, removeScrew, isScrewAccessible, planScrewRemoval } from "../src/game/rules.ts";
import { generatePuzzle } from "../src/game/randomize.ts";
import { DEMO_LEVEL, SCREW_SCALE } from "../src/game/levels.ts";
import { GROUND_IDS, PART_IDS, SCREW_COLOR_ORDER, TILE_IDS } from "../src/game/types.ts";
import type { GameState, PartId, Screw, ScrewColor } from "../src/game/types.ts";
import { createRun, currentFrame, runReducer, settledParts } from "../src/animation/run.ts";
import type { RunState } from "../src/animation/run.ts";
import { buildSequence } from "../src/animation/sequence.ts";
import { PART_PIVOTS, PIECES } from "../src/scene/houseModel.ts";
import { geometryFor } from "../src/scene/geometry.ts";
import { findLooseBlocker, isLooseVisible, LOOSE_LIFETIME_MS, loosePartPose } from "../src/scene/loosePhysics.ts";
import { findExposedScrews } from "../src/scene/exposure.ts";
import { createPartPhysics, initPartPhysics } from "../src/scene/partPhysics.ts";

await initPartPhysics();

function fixture(counts: Partial<Record<ScrewColor, number>> = { red: 6, blue: 6, yellow: 6, green: 6 }): Screw[] {
  return SCREW_COLOR_ORDER.flatMap((color) => Array.from({ length: counts[color] ?? 0 }, (_, index) => ({
    id: `${color}-${index + 1}`, color, position: [0, 0, 0] as [number, number, number], normal: [0, 0, 1] as [number, number, number], removed: false,
  })));
}
function fresh() { return createInitialState(fixture()); }
function start(run: RunState) { return runReducer(runReducer(run, { type: "ready", round: run.round }), { type: "start" }); }
function take(state: GameState, color: ScrewColor, count = 1): GameState {
  const candidates = state.screws.filter((screw) => screw.color === color && isScrewAccessible(state, screw)).slice(0, count);
  assert.equal(candidates.length, count);
  return candidates.reduce((previous, screw) => removeScrew(previous, screw.id), state);
}
function inventory(state: GameState) {
  const stored = [...state.tray, ...state.boxes.flatMap((box) => box?.screws ?? [])];
  assert.equal(state.screws.filter((screw) => screw.removed).length, state.clearedCount + stored.length);
  assert.equal(new Set(stored.map((entry) => entry.screwId)).size, stored.length);
  assert.ok(stored.every((entry) => state.screws.some((screw) => screw.id === entry.screwId && screw.removed)));
  assert.ok(state.boxes.length === 2 || (state.boxes.length === 3 && state.boxes[BONUS_SLOT]));
  assert.equal(new Set(state.boxes.filter(Boolean).map((box) => box!.color)).size, state.boxes.filter(Boolean).length);
  assert.ok(state.tray.length <= 5);
  assert.ok(state.tray.every((entry) => !state.boxes.some((box) => box?.color === entry.color)));
  assert.ok(state.boxes.every((box) => !box || (box.screws.length < 3 && box.screws.every((entry) => entry.color === box.color))));
}
function drain(run: RunState) {
  let current = run;
  for (let guard = 0; current.jobs.length && guard < 10000; guard += 1) {
    const job = current.jobs[0];
    current = runReducer(current, current.frameIndex === -1 ? { type: "begin", job: job.id } : { type: "advance", job: job.id, index: current.frameIndex });
  }
  assert.equal(current.jobs.length, 0);
  return current;
}
function finishFalls(run: RunState) {
  return run.fallingParts.reduce((current, part) =>
    runReducer(current, { type: "fall-finished", part, round: run.round }), run);
}

test("a lifeline animates waiting screws into a third box, then closes on the third match", () => {
  let run = start(createRun(take(fresh(), "green", 2)));
  run = runReducer(run, { type: "boost", now: 100 });
  assert.equal(run.lifelines, 2);
  assert.equal(run.logical.boxes[BONUS_SLOT]?.color, "green", "Prefer a target already in the tray");
  assert.equal(run.logical.boxes[BONUS_SLOT]?.screws.length, 2);
  assert.equal(run.logical.tray.length, 0);
  assert.deepEqual(run.jobs[0].frames.map((frame) => frame.kind), ["bonus-open", "fly", "land", "fly", "land"]);
  assert.equal(runReducer(run, { type: "boost", now: 101 }), run, "An opening box reserves the lifeline slot");
  run = drain(run);
  run = runReducer(run, { type: "select", id: "green-3", now: 60_000 });
  assert.equal(run.logical.boxes.length, 2);
  assert.equal(run.logical.clearedCount, 3);
  assert.equal(runReducer(run, { type: "boost", now: 60_001 }), run, "Wait until the bonus exit animates");
  run = drain(run);
  assert.equal(run.bonusJob, null);
  assert.equal(run.display.boxes.length, 2);
  inventory(run.logical);
});

test("an unfinished lifeline stays active and each round allows three uses", () => {
  const game = createInitialState(fixture({ red: 3, blue: 3, yellow: 12 }));
  let run = start(createRun(game));
  for (let charge = 0; charge < 3; charge += 1) {
    const now = charge * 120_000;
    run = drain(runReducer(run, { type: "boost", now }));
    assert.equal(run.lifelines, 2 - charge);
    run = drain(runReducer(run, { type: "select", id: `yellow-${charge * 3 + 1}`, now: now + 45_000 }));
    assert.equal(run.display.boxes[BONUS_SLOT]?.screws.length, 1);
    assert.equal(runReducer(run, { type: "boost", now: now + 50_000 }), run);
    for (const offset of [2, 3]) {
      run = runReducer(run, { type: "select", id: `yellow-${charge * 3 + offset}`, now: now + 60_000 + offset });
    }
    run = drain(run);
    assert.equal(run.display.boxes.length, 2);
    inventory(run.logical);
  }
  assert.equal(runReducer(run, { type: "boost", now: 360_000 }), run);
  const reset = runReducer(run, { type: "reset", game, seed: 0 });
  assert.equal(reset.lifelines, 3);
  const noTargets = start(createRun(createInitialState(fixture({ red: 3, blue: 3 }))));
  assert.equal(runReducer(noTargets, { type: "boost", now: 100 }), noTargets);
});

function snowRevealRun() {
  let run = start(createRun(createInitialState(DEMO_LEVEL.map((screw) => ({ ...screw, color: "red" })))));
  for (const screw of run.logical.screws.filter((screw) => screw.attachedTo === "roof-lights-left")) run = runReducer(run, { type: "select", id: screw.id, now: 0 });
  run = finishFalls(drain(run));
  run = runReducer(run, { type: "dismiss", part: "roof-lights-left", now: 800 });
  const target = run.logical.screws.find((screw) => screw.attachedTo?.startsWith("roof-left-front") && screw.obstructedBy?.includes("snow-left-front"))!;
  return { run, target };
}

test("all 300 screws release 166 objects, with twelve whole-triple color quotas", () => {
  assert.equal(DEMO_LEVEL.length, 300);
  assert.equal(new Set(DEMO_LEVEL.map((screw) => screw.id)).size, DEMO_LEVEL.length);
  assert.equal(DEMO_LEVEL.filter((screw) => screw.attachedTo).length, DEMO_LEVEL.length);
  assert.equal(PART_IDS.length, 166);
  assert.equal(SCREW_COLOR_ORDER.length, 12);
  const counts = SCREW_COLOR_ORDER.map((color) => DEMO_LEVEL.filter((screw) => screw.color === color).length);
  assert.equal(counts.filter((count) => count === 24).length, 8);
  assert.equal(counts.filter((count) => count === 27).length, 4);
  assert.equal(SCREW_SCALE, 0.275 * 1.25 * 1.15);
  assert.ok(PIECES.every((piece) => PART_IDS.includes(piece.part)));
  assert.ok(DEMO_LEVEL.every((screw) => Math.abs(Math.hypot(...screw.normal) - 1) < 1e-10));
  for (const part of PART_IDS) assert.ok(DEMO_LEVEL.some((screw) => screw.attachedTo === part));
});

test("seeded colors are repeatable but change across restarts without moving any screw", () => {
  const first = generatePuzzle(123);
  assert.deepEqual(first, generatePuzzle(123));
  const second = generatePuzzle(456);
  assert.ok(first.state.screws.filter((screw, index) => screw.color !== second.state.screws[index].color).length > 90);
  assert.deepEqual(first.state.screws.map((screw) => [screw.id, screw.position, screw.normal]), second.state.screws.map((screw) => [screw.id, screw.position, screw.normal]));
  assert.notDeepEqual(first.state.boxQueue.map((box) => box.color), second.state.boxQueue.map((box) => box.color));
});

test("one hundred random seeds all have balanced colors, mixed fasteners, and a full winning solution", () => {
  const starts = new Set<string>();
  for (let seed = 1; seed <= 100; seed += 1) {
    const puzzle = generatePuzzle(seed);
    starts.add(puzzle.state.boxes.map((box) => box?.color).join("/"));
    for (const color of SCREW_COLOR_ORDER) assert.equal(puzzle.state.screws.filter((screw) => screw.color === color).length,
      DEMO_LEVEL.filter((screw) => screw.color === color).length);
    for (const part of PART_IDS) {
      const screws = puzzle.state.screws.filter((screw) => screw.attachedTo === part);
      assert.ok(new Set(screws.map((screw) => screw.color)).size >= Math.min(2, screws.length));
    }
    const opening = puzzle.state.screws.filter((screw) => !screw.obstructedBy?.length && !screw.solutionAfter?.length);
    for (const box of puzzle.state.boxes) {
      const matches = opening.filter((screw) => screw.color === box?.color).length;
      assert.ok(matches > 0 && matches < 3, `Seed ${seed}: opening ${box?.color} box must require a reveal`);
    }
    let state = puzzle.state;
    for (const id of puzzle.solution) {
      assert.ok(isScrewAccessible(state, state.screws.find((screw) => screw.id === id)!));
      state = removeScrew(state, id);
      assert.equal(state.tray.length, 0, "The generated proof uses only the two starting box slots");
      if (seed <= 5) inventory(state);
    }
    assert.equal(state.status, "won");
    assert.equal(state.clearedCount, DEMO_LEVEL.length);
    assert.equal(state.removedParts.length, PART_IDS.length);
  }
  assert.ok(starts.size >= 8);
});

test("matching colors bypass free slots and inactive colors wait without auto-clearing", () => {
  let state = take(take(fresh(), "red"), "blue");
  assert.equal(state.tray.length, 0);
  assert.equal(state.boxes[0]?.screws.length, 1);
  state = take(state, "yellow", 3);
  assert.equal(state.tray.length, 3);
  assert.equal(state.clearedCount, 0);
  inventory(state);
});

test("green and lime match independently and lime transfers only to its own box", () => {
  let game = createInitialState(fixture({ green: 3, blue: 3, lime: 3 }), ["green", "blue", "lime"]);
  game = take(take(game, "green"), "lime", 2);
  assert.deepEqual(game.boxes[0]?.screws.map((entry) => entry.color), ["green"]);
  assert.deepEqual(game.tray.map((entry) => entry.color), ["lime", "lime"]);
  game = take(game, "green", 2);
  assert.equal(game.boxes[0]?.color, "lime");
  assert.equal(game.boxes[0]?.screws.length, 2);
  assert.equal(game.tray.length, 0);
  inventory(game);
});

test("brown boxes collect directly and pink waiting screws transfer when their box appears", () => {
  let state = createInitialState(fixture({ red: 3, blue: 3, brown: 3, pink: 3 }));
  state = take(state, "pink", 2);
  assert.equal(state.tray.length, 2);
  state = take(state, "blue", 3);
  assert.equal(state.boxes[1]?.color, "brown");
  state = take(state, "brown");
  assert.equal(state.boxes[1]?.screws.length, 1);
  assert.equal(state.tray.length, 2, "Matching brown screws must not enter the waiting tray");
  state = take(state, "brown", 2);
  assert.equal(state.boxes[1]?.color, "pink");
  assert.equal(state.boxes[1]?.screws.length, 2);
  assert.equal(state.tray.length, 0);
  inventory(state);
  state = take(take(state, "pink"), "red", 3);
  assert.equal(state.status, "won");
});

test("cyan and black collect directly, and light grey transfers from waiting slots", () => {
  let state = createInitialState(fixture({ cyan: 3, black: 3, grey: 3 }), ["cyan", "black", "grey"]);
  state = take(state, "grey", 2);
  state = take(state, "black");
  assert.equal(state.boxes[1]?.screws.length, 1);
  assert.equal(state.tray.length, 2);
  state = take(state, "cyan", 3);
  assert.equal(state.boxes[0]?.color, "grey");
  assert.equal(state.boxes[0]?.screws.length, 2);
  assert.equal(state.tray.length, 0);
  state = take(take(state, "grey"), "black", 2);
  assert.equal(state.status, "won");
  inventory(state);
});

test("box replacements transfer waiting screws and resolve complete cascades", () => {
  const state = take(take(take(fresh(), "yellow", 3), "green"), "blue", 3);
  assert.equal(state.clearedCount, 6);
  assert.deepEqual(state.boxes.map((box) => box?.color), ["red", "green"]);
  assert.equal(state.boxes[1]?.screws.length, 1);
  assert.equal(state.tray.length, 0);
  inventory(state);
});

test("partial transfers preserve other waiting colors and cannot overflow boxes", () => {
  let state = take(take(fresh(), "yellow", 2), "green", 2);
  state = take(state, "blue", 3);
  assert.equal(state.boxes[1]?.screws.length, 2);
  assert.equal(state.tray.length, 2);
  state = take(state, "yellow");
  assert.equal(state.boxes[1]?.color, "green");
  assert.equal(state.boxes[1]?.screws.length, 2);
  assert.equal(state.tray.length, 0);
  inventory(state);
});

test("five waiting screws lose and freeze all further moves", () => {
  const state = take(fresh(), "yellow", 5);
  assert.equal(state.status, "lost");
  assert.equal(state.clearedCount, 0);
  assert.equal(removeScrew(state, "blue-1"), state);
});

test("duplicate and unknown IDs are ignored without mutating earlier snapshots", () => {
  const initial = take(fresh(), "yellow", 3);
  const saved = structuredClone(initial);
  const state = take(initial, "blue", 3);
  assert.deepEqual(initial, saved);
  assert.equal(removeScrew(state, "blue-1"), state);
  assert.equal(removeScrew(state, "missing"), state);
});

test("the final two boxes disappear and win only when all screws are matched", () => {
  let state = take(createInitialState(fixture({ red: 3, blue: 3 })), "red", 3);
  assert.equal(state.boxes[0], null);
  assert.equal(state.status, "playing");
  state = take(state, "blue", 3);
  assert.equal(state.status, "won");
  assert.deepEqual(state.boxes, [null, null]);
  assert.equal(state.clearedCount, 6);
  assert.equal(removeScrew(state, "blue-1"), state);
  assert.equal(take(createInitialState(fixture({ red: 1 })), "red").status, "playing");
});

test("lights, snow, and roof sections form independent physical reveal steps", () => {
  const { run, target } = snowRevealRun();
  let state = run.logical;
  assert.equal(removeScrew(state, target.id), state);
  for (const screw of state.screws.filter((screw) => screw.attachedTo === "snow-left-front")) state = removeScrew(state, screw.id);
  assert.ok(state.removedParts.includes("snow-left-front"));
  assert.ok(isScrewAccessible(state, state.screws.find((screw) => screw.id === target.id)!));
  const neighbor = state.screws.find((screw) => screw.attachedTo?.startsWith("roof-left-back") && screw.obstructedBy?.includes("snow-left-back"))!;
  assert.equal(removeScrew(state, neighbor.id), state, "Other roof lanes keep their own snow cover");
});

test("animation events keep the completed box visible before replacement and transfer", () => {
  const state = take(take(fresh(), "yellow", 2), "blue", 2);
  const plan = planScrewRemoval(state, "blue-3");
  assert.deepEqual(plan.finalState, removeScrew(state, "blue-3"));
  assert.deepEqual(plan.events.map((event) => event.kind), ["collect", "complete", "replace", "transfer", "transfer"]);
  const frames = buildSequence(plan.events);
  assert.deepEqual(frames.slice(0, 6).map((frame) => frame.kind), ["unscrew", "fly", "land", "complete", "pause", "replace"]);
  assert.deepEqual(frames.slice(0, 6).map((frame) => frame.duration), [350, 160, 75, 200, 35, 120]);
  assert.equal(frames[3].game.boxes[1]?.screws.length, 3);
  assert.equal(frames.filter((frame) => frame.kind === "fly").length, 3);
});

test("Start gates selection and rapid distinct clicks reserve moves while animations are pending", () => {
  let run = createRun(fresh());
  assert.equal(runReducer(run, { type: "select", id: "red-1", now: 0 }), run);
  assert.equal(runReducer(run, { type: "start" }), run);
  run = start(run);
  run = runReducer(run, { type: "select", id: "red-1", now: 0 });
  const firstJob = run.jobs[0];
  run = runReducer(run, { type: "select", id: "blue-1", now: 30 });
  assert.equal(run.jobs.length, 2);
  assert.equal(run.jobs[0], firstJob);
  assert.equal(run.logical.screws.filter((screw) => screw.removed).length, 2);
  assert.equal(run.display.screws.filter((screw) => screw.removed).length, 0);
  assert.equal(runReducer(run, { type: "select", id: "red-1", now: 40 }), run);
  run = runReducer(run, { type: "begin", job: firstJob.id });
  const frame = currentFrame(run);
  run = runReducer(run, { type: "select", id: "red-2", now: 60 });
  assert.equal(currentFrame(run), frame);
  assert.equal(run.frameIndex, 0);
  run = drain(run);
  assert.deepEqual(run.display, run.logical);
});

test("terminal loss is immediate even with pending animations, and reset ignores stale callbacks", () => {
  let run = start(createRun(fresh()));
  for (let index = 1; index <= 5; index += 1) run = runReducer(run, { type: "select", id: `yellow-${index}`, now: index });
  assert.equal(run.jobs.length, 5);
  assert.equal(run.logical.status, "lost");
  assert.equal(runReducer(run, { type: "select", id: "blue-1", now: 6 }), run);
  const stale = run.jobs[0].id;
  run = runReducer(run, { type: "reset", game: fresh(), seed: 22 });
  assert.equal(run.started, false);
  assert.equal(run.ready, false);
  assert.equal(runReducer(run, { type: "ready", round: run.round - 1 }), run);
  assert.equal(run.jobs.length, 0);
  run = start(run);
  run = runReducer(run, { type: "select", id: "red-1", now: 10 });
  assert.notEqual(run.jobs[0].id, stale);
  assert.equal(runReducer(run, { type: "begin", job: stale }), run);
});

test("falls start during the collection queue and a resting cover blocks until cleared", () => {
  const fixture = snowRevealRun();
  let run = fixture.run;
  for (const screw of run.logical.screws.filter((screw) => screw.attachedTo === "snow-left-front")) run = runReducer(run, { type: "select", id: screw.id, now: 900 });
  assert.ok(run.logical.removedParts.includes("snow-left-front"));
  assert.deepEqual(run.fallingParts, ["snow-left-front"]);
  assert.ok(!run.display.removedParts.includes("snow-left-front"));
  assert.equal(runReducer(run, { type: "select", id: fixture.target.id, now: 901 }), run);
  const jobs = run.jobs;
  run = finishFalls(run);
  assert.equal(run.jobs, jobs, "Finishing a fall must leave the collection queue in place");
  run = runReducer(run, { type: "dismiss", part: "snow-left-front", now: 1800 });
  const accepted = runReducer(run, { type: "select", id: fixture.target.id, now: 1801 });
  assert.equal(accepted.jobs.length, jobs.length + 1);
});

test("clearing a snowbank frees outside tile screws while the two under the house remain covered", () => {
  let game = createInitialState(DEMO_LEVEL.map((screw) => ({ ...screw, color: "red" })));
  for (const screw of game.screws.filter((screw) => screw.attachedTo === "snowbank-front")) game = removeScrew(game, screw.id);
  const tile = game.screws.filter((screw) => screw.attachedTo === "tile-s");
  const exposed = tile.filter((screw) => isScrewAccessible(game, screw));
  const covered = tile.filter((screw) => !isScrewAccessible(game, screw));
  assert.equal(exposed.length, 3);
  assert.equal(covered.length, 2);
  for (const screw of exposed) game = removeScrew(game, screw.id);
  assert.equal(game.removedParts.includes("tile-s"), false);
  for (const screw of covered) assert.equal(removeScrew(game, screw.id), game);
  const covers = covered.flatMap((screw) => screw.obstructedBy ?? []);
  game = { ...game, removedParts: [...new Set([...game.removedParts, ...covers])] };
  for (const screw of covered) game = removeScrew(game, screw.id);
  assert.ok(game.removedParts.includes("tile-s"));
});

test("object size limits fixings to one to three, with at most five on large floors and tiles", () => {
  const large = new Set<PartId>([...GROUND_IDS, ...TILE_IDS, "floor-left", "floor-right"]);
  for (const part of PART_IDS) {
    const count = DEMO_LEVEL.filter((screw) => screw.attachedTo === part).length;
    assert.ok(count >= 1 && count <= (large.has(part) ? 5 : 3), `${part} has ${count} screws`);
  }
  for (const part of ["tree-star", "window-upper-left", "planter-left", "gift-left", "present-bed", "candy-left"] as const) {
    assert.equal(DEMO_LEVEL.filter((screw) => screw.attachedTo === part).length, 1);
  }
  for (const [part, count] of [["table", 3], ["chair-front", 2], ["chair-back", 2], ["table-vase", 1]] as const) {
    assert.equal(DEMO_LEVEL.filter((screw) => screw.attachedTo === part).length, count);
    assert.ok(PIECES.filter((piece) => piece.part === part).length > 3);
  }
  assert.ok(PIECES.every((piece) => !["roof-wrap", "yard-lights", "festival-sash"].includes(piece.part)));
});

test("the shower enclosure and tray release separately after their own screws", () => {
  const owner = (part: PartId) => part === "bath-shower" || part === "bath-tray";
  let game = { ...createInitialState(DEMO_LEVEL.filter((screw) => screw.attachedTo && owner(screw.attachedTo)).map((screw) => ({ ...screw, color: "red" }))),
    removedParts: PART_IDS.filter((part) => !owner(part)) };
  const shower = game.screws.filter((screw) => screw.attachedTo === "bath-shower");
  const tray = game.screws.find((screw) => screw.attachedTo === "bath-tray")!;
  assert.equal(shower.length, 3);
  assert.equal(removeScrew(game, tray.id), game);
  for (const screw of shower.slice(0, 2)) game = removeScrew(game, screw.id);
  assert.ok(!isScrewAccessible(game, tray));
  game = removeScrew(game, shower[2].id);
  assert.deepEqual(game.removedParts.filter(owner), ["bath-shower"]);
  assert.ok(isScrewAccessible(game, tray));
  game = removeScrew(game, tray.id);
  assert.deepEqual(game.removedParts.filter(owner), ["bath-shower", "bath-tray"]);
});

test("independent falls can overlap and only cleared active covers can be bypassed", () => {
  const screws = fixture({ red: 3 });
  screws[0].attachedTo = "snow-left-front";
  screws[1].attachedTo = "chimney";
  screws[2].obstructedBy = ["snow-left-front", "chimney"];
  let run = start(createRun(createInitialState(screws)));
  run = runReducer(run, { type: "select", id: screws[0].id, now: 0 });
  const select = { type: "select", id: screws[2].id, now: 20, clearedParts: ["snow-left-front", "chimney"] } as const;
  assert.equal(runReducer(run, select), run, "A standing cover cannot be bypassed");
  run = runReducer(run, { type: "select", id: screws[1].id, now: 10 });
  assert.deepEqual(run.fallingParts, ["snow-left-front", "chimney"]);
  assert.equal(runReducer(run, { ...select, clearedParts: ["chimney"] }), run);
  assert.equal(runReducer(run, select).logical.status, "won");
  run = drain(run);
  assert.deepEqual(settledParts(run), [], "Box playback cannot remove a cover that is still falling");
  const reset = runReducer(run, { type: "reset", game: createInitialState(screws), seed: 2 });
  assert.equal(runReducer(reset, { type: "fall-finished", round: run.round, part: "chimney" }), reset);
});

test("timer waits for the first accepted screw, ignores blocked clicks, stops at loss, and resets", () => {
  let covered = start(createRun(createInitialState(DEMO_LEVEL.map((screw) => ({ ...screw, color: "red" })))));
  const blocked = covered.logical.screws.find((screw) => screw.obstructedBy?.length)!;
  covered = runReducer(covered, { type: "select", id: blocked.id, now: 1000 });
  assert.equal(covered.timerStartedAt, null);
  const first = covered.logical.screws.find((screw) => screw.attachedTo === "roof-lights-left")!;
  covered = runReducer(covered, { type: "select", id: first.id, now: 2000 });
  assert.equal(covered.timerStartedAt, 2000);
  assert.equal(runReducer(covered, { type: "select", id: first.id, now: 3000 }).timerStartedAt, 2000);
  let run = start(createRun(fresh()));
  assert.equal(run.timerStartedAt, null);
  assert.equal(run.timerStoppedAt, null);
  for (let index = 1; index <= 5; index += 1) run = runReducer(run, { type: "select", id: `yellow-${index}`, now: index * 1000 });
  assert.equal(run.timerStartedAt, 1000);
  assert.equal(run.timerStoppedAt, 5000);
  assert.equal(drain(run).timerStoppedAt, 5000, "Cosmetic playback must not add to the solve time");
  run = runReducer(run, { type: "reset", game: fresh(), seed: 99 });
  assert.equal(run.timerStartedAt, null);
  assert.equal(run.timerStoppedAt, null);
});

test("victory stops the timer on the final accepted screw before queued animations finish", () => {
  let run = start(createRun(createInitialState(fixture({ red: 3, blue: 3 }))));
  for (const [index, screw] of run.logical.screws.entries()) run = runReducer(run, { type: "select", id: screw.id, now: 100 + index * 1000 });
  assert.equal(run.logical.status, "won");
  assert.equal(run.timerStartedAt, 100);
  assert.equal(run.timerStoppedAt, 5100);
  assert.ok(run.jobs.length > 0);
});

test("a full generated house also wins through the concurrent presentation controller", () => {
  const puzzle = generatePuzzle(404);
  let run = start(createRun(puzzle.state));
  for (const [index, id] of puzzle.solution.entries()) {
    const screw = run.logical.screws.find((candidate) => candidate.id === id)!;
    if (!isScrewAccessible({ ...run.logical, removedParts: settledParts(run) }, screw)) run = finishFalls(run);
    const count = run.logical.removedParts.length;
    const now = index * 1000;
    run = runReducer(run, { type: "select", id, now });
    const detached = run.logical.removedParts[count];
    if (detached) run = runReducer(run, { type: "dismiss", part: detached, now: now + 850 });
  }
  assert.equal(run.logical.status, "won");
  run = finishFalls(drain(run));
  assert.deepEqual(run.display, run.logical);
  assert.equal(run.display.clearedCount, DEMO_LEVEL.length);
  assert.equal(run.display.removedParts.length, PART_IDS.length);
});

test("every screw in a generated solution has a clear view through the actual hollow house geometry", () => {
  const material = new MeshBasicMaterial({ side: DoubleSide });
  const meshes = PIECES.map((piece) => {
    const mesh = new Mesh(geometryFor(piece), material);
    mesh.position.set(...piece.position); mesh.scale.set(...piece.size);
    if (piece.rotation) mesh.rotation.set(...piece.rotation);
    mesh.updateMatrixWorld(); mesh.userData.part = piece.part;
    return mesh;
  });
  const ray = new Raycaster();
  const blocked: string[] = [];
  for (const seed of [1, 2, 3, 4, 5, 17, 42, 123]) {
  const puzzle = generatePuzzle(seed);
  let state = puzzle.state;
  for (const id of puzzle.solution) {
    const screw = state.screws.find((candidate) => candidate.id === id)!;
    const normal = new Vector3(...screw.normal);
    const face = new Vector3(...screw.position).addScaledVector(normal, SCREW_SCALE * 0.144);
    const solids = meshes.filter((mesh) => !mesh.userData.part || !state.removedParts.includes(mesh.userData.part));
    let clear = false;
    const tangent = Math.abs(normal.y) > 0.9 ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0);
    tangent.addScaledVector(normal, -tangent.dot(normal)).normalize();
    const across = new Vector3().crossVectors(normal, tangent).normalize();
    directions: for (const up of [0, -1, 0.6, 1.5, 3, 6]) for (const side of [-2, -0.8, 0, 0.8, 2]) {
      const direction = normal.clone().addScaledVector(tangent, up).addScaledVector(across, side).normalize();
      if (direction.dot(normal) < 0.12) continue;
      ray.set(face.clone().addScaledVector(direction, 18), direction.clone().negate()); ray.far = 17.998;
      if (!ray.intersectObjects(solids, false).length) { clear = true; break directions; }
    }
    if (!clear) blocked.push(`seed ${seed}: ${id} (${screw.attachedTo ?? "anchor"})`);
    state = removeScrew(state, id);
  }
  }
  material.dispose();
  assert.deepEqual(blocked, []);
});

test("every removable assembly has a dynamic body, even the smallest decorations", (t) => {
  const physics = createPartPhysics();
  t.after(physics.free);
  for (const part of PART_IDS) physics.release(part, 1000);
  assert.equal(Object.keys(physics.read()).length, PART_IDS.length);
  for (const part of PART_IDS) {
    const position = loosePartPose(part, physics.read()[part]!, 1000).position;
    assert.ok(new Vector3(...position).distanceTo(new Vector3(...PART_PIVOTS[part])) < 0.001, part);
  }
  physics.advance(1017);
  assert.ok(physics.read()["tile-n"]!.frames.length > 1);
  assert.ok(physics.read()["bath-mirror"]!.frames.length > 1);
});

test("the loose vase lands on the loose table and drops again when its support poofs", (t) => {
  const physics = createPartPhysics();
  t.after(physics.free);
  const vase = "table-vase";
  const table = "table";
  const pose = (part: PartId, at: number) => loosePartPose(part, physics.read()[part]!, at);
  physics.release(table, 1000);
  physics.advance(1450);
  physics.release(vase, 1450);
  physics.advance(2150);
  const restingY = pose(vase, 2150).position[1];
  assert.ok(Math.abs(restingY - pose(table, 2150).position[1] - 0.27) < 0.05);
  const clearsAt = 1000 + LOOSE_LIFETIME_MS;
  physics.advance(clearsAt - 1);
  assert.equal(physics.read()[table]!.poof, undefined);
  const afterDrop = clearsAt + 200;
  physics.advance(afterDrop);
  assert.equal(physics.read()[table]!.poof?.at, clearsAt);
  assert.ok(pose(vase, afterDrop).position[1] < restingY - 0.10, "A sleeping part wakes when its loose support expires");
  assert.equal(physics.dismiss(vase, afterDrop), true);
  assert.equal(physics.dismiss(vase, afterDrop + 1), false);
  assert.equal(isLooseVisible(physics.read()[vase]!, afterDrop + 1, pose(vase, afterDrop + 1).position[1]), false);
});

test("normal roof collisions slide snow, roll the ornament and let a pitched panel tumble", (t) => {
  const motions = (part: PartId, removed: PartId[]) => {
    const physics = createPartPhysics(removed);
    t.after(physics.free);
    physics.release(part, 1000);
    return (at: number) => {
      physics.advance(at);
      return loosePartPose(part, physics.read()[part]!, at);
    };
  };
  const panel = "roof-right-front-eave", snow = "snow-right-front", bauble = "roof-bauble";
  const roof = motions(panel, [snow, "roof-lights-right"]);
  const roofPose = roof(2850);
  assert.ok(roofPose.position[1] < PART_PIVOTS[panel][1] - 0.2);
  assert.ok(Math.abs(roofPose.rotation[2]) > 0.12);
  const strip = motions(snow, ["roof-lights-right"]);
  assert.ok(strip(1850).position[0] > PART_PIVOTS[snow][0] + 0.75);
  const ornament = motions(bauble, []);
  const ball = ornament(1750);
  assert.ok(ball.position[0] > PART_PIVOTS[bauble][0] + 0.4);
  assert.ok(Math.abs(ball.rotation[2]) > 0.4);
  const impactY = ornament(2200).position[1];
  assert.ok(ornament(2450).position[1] > impactY, "The sphere rebounds off the cottage grounds");
});

test("the sideboard blocks extraction while loose and clears on the exact smoke timestamp", (t) => {
  for (const part of ["bedroom-rug", "study-rug", "reading-chair", "bookcase", "hall-runner", "sideboard"] as const) {
    assert.ok(DEMO_LEVEL.some((screw) => /^(floor|ground)-/.test(screw.attachedTo ?? "") && screw.obstructedBy?.includes(part)), part);
  }
  const screw = DEMO_LEVEL.find((screw) => screw.attachedTo === "ground-ne" && screw.obstructedBy?.includes("sideboard"))!;
  const physics = createPartPhysics();
  t.after(physics.free);
  physics.release("sideboard", 1000);
  const clearsAt = 3000; // Released at 1000 and auto-cleared two seconds later.
  physics.advance(clearsAt - 1);
  assert.equal(findLooseBlocker(physics.read(), screw, SCREW_SCALE, clearsAt - 1), "sideboard");
  physics.advance(clearsAt);
  assert.equal(physics.read().sideboard?.poof?.at, clearsAt);
  assert.deepEqual(physics.read().sideboard?.poof?.position, loosePartPose("sideboard", physics.read().sideboard!, clearsAt).position);
  assert.equal(findLooseBlocker(physics.read(), screw, SCREW_SCALE, clearsAt), undefined);
});

test("the natural opening stays below ten percent across eighty views and requires matching-color reveals", () => {
  const initial = generatePuzzle(123).state;
  const exposed = findExposedScrews(initial);
  assert.equal(exposed.length, 29);
  assert.ok(exposed.length / initial.screws.length < 0.1);
  assert.deepEqual(new Set(exposed), new Set(initial.screws.filter((screw) => !screw.obstructedBy?.length && !screw.solutionAfter?.length).map((screw) => screw.id)));
  for (const owner of ["wall-front-upper-1", "partition-upper-left", "bed"] as const) {
    assert.equal(initial.screws.filter((screw) => screw.attachedTo === owner && exposed.includes(screw.id)).length, 0);
  }
  for (const box of initial.boxes) {
    assert.ok(initial.screws.filter((screw) => screw.color === box?.color && exposed.includes(screw.id)).length < 3);
  }
});
