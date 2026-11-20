import { LIFELINE_COUNT } from "../animation/run.ts";
import type { LevelId } from "./campaign.ts";
import { layoutRevision } from "./layoutVersions.ts";
import { planBonusBox, removeScrew } from "./rules.ts";
import { generateSoloPuzzle } from "./soloLevels.ts";
import { ABILITY_USES, freshAbilities, matchCandidates, settleAbilities } from "./abilities.ts";

type SoloSave = { seed: number; moves: string[]; elapsedMs: number; legacyTitanicLayout?: true };
const inMemory = new Map<LevelId, SoloSave | null>();
export const soloSaveKey = (level: LevelId) => `screw-it:solo-save:${level}:${layoutRevision(level)}`;
const previousTitanicSaveKey = "screw-it:solo-save:titanic:v1";

function validSave(value: unknown): value is SoloSave {
  if (!value || typeof value !== "object" || !("seed" in value) || !("moves" in value) || !("elapsedMs" in value)) return false;
  return typeof value.seed === "number" && Number.isInteger(value.seed) && value.seed >= 0 && value.seed <= 0xffffffff &&
    typeof value.elapsedMs === "number" && Number.isSafeInteger(value.elapsedMs) && value.elapsedMs >= 0 &&
    Array.isArray(value.moves) && value.moves.every((move) => typeof move === "string") &&
    (!("legacyTitanicLayout" in value) || value.legacyTitanicLayout === true);
}

export function readSoloSave(level: LevelId): SoloSave | null {
  if (inMemory.has(level)) return inMemory.get(level) ?? null;
  try {
    const current = window.localStorage.getItem(soloSaveKey(level));
    if (current === null && level === "titanic") {
      const previous: unknown = JSON.parse(window.localStorage.getItem(previousTitanicSaveKey) ?? "null");
      return validSave(previous) ? { ...previous, legacyTitanicLayout: true } : null;
    }
    const value: unknown = JSON.parse(current ?? "null");
    return validSave(value) ? value : null;
  } catch {
    return null;
  }
}

export function writeSoloSave(level: LevelId, save: SoloSave) {
  try {
    window.localStorage.setItem(soloSaveKey(level), JSON.stringify(save));
    if (level === "titanic") window.localStorage.removeItem(previousTitanicSaveKey);
    inMemory.delete(level);
  } catch {
    inMemory.set(level, save);
  }
}

export function clearSoloSave(level: LevelId) {
  try {
    window.localStorage.removeItem(soloSaveKey(level));
    if (level === "titanic") window.localStorage.removeItem(previousTitanicSaveKey);
    inMemory.delete(level);
  } catch {
    inMemory.set(level, null);
  }
}

export function restoreSoloSave(level: LevelId, save: SoloSave) {
  let game = generateSoloPuzzle(level, save.seed, save.legacyTitanicLayout).state;
  // Retired actions did not remove screws. Drop up to three legacy uses so
  // existing checkpoints resume with the same puzzle, hints and lifelines.
  const moves = save.moves.filter(move => move !== "peek");
  if (save.moves.length - moves.length > 3 || moves.length > game.screws.length + LIFELINE_COUNT + ABILITY_USES) return null;
  let lifelines = LIFELINE_COUNT;
  let abilities = freshAbilities();
  for (const move of moves) {
    if (move.startsWith("find:")) {
      const screw = move.slice(5);
      if (abilities.finds === 0 || abilities.hint || !matchCandidates(game).some((candidate) => candidate.id === screw)) return null;
      abilities = { ...abilities, finds: abilities.finds - 1, hint: screw };
      continue;
    }
    if (move === "boost" && lifelines === 0) return null;
    const next = move === "boost" ? planBonusBox(game).finalState : removeScrew(game, move);
    if (next === game || next.status !== "playing") return null;
    if (move === "boost") lifelines -= 1;
    game = next;
    abilities = settleAbilities(abilities, game);
  }
  return { game, seed: save.seed, checkpoint: {
    elapsedBefore: save.elapsedMs, moves, lifelines, abilities, legacyTitanicLayout: save.legacyTitanicLayout,
  } };
}
