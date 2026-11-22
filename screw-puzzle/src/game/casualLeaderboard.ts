import { LEVEL_IDS } from "./types.ts";
import type { LevelId } from "./types.ts";
import { LEVEL_LAYOUT_VERSIONS } from "./layoutVersions.ts";
import { LEVEL_PRESENTATION } from "./levelPresentation.ts";
import { isRunId } from "./runId.ts";
import { isAvatar, isCountry } from "./playerIdentity.ts";
import type { AvatarId } from "./playerIdentity.ts";

export type CasualFinish = { runId: string; boardId: string; level: LevelId; elapsedMs: number; extraBoxUses: number; findMatchUses: number; resumed: boolean; screwCount: number };
export type CasualEntry = { rank: number; nickname: string; avatar?: AvatarId; country?: string | null; elapsedMs: number; extraBoxUses: number; findMatchUses: number; resumed: boolean; completedAt: string; isYou: boolean };
export type CasualBoard = { boardId: string; open: boolean; entries: CasualEntry[]; personal: CasualEntry | null; players: number };
const integer = (value: unknown, min: number, max: number): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= min && value <= max;
export const isPlayerId = (id: unknown): id is string => typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
export function casualBoardId(level: LevelId) {
  if (!LEVEL_IDS.some(id => id === level)) throw new Error("Choose a current level.");
  return `${level}:layout-${LEVEL_LAYOUT_VERSIONS[level]}:casual-1`;
}
export function isCasualFinish(value: unknown): value is CasualFinish {
  if (!value || typeof value !== "object") return false;
  const f = value as CasualFinish;
  return isRunId(f.runId) && LEVEL_IDS.some(id => id === f.level) && typeof f.boardId === "string" &&
    new RegExp(`^${f.level}:layout-[1-9][0-9]{0,5}:casual-[1-9][0-9]{0,5}$`).test(f.boardId) && integer(f.elapsedMs,1,2592000000) &&
    integer(f.extraBoxUses,0,3) && integer(f.findMatchUses,0,3) && typeof f.resumed === "boolean" &&
    integer(f.screwCount,140,240) && f.screwCount % 3 === 0 &&
    (f.boardId !== casualBoardId(f.level) || f.screwCount === LEVEL_PRESENTATION[f.level as keyof typeof LEVEL_PRESENTATION]?.screws);
}
export function finishPayload(f: CasualFinish) {
  if (!isCasualFinish(f)) throw new Error("Invalid completed result.");
  return { run_id: f.runId, board_id: f.boardId, elapsed_ms: f.elapsedMs, extra_box_uses: f.extraBoxUses,
    find_match_uses: f.findMatchUses, resumed: f.resumed, screw_count: f.screwCount };
}
function entry(value: unknown): CasualEntry {
  const e = value as Record<string, unknown> | null;
  if (!e || !integer(e.rank,1,Number.MAX_SAFE_INTEGER) || typeof e.nickname !== "string" || e.nickname.length > 20 ||
    !integer(e.elapsed_ms,1,2592000000) || !integer(e.extra_box_uses,0,3) || !integer(e.find_match_uses,0,3) ||
    typeof e.resumed !== "boolean" || typeof e.created_at !== "string" || !Number.isFinite(Date.parse(e.created_at))) throw new Error("Invalid board response.");
  return { rank:e.rank,nickname:e.nickname,avatar:isAvatar(e.avatar) ? e.avatar : "fox",country:isCountry(e.country) ? e.country : null,elapsedMs:e.elapsed_ms,extraBoxUses:e.extra_box_uses,findMatchUses:e.find_match_uses,
    resumed:e.resumed,completedAt:e.created_at,isYou:e.is_you===true };
}
export function parseCasualBoard(value: unknown, level: LevelId): CasualBoard {
  const b = value as Record<string, unknown> | null;
  if (!b || b.board_id !== casualBoardId(level) || typeof b.open !== "boolean" || !integer(b.players,0,Number.MAX_SAFE_INTEGER) ||
    !Array.isArray(b.entries) || b.entries.length > 10) throw new Error("Invalid board response.");
  return { boardId:b.board_id,open:b.open,players:b.players,entries:b.entries.map(entry),personal:b.personal ? entry(b.personal) : null };
}
