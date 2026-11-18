import { DEMO_LEVEL } from "./levels.ts";
import { createInitialState, removeScrew } from "./rules.ts";
import { SCREW_COLOR_ORDER } from "./types.ts";
import type { GameState, PartId, Screw, ScrewColor } from "./types.ts";

function randomSource(seed: number) {
  let value = seed >>> 0;
  return () => { value = (Math.imul(value, 1664525) + 1013904223) >>> 0; return value / 4294967296; };
}
function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}
function ownerCounts(level: readonly Screw[]) {
  const counts = new Map<Screw["attachedTo"], number>();
  for (const { attachedTo } of level) counts.set(attachedTo, (counts.get(attachedTo) ?? 0) + 1);
  return counts;
}
function peelOrder(random: () => number, level: readonly Screw[], reserve: ReadonlySet<string>, initialCounts: ReturnType<typeof ownerCounts>,
  openingPaths: readonly Screw[][]): Screw[] {
  const remaining = [...level];
  const remainingCounts = new Map(initialCounts);
  const openingPath = openingPaths.length ? openingPaths[Math.floor(random() * openingPaths.length)] : [];
  const parts = new Set<PartId>();
  const result: Screw[] = [];
  let owner: PartId | undefined;
  let lastReleased: PartId | undefined;
  while (remaining.length) {
    const reachable = remaining.filter((screw) => [...(screw.solutionAfter ?? []), ...(screw.obstructedBy ?? [])].every((part) => parts.has(part)));
    const nextOpening = openingPath[result.length];
    const planned = nextOpening ? [nextOpening] : reachable.filter((screw) => !reserve.has(screw.id));
    const accessible = planned.length ? planned : reachable;
    if (!accessible.length) throw new Error("Level layer dependencies contain a cycle");
    let options = accessible.filter((screw) => screw.attachedTo === owner);
    if (!options.length) {
      const completeOwners = [...ownerCounts(accessible)].filter(([part, count]) => count === remainingCounts.get(part)).map(([part]) => part);
      const newlyRevealed = completeOwners.filter((part) => accessible.some((screw) => screw.attachedTo === part &&
        [...(screw.solutionAfter ?? []), ...(screw.obstructedBy ?? [])].includes(lastReleased!)));
      const owners = newlyRevealed.length ? newlyRevealed : completeOwners;
      owner = owners.length ? owners[Math.floor(random() * owners.length)] : accessible[Math.floor(random() * accessible.length)].attachedTo;
      options = accessible.filter((screw) => screw.attachedTo === owner);
    }
    const chosen = options[Math.floor(random() * options.length)];
    result.push(chosen);
    remaining.splice(remaining.indexOf(chosen), 1);
    const left = remainingCounts.get(chosen.attachedTo)! - 1;
    remainingCounts.set(chosen.attachedTo, left);
    if (chosen.attachedTo && left === 0) {
      parts.add(chosen.attachedTo);
      lastReleased = chosen.attachedTo;
    }
  }
  return result;
}
export type GeneratedPuzzle = { seed: number; state: GameState; solution: string[] };
export class PuzzleColorsUnavailable extends Error {}

