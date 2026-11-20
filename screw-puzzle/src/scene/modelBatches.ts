import { Object3D } from "three";
import type { BufferGeometry } from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { LevelId } from "../game/campaign.ts";
import type { PartId } from "../game/types.ts";
import { geometryFor } from "./geometry.ts";
import { LEVEL_MODELS, onLevelRelease } from "./levelModels.ts";

// Preserve independently falling parts, but draw same-color details together.
// The original pieces remain the source for obstruction calculations.
function buildBatches(level: LevelId) {
  const groups = new Map<string, { part: PartId; color: string; smooth: boolean; pieces: BufferGeometry[] }>();
  const transform = new Object3D();
  for (const piece of LEVEL_MODELS[level].pieces) {
    const original = geometryFor(piece);
    const geometry = original.index ? original.toNonIndexed() : original.clone();
    // Procedural materials are solid colors and do not sample texture coordinates.
    geometry.deleteAttribute("uv");
    transform.position.set(...piece.position); transform.scale.set(...piece.size);
    transform.rotation.set(...(piece.rotation ?? [0, 0, 0])); transform.updateMatrix();
    geometry.applyMatrix4(transform.matrix);
    const smooth = geometry.hasAttribute("color");
    const key = `${piece.part}:${piece.color}:${smooth}`;
    if (!groups.has(key)) groups.set(key, { part: piece.part, color: piece.color, smooth, pieces: [] });
    groups.get(key)!.pieces.push(geometry);
  }
  return [...groups.values()].map((group) => {
    const geometry = mergeGeometries(group.pieces);
    group.pieces.forEach((piece) => piece.dispose());
    if (!geometry) throw new Error(`Could not merge ${group.part} details`);
    return { part: group.part, color: group.color, smooth: group.smooth, geometry };
  });
}
const batchesByLevel: Partial<Record<LevelId, ReturnType<typeof buildBatches>>> = {};
export function modelBatches(level: LevelId) { return batchesByLevel[level] ??= buildBatches(level); }
onLevelRelease(level => { batchesByLevel[level]?.forEach(batch => batch.geometry.dispose()); delete batchesByLevel[level]; });
if (import.meta.hot) import.meta.hot.dispose(() => Object.values(batchesByLevel).flat().forEach((batch) => batch.geometry.dispose()));
