import "../src/game/allLevels.ts";
import assert from "node:assert/strict";
import { test } from "node:test";
import { createRoomServer, RECONNECT_MS } from "../server/room.ts";
import { FALL_DURATION_MS } from "../src/game/fallTiming.ts";
import { DEMO_LEVEL } from "../src/game/allLevels.ts";
import { generatePuzzle } from "../src/game/randomize.ts";
import { generateSoloPuzzle, soloLevelTemplate } from "../src/game/soloLevels.ts";
import type { LevelId } from "../src/game/types.ts";
import { collectionPlayback, emptyPlayback, frameDelay } from "../src/multiplayer/collectionPlayback.ts";
import type { RoomCommand, RoomNotice } from "../src/multiplayer/protocol.ts";
import { ROOM_LEVEL_VERSION, ROOM_PHYSICS_DELAY_MS, ROOM_VERSION_MESSAGE } from "../src/multiplayer/protocol.ts";
import { initPartPhysics } from "../src/scene/partPhysics.ts";
import { LOOSE_LIFETIME_MS, loosePartPose, mergeLooseParts, SMOKE_DURATION_MS } from "../src/scene/loosePhysics.ts";
import { freshAbilities, matchCandidates } from "../src/game/abilities.ts";

await initPartPhysics();

test("co-op abilities are leader-controlled, shared, preserved on reconnect and cleared by round reset", (t) => {
  const { leader, guest, makePeer, room, advance, close } = fixture(245);
  t.after(close);
  const target = matchCandidates(generateSoloPuzzle("cottage", 245).state)[0].id;
  guest.send({ type: "find", round: 0, screw: target });
  assert.deepEqual(leader.state().abilities, freshAbilities());
  assert.equal(guest.notices.at(-1)?.type, "rejected");
  leader.send({ type: "find", round: 0, screw: "missing" });
  assert.equal(leader.state().abilities.finds, 3);
  leader.send({ type: "find", round: 0, screw: target });
  assert.deepEqual(guest.state().abilities, { finds: 2, hint: target });
  assert.equal(guest.state().clockRunning, false);
  leader.send({ type: "find", round: 0, screw: target });
  assert.equal(guest.state().abilities.finds, 2);
  const token = guest.seat().token;
  guest.disconnect();
  const refreshed = makePeer(); refreshed.send({ type: "join", room, token, levelVersion: ROOM_LEVEL_VERSION });
  assert.deepEqual(refreshed.state().abilities, leader.state().abilities);
  refreshed.send({ type: "select", round: 0, screw: target });
  assert.equal(leader.state().abilities.hint, null);
  assert.equal(leader.state().abilities.finds, 2);
  leader.send({ type: "reset", round: 0 });
  assert.deepEqual(refreshed.state().abilities, freshAbilities());
  leader.send({ type: "find", round: 0, screw: target });
  assert.deepEqual(refreshed.state().abilities, freshAbilities());
  leader.send({ type: "ready", round: 1 }); refreshed.send({ type: "ready", round: 1 });
  for (const screw of generateSoloPuzzle("cottage", 245).solution) {
    advance(1800); refreshed.send({ type: "select", round: 1, screw });
    if (leader.state().game.clearedCount > 0) break;
  }
  assert.ok(leader.state().game.clearedCount > 0);
  leader.send({ type: "leave" });
  assert.equal(refreshed.state().leader, refreshed.seat().player);
});

function fixture(seed?: number, level: LevelId = "cottage", start = true) {
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
  leader.send({ type: "create", levelVersion: ROOM_LEVEL_VERSION, level });
  const room = leader.state().id;
  guest.send({ type: "join", room, levelVersion: ROOM_LEVEL_VERSION });
  if (start) {
    leader.send({ type: "ready", round: 0 });
    leader.send({ type: "start", round: 0 });
    assert.equal(guest.state().started, false);
    guest.send({ type: "ready", round: 0 });
    leader.send({ type: "start", round: 0 });
    assert.equal(guest.state().started, true);
  }
  return { leader, guest, room, makePeer, advance: (ms: number) => { time += ms; server.expireSeats(); },
    tickPhysics: server.tickPhysics, close: server.close };
}

