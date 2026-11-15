import { buildSequence } from "../animation/sequence.ts";
import type { PlaybackFrame } from "../animation/sequence.ts";
import type { CollectionState } from "../game/types.ts";
import type { CollectionMove } from "./protocol.ts";

type QueuedFrame = { frame: PlaybackFrame<CollectionState>; receivedAt: number };
type Playback = { scene: string; queue: QueuedFrame[] };
type PlaybackAction =
  | { type: "reset"; scene: string }
  | { type: "receive"; scene: string; moves?: CollectionMove[]; receivedAt: number }
  | { type: "advance"; entry: QueuedFrame };

export const emptyPlayback: Playback = { scene: "", queue: [] };

export function collectionPlayback(state: Playback, action: PlaybackAction): Playback {
  if (action.type === "reset") return { scene: action.scene, queue: [] };
  if (action.type === "advance") {
    return state.queue[0] === action.entry ? { ...state, queue: state.queue.slice(1) } : state;
  }
  const queue = state.scene === action.scene ? state.queue : [];
  if (!action.moves?.length) return queue === state.queue ? state : { scene: action.scene, queue };
  const frames = buildSequence(action.moves).map((frame) => ({ frame, receivedAt: action.receivedAt }));
  return { scene: action.scene, queue: [...queue, ...frames] };
}

export function frameDelay({ frame, receivedAt }: QueuedFrame, now: number) {
  // Scene spins start on receipt, even while an earlier collection is still playing.
  return frame.kind === "unscrew" ? Math.max(0, receivedAt + frame.duration - now) : frame.duration;
}
