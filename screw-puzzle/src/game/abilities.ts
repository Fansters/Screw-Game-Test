import { isScrewAccessible } from "./rules.ts";
import type { GameState, Screw } from "./types.ts";

export const ABILITY_USES = 3;
export type AbilityState = { finds: number; peeks: number; hint: string | null; peekAt: number | null };
export const freshAbilities = (): AbilityState => ({ finds: ABILITY_USES, peeks: ABILITY_USES, hint: null, peekAt: null });

// Only active-box colours help. A 2/3 box takes priority over a 1/3 or empty one.
export function matchCandidates(game: GameState): Screw[] {
  if (game.status !== "playing") return [];
  const fullness = new Map(game.boxes.flatMap((box) => box ? [[box.color, box.screws.length] as const] : []));
  return game.screws.filter((screw) => !screw.removed && fullness.has(screw.color) && isScrewAccessible(game, screw))
    .sort((a, b) => fullness.get(b.color)! - fullness.get(a.color)!);
}

// Each prediction is conditional: finish THIS box next, with the other active
// colours unchanged. These are first replacements, before any waiting-slot cascade.
export function queuePreviews(game: GameState) {
  return game.boxes.slice(0, 2).map((box, slot) => {
    if (!box) return null;
    const next = game.boxQueue.find((target) => !game.boxes.some((other, index) => index !== slot && other?.color === target.color));
    return next ? { box: box.id, color: next.color } : null;
  });
}
export function settleAbilities(abilities: AbilityState, game: GameState): AbilityState {
  return { ...abilities,
    hint: matchCandidates(game).some((screw) => screw.id === abilities.hint) ? abilities.hint : null,
    peekAt: game.status === "playing" && abilities.peekAt === game.clearedCount ? abilities.peekAt : null,
  };
}