test("the leader chooses a shared level and switching waits for both scenes to load", (t) => {
  const { leader, guest, close, room, makePeer } = fixture(245, "cottage", false);
  t.after(close);
  leader.send({ type: "ready", round: 0 });
  guest.send({ type: "ready", round: 0 });
  guest.send({ type: "level", round: 0, level: "campsite" });
  assert.equal(guest.notices.at(-1)?.type, "rejected");
  assert.equal(leader.state().level, "cottage");
  leader.send({ type: "level", round: 0, level: "campsite" });
  assert.equal(guest.state().level, "campsite");
  assert.equal(guest.state().round, 1);
  assert.equal(guest.state().game.colors.length, 240);
  assert.equal(guest.state().canStart, false);
  assert.ok(guest.state().players.every((seat) => !seat.ready));
  guest.send({ type: "ready", round: 0 });
  assert.ok(guest.state().players.every((seat) => !seat.ready));
  leader.send({ type: "ready", round: 1 });
  leader.send({ type: "start", round: 1 });
  assert.equal(guest.state().started, false);
  guest.send({ type: "ready", round: 1 });
  leader.send({ type: "start", round: 1 });
  assert.equal(guest.state().started, true);
  leader.send({ type: "level", round: 1, level: "cottage" });
  assert.equal(leader.notices.at(-1)?.type, "rejected");
  assert.equal(leader.state().level, "campsite");
  leader.send({ type: "reset", round: 1, lobby: true });
  assert.equal(guest.state().level, "campsite");
  assert.equal(guest.state().round, 2);
  leader.send({ type: "level", round: 1, level: "cottage" });
  assert.equal(guest.state().level, "campsite");

  guest.disconnect();
  const refreshed = makePeer();
  refreshed.send({ type: "join", room, token: guest.seat().token, levelVersion: ROOM_LEVEL_VERSION });
  assert.equal(refreshed.state().level, "campsite");
  assert.deepEqual(refreshed.state(), leader.state());
  leader.send({ type: "level", round: 2, level: "cottage" });
  assert.equal(refreshed.state().level, "cottage");
  assert.equal(refreshed.state().game.colors.length, 240);
  assert.deepEqual(refreshed.state().looseParts, {});
});

test("both seats finish the campsite with shared physics, pings, duplicate protection and reset", (t) => {
  const { leader, guest, close, advance } = fixture(245, "campsite");
  t.after(close);
  const initial = leader.state();
  assert.equal(initial.level, "campsite");
  const { solution } = generateSoloPuzzle("campsite", initial.seed);
  const first = solution[0];
  leader.send({ type: "ping", round: 0, screw: first });
  assert.deepEqual(guest.notices.at(-1), { type: "ping", round: 0, screw: first, player: leader.seat().player });
  for (const [index, screw] of solution.entries()) {
    const peer = index % 2 ? guest : leader;
    const count = leader.state().game.removedParts.length;
    peer.send({ type: "select", round: 0, screw });
    (index % 2 ? leader : guest).send({ type: "select", round: 0, screw });
    assert.equal(leader.state().game.removed.length, index + 1);
    assert.deepEqual(leader.state(), guest.state());
    const part = leader.state().game.removedParts[count];
    if (part) {
      assert.ok(leader.state().looseParts[part], `shared physics for ${part}`);
      advance(450);
      peer.send({ type: "dismiss", round: 0, part });
      if (leader.state().game.status === "playing") assert.ok(leader.state().looseParts[part]?.poof, `shared dismissal for ${part}`);
    }
    advance(ROOM_PHYSICS_DELAY_MS + LOOSE_LIFETIME_MS);
  }
  assert.equal(guest.state().game.status, "won");
  assert.equal(guest.state().game.removed.length, soloLevelTemplate("campsite").length);
  assert.equal(guest.state().clockRunning, false);
  assert.equal(guest.state().players.reduce((sum, seat) => sum + seat.collected, 0), 240);
  leader.send({ type: "reset", round: 0 });
  assert.equal(guest.state().level, "campsite");
  assert.equal(guest.state().round, 1);
  assert.equal(guest.state().game.removed.length, 0);
  assert.deepEqual(guest.state().looseParts, {});
});

