import { randomBytes, randomInt } from "node:crypto";
import { LIFELINE_COUNT } from "../src/animation/run.ts";
import { FALL_DURATION_MS } from "../src/game/fallTiming.ts";
import { generatePuzzle } from "../src/game/randomize.ts";
import { BONUS_SLOT, isScrewAccessible, planBonusBox, planScrewRemoval } from "../src/game/rules.ts";
import type { CollectionState, GameState, MatchBox, MoveEvent, PartId } from "../src/game/types.ts";
import type { CollectionMove, RoomCommand, RoomGame, RoomNotice, RoomSnapshot } from "../src/multiplayer/protocol.ts";
import { PING_COOLDOWN_MS, ROOM_LEVEL_VERSION, ROOM_VERSION_MESSAGE } from "../src/multiplayer/protocol.ts";
import { detachLooseParts, dismissLoosePart, findLooseBlocker } from "../src/scene/loosePhysics.ts";
import type { LooseParts } from "../src/scene/loosePhysics.ts";
import { SCREW_SCALE } from "../src/game/levels.ts";

export const RECONNECT_MS = 30_000;
export const FALL_LEAD_MS = 62.5;
const newSeed = () => randomInt(0, 2 ** 32);
const secret = () => randomBytes(18).toString("base64url");

type Peer = { send: (notice: RoomNotice) => void; close: () => void };
type Seat = {
  id: string; token: string; number: 1 | 2; collected: number;
  peer: Peer | null; ready: boolean; reconnectBy: number | null; lastPing: number;
};
type Room = {
  id: string; seats: Seat[]; soloAllowed: boolean; round: number; seed: number; game: GameState;
  startedAt: number | null; lifelines: number; fallStarts: Map<PartId, number>;
  elapsedMs: number; clockSince: number | null; looseParts: LooseParts;
};

function wireGame({ screws, ...game }: GameState): RoomGame {
  return { ...game, colors: screws.map((screw) => screw.color),
    removed: screws.filter((screw) => screw.removed).map((screw) => screw.id) };
}
function collection({ boxes, tray }: GameState): CollectionState {
  return { boxes, tray };
}
function canStart(room: Room) {
  return room.startedAt === null && (room.soloAllowed || room.seats.length === 2) &&
    room.seats.every((seat) => seat.peer && seat.ready);
}
function paused(room: Room) {
  return room.seats.some((seat) => !seat.peer);
}
function stopClock(room: Room, now: number) {
  if (room.clockSince === null) return;
  room.elapsedMs += now - room.clockSince;
  room.clockSince = null;
}
function snapshot(room: Room, now: number): RoomSnapshot {
  return {
    levelVersion: ROOM_LEVEL_VERSION,
    id: room.id, leader: room.seats[0].id, round: room.round, seed: room.seed,
    players: room.seats.map((seat) => ({
      id: seat.id, number: seat.number, collected: seat.collected, ready: seat.ready, connected: Boolean(seat.peer),
    })),
    started: room.startedAt !== null, canStart: canStart(room), paused: paused(room), lifelines: room.lifelines,
    game: wireGame(room.game),
    fallStarts: Object.fromEntries([...room.fallStarts].filter(([, at]) => now < at + FALL_DURATION_MS)),
    looseParts: room.looseParts,
    elapsedMs: room.elapsedMs + (room.clockSince === null ? 0 : now - room.clockSince),
    clockRunning: room.clockSince !== null, serverTime: now,
  };
}

