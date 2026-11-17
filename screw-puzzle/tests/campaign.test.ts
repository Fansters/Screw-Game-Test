import assert from "node:assert/strict";
import { test } from "node:test";
import { levelStatus, readLevelProgress, recordLevelClear } from "../src/game/campaign.ts";
import { SOLO_TIMES_KEY } from "../src/game/leaderboard.ts";

test("the level order gates Titanic and reads progress from Cottage wins and older personal times", (t) => {
  const saved = new Map<string, string>();
  Object.defineProperty(globalThis, "window", { configurable: true, value: {
    localStorage: {
      getItem: (key: string) => saved.get(key) ?? null,
      setItem: (key: string, value: string) => saved.set(key, value),
    },
  } });
  t.after(() => Reflect.deleteProperty(globalThis, "window"));
  assert.equal(levelStatus(0, readLevelProgress()), "playable");
  assert.equal(levelStatus(1, readLevelProgress()), "locked");
  saved.set(SOLO_TIMES_KEY, JSON.stringify([{ elapsedMs: 45678, completedAt: 12345 }]));
  assert.equal(levelStatus(1, readLevelProgress()), "coming-soon");
  saved.delete(SOLO_TIMES_KEY);
  recordLevelClear("cottage");
  assert.equal(saved.get("screw-it:cleared:cottage"), "1");
  assert.equal(levelStatus(1, readLevelProgress()), "coming-soon");
});
