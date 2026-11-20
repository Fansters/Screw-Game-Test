import type { LevelId } from "../game/types";
import type { CasualFinish } from "../game/casualLeaderboard";
import { casualBoardId, finishPayload, parseCasualBoard } from "../game/casualLeaderboard";
import { finishOutbox, withOutboxLock } from "./scoreOutbox";
export const PROFILE_CHANGED = "screw-it:profile-changed";
const onlineClient = async () => (await (await import("./runtime")).bootAccount()).client;
export async function readOnlineBoard(level: LevelId, signal: AbortSignal) {
  const client = await onlineClient();
  if (signal.aborted) throw new Error("Cancelled");
  const {data,error} = await client.rpc("get_casual_leaderboard",{p_board:casualBoardId(level)}).abortSignal(AbortSignal.any([signal,AbortSignal.timeout(12000)]));
  if (error) throw new Error("The online board couldn’t load. Please try again.");
  return parseCasualBoard(data,level);
}
export async function queueFinish(playerId: string, finish: CasualFinish) { await withOutboxLock(() => finishOutbox.add(playerId,finish)); }
export async function retryFinishes(playerId: string) { await withOutboxLock(() => finishOutbox.retry(playerId)); }
export async function syncFinishes(playerId: string, cancelled: () => boolean) {
  if (!finishOutbox.list(playerId).some(item => item.status === "pending") || cancelled()) return;
  const client = await onlineClient();
  const session = await client.auth.getSession();
  if (session.error || session.data.session?.user.id !== playerId || session.data.session.user.is_anonymous || cancelled()) return;
  for (const item of finishOutbox.list(playerId).filter(item => item.status === "pending")) {
    if (cancelled()) return;
    const {data,error} = await client.rpc("submit_casual_finish",{p_finish:finishPayload(item.finish),p_expected_player:playerId}).abortSignal(AbortSignal.timeout(12000));
    if (cancelled()) return;
    if (!error && data?.status === "saved" && data.run_id === item.finish.runId.toLowerCase()) {
      await withOutboxLock(() => finishOutbox.remove(playerId,item.finish.runId));
    } else {
      const message = error?.message ?? "";
      const name = message === "nickname_required", invalid = error?.code === "22023" || error?.code === "22P02";
      await withOutboxLock(() => finishOutbox.update(playerId,item.finish.runId,name ? "name" : invalid ? "failed" : "pending",
        name ? "Choose a public player name to share your time." : invalid ? "This result couldn’t be published. Your local time is saved." : "Waiting to upload your time. We’ll retry automatically."));
      break;
    }
  }
}
