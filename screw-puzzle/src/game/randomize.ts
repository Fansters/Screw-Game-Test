import { levelData } from "./levelData.ts";
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

/** Easy offers whole triples at a time on the reachable frontier. Unlike the
 * layered generator, it avoids requiring a reveal midway through most boxes. */
function generateEasyPuzzle(seed: number, template: readonly Screw[], opening: ReadonlySet<string>, range: readonly [
    number,
    number
]): GeneratedPuzzle {
    const quotas = SCREW_COLOR_ORDER.flatMap(color => Array<ScrewColor>(template.filter(s => s.color === color).length / 3).fill(color));
    for (let attempt = 0; attempt < 64; attempt++) {
        const random = randomSource((seed + Math.imul(attempt, 2654435761)) >>> 0), targets = shuffle(quotas, random);
        if (targets[0] === targets[1]) {
            const different = targets.findIndex(c => c !== targets[0]);
            [targets[1], targets[different]] = [targets[different], targets[1]];
        }
        const queue = [...targets], boxes: (ScrewColor | null)[] = [queue.shift()!, queue.shift()!], remaining = [...template], done = new Set<PartId>(), left = ownerCounts(template), colors = new Map<string, ScrewColor>(), order: string[] = [], openingCounts = new Map<ScrewColor, number>();
        const unlocks = new Map<PartId, number>();
        for (const screw of template)
            for (const part of [...(screw.obstructedBy ?? []), ...(screw.solutionAfter ?? [])])
                unlocks.set(part, (unlocks.get(part) ?? 0) + 1);
        let group = 0, valid = true;
        while (remaining.length) {
            const slot = boxes[group % 2] !== null ? group % 2 : boxes.findIndex(Boolean), color = boxes[slot];
            if (!color) {
                valid = false;
                break;
            }
            let frontier = remaining.filter(s => [...(s.obstructedBy ?? []), ...(s.solutionAfter ?? [])].every(p => done.has(p)));
            if (group < 2)
                frontier = frontier.filter(s => opening.has(s.id));
            const chosen = new Set<string>();
            for (let count = 0; count < 3; count++) {
                let candidates = frontier.filter(s => !chosen.has(s.id) && (!opening.has(s.id) || !targets.slice(0, 2).includes(color) || (openingCounts.get(color) ?? 0) < range[1]));
                if (!candidates.length && group >= 2)
                    candidates = remaining.filter(s => [...(s.obstructedBy ?? []), ...(s.solutionAfter ?? [])].every(p => done.has(p)) && (!opening.has(s.id) || !targets.slice(0, 2).includes(color) || (openingCounts.get(color) ?? 0) < range[1]));
                if (!candidates.length) {
                    valid = false;
                    break;
                }
                // Expose useful branches early; independent decorative props remain
                // available as forgiving alternatives instead of a forced single path.
                const scored = candidates.map(s => ({ s, score: (unlocks.get(s.attachedTo!) ?? 0) + random() * 2 })).sort((a, b) => b.score - a.score), screw = scored[0].s;
                chosen.add(screw.id);
                colors.set(screw.id, color);
                order.push(screw.id);
                remaining.splice(remaining.indexOf(screw), 1);
                if (opening.has(screw.id))
                    openingCounts.set(color, (openingCounts.get(color) ?? 0) + 1);
                const countLeft = left.get(screw.attachedTo)! - 1;
                left.set(screw.attachedTo, countLeft);
                if (!countLeft && screw.attachedTo)
                    done.add(screw.attachedTo);
            }
            if (!valid)
                break;
            boxes[slot] = null;
            const next = queue.findIndex(c => !boxes.includes(c));
            if (next !== -1)
                boxes[slot] = queue.splice(next, 1)[0];
            group++;
        }
        if (!valid || targets.slice(0, 2).some(c => (openingCounts.get(c) ?? 0) < range[0]))
            continue;
        const state = createInitialState(template.map(s => ({ ...s, color: colors.get(s.id)! })), targets);
        let proof = state;
        for (const id of order)
            proof = removeScrew(proof, id);
        if (proof.status === "won")
            return { seed: seed >>> 0, state, solution: order };
    }
    throw new PuzzleColorsUnavailable("Could not generate a forgiving Easy frontier");
}


