import { Euler, Matrix4, Vector3 } from "three";
import { ConvexGeometry } from "three/addons/geometries/ConvexGeometry.js";
import type { Screw, TitanicPartId } from "../game/types.ts";
import type { Piece, Vector } from "./houseModel.ts";
import { geometryFor } from "./geometry.ts";
import { makeWaterBlocks } from "./titanicWater.ts";

type Mount = Pick<Screw, "position" | "normal" | "solutionAfter"> & { attachedTo: TitanicPartId };
const pieces: Piece[] = [];
const pivots: Record<TitanicPartId, Vector> = {};
export const TITANIC_MOUNTS: Mount[] = [];
const waterMounts: Mount[] = [];

const cream = "#f3ead8", white = "#fff9ed", teak = "#bd8d60", wood = "#744c36";
const navy = "#182237", red = "#a3363c", brass = "#dacc87", glass = "#426476";

// Cross sections run from the rounded stern to the narrow bow.
const widths = [0.25, 1.77, 2.37, 2.50, 2.53, 2.47, 2.18, 1.56, 0.09];
const bayLength = 2.8;
const lengthScale = 0.56 * 1.1;
const beamScale = 1.26;
const heightScale = 0.9;

for (let bay = 0; bay < widths.length - 1; bay += 1) {
  const x = (bay - 3.5) * bayLength;
  const left = widths[bay], right = widths[bay + 1], width = (left + right) / 2;
  const half = bayLength / 2 - 0.002;
  const at = (u: number) => width + (right - left) * u / bayLength;
  const id = (name: string): TitanicPartId => `ship-${name}-${bay + 1}`;
  const deck = id("boat-deck"), cabinDeck = id("cabin-deck"), saloonDeck = id("saloon-deck");
  const top = id(["stern-mast", "skylight", "funnel-four", "funnel-three", "funnel-two", "funnel-one", "bridge", "bow-mast"][bay]);
  const sides = [-1, 1] as const;
  const side = (value: number) => value < 0 ? "port" : "starboard";
  const gear = sides.map((s) => id(`${bay === 0 || bay === 7 ? "winch" : "lifeboat"}-${side(s)}`));
  const promenade = sides.map((s) => id(`promenade-${side(s)}`));
  const upperHull = sides.map((s) => id(`hull-${side(s)}`));
  const lowerHull = sides.map((s) => id(`bilge-${side(s)}`));
  const mount = (part: TitanicPartId, u: number, y: number, z: number, after?: TitanicPartId[], normal: Vector = [0, 1, 0]) =>
    TITANIC_MOUNTS.push({ attachedTo: part, position: [x + u, y, z], normal, solutionAfter: after });
  const add = (part: TitanicPartId, kind: Piece["kind"], u: number, y: number, z: number, size: Vector, color: string, rotation?: Vector) => {
    const position: Vector = [x + u, y, z];
    pivots[part] ??= position;
    pieces.push({ part, kind, position, size, color, rotation });
  };
  const box = (part: TitanicPartId, u: number, y: number, z: number, size: Vector, color: string, rotation?: Vector) =>
    add(part, "box", u, y, z, size, color, rotation);
  const cylinder = (part: TitanicPartId, u: number, y: number, z: number, radius: number, height: number, color: string, rotation?: Vector) =>
    add(part, "cylinder", u, y, z, [radius, height, radius], color, rotation);
  const round = (part: TitanicPartId, u: number, y: number, z: number, size: Vector, color: string) =>
    add(part, "snow-slab", u, y, z, size, color);

  // Loft between two sections so plates follow the tapered hull without intersecting neighboring bays.
  function loft(part: TitanicPartId, bottom: number, topY: number, color: string,
    innerBottom: number, outerBottom: number, innerTop: number, outerTop: number, span = [-half, half]) {
    const y = (bottom + topY) / 2;
    const points = span.flatMap((u) => [
      new Vector3(u, bottom - y, at(u) * innerBottom), new Vector3(u, bottom - y, at(u) * outerBottom),
      new Vector3(u, topY - y, at(u) * innerTop), new Vector3(u, topY - y, at(u) * outerTop),
    ]);
    const position: Vector = [x, y, 0];
    pivots[part] ??= position;
    pieces.push({ part, kind: "box", position, size: [1, 1, 1], color, geometry: new ConvexGeometry(points) });
  }

  loft(deck, 2.17, 2.34, teak, -0.98, 0.98, -0.98, 0.98);
  loft(cabinDeck, 0.91, 1.05, wood, -0.91, 0.91, -0.91, 0.91);
  loft(saloonDeck, -0.46, -0.31, "#927762", -0.87, 0.87, -0.87, 0.87);
  for (const z of [-0.65, -0.34, 0, 0.34, 0.65]) {
    const slant = Math.atan2(-z * (right - left), bayLength);
    box(deck, 0, 2.343, z * width, [2.76, 0.008, 0.015], "#98724e", [0, slant, 0]);
    box(cabinDeck, 0, 1.053, z * width, [2.76, 0.008, 0.016], "#a87458", [0, slant, 0]);
  }

  // Casing plates, gold sheer stripe, portlights, and a white open promenade.
  for (const [index, s] of sides.entries()) {
    const facade = promenade[index], hull = upperHull[index], bilge = lowerHull[index];
    const nearEdge = 0.86, rim = 0.96;
    loft(hull, -0.75, 0.92, navy, s * 0.85, s, s * 0.91, s);
    loft(hull, 0.86, 1.025, brass, s * 0.91, s * 1.005, s * 0.91, s * 1.005);
    loft(bilge, -2.42, -1.78, "#852d35", 0, s * 0.63, s * 0.54, s * 0.82);
    loft(bilge, -1.78, -0.72, red, s * 0.60, s * 0.82, s * 0.86, s);
    loft(facade, 1.02, 1.39, white, s * nearEdge, s * rim, s * nearEdge, s * rim);
    loft(facade, 1.88, 2.17, cream, s * nearEdge, s * rim, s * nearEdge, s * rim);
    // The promenade runs outside the actual cabin wall.
    loft(facade, 1.05, 1.91, cream, s * 0.67, s * 0.715, s * 0.67, s * 0.715);
    loft(deck, 2.59, 2.625, white, s * 0.941, s * 0.955, s * 0.941, s * 0.955);
    if (bay === 0 || bay === 7) {
      const end = bay === 0 ? -half : half;
      // Overlap the bands slightly and offset their end faces to seal the seams without flicker.
      let band = 0;
      function cap(part: TitanicPartId, bottom: number, topY: number, color: string, lowerWidth: number, upperWidth: number) {
        const tip = end + Math.sign(end) * (0.009 + band * 0.002);
        loft(part, bottom, topY + 0.004, color, 0, s * lowerWidth, 0, s * upperWidth, [end * 0.89, tip]);
        band += 1;
      }
      cap(bilge, -2.42, -1.78, "#852d35", 0.628, 0.818);
      cap(bilge, -1.78, -0.75, red, 0.818, 0.998);
      cap(hull, -0.75, 0.86, navy, 0.998, 0.998);
      cap(hull, 0.86, 1.025, brass, 1.002, 1.002);
      cap(facade, 1.025, 2.17, white, 0.958, 0.958);
    }
    for (const u of [-1.16, -0.58, 0, 0.58, 1.16]) {
      box(facade, u, 1.63, at(u) * s * 0.915, [0.085, 0.55, 0.15], cream);
      box(deck, u, 2.47, at(u) * s * 0.947, [0.045, 0.26, 0.045], white);
      box(facade, u + 0.17, 1.64, at(u + 0.17) * s * 0.72, [0.24, 0.29, 0.028], glass,
        [0, Math.atan2(-s * 0.72 * (right - left), bayLength), 0]);
      cylinder(hull, u, 0.41, at(u) * s * 1.002, 0.084, 0.034, brass, [Math.PI / 2, 0, 0]);
      cylinder(hull, u, 0.41, at(u) * s * 1.012, 0.057, 0.037, glass, [Math.PI / 2, 0, 0]);
    }
    // The fasteners are on the inside flanges, behind the decks they support.
    for (const u of [-0.70, 0.70]) {
      const rail = (fraction: number) => at(u) * s * fraction;
      box(facade, u, 1.978, rail(0.78), [0.28, 0.075, 0.30], cream);
      mount(facade, u, 2.016, rail(0.78), [deck]);
      box(hull, u, 0.76, rail(0.79), [0.30, 0.075, 0.32], navy);
      mount(hull, u, 0.798, rail(0.79), [cabinDeck]);
      const bilgeU = bay === 7 && u > 0 ? 0.46 : u;
      const bilgeZ = at(bilgeU) * s * 0.77;
      mount(bilge, bilgeU, -0.868, bilgeZ, [saloonDeck]);
      // Move one screw per bay to the water while keeping both bilge panels removable.
      if (s < 0 && u > 0) waterMounts.push(TITANIC_MOUNTS.at(-1)!);
      else box(bilge, bilgeU, -0.91, bilgeZ, [0.30, 0.08, 0.35], red);
    }
  }

  // Four raked buff funnels and their black caps, with bridge, skylight and masts at the ends.
  box(top, 0, 2.43, 0, [1.74, 0.17, Math.min(1.32, width * 1.06)], cream);
  if (bay >= 2 && bay <= 5) {
    const rake: Vector = [0, 0, 0.16];
    cylinder(top, -0.01, 2.69, 0, 0.52, 0.40, "#f2e3c6", rake);
    cylinder(top, -0.16, 3.62, 0, 0.44, 1.72, "#d89a52", rake);
    cylinder(top, -0.31, 4.49, 0, 0.455, 0.35, navy, rake);
    cylinder(top, -0.34, 4.665, 0, 0.36, 0.026, "#373b49", rake);
    box(top, 0, 2.70, 0, [0.94, 0.14, 0.92], wood);
  } else if (bay === 6 || bay === 1) {
    const bridge = bay === 6;
    box(top, 0, 2.75, 0, [1.05, 0.51, bridge ? 1.74 : 1.13], white);
    round(top, -0.05, 3.025, 0, [1.12, 0.13, bridge ? 1.85 : 1.24], teak);
    for (const z of [-0.36, -0.12, 0.12, 0.36]) box(top, 0.535, 2.82, z, [0.04, 0.16, 0.15], glass);
    for (const s of sides) for (const u of [-0.28, 0, 0.28]) {
      box(top, u, 2.82, s * (bridge ? 0.878 : 0.572), [0.18, 0.16, 0.035], glass);
    }
  } else {
    cylinder(top, 0, 2.68, 0, 0.18, 0.38, cream);
    cylinder(top, -0.11, 3.49, 0, 0.079, 1.85, "#9e6844", [0, 0, 0.12]);
    box(top, -0.20, 4.04, 0, [0.08, 0.075, 0.79], wood);
    box(top, -0.245, 4.20, -0.31, [0.07, 0.26, 0.57], bay === 0 ? red : navy);
  }
  const funnel = bay >= 2 && bay <= 5;
  for (const u of funnel ? [0.70] : [-0.70, 0.70]) mount(top, u, 2.517, funnel ? 0.34 : 0);

  for (const [index, s] of sides.entries()) {
    const z = s * width * 0.70, fitting = gear[index];
    const lifeboat = bay > 0 && bay < 7;
    if (lifeboat) {
      round(fitting, 0, 2.52, z, [1.82, 0.29, 0.59], white);
      round(fitting, 0, 2.675, z, [1.70, 0.13, 0.52], "#d9c6a3");
      for (const u of [-0.48, 0.57]) round(fitting, u, 2.735, z, [0.14, 0.048, 0.47], teak);
      for (const u of [-0.53, 0.53]) {
        box(fitting, u, 2.42, z, [0.11, 0.23, 0.69], wood);
        box(fitting, u, 2.65, z * 1.14, [0.075, 0.60, 0.075], white);
        box(fitting, u, 2.98, z * 1.10, [0.075, 0.067, 0.29], white);
      }
      mount(fitting, 0.15, 2.743, z);
    } else {
      box(fitting, 0, 2.43, z, [0.83, 0.17, 0.39], navy);
      cylinder(fitting, 0, 2.60, z, 0.16, 0.20, brass);
      cylinder(fitting, 0, 2.71, z, 0.216, 0.075, navy);
      mount(fitting, 0, 2.752, z);
    }
    mount(deck, 0.04, 2.34, z, gear);
  }

  const interiorPieceStart = pieces.length;
  const interiorMountStart = TITANIC_MOUNTS.length;
  for (const s of sides) {
    const z = s * width * 0.41;
    const upper = id(`${s < 0 ? "stateroom" : "lounge"}-furniture`);
    const upperSmall = id(`${side(s)}-bedside`);
    const upholstery = bay % 2 ? "#477e7b" : "#925459";
    box(upper, 0, 1.125, z, [1.46, 0.15, 0.51], wood);
    if (s < 0) {
      round(upper, 0, 1.30, z, [0.84, 0.21, 0.49], "#e8d3bb");
      round(upper, 0.09, 1.42, z, [0.50, 0.09, 0.48], upholstery);
      round(upper, -0.31, 1.46, z, [0.22, 0.105, 0.36], white);
      box(upper, -0.53, 1.45, z, [0.085, 0.64, 0.54], teak);
    } else if (bay === 5 || bay === 6) {
      for (let step = 0; step < 8; step += 1) {
        const u = -0.43 + step * 0.115, height = 1.23 + step * 0.11;
        box(upper, u, height, z, [0.14, 0.13, 0.56], step % 2 ? "#a97650" : teak);
        for (const dz of [-0.253, 0.253]) cylinder(upper, u, height + 0.14, z + dz, 0.017, 0.24, wood);
      }
      for (const dz of [-0.253, 0.253]) box(upper, -0.03, 1.87, z + dz, [1.20, 0.045, 0.045], brass, [0, 0, 0.76]);
    } else {
      round(upper, 0, 1.32, z, [0.75, 0.22, 0.51], upholstery);
      round(upper, 0, 1.52, z + 0.20, [0.78, 0.49, 0.16], upholstery);
      for (const u of [-0.35, 0.35]) round(upper, u, 1.39, z, [0.14, 0.25, 0.49], wood);
    }
    const narrowEnd = bay === 0 || bay === 7;
    mount(upper, -0.65, 1.201, z, [deck]);
    mount(upper, narrowEnd ? 0.55 : 0.60, 1.201, z, [deck]);
    const bedsideZ = bay === 7 ? z - s * 0.11 : z;
    box(upperSmall, 1.01, 1.22, bedsideZ, [0.34, 0.34, 0.42], teak);
    box(upperSmall, 1.01, 1.38, bedsideZ, [0.39, 0.07, 0.47], cream);
    cylinder(upperSmall, 1.01, 1.50, bedsideZ, 0.048, 0.20, brass);
    add(upperSmall, "cone", 1.01, 1.65, bedsideZ, [0.135, 0.19, 0.135], "#dfaa72");
    mount(upperSmall, 1.01, 1.746, bedsideZ, [deck]);
    mount(cabinDeck, 0.04, 1.05, z, [deck, upper]);

    const table = id(`${side(s)}-saloon-table`);
    const chair = id(`${side(s)}-saloon-chair`);
    const trolley = id(`${side(s)}-trolley`);
    box(table, 0, -0.22, z, [1.27, 0.18, 0.48], wood);
    cylinder(table, 0, 0.016, z, 0.084, 0.46, wood);
    round(table, 0, 0.25, z, [0.86, 0.13, 0.65], "#d9b58e");
    for (const u of [-0.20, 0.20]) cylinder(table, u, 0.329, z, 0.104, 0.024, cream);
    for (const u of narrowEnd ? [-0.51, 0.51] : [-0.55, 0.55]) mount(table, u, -0.128, z, [cabinDeck]);
    round(chair, -1.00, -0.055, z, [0.41, 0.16, 0.41], upholstery);
    round(chair, -1.18, 0.11, z, [0.10, 0.50, 0.37], wood);
    for (const dz of [-0.13, 0.13]) for (const dx of [-0.13, 0.13]) box(chair, -1.00 + dx, -0.214, z + dz, [0.052, 0.19, 0.048], wood);
    mount(chair, -0.95, 0.028, z, [cabinDeck]);
    box(trolley, 1.02, -0.09, z, [0.41, 0.39, 0.37], "#537c83");
    box(trolley, 1.02, 0.14, z, [0.47, 0.09, 0.42], teak);
    for (const u of [0.87, 1.17]) for (const dz of [-0.17, 0.17]) cylinder(trolley, u, -0.25, z + dz, 0.076, 0.047, navy, [Math.PI / 2, 0, 0]);
    mount(trolley, 1.02, 0.187, z, [cabinDeck]);
    mount(saloonDeck, 0, -0.31, z, [cabinDeck, table]);
  }

  // Below the saloon, expose a boiler, a valve rack and a cargo chest.
  const boiler = id("boiler"), valves = id("valves"), cargo = id("cargo");
  const machineryZ = width * 0.38;
  cylinder(boiler, -0.45, -1.52, -machineryZ, 0.40, 1.00, "#adb5b7");
  cylinder(boiler, -0.45, -1.00, -machineryZ, 0.35, 0.10, "#526674");
  for (const y of [-1.73, -1.27]) cylinder(boiler, -0.45, y, -machineryZ, 0.43, 0.10, navy);
  cylinder(boiler, -0.45, -1.53, -machineryZ + 0.43, 0.16, 0.14, brass, [Math.PI / 2, 0, 0]);
  mount(boiler, -0.45, -0.949, -machineryZ, [saloonDeck]);
  box(valves, 0.65, -1.87, -machineryZ, [0.70, 0.32, 0.56], "#596b71");
  for (const u of [0.44, 0.86]) {
    cylinder(valves, u, -1.60, -machineryZ, 0.09, 0.28, brass);
    cylinder(valves, u, -1.44, -machineryZ, 0.15, 0.065, red);
  }
  mount(valves, 0.86, -1.405, -machineryZ, [saloonDeck]);
  if (funnel) mount(valves, 0.44, -1.405, -machineryZ, [saloonDeck]);
  round(cargo, 0.05, -1.74, machineryZ, [0.88, 0.60, 0.64], teak);
  for (const u of [-0.23, 0.33]) box(cargo, u, -1.435, machineryZ, [0.065, 0.027, 0.61], navy);
  mount(cargo, 0.05, -1.438, machineryZ, [saloonDeck]);
  if (bay === 0 || bay === 7) {
    // Fit the same fixtures farther inboard where the bow and stern narrow.
    const inboard = bay === 0 ? 0.26 : -0.26;
    function fitEnds(point: Vector) {
      point[0] = x + (point[0] - x) * 0.69 + inboard;
      point[2] *= 0.78;
    }
    for (const piece of pieces.slice(interiorPieceStart)) {
      fitEnds(piece.position);
      piece.size[0] *= 0.69;
      piece.size[2] *= 0.78;
    }
    for (const screw of TITANIC_MOUNTS.slice(interiorMountStart)) fitEnds(screw.position);
  }
}

