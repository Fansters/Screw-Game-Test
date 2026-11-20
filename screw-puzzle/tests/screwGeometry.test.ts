import assert from "node:assert/strict";
import { test } from "node:test";
import { headGeometry, recessGeometry, shaftGeometry } from "../src/components/screwGeometry.ts";
import { SCREW_HEAD_RADIUS, SCREW_HEAD_WIDTH_SCALE, SCREW_SHAFT_LENGTH } from "../src/scene/screwDimensions.ts";

test("the screw cap and cross grow 15% across while head height and shaft length stay fixed", () => {
  for (const geometry of [headGeometry, recessGeometry, shaftGeometry]) geometry.computeBoundingBox();
  const head = headGeometry.boundingBox!, cross = recessGeometry.boundingBox!, shaft = shaftGeometry.boundingBox!;
  const near = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} differs from ${expected}`);
  near(SCREW_HEAD_WIDTH_SCALE, 1.15);
  near(head.max.x - head.min.x, SCREW_HEAD_RADIUS * 2);
  near(head.max.y - head.min.y, SCREW_HEAD_RADIUS * 2);
  near(head.max.z, 0.135 + 0.018 * Math.sin(Math.PI / 3));
  near(cross.max.x - cross.min.x, 0.3 * 1.15);
  near(cross.max.z, 0.144);
  near(shaft.min.z, -SCREW_SHAFT_LENGTH);
  near(shaft.max.x, 0.098);
});
