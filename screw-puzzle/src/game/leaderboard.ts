export const SOLO_TIMES_KEY = "screw-it:solo-times:cottage:v1";
export const SOLO_TIMES_LIMIT = 10;

export type SoloTime = { elapsedMs: number; completedAt: number };

let recent: SoloTime[] = [];
let unsaved: SoloTime[] = [];

function isSoloTime(value: unknown): value is SoloTime {
  if (!value || typeof value !== "object" || !("elapsedMs" in value) || !("completedAt" in value)) return false;
  const { elapsedMs, completedAt } = value;
  return typeof elapsedMs === "number" && Number.isSafeInteger(elapsedMs) && elapsedMs > 0 &&
    typeof completedAt === "number" && Number.isSafeInteger(completedAt) && completedAt > 0 && completedAt <= 8.64e15;
}

function fastest(times: SoloTime[]) {
  return times.sort((a, b) => a.elapsedMs - b.elapsedMs || a.completedAt - b.completedAt).slice(0, SOLO_TIMES_LIMIT);
}

export function readSoloTimes(): SoloTime[] {
  try {
    const saved: unknown = JSON.parse(window.localStorage.getItem(SOLO_TIMES_KEY) ?? "[]");
    recent = fastest([...(Array.isArray(saved) ? saved.filter(isSoloTime) : []), ...unsaved]);
  } catch {
    // Keep the current visit usable when browser storage is unavailable.
  }
  return recent;
}

export function recordSoloTime(elapsedMs: number) {
  const time = { elapsedMs: Math.round(elapsedMs), completedAt: Date.now() };
  if (!isSoloTime(time)) return;
  function save() {
    recent = fastest([...readSoloTimes(), time]);
    try {
      window.localStorage.setItem(SOLO_TIMES_KEY, JSON.stringify(recent));
      unsaved = [];
    } catch {
      unsaved = fastest([...unsaved, time]);
    }
  }
  // Serialize read/modify/write across tabs when the browser supports Web Locks.
  const locks = window.navigator?.locks;
  if (locks) void locks.request(SOLO_TIMES_KEY, save).catch(save);
  else save();
}
