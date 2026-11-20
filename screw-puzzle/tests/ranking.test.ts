import assert from "node:assert/strict";
import { test } from "node:test";
import { advanceRankedClock, createRankedClock, rankedElapsedMs } from "../src/ranking/clock.ts";
import { RANKED_BOARDS, RANKED_RULES, rankedBoardId } from "../src/ranking/rules.ts";
import { topVerifiedResults } from "../src/ranking/results.ts";
import { LEVEL_LAYOUT_VERSIONS, layoutRevision } from "../src/game/layoutVersions.ts";
import { LEVEL_IDS } from "../src/game/types.ts";
import { ABILITY_USES } from "../src/game/abilities.ts";
import { LIFELINE_COUNT } from "../src/animation/run.ts";

test("ranked timing starts on the first accepted screw and includes thinking, menus and network grace", () => {
  let clock = createRankedClock(1000);
  clock = advanceRankedClock(clock, { type: "tick", now: 5000 });
  assert.equal(rankedElapsedMs(clock, 5000), 0);
  clock = advanceRankedClock(clock, { type: "accepted-screw", now: 6000 });
  clock = advanceRankedClock(clock, { type: "tick", now: 12000 });
  assert.equal(rankedElapsedMs(clock, 13000), 7000);
  clock = advanceRankedClock(clock, { type: "disconnect", now: 14000 });
  const offline = advanceRankedClock(clock, { type: "accepted-screw", won: true, now: 15000 });
  assert.equal(offline.status, "running");
  assert.equal(offline.stoppedAt, null);
  clock = advanceRankedClock(offline, { type: "reconnect", now: 44000 });
  clock = advanceRankedClock(clock, { type: "accepted-screw", won: true, now: 45000.8 });
  assert.equal(clock.status, "won");
  assert.equal(rankedElapsedMs(clock, 90000), 39000);
  assert.equal(advanceRankedClock(clock, { type: "refresh", now: 99000 }), clock, "a saved win can be claimed after account linking");
});

test("refresh, exit, reset, loss, expired grace and invalid clock input cannot produce a ranked win", () => {
  const started = advanceRankedClock(createRankedClock(0), { type: "accepted-screw", now: 100 });
  for (const type of ["refresh", "leave", "reset", "lost"] as const) {
    const ended = advanceRankedClock(started, { type, now: 150 });
    assert.notEqual(ended.status, "won");
    assert.equal(advanceRankedClock(ended, { type: "accepted-screw", won: true, now: 200 }), ended);
  }
  let offline = advanceRankedClock(started, { type: "disconnect", now: 200 });
  offline = advanceRankedClock(offline, { type: "disconnect", now: 5000 });
  assert.equal(offline.disconnectedAt, 200, "repeated disconnects cannot extend the deadline");
  const expired = advanceRankedClock(offline, { type: "reconnect", now: 30201 });
  assert.equal(expired.status, "ineligible");
  assert.equal(expired.reason, "reconnect-expired");
  assert.throws(() => createRankedClock(NaN));
  assert.throws(() => createRankedClock(-1));
  assert.throws(() => advanceRankedClock(started, { type: "tick", now: 99 }));
});

test("ranked boards separate layouts, generation and rules without resetting existing local keys", () => {
  assert.deepEqual(RANKED_BOARDS.map(board => board.level), [...LEVEL_IDS]);
  assert.equal(new Set(RANKED_BOARDS.map(board => board.id)).size, 7);
  assert.equal(rankedBoardId("space"), "space:layout-3:generator-1:rules-1:solo");
  assert.throws(() => rankedBoardId("titanic"));
  for (const level of [...LEVEL_IDS, "titanic"] as const) assert.equal(layoutRevision(level), `v${LEVEL_LAYOUT_VERSIONS[level]}`);
  assert.equal(layoutRevision("cottage"), "v2");
  assert.equal(layoutRevision("desert"), "v3");
  assert.equal(RANKED_RULES.findMatches, ABILITY_USES);
  assert.equal(RANKED_RULES.queuePeeks, ABILITY_USES);
  assert.equal(RANKED_RULES.extraBoxes, LIFELINE_COUNT);
});

test("the top ten contains each player's best result, shared millisecond ties and deterministic boundary order", () => {
  const boardId = rankedBoardId("cottage");
  const scores = Array.from({ length: 14 }, (_, i) => ({ id: `r${i}`, playerId: `p${i}`, boardId, elapsedMs: 1000 + i * 100, verifiedAt: 100 + i }));
  scores.push({ ...scores[0], id: "slower", elapsedMs: 9999 });
  scores.push({ ...scores[1], id: "tied", elapsedMs: 1000 });
  scores.push({ ...scores[0], id: "other-board", boardId: rankedBoardId("space"), elapsedMs: 1 });
  scores.push({ ...scores[0], id: "invalid", elapsedMs: -1 });
  const ranked = topVerifiedResults(scores, boardId);
  assert.equal(ranked.length, 10);
  assert.equal(new Set(ranked.map(row => row.playerId)).size, 10);
  assert.deepEqual(ranked.slice(0, 3).map(row => row.place), [1, 1, 3]);
  assert.deepEqual(ranked, topVerifiedResults([...scores].reverse(), boardId));
  assert.deepEqual(topVerifiedResults(scores, "not-a-board"), []);
});
