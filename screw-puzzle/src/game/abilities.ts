import { isScrewAccessible } from "./rules.ts";
import type { GameState, Screw } from "./types.ts";

export const FIND_COOLDOWN_MS = 60_000;
// Count is result metadata, not a gameplay charge limit. Fits PostgreSQL integer.
export const MAX_RECORDED_HINTS = 2_147_483_647;
// Ready time is Unix milliseconds: saves and co-op reconnects retain the wait.
export type AbilityState = { findUses: number; findReadyAt: number; hint: string | null };
export const freshAbilities = (): AbilityState => ({ findUses: 0, findReadyAt: 0, hint: null });
export const canFindMatch = (abilities: AbilityState, now: number) => !abilities.hint && Number.isFinite(now) && now >= abilities.findReadyAt;

// Only active-box colours help. A 2/3 box takes priority over a 1/3 or empty one.
export function matchCandidates(game: GameState): Screw[] {
  if (game.status !== "playing") return [];
  const fullness = new Map(game.boxes.flatMap((box) => box ? [[box.color, box.screws.length] as const] : []));
  return game.screws.filter((screw) => !screw.removed && fullness.has(screw.color) && isScrewAccessible(game, screw))
    .sort((a, b) => fullness.get(b.color)! - fullness.get(a.color)!);
}

export function settleAbilities(abilities: AbilityState, game: GameState): AbilityState {
  return { ...abilities,
    hint: matchCandidates(game).some((screw) => screw.id === abilities.hint) ? abilities.hint : null,
  };
}
