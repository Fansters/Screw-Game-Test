import { newRunId } from "../game/runId.ts";
import { buildSequence, SCREW_SPIN_MS } from "./sequence.ts";
import type { PlaybackFrame } from "./sequence.ts";
import { BONUS_SLOT, isScrewAccessible, planBonusBox, planScrewRemoval } from "../game/rules.ts";
import type { GameState, PartId } from "../game/types.ts";
import { LOOSE_LIFETIME_MS, SMOKE_DURATION_MS } from "../scene/loosePhysics.ts";
import { hasNoSafeMove } from "../game/deadEnd.ts";
import type { PartReleases } from "../scene/loosePhysics.ts";
import { freshAbilities, matchCandidates, settleAbilities } from "../game/abilities.ts";
import type { AbilityState } from "../game/abilities.ts";

export type AnimationJob = { id: number; frames: PlaybackFrame[]; finalState: GameState; readyAt: number };
export const LIFELINE_COUNT = 3;
export type RunState = { runId: string; resumed: boolean; logical: GameState; display: GameState; ready: boolean; started: boolean; jobs: AnimationJob[];
  fallingParts: PartId[]; releases: PartReleases;
  lifelines: number; bonusJob: number | null; abilities: AbilityState;
  moves: string[]; elapsedBefore: number;
  legacyTitanicLayout?: true;
  frameIndex: number; nextJobId: number; round: number; seed: number; timerStartedAt: number | null; timerStoppedAt: number | null };
export type RunCheckpoint = Pick<RunState, "moves" | "lifelines" | "elapsedBefore" | "legacyTitanicLayout"> & { abilities?: AbilityState; runId?: string; resumed?: boolean };
export type RunAction = { type: "ready"; round: number } | { type: "start" } | { type: "select"; id: string; now: number; clearedParts?: readonly PartId[] } |
  { type: "check-dead-end"; now: number; round: number } |
  { type: "fall-finished"; part: PartId; round: number } |
  { type: "dismiss"; part: PartId; now: number } |
  { type: "boost"; now: number } |
  { type: "find"; screw: string } |
  { type: "begin"; job: number } | { type: "advance"; job: number; index: number } |
  { type: "resume-clock"; now: number; round: number } |
  { type: "reset"; game: GameState; seed: number; enter?: boolean; checkpoint?: RunCheckpoint };
export function createRun(game: GameState, seed = 0, round = 0): RunState {
  return { runId: newRunId(), resumed: false, logical: game, display: game, ready: false, started: false, jobs: [], fallingParts: [], releases: {},
    lifelines: LIFELINE_COUNT, bonusJob: null, abilities: freshAbilities(), moves: [], elapsedBefore: 0,
    frameIndex: -1, nextJobId: 1, round, seed, timerStartedAt: null, timerStoppedAt: null };
}
export function elapsedRunTime(run: RunState, now: number) {
  return run.elapsedBefore + (run.timerStartedAt === null ? 0 : Math.max(0, (run.timerStoppedAt ?? now) - run.timerStartedAt));
}
export function settledParts(run: Pick<RunState, "logical" | "fallingParts">): PartId[] {
  return run.logical.removedParts.filter((part) => !run.fallingParts.includes(part));
}
export function currentFrame(run: RunState): PlaybackFrame | null { return run.jobs[0]?.frames[run.frameIndex] ?? null; }

