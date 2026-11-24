import assert from "node:assert/strict";
import { test } from "node:test";
import { Mesh, MeshBasicMaterial, Raycaster, Vector3 } from "three";
import { headGeometry, recessGeometry, shaftGeometry } from "../src/components/screwGeometry.ts";
import { SCREW_HEAD_RADIUS, SCREW_HEAD_WIDTH_SCALE, SCREW_SHAFT_LENGTH } from "../src/scene/screwDimensions.ts";

test("all screw caps grow another 25% with a shallow curved crown and unchanged shafts", () => {
  for (const geometry of [headGeometry, recessGeometry, shaftGeometry]) geometry.computeBoundingBox();
  const head = headGeometry.boundingBox!, cross = recessGeometry.boundingBox!, shaft = shaftGeometry.boundingBox!;
  const near = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} differs from ${expected}`);
  near(SCREW_HEAD_WIDTH_SCALE / 1.15, 1.25);
  near(head.max.x - head.min.x, SCREW_HEAD_RADIUS * 2);
  near(head.max.y - head.min.y, SCREW_HEAD_RADIUS * 2);
  near(head.max.z, .178);
  near(cross.max.x - cross.min.x, 0.3 * SCREW_HEAD_WIDTH_SCALE);
  assert.ok(cross.max.z - cross.min.z > .01, "The cross follows the curved crown");
  near(shaft.min.z, -SCREW_SHAFT_LENGTH);
  near(shaft.max.x, 0.098);
  const material = new MeshBasicMaterial(), mesh = new Mesh(headGeometry, material);
  const ray = new Raycaster(), vertices = recessGeometry.getAttribute("position"), normals = recessGeometry.getAttribute("normal");
  for (let i = 0; i < vertices.count; i++) {
    const vertex = new Vector3().fromBufferAttribute(vertices, i);
    ray.set(vertex.clone().add(new Vector3(0, 0, 1)), new Vector3(0, 0, -1));
    const hit = ray.intersectObject(mesh)[0];
    assert.ok(hit && vertex.z > hit.point.z && vertex.z - hit.point.z < .004, "Cross stays just above the head, without sinking or floating");
    assert.ok(normals.getZ(i) > .8, "Both cross bars face outwards");
  }
  material.dispose();
});
