import assert from "node:assert/strict";
import { test } from "node:test";
import { DoubleSide, Mesh, MeshBasicMaterial, Raycaster, SphereGeometry, Vector3 } from "three";
import { SPACE_BLOCKERS, SPACE_EXPOSED_IDS } from "../src/scene/spaceAudit.ts";
import { SPACE_MODEL, SPACE_CURVED_GEOMETRY, SPACE_BASE_SEGMENTS, SPACE_RINGS } from "../src/scene/spaceModel.ts";
import { findScrewObstructions } from "../src/scene/obstructions.ts";
import { generateSoloPuzzle, soloLevelTemplate } from "../src/game/soloLevels.ts";
import { SCREW_SCALE } from "../src/game/levels.ts";
import { createInitialState, isScrewAccessible, removeScrew } from "../src/game/rules.ts";
import { findExposedScrews } from "../src/scene/exposure.ts";
import { geometryFor } from "../src/scene/geometry.ts";
import { createPartPhysics, initPartPhysics } from "../src/scene/partPhysics.ts";

test("Moonbase Odyssey has 225 natural fixings, all removable owners, detailed space hardware and varied winning seeds", () => {
  const baseline=new SphereGeometry(1,SPACE_BASE_SEGMENTS,SPACE_RINGS);
  assert.equal(SPACE_CURVED_GEOMETRY.index!.count,Math.round(baseline.index!.count*1.4));baseline.dispose();
  const template=soloLevelTemplate("space");
  assert.equal(template.length,225);assert.equal(template.length%3,0);
  assert.deepEqual(new Set(template.map(s=>s.attachedTo)),new Set(SPACE_MODEL.parts));
  assert.ok(template.filter(s=>s.normal[1]<.9).length>template.length/2);
  for(const p of SPACE_MODEL.parts)assert.ok(template.filter(s=>s.attachedTo===p).length<=3,p);
  for(const id of ["space-rocket-nose","space-rover-stereo-camera","space-radar-bowl","space-comms-antenna","space-solar-panel-1","space-greenhouse-glass-3","space-telescope-optics","space-crystal-cluster-0"] as const)assert.ok(SPACE_MODEL.parts.includes(id),id);
  assert.deepEqual(template.map(s=>findScrewObstructions(s,SCREW_SCALE)),SPACE_BLOCKERS);
  const exposed=new Set(findExposedScrews(createInitialState(template),"space"));assert.deepEqual(exposed,new Set(SPACE_EXPOSED_IDS));
  assert.ok(exposed.size>0&&exposed.size<template.length);
  const seeds=new Set<number>();
  for(let i=0;i<30;i++){
    const puzzle=generateSoloPuzzle("space",Math.imul(i+1,2654435761)>>>0);seeds.add(puzzle.seed);
    for(const box of puzzle.state.boxes){const n=puzzle.state.screws.filter(s=>exposed.has(s.id)&&s.color===box!.color).length;assert.ok(n>=1&&n<=2);}
    const end=puzzle.solution.reduce(removeScrew,puzzle.state);assert.equal(end.status,"won");assert.equal(end.removedParts.length,SPACE_MODEL.parts.length);
  }
  assert.ok(seeds.size>20,"fresh colours should not repeatedly fall back to one seed");
});
function solids() {
  const material = new MeshBasicMaterial({ side: DoubleSide });
  return {
    material,
    objects: SPACE_MODEL.pieces.map((p) => {
      const mesh = new Mesh(geometryFor(p), material);
      mesh.position.set(...p.position);
      mesh.scale.set(...p.size);
      if (p.rotation) mesh.rotation.set(...p.rotation);
      mesh.updateMatrixWorld();
      return { mesh, part: p.part };
    }),
  };
}
test("each space head is attached to its own object and has a viewing path in a full solution", () => {
  const { material, objects } = solids(),
    ray = new Raycaster(),
    views: Vector3[] = [];
  for (const e of [
    -1.2, -0.65, -0.3, -0.12, 0, 0.12, 0.3, 0.45, 0.65, 0.85, 1.2,
  ])
    for (let a = 0; a < 32; a++)
      views.push(
        new Vector3(
          Math.cos((a * Math.PI) / 16) * Math.cos(e) * 9,
          Math.sin(e) * 9,
          Math.sin((a * Math.PI) / 16) * Math.cos(e) * 9,
        ),
      );
  const detached: string[] = [],
    hidden: string[] = [];
  for (const seed of [245, 7, 123]) {
    const p = generateSoloPuzzle("space", seed);
    let state = p.state;
    for (const id of p.solution) {
      const s = state.screws.find((s) => s.id === id)!,
        normal = new Vector3(...s.normal),
        face = new Vector3(...s.position).addScaledVector(
          normal,
          SCREW_SCALE * 0.144,
        );
      assert.ok(isScrewAccessible(state, s));
      ray.set(face, normal.clone().negate());
      ray.far = 0.26;
      if (
        !objects
          .filter((o) => o.part === s.attachedTo)
          .some((o) => ray.intersectObject(o.mesh, false).length)
      )
        detached.push(`${id} ${s.attachedTo}`);
      const standing = objects.filter(
        (o) => !state.removedParts.includes(o.part),
      );
      if (
        !views.some((offset) => {
          if (offset.dot(normal) < offset.length() * 0.08) return false;
          ray.set(
            face.clone().add(offset),
            offset.clone().negate().normalize(),
          );
          ray.far = offset.length() - 0.002;
          return !standing.some(
            (o) => ray.intersectObject(o.mesh, false).length,
          );
        })
      )
        hidden.push(`${id} ${s.attachedTo}`);
      state = removeScrew(state, id);
    }
    assert.equal(state.status, "won");
  }
  material.dispose();
  assert.deepEqual({ detached, hidden }, { detached: [], hidden: [] });
});
test("every space assembly has Rapier collisions and the shared one-second poof", async () => {
  await initPartPhysics();
  const physics = createPartPhysics([], "space");
  try {
    let now = 1000;
    for (const part of SPACE_MODEL.parts) {
      physics.release(part, now);
      assert.ok(physics.read()[part], part);
      physics.advance(now + 1050);
      assert.equal(physics.read()[part]?.poof?.at, now + 1000, part);
      now += 2500;
    }
  } finally {
    physics.free();
  }
});

// Cover-to-owner layers are sequential: the hidden fixing appears only after
// its cover (and that cover's screws) have gone. Other neighbors need real room.
test("Moonbase Odyssey heads have physical clearance and comfortable spacing on shared surfaces", () => {
  const screws = soloLevelTemplate("space");
  const headDiameter = 0.5 * SCREW_SCALE;
  for (let i = 0; i < screws.length; i++)
    for (let j = i + 1; j < screws.length; j++) {
      const a = screws[i],
        b = screws[j];
      if (
        a.attachedTo !== b.attachedTo &&
        (a.obstructedBy?.includes(b.attachedTo!) ||
          b.obstructedBy?.includes(a.attachedTo!))
      )
        continue;
      const delta = new Vector3(...b.position).sub(new Vector3(...a.position));
      const normal = new Vector3(...a.normal),
        otherNormal = new Vector3(...b.normal);
      const sameSurface =
        normal.dot(otherNormal) > 0.8 &&
        Math.abs(delta.dot(normal)) < 0.28 * SCREW_SCALE;
      assert.ok(
        delta.length() >= (sameSurface ? 1.8 : 1.1) * headDiameter - 1e-6,
        a.id +
          " (" +
          a.attachedTo +
          ") crowds " +
          b.id +
          " (" +
          b.attachedTo +
          ")",
      );
    }
});