test("both players finish the campsite and can select a different level afterward", (t) => {
  const { leader, guest, close, advance } = fixture(245, "campsite");
  t.after(close);
  assert.equal(leader.state().level, "campsite");
  const { solution } = generateSoloPuzzle("campsite", leader.state().seed);
  for (const [index, screw] of solution.entries()) {
    (index % 2 ? guest : leader).send({ type: "select", round: 0, screw });
    assert.equal(guest.state().game.removed.length, index + 1, screw);
    advance(LOOSE_LIFETIME_MS + ROOM_PHYSICS_DELAY_MS + 10);
  }
  assert.equal(guest.state().game.status, "won");
  assert.equal(leader.state().game.removed.length, 240);
  assert.deepEqual(leader.state(), guest.state());
  leader.send({ type: "reset", round: 0, lobby: true });
  leader.send({ type: "level", round: 1, level: "campsite" });
  assert.equal(guest.state().level, "campsite");
  assert.equal(guest.state().game.colors.length, 240);
});

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
  assert.deepEqual(guest.state().players.map(({ number, collected }) => [number, collected]), [[1, 1], [2, 1]]);
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
  assert.deepEqual(guest.state().players.map(({ collected }) => collected), [0, 0]);
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
  assert.equal(guest.state().fallStarts["chimney-snow"], state.serverTime);
  assert.equal(guest.state().fallStarts["chimney-snow"], state.fallStarts["chimney-snow"]);
  advance(ROOM_PHYSICS_DELAY_MS / 2);
  leader.send({ type: "select", round: 0, screw: chimney.id });
  assert.equal(leader.notices.at(-1)?.type, "rejected");
  advance(450);
  guest.send({ type: "dismiss", round: 0, part: "chimney-snow" });
  advance(ROOM_PHYSICS_DELAY_MS);
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
  assert.deepEqual(refreshed.state().players.map(({ collected }) => collected), [1, 0]);
  refreshed.disconnect();
  advance(RECONNECT_MS);
  assert.equal(guest.state().leader, guest.seat().player);
  assert.equal(guest.state().paused, false);
  guest.send({ type: "select", round: 0, screw: screws[1].id });
  assert.equal(guest.state().game.removed.length, 2);
  assert.deepEqual(guest.state().players.map(({ number, collected }) => [number, collected]), [[2, 1]]);
  guest.send({ type: "reset", round: 0 });
  assert.equal(guest.state().round, 1);
});

test("both seats can finish the same seeded cottage", () => {
  const { leader, guest, advance } = fixture();
  const { solution } = generatePuzzle(leader.state().seed);
  for (const [index, screw] of solution.entries()) {
    const peer = index % 2 ? guest : leader;
    const count = leader.state().game.removedParts.length;
    peer.send({ type: "select", round: 0, screw });
    advance(ROOM_PHYSICS_DELAY_MS + FALL_DURATION_MS);
    const part = leader.state().game.removedParts[count];
    if (part) peer.send({ type: "dismiss", round: 0, part });
    advance(ROOM_PHYSICS_DELAY_MS);
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
    const peer = index % 2 ? guest : leader;
    const count = leader.state().game.removedParts.length;
    peer.send({ type: "select", round: 0, screw });
    advance(ROOM_PHYSICS_DELAY_MS + FALL_DURATION_MS);
    const notice = leader.notices.at(-1)!;
    assert.deepEqual(notice, guest.notices.at(-1));
    assert.equal(notice.type, "state");
    assert.ok(notice.moves?.length);
    const first = playback.queue[0];
    playback = collectionPlayback(playback, { type: "receive", scene, moves: notice.moves, receivedAt: 100 + index });
    if (first) assert.equal(playback.queue[0], first);
    cleared = notice.snapshot.game.clearedCount;
    if (cleared) break;
    const part = notice.snapshot.game.removedParts[count];
    if (part) peer.send({ type: "dismiss", round: 0, part });
    advance(ROOM_PHYSICS_DELAY_MS);
  }
  assert.ok(cleared > 0 && leader.notices.length > start + 1);
  const [first] = playback.queue;
  assert.equal(frameDelay(first, 100), 350);
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
  const opening = leader.state().game;
  const available = DEMO_LEVEL.flatMap((screw, index) => !screw.obstructedBy?.length &&
    !opening.boxes.some((box) => box?.color === opening.colors[index]) ? [{ id: screw.id, color: opening.colors[index] }] : []);
  const color = available.find(({ color }) => available.filter((screw) => screw.color === color).length >= 3)?.color;
  assert.ok(color);
  const waiting = available.filter((screw) => screw.color === color).slice(0, 3);
  assert.equal(waiting.length, 3);
  for (const screw of waiting) guest.send({ type: "select", round: 0, screw: screw.id });
  leader.send({ type: "boost", round: 0 });
  for (const peer of [leader, guest]) {
    const notice = peer.notices.findLast((notice) => notice.type === "state")!;
    assert.equal(notice.completedLifeline?.color, color);
    assert.equal(notice.completedLifeline?.screws.length, 3);
    assert.deepEqual(notice.moves?.map(({ kind }) => kind), ["bonus-open", "transfer", "transfer", "transfer", "complete"]);
    assert.equal(notice.snapshot.game.boxes.length, 2);
    assert.equal(notice.snapshot.game.tray.length, 0);
  }
});

