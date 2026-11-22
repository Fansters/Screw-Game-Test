import { BONUS_SLOT } from "../game/rules.ts";
import type { CollectionState, ScrewColor } from "../game/types.ts";

type Player = { id: string; number: 1 | 2 };

// Seat numbers survive reconnects and leadership changes. A lone player takes
// both standard slots; the temporary bonus slot is always shared.
export function boxOwner(players: readonly Player[], slot: number): Player | undefined {
  if (slot === BONUS_SLOT) return undefined;
  return players.length === 1 ? players[0] : players.find(player => player.number === slot + 1);
}

export function reservedFor(game: CollectionState, players: readonly Player[], actor: string, color: ScrewColor): Player | undefined {
  if (game.boxes[BONUS_SLOT]?.color === color) return undefined;
  const slot = game.boxes.findIndex(box => box?.color === color);
  if (slot < 0) return undefined; // Other colours may use the shared waiting tray.
  const owner = boxOwner(players, slot);
  return owner?.id !== actor ? owner : undefined;
}
