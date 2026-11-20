import { RANKED_RULES } from "./rules.ts";

export type VerifiedResult = {
  id: string; playerId: string; boardId: string; elapsedMs: number; verifiedAt: number;
};
const compare = (a: VerifiedResult, b: VerifiedResult) => a.elapsedMs - b.elapsedMs || a.verifiedAt - b.verifiedAt ||
  (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

// Sorting is not verification. The caller must supply results from trusted
// storage after account eligibility, board and server validation checks.
export function topVerifiedResults(results: readonly VerifiedResult[], boardId: string) {
  const best = new Map<string, VerifiedResult>();
  for (const result of results) {
    if (result.boardId !== boardId || !result.id || !result.playerId ||
      !Number.isSafeInteger(result.elapsedMs) || result.elapsedMs <= 0 ||
      !Number.isSafeInteger(result.verifiedAt) || result.verifiedAt < 0) continue;
    const previous = best.get(result.playerId);
    if (!previous || compare(result, previous) < 0) best.set(result.playerId, result);
  }
  let previousMs = -1, place = 0;
  return [...best.values()].sort(compare).slice(0, RANKED_RULES.topCount).map((result, index) => {
    if (result.elapsedMs !== previousMs) place = index + 1;
    previousMs = result.elapsedMs;
    return { ...result, place };
  });
}
