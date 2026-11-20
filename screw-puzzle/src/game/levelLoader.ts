import type { LevelId } from "./types.ts";
import { installLevel } from "./installLevel.ts";
import { releaseLevelData } from "./levelData.ts";

export type LoadStage = "Downloading level" | "Building geometry";
async function build(level: LevelId, stage: (value: LoadStage) => void) {
  stage("Downloading level");
  switch (level) {
    case "cottage": {
      const [m, t] = await Promise.all([import("../scene/houseModel.ts"), import("./levels.ts")]);
      stage("Building geometry"); const data = m.createCottageModel();
      installLevel(level, data, undefined, () => t.createCottageTemplate(data)); return;
    }
    case "campsite": { const m = await import("../scene/campsiteModel.ts"); stage("Building geometry"); installLevel(level, m.createCampsiteModel()); return; }
    case "titanic": { const m = await import("../scene/titanicModel.ts"); stage("Building geometry"); installLevel(level, m.createTitanicModel()); return; }
    case "desert": {
      const [m,a] = await Promise.all([import("../scene/desertModel.ts"),import("../scene/desertAudit.ts")]);
      stage("Building geometry"); installLevel(level,m.createDesertModel(),{blockers:a.DESERT_BLOCKERS,exposed:a.DESERT_EXPOSED_IDS}); return;
    }
    case "construction": {
      const [m,a] = await Promise.all([import("../scene/constructionModel.ts"),import("../scene/constructionAudit.ts")]);
      stage("Building geometry"); installLevel(level,m.createConstructionModel(),{blockers:a.CONSTRUCTION_BLOCKERS,exposed:a.CONSTRUCTION_EXPOSED_IDS}); return;
    }
    case "carnival": {
      const [m,a] = await Promise.all([import("../scene/carnivalModel.ts"),import("../scene/carnivalAudit.ts")]);
      stage("Building geometry"); installLevel(level,m.createCarnivalModel(),{blockers:a.CARNIVAL_BLOCKERS,exposed:a.CARNIVAL_EXPOSED_IDS}); return;
    }
    case "zoo": {
      const [m,a] = await Promise.all([import("../scene/zooModel.ts"),import("../scene/zooAudit.ts")]);
      stage("Building geometry"); installLevel(level,m.createZooModel(),{blockers:a.ZOO_BLOCKERS,exposed:a.ZOO_EXPOSED_IDS}); return;
    }
    case "space": {
      const [m,a] = await Promise.all([import("../scene/spaceModel.ts"),import("../scene/spaceAudit.ts")]);
      stage("Building geometry"); installLevel(level,m.createSpaceModel(),{blockers:a.SPACE_BLOCKERS,exposed:a.SPACE_EXPOSED_IDS});
    }
  }
}
type Entry = { users: number; promise: Promise<void>; timer?: ReturnType<typeof setTimeout>; listeners: Set<(stage: LoadStage) => void> };
const entries = new Map<LevelId, Entry>();
export type LevelLease = { level: LevelId; release: () => void };
export async function acquireLevel(level: LevelId, onStage?: (value: LoadStage) => void): Promise<LevelLease> {
  let entry = entries.get(level);
  if (!entry) {
    entry = { users: 0, promise: Promise.resolve(), listeners: new Set() };
    const current = entry;
    entries.set(level, entry);
    entry.promise = build(level, value => current.listeners.forEach(listener => listener(value)));
  }
  clearTimeout(entry.timer); entry.users++;
  if (onStage) { entry.listeners.add(onStage); onStage("Downloading level"); }
  try { await entry.promise; }
  catch (error) {
    entry.users--;
    if (entry.users === 0) { releaseLevelData(level); entries.delete(level); }
    throw error;
  } finally { if (onStage) entry.listeners.delete(onStage); }
  let released = false;
  return { level, release: () => {
    if (released) return; released = true;
    if (--entry.users !== 0) return;
    // R3F unmounts its scene asynchronously. Allow it to stop drawing and free
    // its physics/materials before disposing shared source and merged buffers.
    entry.timer = setTimeout(() => {
      if (entry.users === 0 && entries.get(level) === entry) { releaseLevelData(level); entries.delete(level); }
    }, 650);
  } };
}
