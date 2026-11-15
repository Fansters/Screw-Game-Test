import type { CollectionState, GameState, MatchBox, MoveEvent, PartId, ScrewColor } from "../game/types.ts";

// Both peers use the same ordered screw IDs and part geometry.
export const ROOM_LEVEL_VERSION = 2;
export const ROOM_VERSION_MESSAGE = "The room and game versions differ. Refresh the game, or wait for the server update to finish.";
export const COMPLETED_LIFELINE_MS = 640;
export const PING_COOLDOWN_MS = 600;

export type CollectionMove = Exclude<MoveEvent<CollectionState>, { kind: "detach" }>;
export type RoomGame = Pick<GameState, "boxes" | "boxQueue" | "tray" | "clearedCount" | "status" | "removedParts"> & {
  colors: ScrewColor[];
  removed: string[];
};
export type RoomSnapshot = {
  levelVersion: number;
  id: string;
  leader: string;
  players: { id: string; connected: boolean; ready: boolean }[];
  round: number;
  seed: number;
  started: boolean;
  canStart: boolean;
  paused: boolean;
  lifelines: number;
  game: RoomGame;
  fallStarts: Partial<Record<PartId, number>>;
  elapsedMs: number;
  clockRunning: boolean;
  serverTime: number;
};
export type RoomCommand =
  | { type: "create"; levelVersion?: number }
  | { type: "join"; room: string; token?: string; levelVersion?: number }
  | { type: "clock"; sentAt: number }
  | { type: "leave" }
  | { type: "ready" | "start" | "reset" | "boost"; round: number }
  | { type: "select" | "ping"; round: number; screw: string };
export type RoomNotice =
  | { type: "joined"; player: string; token: string; snapshot: RoomSnapshot }
  | { type: "state"; snapshot: RoomSnapshot; moves?: CollectionMove[]; matched?: boolean; completedLifeline?: MatchBox }
  | { type: "clock"; sentAt: number; serverTime: number }
  | { type: "ping"; round: number; screw: string; player: string }
  | { type: "rejected"; reason: string; screw?: string };
