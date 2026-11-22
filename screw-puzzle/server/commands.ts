import type { RoomCommand } from "../src/multiplayer/protocol.ts";
import { isLevelId, LEVEL_IDS } from "../src/game/types.ts";
import { isLevelPart } from "../src/scene/loosePhysics.ts";

// A newly playable level must also work through the real WebSocket boundary.
// Cottage fixings retain their original screw- prefix.
const screwId = new RegExp(`^(?:screw|${LEVEL_IDS.filter(id => id !== "cottage").join("|")})-[0-9]{1,6}$`);

export function parseCommand(data: string): RoomCommand | null {
  const value: unknown = JSON.parse(data);
  if (!value || typeof value !== "object" || !("type" in value)) return null;
  const levelVersion = "levelVersion" in value && typeof value.levelVersion === "number" ? value.levelVersion : undefined;
  switch (value.type) {
    case "create":
      if (!("level" in value)) return { type: "create", levelVersion };
      if (isLevelId(value.level)) return { type: "create", levelVersion, level: value.level };
      break;
    case "leave": return { type: value.type };
    case "join":
      if ("room" in value && typeof value.room === "string" && /^[\w-]{24}$/.test(value.room) &&
        (!("token" in value) || (typeof value.token === "string" && /^[\w-]{24}$/.test(value.token)))) {
        return { type: "join", room: value.room, token: "token" in value ? value.token as string : undefined, levelVersion };
      }
      break;
    case "clock":
      if ("sentAt" in value && typeof value.sentAt === "number" && Number.isFinite(value.sentAt)) return { type: "clock", sentAt: value.sentAt };
      break;
    case "ready": case "level": case "start": case "reset": case "boost": case "find": case "dismiss": case "ping": case "select":
      if (!("round" in value) || typeof value.round !== "number" || !Number.isSafeInteger(value.round)) break;
      if (value.type === "reset") return { type: "reset", round: value.round, lobby: "lobby" in value && value.lobby === true };
      if (value.type === "level") {
        if ("level" in value && isLevelId(value.level)) return { type: "level", round: value.round, level: value.level };
        break;
      }
      if (value.type === "dismiss") {
        if ("part" in value && isLevelPart(value.part)) return { type: "dismiss", round: value.round, part: value.part };
        break;
      }
      if (value.type !== "ping" && value.type !== "select" && value.type !== "find") return { type: value.type, round: value.round };
      if ("screw" in value && typeof value.screw === "string" && screwId.test(value.screw)) return { type: value.type, round: value.round, screw: value.screw };
  }
  return null;
}
