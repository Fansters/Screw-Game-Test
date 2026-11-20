import { BoxGeometry, BufferGeometry, ConeGeometry, CylinderGeometry, ExtrudeGeometry, Float32BufferAttribute, IcosahedronGeometry, Shape, SphereGeometry, TorusGeometry } from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { HOUSE } from "./houseConfig.ts";
import type { Piece } from "./houseModel.ts";
const shape = new Shape();
shape.moveTo(-HOUSE.halfWidth, 0); shape.lineTo(HOUSE.halfWidth, 0);
shape.lineTo(HOUSE.halfWidth, HOUSE.ridge - HOUSE.halfWidth * HOUSE.roofRise / HOUSE.roofRun - HOUSE.eave);
shape.lineTo(0, HOUSE.ridge - HOUSE.eave);
shape.lineTo(-HOUSE.halfWidth, HOUSE.ridge - HOUSE.halfWidth * HOUSE.roofRise / HOUSE.roofRun - HOUSE.eave);
shape.closePath();
const star = new Shape();
for (let index = 0; index < 10; index += 1) {
  const angle = Math.PI / 2 + index * Math.PI / 5, radius = index % 2 ? 0.19 : 0.4;
  if (index === 0) star.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
  else star.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
}
star.closePath();

function curtainGeometry() {
  const folds = new Shape();
  const steps = 48;
  // Trace the fabric thickness around the pleats, then extrude it down the window.
  const profile = (t: number) => 0.32 * Math.cos(t * 2 * Math.PI * 8);
  folds.moveTo(-0.5, profile(0) + 0.14);
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    folds.lineTo(t - 0.5, profile(t) + 0.14);
  }
  for (let i = steps; i >= 0; i -= 1) {
    const t = i / steps;
    folds.lineTo(t - 0.5, profile(t) - 0.14);
  }
  folds.closePath();
  return new ExtrudeGeometry(folds, { depth: 1, bevelEnabled: false }).rotateX(Math.PI / 2).translate(0, 0.5, 0);
}

function shadeSnow(geometry: BufferGeometry, halfHeight: number) {
  const position = geometry.getAttribute("position");
  const colors = new Float32Array(position.count * 3);
  for (let index = 0; index < position.count; index += 1) {
    const height = (1 + position.getY(index) / halfHeight) / 2;
    colors.set([0.54 + 0.46 * height, 0.69 + 0.31 * height, 0.86 + 0.14 * height], index * 3);
  }
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  return geometry;
}
export const PIECE_GEOMETRIES = {
  box: new BoxGeometry(1, 1, 1),
  cylinder: new CylinderGeometry(1, 0.9, 1, 22),
  ico: new IcosahedronGeometry(1, 1),
  "ico-detail": new IcosahedronGeometry(1, 2),
  ring: new TorusGeometry(1, 0.15, 8, 36).rotateX(-Math.PI / 2),
  cone: new ConeGeometry(1, 1, 20),
  curtain: curtainGeometry(),
  "snow-slab": shadeSnow(new RoundedBoxGeometry(1, 1, 1, 2, 0.12), 0.5),
  "snow-drift": shadeSnow(new SphereGeometry(1, 23, 10), 1),
  star: new ExtrudeGeometry(star, { depth: 0.14, bevelEnabled: false }).translate(0, 0, -0.07),
  gable: new ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: false }).translate(0, 0, -0.06),
};
export function geometryFor(piece: Piece) {
  return piece.geometry ?? PIECE_GEOMETRIES[piece.kind];
}
if (import.meta.hot) import.meta.hot.dispose(() => Object.values(PIECE_GEOMETRIES).forEach((geometry) => geometry.dispose()));