// Construct a solution first; color it using only the two currently active boxes.
// This gives true spatial mixing and a proof of solvability instead of blind shuffling.
export function generatePuzzle(seed: number, template: readonly Screw[] = DEMO_LEVEL, preferLayeredPeel = false,
  exposedHeads?: ReadonlySet<string>): GeneratedPuzzle {
  const opening = exposedHeads ?? new Set(template.filter((screw) => !screw.obstructedBy?.length && !screw.solutionAfter?.length).map((screw) => screw.id));
  const counts = ownerCounts(template);
  const blockers = new Set(template.flatMap((screw) => [...(screw.solutionAfter ?? []), ...(screw.obstructedBy ?? [])]));
  const exposedSingles = new Map(template.filter((screw) => opening.has(screw.id) && counts.get(screw.attachedTo) === 1)
    .map((screw) => [screw.attachedTo, screw]));
  // Open up a small section early so both colors can progress through its newly exposed fixings.
  const openingPaths = preferLayeredPeel ? template.flatMap((screw) => {
    const covers = new Set([...(screw.solutionAfter ?? []), ...(screw.obstructedBy ?? [])]);
    if (covers.size === 0 || covers.size > 2 || ![...covers].every((part) => exposedSingles.has(part))) return [];
    return [[...covers].map((part) => exposedSingles.get(part)!)];
  }) : [];
  // Leave independent single-fixing props for the end, when only one box color may remain.
  const reserve = new Set(preferLayeredPeel ? template.filter((screw) => screw.attachedTo && !opening.has(screw.id) &&
    !blockers.has(screw.attachedTo) && counts.get(screw.attachedTo) === 1)
    .slice(-12).map((screw) => screw.id) : []);
  const quotas = SCREW_COLOR_ORDER.flatMap((color) => {
    const count = template.filter((screw) => screw.color === color).length;
    if (count % 3) throw new Error("Each level color needs a whole number of triples");
    return Array<ScrewColor>(count / 3).fill(color);
  });
  for (let attempt = 0; attempt < 64; attempt += 1) {
    const random = randomSource((seed + Math.imul(attempt, 2654435761)) >>> 0);
    const order = peelOrder(random, template, reserve, counts, openingPaths);
    const targets = shuffle(quotas, random);
    if (targets[0] === targets[1]) {
      const other = targets.findIndex((color) => color !== targets[0]);
      [targets[1], targets[other]] = [targets[other], targets[1]];
    }
    const queue = [...targets];
    const boxes: ({ color: ScrewColor; count: number } | null)[] = [
      { color: queue.shift()!, count: 0 }, { color: queue.shift()!, count: 0 },
    ];
    const colors = new Map<string, ScrewColor>();
    const partColors = new Map<PartId, ScrewColor[]>();
    const openingCounts = new Map<ScrewColor, number>();
    let valid = true;
    for (const screw of order) {
      const seen = screw.attachedTo ? partColors.get(screw.attachedTo) ?? [] : [];
      const total = screw.attachedTo ? counts.get(screw.attachedTo)! : 0;
      // Mix the first two fixings, before the endgame can exhaust an alternative color.
      const mustDiffer = total > 1 && seen.length === 1;
      const options = boxes.map((box, index) => ({ box, index })).filter(({ box }) => box &&
        (!mustDiffer || box.color !== seen[0]) &&
        (!opening.has(screw.id) || !targets.slice(0, 2).includes(box.color) || (openingCounts.get(box.color) ?? 0) < 2));
      if (!options.length) { valid = false; break; }
      const { box, index } = options[Math.floor(random() * options.length)];
      const color = box!.color;
      colors.set(screw.id, color);
      if (opening.has(screw.id)) openingCounts.set(color, (openingCounts.get(color) ?? 0) + 1);
      if (screw.attachedTo) partColors.set(screw.attachedTo, [...seen, color]);
      box!.count += 1;
      if (box!.count === 3) {
        boxes[index] = null;
        const next = queue.findIndex((candidate) => !boxes.some((active) => active?.color === candidate));
        if (next !== -1) boxes[index] = { color: queue.splice(next, 1)[0], count: 0 };
      }
    }
    if (!valid) continue;
    const level = template.map((screw) => ({ ...screw, color: colors.get(screw.id)! }));
    // Neither opening box can be finished by simply sweeping the exposed heads.
    // Small natural props and interior fixings reveal the next choices.
    if (targets.slice(0, 2).some((color) => {
      const count = openingCounts.get(color) ?? 0;
      return count < 1 || count > 2;
    })) continue;
    const state = createInitialState(level, targets);
    let proof = state;
    for (const screw of order) proof = removeScrew(proof, screw.id);
    if (proof.status !== "won") throw new Error("Generated puzzle failed its solution proof");
    return { seed: seed >>> 0, state, solution: order.map((screw) => screw.id) };
  }
  throw new PuzzleColorsUnavailable("Could not generate mixed-color level parts");
}
