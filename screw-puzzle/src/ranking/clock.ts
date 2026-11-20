import { RANKED_RULES } from "./rules.ts";

export type RankedClock = {
  status: "waiting" | "running" | "won" | "lost" | "ineligible";
  startedAt: number | null;
  stoppedAt: number | null;
  disconnectedAt: number | null;
  lastAt: number;
  reason: "left" | "refreshed" | "reset" | "reconnect-expired" | null;
};
export type RankedClockEvent = { now: number } & (
  { type: "accepted-screw"; won?: boolean } |
  { type: "tick" | "disconnect" | "reconnect" | "leave" | "refresh" | "reset" | "lost" }
);

function checkedTime(now: number, previous = 0) {
  if (!Number.isFinite(now) || now < previous) throw new Error("Ranked clocks require monotonic server time");
  return now;
}

export function createRankedClock(now: number): RankedClock {
  return { status: "waiting", startedAt: null, stoppedAt: null, disconnectedAt: null,
    lastAt: checkedTime(now), reason: null };
}

// Call only after the server validates a move. Client-reported times, wins and
// reconnect claims are not inputs to the authoritative clock.
export function advanceRankedClock(clock: RankedClock, event: RankedClockEvent): RankedClock {
  if (["won", "lost", "ineligible"].includes(clock.status)) return clock;
  const now = checkedTime(event.now, clock.lastAt);
  const next = { ...clock, lastAt: now };
  if (clock.disconnectedAt !== null && now - clock.disconnectedAt > RANKED_RULES.reconnectGraceMs) {
    return { ...next, status: "ineligible", stoppedAt: now, reason: "reconnect-expired" };
  }
  switch (event.type) {
    case "leave": return { ...next, status: "ineligible", stoppedAt: now, reason: "left" };
    case "refresh": return { ...next, status: "ineligible", stoppedAt: now, reason: "refreshed" };
    case "reset": return { ...next, status: "ineligible", stoppedAt: now, reason: "reset" };
    case "lost": return { ...next, status: "lost", stoppedAt: now };
    case "disconnect": return { ...next, disconnectedAt: clock.disconnectedAt ?? now };
    case "reconnect": return { ...next, disconnectedAt: null };
    case "accepted-screw":
      if (clock.disconnectedAt !== null) return next; // No offline move queue.
      return { ...next, startedAt: clock.startedAt ?? now,
        status: event.won ? "won" : "running", stoppedAt: event.won ? now : null };
    case "tick": return next;
  }
}

export function rankedElapsedMs(clock: RankedClock, now: number): number {
  if (clock.startedAt === null) return 0;
  return Math.floor(checkedTime(clock.stoppedAt ?? now, clock.startedAt) - clock.startedAt);
}
