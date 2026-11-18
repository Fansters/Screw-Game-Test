import type { PartId } from "./types.ts";

// Preserve every removable assembly. Keep its most interesting fixing first,
// then spend the remaining budget on structural panels rather than small props.
export function budgetFasteners<T extends { attachedTo: PartId; normal: readonly number[] }>(
  mounts: readonly T[], limit: number, priority: (mount: T) => number,
): T[] {
  const ranked = mounts.map((mount, index) => ({ mount, index, score: priority(mount) }))
    .sort((a, b) => b.score - a.score || a.index - b.index);
  const chosen = new Set<number>(), owners = new Set<PartId>();
  for (const { mount, index } of ranked) {
    if (owners.has(mount.attachedTo)) continue;
    owners.add(mount.attachedTo); chosen.add(index);
  }
  if (owners.size > limit || mounts.length < limit || limit % 3) throw new Error("Invalid level screw budget");
  for (const { index } of ranked) {
    if (chosen.size === limit) break;
    chosen.add(index);
  }
  return mounts.filter((_, index) => chosen.has(index));
}
