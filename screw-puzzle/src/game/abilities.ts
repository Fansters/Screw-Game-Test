import { isScrewAccessible } from "./rules.ts";
import type { GameState, Screw } from "./types.ts";

export const ABILITY_USES = 3;
export type AbilityState = { finds: number; hint: string | null };
export const freshAbilities = (): AbilityState => ({ finds: ABILITY_USES, hint: null });

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
