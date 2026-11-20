import type { LevelId, Screw } from "./types.ts";
import { releaseModel } from "../scene/levelModels.ts";
export type LevelData = { template: readonly Screw[]; opening?: ReadonlySet<string> };
const loaded = new Map<LevelId, LevelData>();
export function registerLevelData(level: LevelId, data: LevelData) { loaded.set(level, data); }
export function levelData(level: LevelId): LevelData {
  const data = loaded.get(level);
  if (!data) throw new Error(`Level ${level} must finish loading first`);
  return data;
}
export function loadedLevelIds() { return [...loaded.keys()]; }
export function releaseLevelData(level: LevelId) { loaded.delete(level); releaseModel(level); }