test("both seats see the same loose lantern and one shared poof", () => {
  const { leader, guest, advance } = fixture(1);
  const part = "holiday-lantern";
  const screw = DEMO_LEVEL.find((screw) => screw.attachedTo === part)!;
  guest.send({ type: "dismiss", round: 0, part });
  assert.deepEqual(leader.state().looseParts, {});
  leader.send({ type: "select", round: 0, screw: screw.id });
  const motion = leader.state().looseParts[part]!;
  assert.equal(motion.releasedAt, leader.state().serverTime);
  guest.send({ type: "dismiss", round: 0, part });
  assert.equal(leader.state().looseParts[part]!.poof, undefined);
  advance(450);
  guest.send({ type: "dismiss", round: 0, part });
  assert.equal(leader.state().looseParts[part]!.poof?.at, leader.state().serverTime);
  assert.deepEqual(guest.state().looseParts, leader.state().looseParts);
  const length = leader.notices.length;
  leader.send({ type: "dismiss", round: 0, part });
  assert.equal(leader.notices.length, length);
  assert.deepEqual(leader.state().players.map(({ collected }) => collected), [1, 0]);
  leader.send({ type: "reset", round: 0 });
  assert.deepEqual(guest.state().looseParts, {});
});

test("both seats interpolate the same compact pose stream, including after a reconnect", () => {
  const { leader, guest, room, makePeer, advance, tickPhysics } = fixture(1);
  const part = "roof-bauble";
  const screw = DEMO_LEVEL.find((candidate) => candidate.attachedTo === part)!;
  const invite = guest.seat();
  leader.send({ type: "select", round: 0, screw: screw.id });
  const { looseParts, serverTime } = leader.state();
  const releasedAt = serverTime;
  assert.equal(looseParts[part]?.releasedAt, releasedAt);
  assert.deepEqual(guest.state().looseParts[part], looseParts[part]);
  let history = looseParts;
  for (let tick = 0; tick < 21; tick += 1) {
    advance(1000 / 30);
    tickPhysics();
    const update = leader.notices.at(-1)!;
    assert.equal(update.type, "physics");
    assert.deepEqual(guest.notices.at(-1), update);
    assert.ok(update.looseParts[part]!.frames.length <= 3);
    history = mergeLooseParts(history, update.looseParts);
  }
  assert.ok(history[part]!.frames.length > 3);
  assert.notDeepEqual(loosePartPose(part, looseParts[part]!, releasedAt), loosePartPose(part, history[part]!, releasedAt + 650));
  guest.disconnect();
  const whileMoving = makePeer();
  whileMoving.send({ type: "join", room, token: invite.token, levelVersion: ROOM_LEVEL_VERSION });
  assert.deepEqual(whileMoving.seat().snapshot.looseParts, leader.state().looseParts);
  advance(LOOSE_LIFETIME_MS - 700);
  tickPhysics();
  const expired = leader.notices.at(-1)!;
  assert.equal(expired.type, "physics");
  assert.equal(expired.looseParts[part]?.poof?.at, releasedAt + LOOSE_LIFETIME_MS);
  whileMoving.disconnect();
  advance(SMOKE_DURATION_MS + 500);
  const refreshed = makePeer();
  refreshed.send({ type: "join", room, token: invite.token, levelVersion: ROOM_LEVEL_VERSION });
  assert.equal(refreshed.seat().snapshot.looseParts[part], undefined);
  assert.ok(refreshed.seat().snapshot.game.removedParts.includes(part));
});

