// CPU/source and render-buffer payload, not total browser/GPU/physics memory.
// Shared source arrays are counted once; batching creates its own vertex data.
import { LEVEL_MODELS } from "../src/scene/levelModels.ts";
import { geometryFor } from "../src/scene/geometry.ts";
import { modelBatches } from "../src/scene/modelBatches.ts";
import type { BufferGeometry } from "three";
function bytes(geometry: BufferGeometry) {
  const buffers = new Set<ArrayBufferLike>();
  for (const attribute of Object.values(geometry.attributes)) buffers.add(attribute.array.buffer);
  if (geometry.index) buffers.add(geometry.index.array.buffer);
  return [...buffers].reduce((sum, buffer) => sum + buffer.byteLength, 0);
}
const all = new Set<BufferGeometry>();
for (const [id, model] of Object.entries(LEVEL_MODELS)) {
  const source = new Set(model.pieces.map(geometryFor)); source.forEach(g => all.add(g));
  const batches = modelBatches(id as keyof typeof LEVEL_MODELS);
  console.log(JSON.stringify({ level: id, parts: model.parts.length, pieces: model.pieces.length,
    sourceMiB: +([...source].reduce((sum,g) => sum + bytes(g), 0) / 1048576).toFixed(2),
    renderMiB: +(batches.reduce((sum,b) => sum + bytes(b.geometry), 0) / 1048576).toFixed(2),
    triangles: batches.reduce((sum,b) => sum + (b.geometry.index?.count ?? b.geometry.getAttribute("position").count) / 3, 0),
    batches: batches.length }));
}
console.log("All unique source geometry MiB:", +([...all].reduce((sum,g) => sum + bytes(g),0) / 1048576).toFixed(2));
