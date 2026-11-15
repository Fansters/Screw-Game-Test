import assert from "node:assert/strict";
import { test } from "node:test";
import { createRoomServer, FALL_LEAD_MS, RECONNECT_MS } from "../server/room.ts";
import { FALL_DURATION_MS } from "../src/game/fallTiming.ts";
import { DEMO_LEVEL } from "../src/game/levels.ts";
import { generatePuzzle } from "../src/game/randomize.ts";
import { collectionPlayback, emptyPlayback, frameDelay } from "../src/multiplayer/collectionPlayback.ts";
import type { RoomCommand, RoomNotice } from "../src/multiplayer/protocol.ts";
import { ROOM_LEVEL_VERSION, ROOM_VERSION_MESSAGE } from "../src/multiplayer/protocol.ts";

function fixture(seed?: number) {
  let time = 20_000;
  const server = createRoomServer(() => time, seed === undefined ? undefined : () => seed);
  function makePeer() {
    const notices: RoomNotice[] = [];
    const peer = { send: (notice: RoomNotice) => notices.push(notice), close: () => server.disconnect(peer) };
    return {
      send: (command: RoomCommand) => server.receive(peer, command),
      notices,
      state: () => notices.findLast((notice) => notice.type === "state")!.snapshot,
      seat: () => notices.findLast((notice) => notice.type === "joined")!,
      disconnect: () => server.disconnect(peer),
    };
  }
  const leader = makePeer();
  const guest = makePeer();
  leader.send({ type: "create", levelVersion: ROOM_LEVEL_VERSION });
  const room = leader.state().id;
  guest.send({ type: "join", room, levelVersion: ROOM_LEVEL_VERSION });
  leader.send({ type: "ready", round: 0 });
  leader.send({ type: "start", round: 0 });
  assert.equal(guest.state().started, false);
  guest.send({ type: "ready", round: 0 });
  leader.send({ type: "start", round: 0 });
  assert.equal(guest.state().started, true);
  return { leader, guest, room, makePeer, advance: (ms: number) => { time += ms; server.expireSeats(); } };
}

test("both players use one puzzle, while only its leader can spend a lifeline or reset", () => {
  const { leader, guest, room, makePeer } = fixture();
  const extra = makePeer();
  extra.send({ type: "join", room, levelVersion: ROOM_LEVEL_VERSION });
  assert.equal(extra.notices.at(-1)?.type, "rejected");
  const state = leader.state();
  const screws = DEMO_LEVEL.filter((screw) => !screw.obstructedBy?.length).slice(0, 2);
  leader.send({ type: "select", round: 0, screw: screws[0].id });
  guest.send({ type: "select", round: 0, screw: screws[0].id });
  guest.send({ type: "select", round: 0, screw: screws[1].id });
  assert.deepEqual(leader.state(), guest.state());
  assert.deepEqual(guest.state().game.removed, screws.map((screw) => screw.id));
  guest.send({ type: "boost", round: 0 });
  guest.send({ type: "reset", round: 0 });
  assert.equal(guest.notices.at(-1)?.type, "rejected");
  assert.equal(leader.state().lifelines, 3);
  assert.equal(leader.state().round, state.round);
  leader.send({ type: "boost", round: 0 });
  assert.equal(guest.state().lifelines, 2);
  assert.deepEqual(guest.state().game, leader.state().game);
  leader.send({ type: "reset", round: 0 });
  assert.equal(guest.state().round, 1);
  assert.equal(guest.state().game.removed.length, 0);
  leader.send({ type: "select", round: 0, screw: screws[0].id });
  assert.equal(leader.state().game.removed.length, 0);
});

test("a cover unlocks from a shared fall timestamp and pings go to the partner", () => {
  const { leader, guest, advance } = fixture();
  const snow = DEMO_LEVEL.find((screw) => screw.attachedTo === "chimney-snow")!;
  const chimney = DEMO_LEVEL.find((screw) => screw.attachedTo === "chimney" &&
    screw.obstructedBy?.length === 1 && screw.obstructedBy[0] === "chimney-snow")!;
  guest.send({ type: "ping", round: 0, screw: snow.id });
  assert.deepEqual(leader.notices.at(-1), { type: "ping", round: 0, screw: snow.id, player: guest.seat().player });
  guest.send({ type: "select", round: 0, screw: snow.id });
  const state = leader.state();
  assert.equal(guest.state().fallStarts["chimney-snow"], state.serverTime + FALL_LEAD_MS);
  assert.equal(guest.state().fallStarts["chimney-snow"], state.fallStarts["chimney-snow"]);
  advance(FALL_LEAD_MS + FALL_DURATION_MS - 1);
  leader.send({ type: "select", round: 0, screw: chimney.id });
  assert.equal(leader.notices.at(-1)?.type, "rejected");
  advance(1);
  leader.send({ type: "select", round: 0, screw: chimney.id });
  assert.ok(guest.state().game.removed.includes(chimney.id));
});

