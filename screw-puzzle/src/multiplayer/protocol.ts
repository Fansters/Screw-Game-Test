import type { GameState, PartId, ScrewColor } from "../game/types.ts";

export type RoomGame = Pick<GameState, "boxes" | "boxQueue" | "tray" | "clearedCount" | "status" | "removedParts"> & {
  colors: ScrewColor[];
  removed: string[];
};
export type RoomSnapshot = {
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
  | { type: "create" }
  | { type: "join"; room: string; token?: string }
  | { type: "clock"; sentAt: number }
  | { type: "leave" }
  | { type: "ready" | "start" | "reset" | "boost"; round: number }
  | { type: "select" | "ping"; round: number; screw: string };
export type RoomNotice =
  | { type: "joined"; player: string; token: string; snapshot: RoomSnapshot }
  | { type: "state"; snapshot: RoomSnapshot; matched?: boolean }
  | { type: "clock"; sentAt: number; serverTime: number }
  | { type: "ping"; round: number; screw: string; player: string }
  | { type: "rejected"; reason: string; screw?: string };