export function createRoomServer(now = Date.now, nextSeed = newSeed) {
  const rooms = new Map<string, Room>();
  const memberships = new Map<Peer, { room: Room; seat: Seat }>();
  function publish(room: Room, moves?: CollectionMove[], matched = false, completedLifeline?: MatchBox) {
    const state = snapshot(room, now());
    for (const seat of room.seats) seat.peer?.send({ type: "state", snapshot: state, moves, matched, completedLifeline });
  }
  function reject(peer: Peer, reason: string, screw?: string) {
    peer.send({ type: "rejected", reason, screw });
  }
  function addSeat(room: Room) {
    const number = room.seats.some((member) => member.number === 1) ? 2 : 1;
    const seat: Seat = { id: secret(), token: secret(), number, collected: 0, peer: null, ready: false, reconnectBy: null, lastPing: -Infinity };
    room.seats.push(seat);
    return seat;
  }
  function resumeClock(room: Room) {
    if (!paused(room) && room.game.status === "playing" && room.clockSince === null && room.game.screws.some((screw) => screw.removed)) {
      room.clockSince = now();
    }
  }
  function attach(peer: Peer, room: Room, seat: Seat) {
    const previous = seat.peer;
    if (previous) memberships.delete(previous);
    seat.peer = peer;
    seat.reconnectBy = null;
    memberships.set(peer, { room, seat });
    previous?.close();
    resumeClock(room);
    peer.send({ type: "joined", player: seat.id, token: seat.token, snapshot: snapshot(room, now()) });
    publish(room);
  }
  function removeSeat(room: Room, seat: Seat) {
    if (seat.peer) memberships.delete(seat.peer);
    room.seats = room.seats.filter((entry) => entry !== seat);
    room.soloAllowed = true;
    if (!room.seats.length) rooms.delete(room.id);
    else {
      resumeClock(room);
      publish(room);
    }
  }
  function disconnect(peer: Peer) {
    const membership = memberships.get(peer);
    if (!membership) return;
    const { room, seat } = membership;
    memberships.delete(peer);
    seat.peer = null;
    seat.reconnectBy = now() + RECONNECT_MS;
    stopClock(room, now());
    publish(room);
  }
  function expireSeats() {
    const time = now();
    for (const room of rooms.values()) {
      for (const seat of room.seats) if (seat.reconnectBy !== null && seat.reconnectBy <= time) removeSeat(room, seat);
    }
  }
  function receive(peer: Peer, command: RoomCommand) {
    const time = now();
    if (command.type === "clock") {
      peer.send({ type: "clock", sentAt: command.sentAt, serverTime: time });
      return;
    }
    const membership = memberships.get(peer);
    if (command.type === "create" || command.type === "join") {
      if (membership) return;
      if (command.levelVersion !== ROOM_LEVEL_VERSION) return reject(peer, ROOM_VERSION_MESSAGE);
      expireSeats();
      if (command.type === "create") {
        const seed = nextSeed();
        const room: Room = { id: secret(), seats: [], soloAllowed: false, round: 0, seed,
          game: generatePuzzle(seed).state, startedAt: null, lifelines: LIFELINE_COUNT, fallStarts: new Map(),
          elapsedMs: 0, clockSince: null, looseParts: {} };
        rooms.set(room.id, room);
        attach(peer, room, addSeat(room));
        return;
      }
      const room = rooms.get(command.room);
      if (!room) return reject(peer, "This room has closed.");
      const seat = room.seats.find((entry) => entry.token === command.token);
      if (command.token && !seat) return reject(peer, "Your seat expired. Open the invitation again to join as a guest.");
      if (!seat && room.seats.length === 2) return reject(peer, "This room already has two players.");
      attach(peer, room, seat ?? addSeat(room));
      return;
    }
    if (!membership) return reject(peer, "Join a room first.");
    const { room, seat } = membership;
    if (command.type === "leave") {
      removeSeat(room, seat);
      return;
    }
    if (command.round !== room.round) return;
    if (command.type === "ready") {
      if (!seat.ready) {
        seat.ready = true;
        publish(room);
      }
      return;
    }
    if (command.type === "start" || command.type === "reset" || command.type === "boost") {
      if (seat !== room.seats[0]) return reject(peer, "Only the room leader can do that.");
    }
    if (command.type === "reset") {
      if (room.startedAt === null) return;
      room.seed = nextSeed();
      room.game = generatePuzzle(room.seed).state;
      room.round += 1;
      room.startedAt = null;
      room.lifelines = LIFELINE_COUNT;
      room.fallStarts.clear();
      room.looseParts = {};
      room.elapsedMs = 0;
      room.clockSince = null;
      for (const member of room.seats) {
        member.ready = false;
        member.collected = 0;
      }
      publish(room);
      return;
    }
    if (command.type === "start") {
      if (!canStart(room)) return reject(peer, "Wait for both players to be ready.");
      room.startedAt = time;
      publish(room);
      return;
    }
    if (room.startedAt === null || !seat.ready ||
        paused(room) || room.game.status !== "playing") return;
    if (command.type === "dismiss") {
      const looseParts = dismissLoosePart(room.looseParts, command.part, room.game.removedParts, time);
      if (looseParts !== room.looseParts) {
        room.looseParts = looseParts;
        room.fallStarts.delete(command.part);
        publish(room);
      }
      return;
    }
    if (command.type === "ping") {
      if (time - seat.lastPing < PING_COOLDOWN_MS ||
          !room.game.screws.some((screw) => screw.id === command.screw && !screw.removed)) return;
      seat.lastPing = time;
      for (const member of room.seats) {
        if (member !== seat) member.peer?.send({ type: "ping", round: room.round, screw: command.screw, player: seat.id });
      }
      return;
    }
    if (command.type === "boost") {
      if (room.lifelines === 0) return;
      const { finalState, events } = planBonusBox(room.game);
      if (!events.length) return;
      room.lifelines -= 1;
      const completed = events.find((event) => event.kind === "complete" && event.slot === BONUS_SLOT);
      commit(room, finalState, events, completed?.before.boxes[BONUS_SLOT] ?? undefined);
      return;
    }
    if (command.type !== "select") return;

    const screw = room.game.screws.find((entry) => entry.id === command.screw);
    if (!screw || screw.removed) return;
    const removedParts = room.game.removedParts.filter((part) => time >= (room.fallStarts.get(part) ?? -Infinity) + FALL_DURATION_MS);
    if (!isScrewAccessible({ ...room.game, removedParts }, screw) ||
        findLooseBlocker(room.looseParts, screw, SCREW_SCALE, time)) return reject(peer, "That screw is blocked.", screw.id);
    const { finalState, events } = planScrewRemoval(room.game, screw.id);
    if (finalState === room.game) return;
    seat.collected += 1;
    room.clockSince ??= time;
    for (const event of events) {
      if (event.kind === "detach") {
        const startAt = time + FALL_LEAD_MS;
        room.fallStarts.set(event.part, startAt);
        room.looseParts = detachLooseParts(room.looseParts, event.part, finalState.removedParts, startAt);
      }
    }
    commit(room, finalState, events);
  }
  function commit(room: Room, game: GameState, events: MoveEvent[], completedLifeline?: MatchBox) {
    const matched = game.clearedCount > room.game.clearedCount;
    const moves = events.flatMap((event) => event.kind === "detach" ? [] :
      [{ ...event, before: collection(event.before), after: collection(event.after) }]);
    room.game = game;
    if (game.status !== "playing") stopClock(room, now());
    publish(room, moves, matched, completedLifeline);
  }
  return { receive, disconnect, expireSeats };
}
