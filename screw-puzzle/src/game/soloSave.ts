import { isRunId, newRunId } from "./runId.ts";
import { LIFELINE_COUNT } from "../animation/run.ts";
import type { LevelId } from "./campaign.ts";
import { planBonusBox, removeScrew } from "./rules.ts";
import { generateSoloPuzzle } from "./soloLevels.ts";
import { freshAbilities, matchCandidates, settleAbilities } from "./abilities.ts";

export type SoloSave = { runId?: string; seed: number; moves: string[]; elapsedMs: number; findReadyAt?: number; legacyTitanicLayout?: true };

export function validSave(value: unknown): value is SoloSave {
  if (!value || typeof value !== "object" || !("seed" in value) || !("moves" in value) || !("elapsedMs" in value)) return false;
  return typeof value.seed === "number" && Number.isInteger(value.seed) && value.seed >= 0 && value.seed <= 0xffffffff &&
    typeof value.elapsedMs === "number" && Number.isSafeInteger(value.elapsedMs) && value.elapsedMs >= 0 &&
    Array.isArray(value.moves) && value.moves.every((move) => typeof move === "string") &&
    (!("runId" in value) || isRunId(value.runId)) &&
    (!("findReadyAt" in value) || typeof value.findReadyAt === "number" && Number.isSafeInteger(value.findReadyAt) && value.findReadyAt >= 0) &&
    (!("legacyTitanicLayout" in value) || value.legacyTitanicLayout === true);
}

/** Retire only the old puzzle-progress keys; keep Auth, preferences and score retries. */
export function retireLocalProgress() {
  try {
    for(let i=window.localStorage.length-1;i>=0;i--) {
      const key=window.localStorage.key(i);
      if(key && ["screw-it:solo-save:","screw-it:cleared:"].some(prefix=>key.startsWith(prefix))) window.localStorage.removeItem(key);
    }
  } catch { /* Guest play needs no storage. */ }
}

export function restoreSoloSave(level: LevelId, save: SoloSave) {
  if (!validSave(save)) return null;
  let game = generateSoloPuzzle(level, save.seed, save.legacyTitanicLayout).state;
  // Retired actions did not remove screws. Drop up to three legacy uses so
  // existing checkpoints resume with the same puzzle, hints and lifelines.
  const moves = save.moves.filter(move => move !== "peek");
  if (save.moves.length - moves.length > 3 || moves.length > game.screws.length * 2 + LIFELINE_COUNT) return null;
  let lifelines = LIFELINE_COUNT;
  let abilities = freshAbilities();
  for (const move of moves) {
    if (move.startsWith("find:")) {
      const screw = move.slice(5);
      // Replay validates the old choices, not the historical wall-clock gaps.
      if (abilities.hint || !matchCandidates(game).some((candidate) => candidate.id === screw)) return null;
      abilities = { ...abilities, findUses: abilities.findUses + 1, hint: screw };
      continue;
    }
    if (move === "boost" && lifelines === 0) return null;
    const next = move === "boost" ? planBonusBox(game).finalState : removeScrew(game, move);
    if (next === game || next.status !== "playing") return null;
    if (move === "boost") lifelines -= 1;
    game = next;
    abilities = settleAbilities(abilities, game);
  }
  abilities.findReadyAt = save.findReadyAt ?? 0;
  return { game, seed: save.seed, checkpoint: {
    runId: save.runId ?? newRunId(), resumed: moves.length > 0 || save.elapsedMs > 0,
    elapsedBefore: save.elapsedMs, moves, lifelines, abilities, legacyTitanicLayout: save.legacyTitanicLayout,
  } };
}
