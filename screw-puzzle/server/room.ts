import "../src/game/allLevels.ts";
import { randomBytes, randomInt } from "node:crypto";
import { LIFELINE_COUNT } from "../src/animation/run.ts";
import { FALL_DURATION_MS } from "../src/game/fallTiming.ts";
import { generateSoloPuzzle } from "../src/game/soloLevels.ts";
import { isLevelId } from "../src/game/types.ts";
import { BONUS_SLOT, isScrewAccessible, planBonusBox, planScrewRemoval } from "../src/game/rules.ts";
import type { CollectionState, GameState, LevelId, MatchBox, MoveEvent, PartId } from "../src/game/types.ts";
import type { CollectionMove, RoomCommand, RoomGame, RoomNotice, RoomSnapshot } from "../src/multiplayer/protocol.ts";
import { PING_COOLDOWN_MS, ROOM_LEVEL_VERSION, ROOM_PHYSICS_DELAY_MS, ROOM_VERSION_MESSAGE } from "../src/multiplayer/protocol.ts";
import { findLooseBlocker, LOOSE_LIFETIME_MS, SMOKE_DURATION_MS } from "../src/scene/loosePhysics.ts";
import { hasNoSafeMove } from "../src/game/deadEnd.ts";
import { createPartPhysics } from "../src/scene/partPhysics.ts";
import type { PartPhysics } from "../src/scene/partPhysics.ts";
import { SCREW_SCALE } from "../src/game/screwScale.ts";
import { canFindMatch, FIND_COOLDOWN_MS, freshAbilities, matchCandidates, settleAbilities } from "../src/game/abilities.ts";
import type { AbilityState } from "../src/game/abilities.ts";
import { reservedFor } from "../src/multiplayer/boxOwnership.ts";
import type { NextRound, PastPlayer, RoomIdentity, TeamStats } from "../src/multiplayer/protocol.ts";
import { isAvatar } from "../src/game/playerIdentity.ts";
import { normalizeNickname } from "../src/online/nickname.ts";
const freshStats = ():TeamStats => ({boxes:0,parts:0,assists:0,extraBoxes:0,hints:0});

export const RECONNECT_MS = 30_000;
const newSeed = () => randomInt(0, 2 ** 32);
const secret = () => randomBytes(18).toString("base64url");

type Peer = { send: (notice: RoomNotice) => void; close: () => void };
type Seat = {
  id: string; token: string; number: 1 | 2; collected: number;
  peer: Peer | null; ready: boolean; reconnectBy: number | null; lastPing: number;
  identity: RoomIdentity; stats: TeamStats;
};
type Room = {
  id: string; level: LevelId; seats: Seat[]; soloAllowed: boolean; round: number; seed: number; game: GameState;
  startedAt: number | null; lifelines: number; fallStarts: Map<PartId, number>;
  elapsedMs: number; clockSince: number | null; physics?: PartPhysics; physicsRevision: number;
  abilities: AbilityState;
  checkDeadEndAfter?: number;
  nextRound: NextRound | null; proposalRevision: number;
  pastPlayers: PastPlayer[];
  pings: Map<string,{player:string;at:number}>;
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
  return room.seats.some((seat) => !seat.peer || (room.startedAt !== null && !seat.ready));
}
function stopClock(room: Room, now: number) {
  if (room.clockSince === null) return;
  room.elapsedMs += now - room.clockSince;
  room.clockSince = null;
}
function snapshot(room: Room, now: number): RoomSnapshot {
  room.physics?.advance(now);
  return {
    levelVersion: ROOM_LEVEL_VERSION,
    level: room.level,
    id: room.id, leader: room.seats[0].id, round: room.round, seed: room.seed,
    players: room.seats.map((seat) => ({
      id: seat.id, number: seat.number, collected: seat.collected, ready: seat.ready, connected: Boolean(seat.peer), identity: seat.identity, stats: {...seat.stats},
    })),
    started: room.startedAt !== null, canStart: canStart(room), paused: paused(room), lifelines: room.lifelines,
    game: wireGame(room.game),
    abilities: room.abilities,
    nextRound: room.nextRound ? {...room.nextRound,ready:[...room.nextRound.ready]} : null,
    pastPlayers: room.pastPlayers.map(member=>({...member,stats:{...member.stats}})),
    fallStarts: Object.fromEntries([...room.fallStarts].filter(([, at]) => now - ROOM_PHYSICS_DELAY_MS < at + FALL_DURATION_MS)),
    looseParts: room.physics?.packet() ?? {},
    elapsedMs: room.elapsedMs + (room.clockSince === null ? 0 : now - room.clockSince),
    clockRunning: room.clockSince !== null, serverTime: now,
  };
}

