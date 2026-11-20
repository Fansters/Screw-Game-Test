import { levelData } from "./levelData.ts";
import { SCREW_COLOR_ORDER } from "./types.ts";
import type { BoxTarget, GameState, MoveEvent, Screw, ScrewColor, Socket } from "./types.ts";

export const TRAY_CAPACITY = 5;
export const MATCH_SIZE = 3;
export const ACTIVE_BOX_COUNT = 2;
export const BONUS_SLOT = ACTIVE_BOX_COUNT;
type RecordEvent = (event: MoveEvent) => void;

export function isScrewAccessible(state: GameState, screw: Screw): boolean {
  return !screw.removed && (screw.obstructedBy ?? []).every((part) => state.removedParts.includes(part));
}

export function createInitialState(level: readonly Screw[] = levelData("cottage").template, targetColors?: readonly ScrewColor[]): GameState {
  const boxQueue: BoxTarget[] = [];
  const counts = SCREW_COLOR_ORDER.map((color) => level.filter((screw) => screw.color === color).length);
  if (targetColors) targetColors.forEach((color) => boxQueue.push({ id: `box-${boxQueue.length + 1}`, color }));
  else for (let round = 0; round < Math.ceil(Math.max(0, ...counts) / MATCH_SIZE); round += 1) {
    SCREW_COLOR_ORDER.forEach((color, index) => {
      if (counts[index] > round * MATCH_SIZE) boxQueue.push({ id: `box-${boxQueue.length + 1}`, color });
    });
  }
  return withStatus(settleBoxes({
    screws: level.map((screw) => ({ ...screw, position: [...screw.position], normal: [...screw.normal],
      solutionAfter: screw.solutionAfter ? [...screw.solutionAfter] : undefined,
      obstructedBy: screw.obstructedBy ? [...screw.obstructedBy] : undefined, removed: false })),
    tray: [], boxes: Array.from({ length: ACTIVE_BOX_COUNT }, () => null), boxQueue,
    clearedCount: 0, status: "playing", removedParts: [],
  }));
}

function withStatus(state: GameState): GameState {
  const won = state.screws.every((screw) => screw.removed) && state.tray.length === 0 &&
    state.boxes.every((box) => box === null) && state.boxQueue.length === 0;
  return { ...state, status: won ? "won" : state.tray.length === TRAY_CAPACITY ? "lost" : "playing" };
}

// Immutable intermediate states form the animation script as well as the final pure move.
function settleBoxes(state: GameState, record?: RecordEvent): GameState {
  let current = state;
  let changed: boolean;
  do {
    changed = false;
    for (let slot = 0; slot < current.boxes.length; slot += 1) {
      const full = current.boxes[slot];
      if (full?.screws.length === MATCH_SIZE) {
        const next = { ...current, clearedCount: current.clearedCount + MATCH_SIZE,
          boxes: slot === BONUS_SLOT ? current.boxes.slice(0, BONUS_SLOT) :
            current.boxes.map((box, index) => index === slot ? null : box) };
        record?.({ kind: "complete", slot, color: full.color, before: current, after: next });
        current = next;
        changed = true;
      }
      if (slot < ACTIVE_BOX_COUNT && !current.boxes[slot]) {
        const nextIndex = current.boxQueue.findIndex((target) => !current.boxes.some((box) => box?.color === target.color));
        if (nextIndex !== -1) {
          const target = current.boxQueue[nextIndex];
          const next = { ...current, boxQueue: current.boxQueue.filter((_, index) => index !== nextIndex),
            boxes: current.boxes.map((box, index) => index === slot ? { ...target, screws: [] } : box) };
          record?.({ kind: "replace", slot, color: target.color, before: current, after: next });
          current = next;
          changed = true;
        }
      }
      while (current.boxes[slot] && current.boxes[slot]!.screws.length < MATCH_SIZE) {
        const box = current.boxes[slot]!;
        const from = current.tray.findIndex((entry) => entry.color === box.color);
        if (from === -1) break;
        const entry = current.tray[from];
        const to: Socket = { kind: "box", slot, index: box.screws.length };
        const next = { ...current, tray: current.tray.filter((_, index) => index !== from),
          boxes: current.boxes.map((candidate, index) => index === slot ? { ...box, screws: [...box.screws, entry] } : candidate) };
        record?.({ kind: "transfer", screw: entry, from, to, before: current, after: next });
        current = next;
        changed = true;
      }
    }
  } while (changed);
  return current;
}

function executeMove(state: GameState, screwId: string, record?: RecordEvent): GameState {
  const screw = state.screws.find((candidate) => candidate.id === screwId);
  if (state.status !== "playing" || !screw || !isScrewAccessible(state, screw)) return state;
  const slot = state.boxes.findIndex((box) => box?.color === screw.color);
  if (slot === -1 && state.tray.length >= TRAY_CAPACITY) return state;
  const entry = { screwId, color: screw.color };
  const to: Socket = slot === -1 ? { kind: "tray", index: state.tray.length } :
    { kind: "box", slot, index: state.boxes[slot]!.screws.length };
  const collected: GameState = {
    ...state,
    screws: state.screws.map((candidate) => candidate.id === screwId ? { ...candidate, removed: true } : candidate),
    boxes: state.boxes.map((box, index) => box && index === slot ? { ...box, screws: [...box.screws, entry] } : box),
    tray: slot === -1 ? [...state.tray, entry] : state.tray,
  };
  record?.({ kind: "collect", screw: entry, to, before: state, after: collected });
  let current = settleBoxes(collected, record);
  for (const part of screw.attachedTo ? [screw.attachedTo] : []) {
    const fasteners = current.screws.filter((candidate) => candidate.attachedTo === part);
    if (!current.removedParts.includes(part) && fasteners.length > 0 && fasteners.every((candidate) => candidate.removed)) {
      const next = { ...current, removedParts: [...current.removedParts, part] };
      record?.({ kind: "detach", part, before: current, after: next });
      current = next;
    }
  }
  return withStatus(current);
}

export function removeScrew(state: GameState, screwId: string): GameState {
  return executeMove(state, screwId);
}

export function planScrewRemoval(state: GameState, screwId: string) {
  const events: MoveEvent[] = [];
  const finalState = executeMove(state, screwId, (event) => events.push(event));
  return { finalState, events };
}

function bonusTarget(state: GameState): BoxTarget | undefined {
  if (state.status !== "playing" || state.boxes[BONUS_SLOT]) return undefined;
  const eligible = state.boxQueue.filter((target) => !state.boxes.some((box) => box?.color === target.color));
  return eligible.find((target) => state.tray.some((entry) => entry.color === target.color)) ?? eligible[0];
}

export function canOpenBonusBox(state: GameState) {
  return Boolean(bonusTarget(state));
}

export function planBonusBox(state: GameState) {
  const target = bonusTarget(state);
  if (!target) return { finalState: state, events: [] };
  const next = { ...state, boxes: [...state.boxes, { ...target, screws: [] }], boxQueue: state.boxQueue.filter((box) => box !== target) };
  const events: MoveEvent[] = [{ kind: "bonus-open", slot: BONUS_SLOT, before: state, after: next }];
  return { finalState: withStatus(settleBoxes(next, (event) => events.push(event))), events };
}
