import type { LevelId } from "./campaign.ts";

const timesKey = (level: LevelId) => `screw-it:solo-times:${level}:v2`;
export const SOLO_TIMES_KEY = timesKey("cottage");
export const SOLO_TIMES_LIMIT = 10;

export type SoloTime = { elapsedMs: number; completedAt: number };

const recent = new Map<LevelId, SoloTime[]>();
const unsaved = new Map<LevelId, SoloTime[]>();

function isSoloTime(value: unknown): value is SoloTime {
  if (!value || typeof value !== "object" || !("elapsedMs" in value) || !("completedAt" in value)) return false;
  const { elapsedMs, completedAt } = value;
  return typeof elapsedMs === "number" && Number.isSafeInteger(elapsedMs) && elapsedMs > 0 &&
    typeof completedAt === "number" && Number.isSafeInteger(completedAt) && completedAt > 0 && completedAt <= 8.64e15;
}

function fastest(times: SoloTime[]) {
  return times.sort((a, b) => a.elapsedMs - b.elapsedMs || a.completedAt - b.completedAt).slice(0, SOLO_TIMES_LIMIT);
}

export function readSoloTimes(level: LevelId = "cottage"): SoloTime[] {
  try {
    const saved: unknown = JSON.parse(window.localStorage.getItem(timesKey(level)) ?? "[]");
    recent.set(level, fastest([...(Array.isArray(saved) ? saved.filter(isSoloTime) : []), ...(unsaved.get(level) ?? [])]));
  } catch {
    // Keep the current visit usable when browser storage is unavailable.
  }
  return recent.get(level) ?? [];
}

export function recordSoloTime(elapsedMs: number, level: LevelId = "cottage") {
  const time = { elapsedMs: Math.round(elapsedMs), completedAt: Date.now() };
  if (!isSoloTime(time)) return;
  function save() {
    const times = fastest([...readSoloTimes(level), time]);
    recent.set(level, times);
    try {
      window.localStorage.setItem(timesKey(level), JSON.stringify(times));
      unsaved.delete(level);
    } catch {
      unsaved.set(level, fastest([...(unsaved.get(level) ?? []), time]));
    }
  }
  // Serialize read/modify/write across tabs when the browser supports Web Locks.
  const locks = window.navigator?.locks;
  if (locks) void locks.request(timesKey(level), save).catch(save);
  else save();
}
