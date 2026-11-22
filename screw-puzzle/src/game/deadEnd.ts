import { canOpenBonusBox, isScrewAccessible, planScrewRemoval } from "./rules.ts";
import type { GameState } from "./types.ts";

/** Conservative one-move proof, independent of camera position and seat ownership.
 * Both co-op seats together can collect every active colour. Never call this
 * while physical releases or collection jobs can still reveal/change moves.
 * This is intentionally not a prediction of whether a whole puzzle is solvable.
 */
export function hasNoSafeMove(game: GameState, lifelines: number): boolean {
  if (game.status !== "playing" || !game.screws.some(screw => !screw.removed)) return false;
  if (lifelines > 0 && canOpenBonusBox(game)) return false;
  return !game.screws.some(screw => isScrewAccessible(game, screw) && planScrewRemoval(game, screw.id).finalState.status !== "lost");
}