test("refresh restores the seat and puzzle, then an expired leader hands off the same round", () => {
  const { leader, guest, room, makePeer, advance } = fixture();
  const screws = DEMO_LEVEL.filter((screw) => !screw.obstructedBy?.length).slice(0, 2);
  leader.send({ type: "select", round: 0, screw: screws[0].id });
  advance(500);
  leader.disconnect();
  assert.equal(guest.state().paused, true);
  assert.equal(guest.state().clockRunning, false);
  guest.send({ type: "select", round: 0, screw: screws[1].id });
  assert.equal(guest.state().game.removed.length, 1);
  advance(2000);
  const refreshed = makePeer();
  refreshed.send({ type: "join", room, token: leader.seat().token, levelVersion: ROOM_LEVEL_VERSION });
  assert.equal(refreshed.seat().player, leader.seat().player);
  assert.equal(refreshed.state().paused, false);
  assert.equal(refreshed.state().elapsedMs, 500);
  assert.equal(refreshed.state().clockRunning, true);
  assert.equal(refreshed.state().game.removed[0], screws[0].id);
  refreshed.disconnect();
  advance(RECONNECT_MS);
  assert.equal(guest.state().leader, guest.seat().player);
  assert.equal(guest.state().paused, false);
  guest.send({ type: "select", round: 0, screw: screws[1].id });
  assert.equal(guest.state().game.removed.length, 2);
  guest.send({ type: "reset", round: 0 });
  assert.equal(guest.state().round, 1);
});

test("both seats can finish the same seeded cottage", () => {
  const { leader, guest, advance } = fixture();
  const { solution } = generatePuzzle(leader.state().seed);
  for (const [index, screw] of solution.entries()) {
    (index % 2 ? guest : leader).send({ type: "select", round: 0, screw });
    advance(FALL_LEAD_MS + FALL_DURATION_MS);
  }
  assert.equal(guest.state().game.status, "won");
  assert.equal(leader.state().game.removed.length, DEMO_LEVEL.length);
  assert.equal(guest.state().clockRunning, false);
  assert.deepEqual(guest.state(), leader.state());
});

test("rapid moves from both seats replay the third screw before completing and replacing its box", () => {
  const { leader, guest, advance } = fixture(1);
  const { solution } = generatePuzzle(1);
  const start = leader.notices.length;
  const scene = `${leader.state().id}:0`;
  let playback = collectionPlayback(emptyPlayback, { type: "reset", scene });
  let cleared = 0;
  for (const [index, screw] of solution.entries()) {
    (index % 2 ? guest : leader).send({ type: "select", round: 0, screw });
    advance(FALL_LEAD_MS + FALL_DURATION_MS);
    const notice = leader.notices.at(-1)!;
    assert.deepEqual(notice, guest.notices.at(-1));
    assert.equal(notice.type, "state");
    assert.ok(notice.moves?.length);
    const first = playback.queue[0];
    playback = collectionPlayback(playback, { type: "receive", scene, moves: notice.moves, receivedAt: 100 + index });
    if (first) assert.equal(playback.queue[0], first);
    cleared = notice.snapshot.game.clearedCount;
    if (cleared) break;
  }
  assert.ok(cleared > 0 && leader.notices.length > start + 1);
  const [first] = playback.queue;
  assert.equal(frameDelay(first, 100), 700);
  assert.equal(frameDelay(first, 850), 0);
  const frames = playback.queue.map(({ frame }) => frame);
  const complete = frames.findIndex((frame) => frame.kind === "complete");
  assert.equal(frames[complete - 1].kind, "land");
  assert.equal(frames[complete].game.boxes[frames[complete].slot!]?.screws.length, 3);
  assert.equal(frames[complete + 1].kind, "pause");
  assert.equal(frames[complete + 2].kind, "replace");
  const reconnect = collectionPlayback(playback, { type: "reset", scene });
  assert.equal(reconnect.queue.length, 0);
  assert.equal(collectionPlayback(reconnect, { type: "advance", entry: first }), reconnect);
  assert.equal(collectionPlayback(playback, { type: "receive", scene: "new-round", receivedAt: 900 }).queue.length, 0);
});

test("a browser with an older cottage layout receives a version error", () => {
  const { makePeer, room } = fixture();
  const stale = makePeer();
  stale.send({ type: "join", room });
  assert.equal(stale.notices.at(-1)?.type, "rejected");
  assert.equal(stale.notices.findLast((notice) => notice.type === "rejected")?.reason, ROOM_VERSION_MESSAGE);
});

test("both browsers receive the filled lifeline for animation when opening completes it", () => {
  const { leader, guest } = fixture(1);
  const opening = leader.state().game.colors;
  const cyan = DEMO_LEVEL.filter((screw, index) => opening[index] === "cyan" && !screw.obstructedBy?.length).slice(0, 3);
  assert.equal(cyan.length, 3);
  assert.ok(leader.state().game.boxes.every((box) => box?.color !== "cyan"));
  for (const screw of cyan) guest.send({ type: "select", round: 0, screw: screw.id });
  leader.send({ type: "boost", round: 0 });
  for (const peer of [leader, guest]) {
    const notice = peer.notices.findLast((notice) => notice.type === "state")!;
    assert.equal(notice.completedLifeline?.color, "cyan");
    assert.equal(notice.completedLifeline?.screws.length, 3);
    assert.deepEqual(notice.moves?.map(({ kind }) => kind), ["bonus-open", "transfer", "transfer", "transfer", "complete"]);
    assert.equal(notice.snapshot.game.boxes.length, 2);
    assert.equal(notice.snapshot.game.tray.length, 0);
  }
});
