import { BufferGeometry, ConeGeometry, CylinderGeometry, Float32BufferAttribute, LatheGeometry, TorusGeometry, Vector2 } from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { SCREW_HEAD_WIDTH_SCALE, SCREW_SHAFT_LENGTH } from "../scene/screwDimensions.ts";

function mergeParts(parts: BufferGeometry[]) {
  const result = mergeGeometries(parts);
  parts.forEach((part) => part.dispose());
  if (!result) throw new Error("Could not build screw geometry");
  return result;
}

// A shallow pan head with a rounded shoulder, rather than a flat disk or ball.
// Radius/height pairs also let the dark cross follow the crown without floating.
const crown: readonly (readonly [number, number])[] = [
  [0, .178], [.08, .174], [.14, .164], [.19, .148],
  [.225, .128], [.244, .102], [.25, .07],
];
function crownHeight(radius: number) {
  const i = crown.findIndex(([r]) => r >= radius);
  if (i <= 0) return crown[Math.max(0, i)][1];
  const [a, z] = crown[i - 1], [b, next] = crown[i];
  return z + (next - z) * (radius - a) / (b - a);
}
function curvedCrossBar(vertical: boolean) {
  const vertices: number[] = [], indices: number[] = [], steps = 12;
  for (let row = 0; row <= steps; row++) for (let col = 0; col <= 2; col++) {
    const along = -.15 + .3 * row / steps, across = -.025 + .025 * col;
    const x = vertical ? across : along, y = vertical ? along : across;
    vertices.push(x, y, crownHeight(Math.hypot(x, y)) + .0015);
  }
  for (let row = 0; row < steps; row++) for (let col = 0; col < 2; col++) {
    const i = row * 3 + col;
    indices.push(...(vertical ? [i, i + 1, i + 3, i + 1, i + 4, i + 3] : [i, i + 3, i + 1, i + 1, i + 3, i + 4]));
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}
// Three shared geometries, batched into instanced draws by ScrewField.
export const headGeometry = new LatheGeometry([
  new Vector2(0, 0), new Vector2(.22, 0), new Vector2(.24, .01),
  new Vector2(.25, .035), ...[...crown].reverse().map(([r, z]) => new Vector2(r, z)),
], 32).rotateX(Math.PI / 2).scale(SCREW_HEAD_WIDTH_SCALE, SCREW_HEAD_WIDTH_SCALE, 1);
export const recessGeometry = mergeParts([curvedCrossBar(false), curvedCrossBar(true)])
  .scale(SCREW_HEAD_WIDTH_SCALE, SCREW_HEAD_WIDTH_SCALE, 1);
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
