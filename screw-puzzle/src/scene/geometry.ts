import { BoxGeometry, BufferGeometry, ConeGeometry, CylinderGeometry, ExtrudeGeometry, Float32BufferAttribute, IcosahedronGeometry, Shape, SphereGeometry } from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { HOUSE } from "./houseModel.ts";
import type { Piece } from "./houseModel.ts";
import { CHEST_PART_IDS } from "../game/types.ts";
import type { ChestPartId } from "../game/types.ts";
import { CHEST_SURFACES } from "./chestModel.ts";
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
  cylinder: new CylinderGeometry(1, 0.9, 1, 16),
  ico: new IcosahedronGeometry(1, 1),
  cone: new ConeGeometry(1, 1, 12),
  "snow-slab": shadeSnow(new RoundedBoxGeometry(1, 1, 1, 2, 0.12), 0.5),
  "snow-drift": shadeSnow(new SphereGeometry(1, 20, 10), 1),
  star: new ExtrudeGeometry(star, { depth: 0.14, bevelEnabled: false }).translate(0, 0, -0.07),
  gable: new ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: false }).translate(0, 0, -0.06),
};
const chestGeometries = Object.fromEntries(CHEST_PART_IDS.map((part) => {
  const { positions, indices } = CHEST_SURFACES[part];
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  return [part, geometry];
})) as Record<ChestPartId, BufferGeometry>;
export function geometryFor(piece: Piece) {
  return piece.kind === "chest-surface" ? chestGeometries[piece.part] : PIECE_GEOMETRIES[piece.kind];
}
if (import.meta.hot) import.meta.hot.dispose(() => [...Object.values(PIECE_GEOMETRIES), ...Object.values(chestGeometries)].forEach((geometry) => geometry.dispose()));
