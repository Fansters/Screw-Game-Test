import type { CollectionState, GameState, LevelId, MatchBox, MoveEvent, PartId, ScrewColor } from "../game/types.ts";
import type { LooseParts } from "../scene/loosePhysics.ts";
import type { AbilityState } from "../game/abilities.ts";
import type { AvatarId } from "../game/playerIdentity.ts";
export type RoomIdentity = { name: string; avatar: AvatarId };
export type TeamStats = { boxes: number; parts: number; assists: number; extraBoxes: number; hints: number };
export type PastPlayer = { id: string; number: 1 | 2; collected: number; identity: RoomIdentity; stats: TeamStats };
export type NextRound = { revision: number; level: LevelId; proposedBy: string; approved: boolean; ready: string[] };

// Both peers use the same ordered screw IDs and part geometry.
export const ROOM_LEVEL_VERSION = 37;
export const ROOM_PHYSICS_DELAY_MS = 62.5;
export const ROOM_VERSION_MESSAGE = "The room and game versions differ. Refresh the game, or wait for the server update to finish.";
export const COMPLETED_LIFELINE_MS = 320;
export const PING_COOLDOWN_MS = 600;

export type CollectionMove = Exclude<MoveEvent<CollectionState>, { kind: "detach" }>;
export type RoomGame = Pick<GameState, "boxes" | "boxQueue" | "tray" | "clearedCount" | "status" | "lossReason" | "removedParts"> & {
  colors: ScrewColor[];
  removed: string[];
};
export type RoomSnapshot = {
  levelVersion: number;
  level: LevelId;
  id: string;
  leader: string;
  players: { id: string; number: 1 | 2; collected: number; connected: boolean; ready: boolean; identity?: RoomIdentity; stats?: TeamStats }[];
  nextRound?: NextRound | null;
  pastPlayers?: PastPlayer[];
  round: number;
  seed: number;
  started: boolean;
  canStart: boolean;
  paused: boolean;
  lifelines: number;
  abilities: AbilityState;
  game: RoomGame;
  fallStarts: Partial<Record<PartId, number>>;
  looseParts: LooseParts;
  elapsedMs: number;
  clockRunning: boolean;
  serverTime: number;
};
export type RoomCommand =
  | { type: "create"; levelVersion?: number; level?: LevelId }
  | { type: "join"; room: string; token?: string; levelVersion?: number }
  | { type: "clock"; sentAt: number }
  | { type: "leave" }
  | { type: "identity"; identity: RoomIdentity }
  | { type: "propose"; round: number; level: LevelId }
  | { type: "approve"; round: number; proposal: number }
  | { type: "next-ready"; round: number; proposal: number; ready: boolean }
  | { type: "ready" | "start" | "boost"; round: number }
  | { type: "find"; round: number; screw: string }
  | { type: "reset"; round: number; lobby?: boolean }
  | { type: "level"; round: number; level: LevelId }
  | { type: "dismiss"; round: number; part: PartId }
  | { type: "select" | "ping"; round: number; screw: string };
export type RoomNotice =
  | { type: "joined"; player: string; token: string; snapshot: RoomSnapshot }
  | { type: "state"; snapshot: RoomSnapshot; moves?: CollectionMove[]; matched?: boolean; completedLifeline?: MatchBox }
  | { type: "physics"; round: number; looseParts: LooseParts }
  | { type: "clock"; sentAt: number; serverTime: number }
  | { type: "ping"; round: number; screw: string; player: string }
  | { type: "rejected"; reason: string; screw?: string };
