import assert from "node:assert/strict";
import { test } from "node:test";
import { CAMPAIGN_LEVELS } from "../src/game/campaign.ts";
import { LEVEL_PRESENTATION, savedScrewCount } from "../src/game/levelPresentation.ts";

test("level-card saved progress excludes ability actions and covers every playable scene", () => {
  assert.equal(savedScrewCount(["screw-1", "boost", "find:screw-2", "peek", "screw-2"]), 2);
  assert.equal(savedScrewCount([]), 0);
  assert.deepEqual(Object.keys(LEVEL_PRESENTATION), CAMPAIGN_LEVELS.map(level => level.id));
  assert.ok(CAMPAIGN_LEVELS.every(level => {
    const count = LEVEL_PRESENTATION[level.id].screws;
    return count % 3 === 0 && (level.id === "arctic" ? count >= 140 && count <= 160 : count >= 200 && count <= 240);
  }));
});
