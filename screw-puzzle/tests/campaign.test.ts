import "../src/game/allLevels.ts";
import assert from "node:assert/strict";
import { test } from "node:test";
import { CAMPAIGN_LEVELS, levelIdentity, levelsForDifficulty, levelStatus, readLevelProgress, recordLevelClear } from "../src/game/campaign.ts";
const SOLO_TIMES_KEY = "screw-it:solo-times:cottage:v2"; // Read-only completion compatibility.

test("difficulty groups number locally while save and board identities stay stable", () => {
  assert.deepEqual(levelsForDifficulty("easy").map(level=>level.id),["arctic"]);
  assert.deepEqual(levelsForDifficulty("medium").map(level=>level.id),["cottage","construction","carnival","zoo","castle"]);
  assert.deepEqual(levelsForDifficulty("hard").map(level=>level.id),["campsite","desert","oasis"]);
  for(const [id,difficulty,number] of [["arctic","easy",1],["campsite","hard",1],["oasis","hard",3],["castle","medium",5],["desert","hard",2]] as const) {
    assert.equal(levelIdentity(id)?.difficulty,difficulty);assert.equal(levelIdentity(id)?.number,number);
  }
});

test("all nine levels are playable immediately while completed runs retain their progress", (t) => {
  const saved = new Map<string, string>();
  Object.defineProperty(globalThis, "window", { configurable: true, value: {
    localStorage: {
      getItem: (key: string) => saved.get(key) ?? null,
      setItem: (key: string, value: string) => saved.set(key, value),
    },
  } });
  t.after(() => Reflect.deleteProperty(globalThis, "window"));
  assert.deepEqual(CAMPAIGN_LEVELS.map(({ id }) => id), ["cottage", "campsite", "desert", "construction", "carnival", "zoo", "castle", "arctic", "oasis"]);
  assert.equal(levelStatus(0), "playable");
  assert.equal(levelStatus(5), "playable");
  assert.equal(levelStatus(6), "playable");
  assert.equal(levelStatus(7), "playable");
  assert.equal(levelStatus(8), "playable");
  assert.equal(levelStatus(9), "coming-soon");
  assert.equal(levelStatus(4), "playable");
  assert.equal(levelStatus(3), "playable");
  assert.equal(levelStatus(1), "playable");
  assert.equal(levelStatus(2), "playable");
  assert.equal(readLevelProgress().size, 0);
  saved.set(SOLO_TIMES_KEY, JSON.stringify([{ elapsedMs: 45678, completedAt: 12345 }]));
  assert.equal(levelStatus(1), "playable");
  assert.equal(levelStatus(2), "playable");
  assert.equal(readLevelProgress().has("cottage"),false,"old device records are no longer imported");
  recordLevelClear("campsite");
  assert.equal(levelStatus(2), "playable");
  saved.delete(SOLO_TIMES_KEY);
  recordLevelClear("cottage");
  assert.equal(saved.get("screw-it:cleared:cottage"), undefined,"guest completion stays in this visit only");
  assert.equal(levelStatus(1), "playable");
});
