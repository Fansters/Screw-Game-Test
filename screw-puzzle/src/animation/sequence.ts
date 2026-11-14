import type { CollectedScrew, GameState, MoveEvent, Socket } from "../game/types.ts";

export type PlaybackFrame = {
  kind: "unscrew" | "fly" | "land" | "complete" | "replace" | "pause" | "bonus-open";
  game: GameState;
  duration: number;
  message: string;
  screw?: CollectedScrew;
  from?: { kind: "scene" } | { kind: "tray"; index: number };
  to?: Socket;
  slot?: number;
};

export function buildSequence(events: MoveEvent[]): PlaybackFrame[] {
  const frames: PlaybackFrame[] = [];
  for (const event of events) {
    if (event.kind === "collect" || event.kind === "transfer") {
      const label = `${event.screw.color[0].toUpperCase()}${event.screw.color.slice(1)}`;
      const message = `${label} screw → ${event.to.kind === "box" ? `${label.toLowerCase()} box` : "free slot"}`;
      if (event.kind === "collect") frames.push({ kind: "unscrew", game: event.before, duration: 700,
        message: `Unscrewing ${label.toLowerCase()}…`, screw: event.screw });
      frames.push({ kind: "fly", game: event.before, duration: 320, message, screw: event.screw,
        from: event.kind === "collect" ? { kind: "scene" } : { kind: "tray", index: event.from }, to: event.to });
      frames.push({ kind: "land", game: event.after, duration: 150, message, screw: event.screw, to: event.to });
    } else if (event.kind === "complete") {
      frames.push({ kind: "complete", game: event.before, duration: 400, slot: event.slot,
        message: `${event.color.toUpperCase()} triple complete!` });
      frames.push({ kind: "pause", game: event.after, duration: 70, message: "Making room for the next box…" });
    } else if (event.kind === "replace") {
      frames.push({ kind: "replace", game: event.after, duration: 240, slot: event.slot,
        message: `New ${event.color} box!` });
    } else if (event.kind === "bonus-open") {
      frames.push({ kind: "bonus-open", game: event.after, duration: 240, slot: event.slot,
        message: "Lifeline box opened" });
    }
  }
  return frames;
}
