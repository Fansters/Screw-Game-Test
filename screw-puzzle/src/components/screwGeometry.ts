import { BoxGeometry, ConeGeometry, CylinderGeometry, TorusGeometry } from "three";
import type { BufferGeometry } from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { SCREW_SHAFT_LENGTH } from "../scene/screwDimensions.ts";

function mergeParts(parts: BufferGeometry[]) {
  const result = mergeGeometries(parts);
  parts.forEach((part) => part.dispose());
  if (!result) throw new Error("Could not build screw geometry");
  return result;
}

// Three shared geometries, batched into instanced draws by ScrewField.
export const headGeometry = mergeParts([
  new CylinderGeometry(0.25, 0.22, 0.14, 24).rotateX(Math.PI / 2).translate(0, 0, 0.07),
  new TorusGeometry(0.225, 0.018, 6, 24).translate(0, 0, 0.135),
]);
export const recessGeometry = mergeParts([
  new BoxGeometry(0.3, 0.05, 0.006).translate(0, 0, 0.141),
  new BoxGeometry(0.05, 0.3, 0.006).translate(0, 0, 0.141),
]);
export const shaftGeometry = mergeParts([
  new CylinderGeometry(0.075, 0.075, 0.42, 12).rotateX(Math.PI / 2).translate(0, 0, -0.21),
  ...[-0.06, -0.12, -0.18, -0.24, -0.3, -0.36].map((z) => new TorusGeometry(0.08, 0.018, 5, 12).translate(0, 0, z)),
  new ConeGeometry(0.075, SCREW_SHAFT_LENGTH - 0.42, 12).rotateX(-Math.PI / 2)
    .translate(0, 0, -(0.42 + SCREW_SHAFT_LENGTH) / 2),
]);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    headGeometry.dispose();
    recessGeometry.dispose();
    shaftGeometry.dispose();
  });
}
