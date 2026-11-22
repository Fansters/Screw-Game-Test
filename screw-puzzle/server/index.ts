import { createServer } from "node:http";
import { env } from "node:process";
import { WebSocket, WebSocketServer } from "ws";
import { createRoomServer } from "./room.ts";
import type { RoomNotice } from "../src/multiplayer/protocol.ts";

import { initPartPhysics } from "../src/scene/partPhysics.ts";
import { parseCommand } from "./commands.ts";

await initPartPhysics();
const rooms = createRoomServer();
const server = createServer((_request, response) => {
  response.writeHead(200, { "Content-Type": "text/plain" }).end("Screw Cottage room server");
});
const sockets = new WebSocketServer({ server, path: "/rooms", maxPayload: 1024 });
const origins = env.ROOM_ORIGINS?.split(",").map((origin) => origin.trim()).filter(Boolean);
const awaitingPong = new Set<WebSocket>();

sockets.on("connection", (socket, request) => {
  if (origins?.length && (!request.headers.origin || !origins.includes(request.headers.origin))) {
    socket.close(1008, "Origin not allowed");
    return;
  }
  const peer = {
    send: (notice: RoomNotice) => {
      if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(notice));
    },
    close: () => socket.close(4001, "Seat opened in another tab"),
  };
  socket.on("pong", () => awaitingPong.delete(socket));
  socket.on("error", () => socket.terminate());
  socket.on("close", () => {
    awaitingPong.delete(socket);
    rooms.disconnect(peer);
  });
  socket.on("message", (data) => {
    try {
      const command = parseCommand(data.toString());
      if (!command) return socket.close(1008, "Invalid command");
      rooms.receive(peer, command);
    } catch (error) {
      console.error("Room request failed", error);
      peer.send({ type: "rejected", reason: "The room server could not complete that request." });
    }
  });
});

const connectionCheck = setInterval(() => {
  for (const socket of sockets.clients) {
    if (socket.readyState !== WebSocket.OPEN) continue;
    if (awaitingPong.has(socket)) socket.terminate();
    else {
      awaitingPong.add(socket);
      socket.ping();
    }
  }
}, 5000);
const seatCheck = setInterval(rooms.expireSeats, 1000);
const physicsCheck = setInterval(rooms.tickPhysics, 1000 / 30);
server.on("close", () => {
  clearInterval(connectionCheck);
  clearInterval(seatCheck);
  clearInterval(physicsCheck);
  rooms.close();
});

const port = Number(env.PORT ?? 2567);
server.listen(port, () => console.log(`Screw Cottage room server listening on port ${(server.address() as { port: number }).port}`));
