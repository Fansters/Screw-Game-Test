import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { test } from "node:test";
import { WebSocket } from "ws";
import { parseCommand } from "../server/commands.ts";
import { LEVEL_IDS } from "../src/game/types.ts";
import { ROOM_LEVEL_VERSION } from "../src/multiplayer/protocol.ts";
import type { RoomCommand, RoomNotice } from "../src/multiplayer/protocol.ts";

test("WebSocket input accepts screw actions for every playable level and rejects unknown or malformed IDs", () => {
  for (const level of LEVEL_IDS) for (const type of ["select", "ping", "find"] as const) {
    const command = { type, round: 0, screw: `${level === "cottage" ? "screw" : level}-1` };
    assert.deepEqual(parseCommand(JSON.stringify(command)), command);
  }
  for (const screw of ["space-1", "titanic-1", "unknown-1", "castle-x", "castle-1234567", "castle-1 extra"]) {
    assert.equal(parseCommand(JSON.stringify({ type: "select", round: 0, screw })), null);
  }
  assert.equal(parseCommand(JSON.stringify({ type: "select", round: "0", screw: "castle-1" })), null);
});

for (const level of ["castle", "arctic"] as const) test(`real ${level} WebSocket guests can remove and ping screws without being disconnected`, { timeout: 30_000 }, async t => {
  // Build the Node fixtures before opening sockets. A synchronous geometry
  // import here used to block this test client's automatic heartbeat replies.
  await import("../src/game/allLevels.ts");
  const { generateSoloPuzzle } = await import("../src/game/soloLevels.ts");
  const child = spawn(process.execPath, ["server/index.ts"], {
    cwd: new URL("..", import.meta.url), windowsHide: true,
    env: { ...process.env, PORT: "0", ROOM_ORIGINS: "" }, stdio: ["ignore", "pipe", "pipe"],
  });
  const peers: WebSocket[] = [];
  t.after(async () => {
    peers.forEach(ws => ws.terminate());
    if (child.exitCode === null) { const exited = once(child, "exit"); child.kill(); await exited; }
  });
  let logs = "";
  child.stderr.on("data", data => { logs += data; });
  const port = await new Promise<number>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Server startup timed out: ${logs}`)), 15_000);
    child.once("exit", code => { clearTimeout(timeout); reject(new Error(`Server exited ${code}: ${logs}`)); });
    child.stdout.on("data", data => {
      logs += data;
      const match = logs.match(/listening on port (\d+)/);
      if (match) { clearTimeout(timeout); resolve(Number(match[1])); }
    });
  });
  async function peer() {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/rooms`);
    peers.push(ws);
    const notices: RoomNotice[] = [];
    const waiting = new Set<() => void>();
    ws.on("message", data => { notices.push(JSON.parse(data.toString())); for (const check of [...waiting]) check(); });
    await once(ws, "open");
    return {
      send(command: RoomCommand) { ws.send(JSON.stringify(command)); },
      wait(predicate: (notice: RoomNotice) => boolean) {
        return new Promise<RoomNotice>((resolve, reject) => {
          const timeout = setTimeout(() => { waiting.delete(check); reject(new Error(`Notice timed out; socket ${ws.readyState}`)); }, 8000);
          function check() {
            const found = notices.findLast(predicate);
            if (found) { clearTimeout(timeout); waiting.delete(check); resolve(found); }
          }
          waiting.add(check); check();
        });
      },
    };
  }
  const host = await peer();
  host.send({ type: "create", levelVersion: ROOM_LEVEL_VERSION, level });
  const joined = await host.wait(n => n.type === "joined");
  assert.equal(joined.type, "joined");
  if (joined.type !== "joined") throw new Error("Missing seat");
  const guest = await peer();
  guest.send({ type: "join", room: joined.snapshot.id, levelVersion: ROOM_LEVEL_VERSION });
  await guest.wait(n => n.type === "joined");
  host.send({ type: "ready", round: 0 }); guest.send({ type: "ready", round: 0 });
  await host.wait(n => n.type === "state" && n.snapshot.canStart);
  host.send({ type: "start", round: 0 });
  await guest.wait(n => n.type === "state" && n.snapshot.started && !n.snapshot.paused);
  const puzzle = generateSoloPuzzle(level, joined.snapshot.seed);
  const screw = puzzle.solution[0];
  host.send({ type: "ping", round: 0, screw });
  await guest.wait(n => n.type === "ping" && n.screw === screw);
  host.send({ type: "find", round: 0, screw });
  await host.wait(n => n.type === "state" && n.snapshot.abilities.finds === 2);
  const color = puzzle.state.screws.find(s => s.id === screw)!.color;
  const slot = puzzle.state.boxes.findIndex(box => box?.color === color);
  const collector = slot === 0 ? host : guest, partner = slot === 0 ? guest : host;
  if (slot >= 0) {
    partner.send({ type: "select", round: 0, screw });
    const rejected = await partner.wait(n => n.type === "rejected" && n.screw === screw);
    assert.ok(rejected.type === "rejected" && rejected.reason.includes("belongs to Player"));
  }
  collector.send({ type: "select", round: 0, screw });
  for (const client of [host, guest]) {
    const accepted = await client.wait(n => n.type === "state" && n.snapshot.game.removed.includes(screw));
    assert.equal(accepted.type, "state");
    if (accepted.type === "state") {
      assert.equal(accepted.snapshot.paused, false);
      assert.ok(accepted.snapshot.players.every(p => p.connected));
      assert.equal(accepted.snapshot.game.removed.length, 1);
    }
  }
  host.send({ type: "clock", sentAt: 12345 });
  await host.wait(n => n.type === "clock" && n.sentAt === 12345);
  assert.ok(peers.every(ws => ws.readyState === WebSocket.OPEN));
});