test("reset restarts in place, waits for both scenes, and rejects old round inputs", (t) => {
  const { leader, guest, close } = fixture(245, "campsite");
  t.after(close);
  leader.send({ type: "boost", round: 0 });
  leader.send({ type: "reset", round: 0 });
  assert.equal(guest.state().started, true);
  assert.equal(guest.state().paused, true);
  assert.equal(guest.state().round, 1);
  assert.equal(guest.state().level, "campsite");
  assert.equal(guest.state().game.colors.length, 240);
  assert.equal(guest.state().lifelines, 3);
  assert.equal(guest.state().elapsedMs, 0);
  const first = generateSoloPuzzle("campsite", leader.state().seed).solution[0];
  leader.send({ type: "select", round: 0, screw: first });
  leader.send({ type: "select", round: 1, screw: first });
  assert.equal(guest.state().game.removed.length, 0);
  leader.send({ type: "ready", round: 1 });
  leader.send({ type: "select", round: 1, screw: first });
  assert.equal(guest.state().game.removed.length, 0);
  guest.send({ type: "ready", round: 1 });
  assert.equal(guest.state().paused, false);
  guest.send({ type: "select", round: 1, screw: first });
  assert.equal(guest.state().game.removed.length, 1);
  assert.deepEqual(leader.state(), guest.state());
});

test("the archived ship cannot be created or selected in a room", (t) => {
  const { leader, close, makePeer } = fixture(245, "cottage", false);
  t.after(close);
  const other = makePeer();
  other.send({ type: "create", levelVersion: ROOM_LEVEL_VERSION, level: "titanic" });
  assert.equal(other.notices.at(-1)?.type, "rejected");
  leader.send({ type: "level", round: 0, level: "titanic" });
  assert.equal(leader.notices.at(-1)?.type, "rejected");
  assert.equal(leader.state().level, "cottage");
});

test("both seats select, refresh, solve and restart Route 66 with one shared level", (t) => {
  const { leader, guest, room, makePeer, close, advance } = fixture(245, "desert");
  t.after(close);
  const initial = leader.state();
  assert.equal(initial.game.colors.length, 216);
  const { solution } = generateSoloPuzzle("desert", initial.seed);
  const token = guest.seat().token;
  guest.disconnect();
  const refreshed = makePeer();
  refreshed.send({ type: "join", room, token, levelVersion: ROOM_LEVEL_VERSION });
  assert.equal(refreshed.state().level, "desert");
  for (const [index, screw] of solution.entries()) {
    (index % 2 ? refreshed : leader).send({ type: "select", round: 0, screw });
    assert.equal(leader.state().game.removed.length, index + 1, screw);
    assert.deepEqual(leader.state(), refreshed.state());
    advance(LOOSE_LIFETIME_MS + ROOM_PHYSICS_DELAY_MS + 10);
  }
  assert.equal(refreshed.state().game.status, "won");
  assert.equal(refreshed.state().players.reduce((n, player) => n + player.collected, 0), 216);
  leader.send({ type: "reset", round: 0 });
  assert.equal(refreshed.state().started, true);
  assert.equal(refreshed.state().level, "desert");
  assert.equal(refreshed.state().game.removed.length, 0);
  assert.equal(refreshed.state().paused, true);
});

test("both seats select, refresh, solve and restart Construction Crew with one shared level", (t) => {
  const { leader, guest, room, makePeer, close, advance } = fixture(245, "construction");
  t.after(close);
  const initial = leader.state();
  assert.equal(initial.game.colors.length, 204);
  const { solution } = generateSoloPuzzle("construction", initial.seed);
  const token = guest.seat().token;
  guest.disconnect();
  const refreshed = makePeer();
  refreshed.send({ type: "join", room, token, levelVersion: ROOM_LEVEL_VERSION });
  assert.equal(refreshed.state().level, "construction");
  for (const [index, screw] of solution.entries()) {
    (index % 2 ? refreshed : leader).send({ type: "select", round: 0, screw });
    assert.equal(leader.state().game.removed.length, index + 1, screw);
    assert.deepEqual(leader.state(), refreshed.state());
    advance(LOOSE_LIFETIME_MS + ROOM_PHYSICS_DELAY_MS + 10);
  }
  assert.equal(refreshed.state().game.status, "won");
  assert.equal(refreshed.state().players.reduce((n, player) => n + player.collected, 0), 204);
  leader.send({ type: "reset", round: 0 });
  assert.equal(refreshed.state().started, true);
  assert.equal(refreshed.state().level, "construction");
  assert.equal(refreshed.state().game.removed.length, 0);
  assert.equal(refreshed.state().paused, true);
});

