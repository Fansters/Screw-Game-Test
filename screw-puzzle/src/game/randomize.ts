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
function peelOrder(random: () => number): Screw[] {
  const remaining = [...DEMO_LEVEL];
  const removed = new Set<string>();
  const parts = new Set<PartId>();
  const result: Screw[] = [];
  let owner: PartId | undefined;
  let lastReleased: PartId | undefined;
  while (remaining.length) {
    const accessible = remaining.filter((screw) => [...(screw.solutionAfter ?? []), ...(screw.obstructedBy ?? [])].every((part) => parts.has(part)));
    if (!accessible.length) throw new Error("House layer dependencies contain a cycle");
    let options = accessible.filter((screw) => screw.attachedTo === owner);
    if (!options.length) {
      const completeOwners = [...new Set(accessible.map((screw) => screw.attachedTo))].filter((part) =>
        remaining.filter((screw) => screw.attachedTo === part).every((screw) => accessible.includes(screw)));
      const newlyRevealed = completeOwners.filter((part) => accessible.some((screw) => screw.attachedTo === part &&
        [...(screw.solutionAfter ?? []), ...(screw.obstructedBy ?? [])].includes(lastReleased!)));
      const owners = newlyRevealed.length ? newlyRevealed : completeOwners;
      owner = owners.length ? owners[Math.floor(random() * owners.length)] : accessible[Math.floor(random() * accessible.length)].attachedTo;
      options = accessible.filter((screw) => screw.attachedTo === owner);
    }
    const chosen = options[Math.floor(random() * options.length)];
    result.push(chosen); removed.add(chosen.id);
    remaining.splice(remaining.indexOf(chosen), 1);
    if (chosen.attachedTo && DEMO_LEVEL.filter((screw) => screw.attachedTo === chosen.attachedTo).every((screw) => removed.has(screw.id))) {
      parts.add(chosen.attachedTo);
      lastReleased = chosen.attachedTo;
    }
  }
  return result;
}
export type GeneratedPuzzle = { seed: number; state: GameState; solution: string[] };

// Construct a solution first; color it using only the two currently active boxes.
// This gives true spatial mixing and a proof of solvability instead of blind shuffling.
export function generatePuzzle(seed: number): GeneratedPuzzle {
  const opening = new Set(DEMO_LEVEL.filter((screw) => !screw.obstructedBy?.length && !screw.solutionAfter?.length).map((screw) => screw.id));
  for (let attempt = 0; attempt < 64; attempt += 1) {
    const random = randomSource((seed + Math.imul(attempt, 2654435761)) >>> 0);
    const order = peelOrder(random);
    const targets = shuffle(SCREW_COLOR_ORDER.flatMap((color) => {
      const count = DEMO_LEVEL.filter((screw) => screw.color === color).length;
      if (count % 3) throw new Error("Each level color needs a whole number of triples");
      return Array.from({ length: count / 3 }, () => color);
    }), random);
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
      const total = screw.attachedTo ? DEMO_LEVEL.filter((candidate) => candidate.attachedTo === screw.attachedTo).length : 0;
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
    const level = DEMO_LEVEL.map((screw) => ({ ...screw, color: colors.get(screw.id)! }));
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
  throw new Error("Could not generate mixed-color house parts");
}
