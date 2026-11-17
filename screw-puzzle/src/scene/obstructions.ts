import { DoubleSide, Matrix3, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from "three";
import type { Object3D } from "three";
import type { PartId } from "../game/types.ts";
import { PIECES } from "./houseModel.ts";
import { geometryFor } from "./geometry.ts";
import { SCREW_PULL_DISTANCE } from "./screwDimensions.ts";

// Geometry-derived clearance is independent of color, camera, and React. Cache it
// in level data; camera picking separately prevents clicks through solid objects.
const material = new MeshBasicMaterial({ side: DoubleSide });
const solids = PIECES.map((piece) => {
  const mesh = new Mesh(geometryFor(piece), material);
  mesh.position.set(...piece.position); mesh.scale.set(...piece.size);
  if (piece.rotation) mesh.rotation.set(...piece.rotation);
  mesh.updateMatrixWorld();
  return { mesh, part: piece.part, normalMatrix: new Matrix3().getNormalMatrix(mesh.matrixWorld) };
});

export function findScrewObstructions(screw: { position: [number, number, number]; normal: [number, number, number]; attachedTo?: PartId }, scale: number,
  live?: { root: Object3D; part: PartId }): PartId[] {
  let colliders = solids;
  if (live) {
    colliders = [];
    live.root.updateWorldMatrix(true, false);
    for (const solid of solids.filter((solid) => solid.part === live.part)) {
      // The named group maps original model coordinates into the falling pose.
      // Keep individual pieces even though rendering merges same-color geometry.
      const mesh = new Mesh(solid.mesh.geometry, material);
      mesh.matrixWorld.multiplyMatrices(live.root.matrixWorld, solid.mesh.matrixWorld);
      colliders.push({ mesh, part: live.part, normalMatrix: new Matrix3().getNormalMatrix(mesh.matrixWorld) });
    }
  }
  const normal = new Vector3(...screw.normal);
  const face = new Vector3(...screw.position).addScaledVector(normal, scale * 0.144);
  const across = new Vector3().crossVectors(normal, Math.abs(normal.y) < 0.9 ? new Vector3(0, 1, 0) : new Vector3(1, 0, 0)).normalize();
  const up = new Vector3().crossVectors(normal, across).normalize();
  const samples = [face];
  for (let index = 0; index < 8; index += 1) {
    const angle = index * Math.PI / 4;
    samples.push(face.clone().addScaledVector(across, Math.cos(angle) * scale * 0.24).addScaledVector(up, Math.sin(angle) * scale * 0.24));
  }
  const ray = new Raycaster();
  const blocked = new Set<PartId>();
  for (const solid of colliders) {
    if (solid.part === screw.attachedTo || blocked.has(solid.part)) continue;
    for (const sample of samples) {
      ray.set(sample, normal);
      const hit = ray.intersectObject(solid.mesh, false)[0];
      if (!hit) continue;
      // An outward-facing first hit means the sample starts INSIDE this solid,
      // including deep covers whose exit lies beyond the short spin-out path.
      const inside = hit.face && hit.face.normal.clone().applyNormalMatrix(solid.normalMatrix).dot(normal) > 0.00001;
      if (inside || hit.distance < scale * SCREW_PULL_DISTANCE + 0.01) { blocked.add(solid.part); break; }
    }
  }
  return [...blocked];
}

if (import.meta.hot) import.meta.hot.dispose(() => material.dispose());
