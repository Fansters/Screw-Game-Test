import assert from "node:assert/strict";
import { test } from "node:test";
import { CAMPAIGN_LEVELS, levelStatus, readLevelProgress, recordLevelClear } from "../src/game/campaign.ts";
import { SOLO_TIMES_KEY } from "../src/game/leaderboard.ts";

test("all five levels are playable immediately while completed runs retain their progress", (t) => {
  const saved = new Map<string, string>();
  Object.defineProperty(globalThis, "window", { configurable: true, value: {
    localStorage: {
      getItem: (key: string) => saved.get(key) ?? null,
      setItem: (key: string, value: string) => saved.set(key, value),
    },
  } });
  t.after(() => Reflect.deleteProperty(globalThis, "window"));
  assert.deepEqual(CAMPAIGN_LEVELS.map(({ id }) => id), ["cottage", "campsite", "desert", "construction", "carnival"]);
  assert.equal(levelStatus(0), "playable");
  assert.equal(levelStatus(4), "playable");
  assert.equal(levelStatus(3), "playable");
  assert.equal(levelStatus(1), "playable");
  assert.equal(levelStatus(2), "playable");
  assert.equal(readLevelProgress().size, 0);
  saved.set(SOLO_TIMES_KEY, JSON.stringify([{ elapsedMs: 45678, completedAt: 12345 }]));
  assert.equal(levelStatus(1), "playable");
  assert.equal(levelStatus(2), "playable");
  assert.ok(readLevelProgress().has("cottage"));
  recordLevelClear("campsite");
  assert.equal(levelStatus(2), "playable");
  saved.delete(SOLO_TIMES_KEY);
  recordLevelClear("cottage");
  assert.equal(saved.get("screw-it:cleared:cottage"), "1");
  assert.equal(levelStatus(1), "playable");
});