// Construct a solution first; color it using only the two currently active boxes.
// This gives true spatial mixing and a proof of solvability instead of blind shuffling.
export function generatePuzzle(seed: number, template: readonly Screw[] = levelData("cottage").template, preferLayeredPeel = false,
  exposedHeads?: ReadonlySet<string>, adaptPeelToColors = false, openingMatchRange: readonly [number, number] = [1, 2]): GeneratedPuzzle {
  const opening = exposedHeads ?? new Set(template.filter((screw) => !screw.obstructedBy?.length && !screw.solutionAfter?.length).map((screw) => screw.id));
  if(openingMatchRange[0]>=3)return generateEasyPuzzle(seed,template,opening,openingMatchRange);
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
    const peeled = new Set<PartId>();
    const left = new Map(counts);
    const colorOptions = (screw: Screw) => {
      const seen = screw.attachedTo ? partColors.get(screw.attachedTo) ?? [] : [];
      const total = screw.attachedTo ? counts.get(screw.attachedTo)! : 0;
      // Mix the first two fixings, before the endgame can exhaust an alternative color.
      const mustDiffer = total > 1 && seen.length === 1;
      return boxes.map((box, index) => ({ box, index })).filter(({ box }) => box &&
        (!mustDiffer || box.color !== seen[0]) &&
        (!opening.has(screw.id) || !targets.slice(0, 2).includes(box.color) || (openingCounts.get(box.color) ?? 0) < openingMatchRange[1]));
    };
    for (let step = 0; step < order.length; step += 1) {
      let screw = order[step], options = colorOptions(screw);
      // Open scenes offer many independent branches. If this branch cannot use
      // either active color, follow another physically reachable reveal first.
      // Earlier levels keep their original deterministic generation inputs.
      if (adaptPeelToColors && !options.length) {
        const next = order.findIndex((candidate, index) => index > step && colorOptions(candidate).length > 0 &&
          [...(candidate.solutionAfter ?? []), ...(candidate.obstructedBy ?? [])].every(part => peeled.has(part)));
        if (next !== -1) {
          [screw] = order.splice(next, 1);
          order.splice(step, 0, screw);
          options = colorOptions(screw);
        }
      }
      if (!options.length) { valid = false; break; }
      const { box, index } = options[Math.floor(random() * options.length)];
      const color = box!.color;
      colors.set(screw.id, color);
      if (opening.has(screw.id)) openingCounts.set(color, (openingCounts.get(color) ?? 0) + 1);
      if (screw.attachedTo) {
        partColors.set(screw.attachedTo, [...(partColors.get(screw.attachedTo) ?? []), color]);
        const remaining = left.get(screw.attachedTo)! - 1;
        left.set(screw.attachedTo, remaining);
        if (!remaining) peeled.add(screw.attachedTo);
      }
      box!.count += 1;
      if (box!.count === 3) {
        boxes[index] = null;
        const next = queue.findIndex((candidate) => !boxes.some((active) => active?.color === candidate));
        if (next !== -1) boxes[index] = { color: queue.splice(next, 1)[0], count: 0 };
      }
    }
    if (!valid) continue;
    const level = template.map((screw) => ({ ...screw, color: colors.get(screw.id)! }));
    // Older worlds retain their layered opening. Easy can offer complete
    // opening triples, spread across independent exposed assemblies.
    if (targets.slice(0, 2).some((color) => {
      const count = openingCounts.get(color) ?? 0;
      return count < openingMatchRange[0] || count > openingMatchRange[1];
    })) continue;
    const state = createInitialState(level, targets);
    let proof = state;
    for (const screw of order) proof = removeScrew(proof, screw.id);
    if (proof.status !== "won") throw new Error("Generated puzzle failed its solution proof");
    return { seed: seed >>> 0, state, solution: order.map((screw) => screw.id) };
  }
  throw new PuzzleColorsUnavailable("Could not generate mixed-color level parts");
}