export function runReducer(run: RunState, action: RunAction): RunState {
  if (action.type === "check-dead-end") {
    if (action.round !== run.round || !run.started || !run.ready || run.jobs.length || run.fallingParts.length ||
      Object.values(run.releases).some(release => release && action.now < (release.dismissedAt ?? release.releasedAt + LOOSE_LIFETIME_MS) + SMOKE_DURATION_MS) || !hasNoSafeMove(run.logical, run.lifelines)) return run;
    const game: GameState = { ...run.logical, status: "lost", lossReason: "no-moves" };
    return { ...run, logical: game, display: game, timerStoppedAt: action.now };
  }
  if (action.type === "reset") return { ...createRun(action.game, action.seed, run.round + 1), ...action.checkpoint,
    started: action.enter ?? false, nextJobId: run.nextJobId + 1 };
  if (action.type === "ready") return action.round === run.round && !run.ready ? { ...run, ready: true } : run;
  if (action.type === "start") return run.started || !run.ready ? run : { ...run, started: true };
  if (action.type === "resume-clock") {
    return run.round === action.round && run.timerStartedAt === null && run.logical.screws.some((screw) => screw.removed) ?
      { ...run, timerStartedAt: action.now } : run;
  }
  if (action.type === "dismiss") {
    if (!run.started || run.logical.status !== "playing") return run;
    const release = run.releases[action.part];
    if (!release || release.dismissedAt !== undefined || action.now < release.releasedAt || action.now >= release.releasedAt + LOOSE_LIFETIME_MS) return run;
    return { ...run, releases: { ...run.releases, [action.part]: { ...release, dismissedAt: action.now } },
      fallingParts: run.fallingParts.filter((part) => part !== action.part) };
  }
  if (action.type === "fall-finished") {
    if (action.round !== run.round || !run.fallingParts.includes(action.part)) return run;
    return { ...run, fallingParts: run.fallingParts.filter((part) => part !== action.part) };
  }
  if (action.type === "find") {
    if (!run.started || run.logical.status !== "playing") return run;
    const abilities = settleAbilities(run.abilities, run.logical);
    if (abilities.finds === 0 || abilities.hint || !matchCandidates(run.logical).some((screw) => screw.id === action.screw)) return run;
    return { ...run, abilities: { ...abilities, finds: abilities.finds - 1, hint: action.screw }, moves: [...run.moves, `find:${action.screw}`] };
  }
  if (action.type === "boost") {
    if (!run.started || run.bonusJob !== null || run.lifelines === 0) return run;
    const { finalState, events } = planBonusBox(run.logical);
    if (!events.length) return run;
    const job = { id: run.nextJobId, frames: buildSequence(events), finalState, readyAt: action.now };
    return { ...run, logical: finalState, abilities: settleAbilities(run.abilities, finalState), jobs: [...run.jobs, job], nextJobId: job.id + 1,
      lifelines: run.lifelines - 1, bonusJob: job.id, moves: [...run.moves, "boost"] };
  }
  if (action.type === "select") {
    if (!run.started || run.logical.status !== "playing") return run;
    const screw = run.logical.screws.find((candidate) => candidate.id === action.id);
    // The scene can clear an active cover after checking its current mesh.
    const cleared = run.fallingParts.filter((part) => action.clearedParts?.includes(part));
    if (!screw || !isScrewAccessible({ ...run.logical, removedParts: [...settledParts(run), ...cleared] }, screw)) return run;
    const result = planScrewRemoval(run.logical, action.id);
    if (result.finalState === run.logical) return run;
    const job = { id: run.nextJobId, frames: buildSequence(result.events).filter((frame) => frame.kind !== "unscrew"),
      finalState: result.finalState, readyAt: action.now + SCREW_SPIN_MS };
    const detach = result.events.find((event) => event.kind === "detach");
    return { ...run, logical: result.finalState, abilities: settleAbilities(run.abilities, result.finalState), jobs: [...run.jobs, job], nextJobId: run.nextJobId + 1,
      moves: [...run.moves, action.id], fallingParts: detach ? [...run.fallingParts, detach.part] : run.fallingParts,
      releases: detach ? { ...run.releases, [detach.part]: { releasedAt: action.now } } : run.releases,
      timerStartedAt: run.timerStartedAt ?? action.now,
      timerStoppedAt: result.finalState.status === "playing" ? null : action.now };
  }
  const job = run.jobs[0];
  if (!job || job.id !== action.job) return run;
  if (action.type === "begin") return run.frameIndex !== -1 ? run : { ...run, frameIndex: 0, display: job.frames[0].game };
  if (run.frameIndex !== action.index) return run;
  const next = run.frameIndex + 1;
  if (next < job.frames.length) return { ...run, frameIndex: next, display: job.frames[next].game };
  const bonusClosed = run.bonusJob !== null && job.id >= run.bonusJob && !job.finalState.boxes[BONUS_SLOT];
  return { ...run, frameIndex: -1, display: job.finalState, jobs: run.jobs.slice(1),
    bonusJob: bonusClosed ? null : run.bonusJob };
}