test("both seats select, refresh, solve and restart Carnival Fairground with one shared level", (t) => {
  const { leader, guest, room, makePeer, close, advance } = fixture(245, "carnival");
  t.after(close);
  const initial = leader.state();
  assert.equal(initial.game.colors.length, 240);
  const { solution } = generateSoloPuzzle("carnival", initial.seed);
  const token = guest.seat().token;
  guest.disconnect();
  const refreshed = makePeer();
  refreshed.send({ type: "join", room, token, levelVersion: ROOM_LEVEL_VERSION });
  assert.equal(refreshed.state().level, "carnival");
  for (const [index, screw] of solution.entries()) {
    (index % 2 ? refreshed : leader).send({ type: "select", round: 0, screw });
    assert.equal(leader.state().game.removed.length, index + 1, screw);
    assert.deepEqual(leader.state(), refreshed.state());
    advance(LOOSE_LIFETIME_MS + ROOM_PHYSICS_DELAY_MS + 10);
  }
  assert.equal(refreshed.state().game.status, "won");
  assert.equal(refreshed.state().players.reduce((n, player) => n + player.collected, 0), 240);
  leader.send({ type: "reset", round: 0 });
  assert.equal(refreshed.state().started, true);
  assert.equal(refreshed.state().level, "carnival");
  assert.equal(refreshed.state().game.removed.length, 0);
  assert.equal(refreshed.state().paused, true);
});

test("both seats select, refresh, solve and restart Zoo Adventure Park with one shared level", (t) => {
  const { leader, guest, room, makePeer, close, advance } = fixture(245, "zoo");
  t.after(close);
  const initial = leader.state();
  assert.equal(initial.game.colors.length, 231);
  const { solution } = generateSoloPuzzle("zoo", initial.seed);
  const token = guest.seat().token;
  guest.disconnect();
  const refreshed = makePeer();
  refreshed.send({ type: "join", room, token, levelVersion: ROOM_LEVEL_VERSION });
  assert.equal(refreshed.state().level, "zoo");
  for (const [index, screw] of solution.entries()) {
    (index % 2 ? refreshed : leader).send({ type: "select", round: 0, screw });
    assert.equal(leader.state().game.removed.length, index + 1, screw);
    assert.deepEqual(leader.state(), refreshed.state());
    advance(LOOSE_LIFETIME_MS + ROOM_PHYSICS_DELAY_MS + 10);
  }
  assert.equal(refreshed.state().game.status, "won");
  assert.equal(refreshed.state().players.reduce((n, player) => n + player.collected, 0), 231);
  leader.send({ type: "reset", round: 0 });
  assert.equal(refreshed.state().started, true);
  assert.equal(refreshed.state().level, "zoo");
  assert.equal(refreshed.state().game.removed.length, 0);
  assert.equal(refreshed.state().paused, true);
});
test("both seats select, refresh, solve and restart Royal Castle Courtyard with one shared level", (t) => {
  const { leader, guest, room, makePeer, close, advance } = fixture(245, "castle");
  t.after(close);
  const initial = leader.state();
  assert.equal(initial.game.colors.length, 225);
  const { solution } = generateSoloPuzzle("castle", initial.seed);
  const token = guest.seat().token;
  guest.disconnect();
  const refreshed = makePeer();
  refreshed.send({ type: "join", room, token, levelVersion: ROOM_LEVEL_VERSION });
  assert.equal(refreshed.state().level, "castle");
  for (const [index, screw] of solution.entries()) {
    (index % 2 ? refreshed : leader).send({ type: "select", round: 0, screw });
    assert.equal(leader.state().game.removed.length, index + 1, screw);
    assert.deepEqual(leader.state(), refreshed.state());
    advance(LOOSE_LIFETIME_MS + ROOM_PHYSICS_DELAY_MS + 10);
  }
  assert.equal(refreshed.state().game.status, "won");
  assert.equal(refreshed.state().players.reduce((n, player) => n + player.collected, 0), 225);
  leader.send({ type: "reset", round: 0 });
  assert.equal(refreshed.state().started, true);
  assert.equal(refreshed.state().level, "castle");
  assert.equal(refreshed.state().game.removed.length, 0);
  assert.equal(refreshed.state().paused, true);
});

test("retired Moonbase cannot be hosted or selected in a room", (t) => {
  const { leader, makePeer, close } = fixture(245);
  t.after(close);
  const other = makePeer();
  other.send({ type: "create", levelVersion: ROOM_LEVEL_VERSION, level: "space" });
  assert.equal(other.notices.at(-1)?.type, "rejected");
  leader.send({ type: "level", round: 0, level: "space" });
  assert.equal(leader.state().level, "cottage");
  assert.equal(leader.notices.at(-1)?.type, "rejected");
});
