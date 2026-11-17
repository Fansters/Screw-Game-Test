import { test } from "node:test";
import assert from "node:assert/strict";
import { readSoloTimes, recordSoloTime, SOLO_TIMES_KEY } from "../src/game/leaderboard.ts";

test("solo records validate saved data, rank the fastest ten, and recover from a denied write", (t) => {
  const saved = new Map([[SOLO_TIMES_KEY, JSON.stringify([
    { elapsedMs: 35_000, completedAt: 20 }, { elapsedMs: -50, completedAt: 20 }, { elapsedMs: 500, completedAt: "yesterday" },
  ])]]);
  let writable = true;
  Object.defineProperty(globalThis, "window", { configurable: true, value: {
    localStorage: {
      getItem: (key: string) => saved.get(key) ?? null,
      setItem: (key: string, value: string) => {
        if (!writable) throw new Error("Storage unavailable");
        saved.set(key, value);
      },
    },
  } });
  t.after(() => Reflect.deleteProperty(globalThis, "window"));
  assert.deepEqual(readSoloTimes().map(({ elapsedMs }) => elapsedMs), [35_000]);
  recordSoloTime(NaN);
  for (let i = 12; i >= 2; i -= 1) recordSoloTime(i * 1000);
  assert.deepEqual(readSoloTimes().map(({ elapsedMs }) => elapsedMs), [2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10_000, 11_000]);
  writable = false;
  recordSoloTime(1500.4);
  assert.equal(readSoloTimes()[0].elapsedMs, 1500);
  writable = true;
  recordSoloTime(1900);
  assert.deepEqual(readSoloTimes().slice(0, 3).map(({ elapsedMs }) => elapsedMs), [1500, 1900, 2000]);
  assert.equal(JSON.parse(saved.get(SOLO_TIMES_KEY)!).length, 10);
  saved.set(SOLO_TIMES_KEY, "{malformed");
  assert.equal(readSoloTimes()[0].elapsedMs, 1500);
});