export function createRoomServer(now = Date.now, nextSeed = newSeed) {
  const rooms = new Map<string, Room>();
  const memberships = new Map<Peer, { room: Room; seat: Seat }>();
  function publish(room: Room, moves?: CollectionMove[], matched = false, completedLifeline?: MatchBox) {
    const state = snapshot(room, now());
    room.physicsRevision = room.physics?.revision() ?? 0;
    for (const seat of room.seats) seat.peer?.send({ type: "state", snapshot: state, moves, matched, completedLifeline });
  }
  function tickPhysics() {
    const time = now();
    for (const room of rooms.values()) {
      if (room.checkDeadEndAfter !== undefined && time >= room.checkDeadEndAfter && !paused(room)) {
        room.checkDeadEndAfter = undefined;
        if (room.startedAt !== null && hasNoSafeMove(room.game, room.lifelines)) {
          room.game = { ...room.game, status: "lost", lossReason: "no-moves" };
          stopClock(room, time);
          publish(room);
        }
      }
      const physics = room.physics;
      if (!physics) continue;
      physics.advance(time);
      const revision = physics.revision();
      if (revision === room.physicsRevision) continue;
      room.physicsRevision = revision;
      const notice: RoomNotice = { type: "physics", round: room.round, looseParts: physics.packet() };
      for (const seat of room.seats) seat.peer?.send(notice);
    }
  }
  function reject(peer: Peer, reason: string, screw?: string) {
    peer.send({ type: "rejected", reason, screw });
  }
  function addSeat(room: Room) {
    const number = room.seats.some((member) => member.number === 1) ? 2 : 1;
    const seat: Seat = { id: secret(), token: secret(), number, collected: 0, peer: null, ready: false, reconnectBy: null, lastPing: -Infinity,
      identity:{name:`Player ${number}`,avatar:number===1?"fox":"panda"},stats:freshStats() };
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
    if (paused(room)) stopClock(room, now());
    else resumeClock(room);
    peer.send({ type: "joined", player: seat.id, token: seat.token, snapshot: snapshot(room, now()) });
    publish(room);
  }
  function removeSeat(room: Room, seat: Seat) {
    if (seat.peer) memberships.delete(seat.peer);
    if(seat.collected||Object.values(seat.stats).some(value=>value>0))room.pastPlayers.push({id:seat.id,number:seat.number,collected:seat.collected,identity:seat.identity,stats:{...seat.stats}});
    room.seats = room.seats.filter((entry) => entry !== seat);
    if(room.nextRound)room.nextRound.ready=[];
    room.soloAllowed = true;
    if (!room.seats.length) {
      room.physics?.free();
      rooms.delete(room.id);
    }
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
    if(room.nextRound)room.nextRound.ready=room.nextRound.ready.filter(id=>id!==seat.id);
    stopClock(room, now());
    publish(room);
  }
  function expireSeats() {
    const time = now();
    for (const room of rooms.values()) {
      for (const seat of room.seats) if (seat.reconnectBy !== null && seat.reconnectBy <= time) removeSeat(room, seat);
    }
  }
  function resetRound(room: Room, level = room.level, restart = false) {
    const puzzle = generateSoloPuzzle(level, nextSeed());
    room.physics?.free();
    room.level = level;
    room.seed = puzzle.seed;
    room.game = puzzle.state;
    room.round += 1;
    room.startedAt = restart ? now() : null;
    room.lifelines = LIFELINE_COUNT;
    room.abilities = freshAbilities();
    room.fallStarts.clear();
    room.checkDeadEndAfter = undefined;
    room.physics = undefined;
    room.physicsRevision = 0;
    room.elapsedMs = 0;
    room.clockSince = null;
    room.nextRound = null; room.pings.clear();room.pastPlayers=[];
    for (const member of room.seats) {
      member.ready = false;
      member.collected = 0;
      member.stats = freshStats();
    }
    publish(room);
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
        const level = command.level ?? "cottage";
        if (!isLevelId(level)) return reject(peer, "Choose an available level.");
        const puzzle = generateSoloPuzzle(level, nextSeed());
        const room: Room = { id: secret(), level, seats: [], soloAllowed: false, round: 0, seed: puzzle.seed,
          game: puzzle.state, startedAt: null, lifelines: LIFELINE_COUNT, abilities: freshAbilities(), fallStarts: new Map(),
          elapsedMs: 0, clockSince: null, physicsRevision: 0, nextRound:null, proposalRevision:0, pastPlayers:[], pings:new Map() };
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
    if (command.type === "identity") {
      // Cosmetic room labels never grant leadership, ownership or score rights.
      try {
        const name=normalizeNickname(command.identity.name);
        if (!isAvatar(command.identity.avatar)) return;
        if (seat.identity.name===name && seat.identity.avatar===command.identity.avatar) return;
        seat.identity={name,avatar:command.identity.avatar}; publish(room);
      } catch { reject(peer,"Choose a player name with 3–20 letters or numbers."); }
      return;
    }
    if (command.round !== room.round) return;
    if (command.type === "propose" || command.type === "approve" || command.type === "next-ready") {
      if (room.startedAt === null || room.game.status === "playing") return reject(peer,"Choose the next round after this one ends.");
      if (command.type === "propose") {
        if (!isLevelId(command.level)) return reject(peer,"Choose an available level.");
        room.nextRound={revision:++room.proposalRevision,level:command.level,proposedBy:seat.id,approved:seat===room.seats[0],ready:[]};
      } else {
        const next=room.nextRound;
        if (!next || next.revision!==command.proposal) return;
        if (command.type === "approve") {
          if (seat!==room.seats[0]) return reject(peer,"Only the room leader can confirm the next level.");
          next.approved=true;
        } else {
          if (!next.approved) return reject(peer,"Wait for the leader to confirm the level.");
          next.ready=next.ready.filter(id=>id!==seat.id);
          if(command.ready) next.ready.push(seat.id);
          if(room.seats.every(member=>member.peer && next.ready.includes(member.id))) { resetRound(room,next.level,true); return; }
        }
      }
      publish(room); return;
    }
    if (command.type === "ready") {
      if (!seat.ready) {
        seat.ready = true;
        resumeClock(room);
        publish(room);
      }
      return;
    }
    if (command.type === "start" || command.type === "reset" || command.type === "boost" || command.type === "level" || command.type === "find") {
      if (seat !== room.seats[0]) return reject(peer, "Only the room leader can do that.");
    }
    if (command.type === "level") {
      if (!isLevelId(command.level)) return reject(peer, "Choose an available level.");
      if (room.startedAt !== null) return reject(peer, "Choose a level between rounds.");
      if (room.level !== command.level) resetRound(room, command.level);
      return;
    }
    if (command.type === "reset") {
      if (room.startedAt === null) return;
      resetRound(room, room.level, !command.lobby);
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
    if (command.type === "find") {
      if (!canFindMatch(room.abilities, time)) return;
      // The leader's scene proposes a head with a verified viewing angle; the
      // server independently reserves the shared charge and checks live clearance.
      const screw = matchCandidates(room.game).find((screw) => screw.id === command.screw);
      room.physics?.advance(time);
      if (!screw || findLooseBlocker(room.physics?.read() ?? {}, screw, SCREW_SCALE, time - ROOM_PHYSICS_DELAY_MS)) {
        return reject(peer, "That match changed. No hint use was spent; try again.");
      }
      room.abilities = { ...room.abilities, findUses: room.abilities.findUses + 1, findReadyAt: time + FIND_COOLDOWN_MS, hint: screw.id };
      seat.stats.hints++;
      publish(room);
      return;
    }
    if (command.type === "dismiss") {
      const startedAt = room.fallStarts.get(command.part);
      if (startedAt !== undefined && time - ROOM_PHYSICS_DELAY_MS < startedAt) return;
      if (room.physics?.dismiss(command.part, time)) publish(room);
      return;
    }
    if (command.type === "ping") {
      if (time - seat.lastPing < PING_COOLDOWN_MS ||
          !room.game.screws.some((screw) => screw.id === command.screw && !screw.removed)) return;
      seat.lastPing = time;
      room.pings.set(command.screw,{player:seat.id,at:time});
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
      seat.stats.extraBoxes++;
      seat.stats.boxes += events.filter(event=>event.kind==="complete").length;
      const completed = events.find((event) => event.kind === "complete" && event.slot === BONUS_SLOT);
      commit(room, finalState, events, completed?.before.boxes[BONUS_SLOT] ?? undefined);
      return;
    }
    if (command.type !== "select") return;

    const screw = room.game.screws.find((entry) => entry.id === command.screw);
    if (!screw || screw.removed) return;
    const owner = reservedFor(room.game, room.seats, seat.id, screw.color);
    if (owner) return reject(peer, `That colour belongs to Player ${owner.number}. Ping it for your partner!`, screw.id);
    room.physics?.advance(time);
    if (!isScrewAccessible(room.game, screw) ||
        findLooseBlocker(room.physics?.read() ?? {}, screw, SCREW_SCALE, time - ROOM_PHYSICS_DELAY_MS)) {
      return reject(peer, "That screw is blocked.", screw.id);
    }
    const { finalState, events } = planScrewRemoval(room.game, screw.id);
    if (finalState === room.game) return;
    seat.collected += 1;
    seat.stats.boxes += events.filter(event=>event.kind==="complete").length;
    seat.stats.parts += events.filter(event=>event.kind==="detach").length;
    const ping=room.pings.get(screw.id); room.pings.delete(screw.id);
    if(ping && ping.player!==seat.id && time-ping.at<=15000) { const helper=room.seats.find(member=>member.id===ping.player); if(helper) helper.stats.assists++; }
    room.clockSince ??= time;
    for (const event of events) {
      if (event.kind === "detach") {
        room.physics ??= createPartPhysics(room.game.removedParts, room.level);
        room.fallStarts.set(event.part, time);
        room.physics.release(event.part, time);
      }
    }
    commit(room, finalState, events);
  }
  function commit(room: Room, game: GameState, events: MoveEvent[], completedLifeline?: MatchBox) {
    const matched = game.clearedCount > room.game.clearedCount;
    const moves = events.flatMap((event) => event.kind === "detach" ? [] :
      [{ ...event, before: collection(event.before), after: collection(event.after) }]);
    room.game = game;
    // A round-tagged Room owns this deadline; resetting must clear it. Wait
    // through the newest fall/smoke and collection animation before declaring
    // a dead end. Evaluation runs once per mutation, never on every tick.
    room.checkDeadEndAfter = Math.max(now() + 700, ...[...room.fallStarts.values()].map(at => at + LOOSE_LIFETIME_MS + SMOKE_DURATION_MS + ROOM_PHYSICS_DELAY_MS));
    room.abilities = settleAbilities(room.abilities, game);
    if (game.status !== "playing") stopClock(room, now());
    publish(room, moves, matched, completedLifeline);
  }
  return { receive, disconnect, expireSeats, tickPhysics,
    close: () => {
      for (const room of rooms.values()) room.physics?.free();
      rooms.clear();
      memberships.clear();
    } };
}