const compact = ([x, y, z]: Vector): Vector => [x * lengthScale, y * heightScale, z * beamScale];
const proportions = new Matrix4().makeScale(lengthScale, heightScale, beamScale);
const transform = new Matrix4();
const rotation = new Euler();
const scale = new Vector3();

// Reshape the authored hull and decks together with their fittings. Bake the
// transform for tilted pieces so their meshes and collision surfaces agree.
for (const piece of pieces) {
  piece.position = compact(piece.position);
  if (piece.part.startsWith("ship-funnel-") && piece.kind === "cylinder") {
    // Keep the funnels round and chunky over the shorter hull.
    piece.size = [piece.size[0] * 0.94, piece.size[1] * heightScale, piece.size[2] * 0.94];
    if (piece.rotation) {
      const [pitch, yaw, rake] = piece.rotation;
      piece.rotation = [pitch, yaw, Math.atan(lengthScale / heightScale * Math.tan(rake))];
    }
  } else if (piece.rotation) {
    transform.makeRotationFromEuler(rotation.set(...piece.rotation))
      .scale(scale.set(...piece.size)).premultiply(proportions);
    piece.geometry = geometryFor(piece).clone().applyMatrix4(transform);
    piece.size = [1, 1, 1];
    piece.rotation = undefined;
  } else {
    piece.size = compact(piece.size);
  }
}

for (const part of Object.keys(pivots) as TitanicPartId[]) pivots[part] = compact(pivots[part]);
for (const mount of TITANIC_MOUNTS) {
  mount.position = compact(mount.position);
  const [x, y, z] = mount.normal;
  mount.normal = scale.set(x / lengthScale, y / heightScale, z / beamScale).normalize().toArray();
}

const halfLength = bayLength * lengthScale * (widths.length - 1) / 2;
const hullWidthAt = (x: number) => {
  const station = (x + halfLength) / (bayLength * lengthScale);
  const index = Math.min(widths.length - 2, Math.floor(station));
  return (widths[index] + (widths[index + 1] - widths[index]) * (station - index)) * beamScale * 1.005;
};
makeWaterBlocks(halfLength, hullWidthAt).forEach(({ piece, screw }, index) => {
  pieces.push(piece);
  pivots[piece.part] = piece.position;
  const mount = waterMounts[index];
  mount.attachedTo = piece.part;
  mount.position = screw;
  mount.solutionAfter = undefined;
});

export const TITANIC_MODEL = { pieces, pivots, parts: Object.keys(pivots) as TitanicPartId[] };
