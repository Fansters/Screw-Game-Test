import { createServer } from "node:http";
import { env } from "node:process";
import { WebSocket, WebSocketServer } from "ws";
import { createRoomServer } from "./room.ts";
import type { RoomCommand, RoomNotice } from "../src/multiplayer/protocol.ts";

function parseCommand(data: string): RoomCommand | null {
  const value: unknown = JSON.parse(data);
  if (!value || typeof value !== "object" || !("type" in value)) return null;
  const levelVersion = "levelVersion" in value && typeof value.levelVersion === "number" ? value.levelVersion : undefined;
  switch (value.type) {
    case "create":
      return { type: "create", levelVersion };
    case "leave":
      return { type: value.type };
    case "join":
      if ("room" in value && typeof value.room === "string" && /^[\w-]{24}$/.test(value.room) &&
          (!("token" in value) || (typeof value.token === "string" && /^[\w-]{24}$/.test(value.token)))) {
        return { type: "join", room: value.room, token: "token" in value ? value.token as string : undefined,
          levelVersion };
      }
      break;
    case "clock":
      if ("sentAt" in value && typeof value.sentAt === "number" && Number.isFinite(value.sentAt)) return { type: "clock", sentAt: value.sentAt };
      break;
    case "ready":
    case "start":
    case "reset":
    case "boost":
    case "ping":
    case "select":
      if (!("round" in value) || typeof value.round !== "number" || !Number.isSafeInteger(value.round)) break;
      if (value.type !== "ping" && value.type !== "select") return { type: value.type, round: value.round };
      if ("screw" in value && typeof value.screw === "string" && /^screw-\d{1,6}$/.test(value.screw)) {
        return { type: value.type, round: value.round, screw: value.screw };
      }
  }
  return null;
}

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
server.on("close", () => {
  clearInterval(connectionCheck);
  clearInterval(seatCheck);
});

const port = Number(env.PORT ?? 2567);
server.listen(port, () => console.log(`Screw Cottage room server listening on port ${port}`));
