import { Object3D } from "three";
import type { BufferGeometry } from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { PartId } from "../game/types.ts";
import { PIECES } from "./houseModel.ts";
import { geometryFor } from "./geometry.ts";

// Preserve independently falling parts, but draw same-color details together.
// The original convex pieces remain the source for obstruction calculations.
const groups = new Map<string, { part: PartId; color: string; smooth: boolean; pieces: BufferGeometry[] }>();
const transform = new Object3D();
for (const piece of PIECES) {
  const original = geometryFor(piece);
  const geometry = original.index ? original.toNonIndexed() : original.clone();
  transform.position.set(...piece.position); transform.scale.set(...piece.size);
  transform.rotation.set(...(piece.rotation ?? [0, 0, 0])); transform.updateMatrix();
  geometry.applyMatrix4(transform.matrix);
  const smooth = piece.kind === "snow-slab" || piece.kind === "snow-drift";
  const key = `${piece.part}:${piece.color}:${smooth}`;
  if (!groups.has(key)) groups.set(key, { part: piece.part, color: piece.color, smooth, pieces: [] });
  groups.get(key)!.pieces.push(geometry);
}
export const MODEL_BATCHES = [...groups.values()].map((group) => {
  const geometry = mergeGeometries(group.pieces);
  group.pieces.forEach((piece) => piece.dispose());
  if (!geometry) throw new Error(`Could not merge ${group.part} details`);
  return { part: group.part, color: group.color, smooth: group.smooth, geometry };
});
groups.clear();
if (import.meta.hot) import.meta.hot.dispose(() => MODEL_BATCHES.forEach((batch) => batch.geometry.dispose()));
