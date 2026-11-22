import { CatmullRomCurve3, ConeGeometry, CylinderGeometry, Euler, ExtrudeGeometry, Float32BufferAttribute, IcosahedronGeometry, LatheGeometry, Quaternion, Shape, SphereGeometry, TorusGeometry, TubeGeometry, Vector2, Vector3 } from "three";
import type { BufferGeometry } from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { ArcticPartId, Screw } from "../game/types.ts";
import type { Piece, Vector } from "./houseModel.ts";

export const ARCTIC_DETAIL = { radialSegments: 24, sphereRings: 12, bevelSegments: 2 } as const;

export function createArcticModel() {
  const pieces: Piece[] = [], pivots: Record<ArcticPartId, Vector> = {};
  const mounts: (Pick<Screw, "position" | "normal" | "solutionAfter"> & { attachedTo: ArcticPartId })[] = [];
  const snow = "#f5fbff", shadowSnow = "#d3eaf9", ice = "#63c7ef", deepIce = "#288bc7", paleIce = "#9de5fa", water = "#10b9d2";
  const red = "#e8544f", redShade = "#b93742", blue = "#307ec0", navy = "#344466", gold = "#ffc54f", wood = "#b47b4c", honey = "#dfa56b", cream = "#fff1d3", charcoal = "#34455c";
  function smooth(g: BufferGeometry) {
    g.setAttribute("color", new Float32BufferAttribute(new Float32Array(g.getAttribute("position").count * 3).fill(1), 3));
    return g;
  }
  const rounded = smooth(new RoundedBoxGeometry(1, 1, 1, ARCTIC_DETAIL.bevelSegments, .08));
  const sphere = smooth(new SphereGeometry(1, ARCTIC_DETAIL.radialSegments, ARCTIC_DETAIL.sphereRings));
  const cylinder = smooth(new CylinderGeometry(1, 1, 1, 24));
  const cone = smooth(new ConeGeometry(1, 1, 20));
  const ring = smooth(new TorusGeometry(1, .095, 8, 28));
  const crystal = new IcosahedronGeometry(1, 0);
  function owner(name: string, p: Vector): ArcticPartId {
    const id: ArcticPartId = `arctic-${name}`;
    if (pivots[id]) throw new Error(`Duplicate ${id}`);
    pivots[id] = p; return id;
  }
  function shape(part: ArcticPartId, geometry: BufferGeometry, position: Vector, size: Vector, color: string, rotation?: Vector, kind: Piece["kind"] = "box") {
    pieces.push({ part, kind, geometry, position, size, color, rotation });
  }
  const box = (p: ArcticPartId, at: Vector, size: Vector, color: string, rotation?: Vector) => shape(p, rounded, at, size, color, rotation);
  const ball = (p: ArcticPartId, at: Vector, size: Vector, color: string) => shape(p, sphere, at, size, color, undefined, "ico-detail");
  const cyl = (p: ArcticPartId, at: Vector, radius: number, height: number, color: string, rotation?: Vector) => shape(p, cylinder, at, [radius, height, radius], color, rotation, "cylinder");
  const hoop = (p: ArcticPartId, at: Vector, radius: number, color: string, rotation: Vector = [Math.PI / 2, 0, 0]) => shape(p, ring, at, [radius, radius, radius], color, rotation, "ring");
  function fix(part: ArcticPartId, position: Vector, normal: Vector = [0, 1, 0], after?: ArcticPartId[]) {
    mounts.push({ attachedTo: part, position, normal: new Vector3(...normal).normalize().toArray(), solutionAfter: after });
  }
  function after(part: ArcticPartId, covers: ArcticPartId[]) {
    const m = mounts.find(m => m.attachedTo === part)!;
    m.solutionAfter = [...(m.solutionAfter ?? []), ...covers];
  }
  function beam(p: ArcticPartId, a: Vector, b: Vector, width: number, color: string) {
    const A = new Vector3(...a), B = new Vector3(...b), d = B.clone().sub(A);
    const q = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), d.clone().normalize());
    box(p, A.add(B).multiplyScalar(.5).toArray(), [width, d.length(), width], color, new Euler().setFromQuaternion(q).toArray().slice(0, 3) as Vector);
  }
  function curve(p: ArcticPartId, points: Vector[], radius: number, color: string) {
    shape(p, smooth(new TubeGeometry(new CatmullRomCurve3(points.map(v => new Vector3(...v))), 20, radius, 8, false)), [0, 0, 0], [1, 1, 1], color);
  }
  function polygon(p: ArcticPartId, points: [number, number][], bottom: number, height: number, color: string) {
    const s = new Shape(); points.forEach(([x, z], i) => i ? s.lineTo(x, -z) : s.moveTo(x, -z)); s.closePath();
    const g = new ExtrudeGeometry(s, { depth: height, bevelEnabled: false }).rotateX(-Math.PI / 2);
    shape(p, g, [0, bottom, 0], [1, 1, 1], color);
  }
  function snowbank(p: ArcticPartId, x: number, y: number, z: number, w: number, d: number, icicles = false) {
    box(p, [x, y, z], [w, .18, d], snow);
    for (let i = 0; i < 7; i++) ball(p, [x + (i - 3) * w / 7, y + .035, z + .03 * Math.sin(i * 2)], [w / 7, .14 + .035 * (i % 3), d * .51], snow);
    if (icicles) for (let i = 0; i < 9; i++) {
      const h = .17 + .13 * (i % 3);
      shape(p, cone, [x + (i - 4) * w / 10, y - h / 2 - .05, z + d / 2 - .03], [.065, h, .065], i % 2 ? paleIce : shadowSnow, [Math.PI, 0, 0], "cone");
    }
  }
  function iceChunk(p: ArcticPartId, at: Vector, size: Vector, color = ice) {
    shape(p, crystal, at, size, color, undefined, "ico");
  }
  function flowerSnowflake(p: ArcticPartId, x: number, y: number, z: number, radius: number) {
    for (let a = 0; a < 3; a++) {
      const angle = a * Math.PI / 3;
      beam(p, [x - Math.cos(angle) * radius, y - Math.sin(angle) * radius, z], [x + Math.cos(angle) * radius, y + Math.sin(angle) * radius, z], .025, snow);
    }
  }
  // Low octagonal ice shelf and separate, opaque turquoise water sectors.
  const radius = 5.8, terrain: ArcticPartId[] = [];
  const shelf = Array.from({ length: 8 }, (_, i): [number, number] => [Math.cos(i * Math.PI / 4) * radius, Math.sin(i * Math.PI / 4) * radius]);
  function insideShelf(x: number, z: number) {
    return shelf.every(([ax, az], i) => {
      const [bx, bz] = shelf[(i + 1) % shelf.length];
      return (bx - ax) * (z - az) - (bz - az) * (x - ax) >= -.0001;
    });
  }
  function clipWater(points: [number, number][]) {
    let polygon = points;
    for (let i = 0; i < shelf.length; i++) {
      const [ax, az] = shelf[i], [bx, bz] = shelf[(i + 1) % shelf.length], output: [number, number][] = [];
      const side = ([x, z]: [number, number]) => (bx - ax) * (z - az) - (bz - az) * (x - ax);
      for (let j = 0; j < polygon.length; j++) {
        const a = polygon[j], b = polygon[(j + 1) % polygon.length], da = side(a), db = side(b);
        if (da >= 0) output.push(a);
        if ((da >= 0) !== (db >= 0)) { const t = da / (da - db); output.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
      }
      polygon = output;
    }
    return polygon;
  }
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4, b = (i + 1) * Math.PI / 4, t = (a + b) / 2;
    const p = owner(`foundation-${i}`, [Math.cos(t) * 3.6, -.5, Math.sin(t) * 3.6]); terrain.push(p);
    polygon(p, [[0, 0], [Math.cos(a) * radius, Math.sin(a) * radius], [Math.cos(b) * radius, Math.sin(b) * radius]], -.8, .6, i % 2 ? ice : deepIce);
    const chord = radius * Math.cos(Math.PI / 8);
    const centre: Vector = [Math.cos(t) * chord, -.19, Math.sin(t) * chord];
    box(p, centre, [radius * Math.sin(Math.PI / 8) * 2, .16, .23], snow, [0, Math.PI / 2 - t, 0]);
    for (let j = 0; j < 4; j++) iceChunk(p, [centre[0] + Math.sin(t) * (j - 1.5) * .63, -.44, centre[2] - Math.cos(t) * (j - 1.5) * .63], [.18, .36, .15], paleIce);
    fix(p, [Math.cos(t) * (chord + .015), -.52, Math.sin(t) * (chord + .015)], [Math.cos(t), 0, Math.sin(t)]);
  }
  const waterParts: ArcticPartId[] = [];
  for (const [i, [x, z, w, d]] of [[-3.35, 3.25, 2.9, 2.0], [0, 3.3, 3.7, 2.7], [3.3, 3.2, 2.8, 2.05], [0, 4.9, 3.6, .52]].entries()) {
    const p = owner(`water-${i}`, [x, -.07, z]); waterParts.push(p);
    polygon(p, clipWater([[x - w / 2, z - d / 2], [x + w / 2, z - d / 2], [x + w / 2, z + d / 2], [x - w / 2, z + d / 2]]), -.135, .13, water);
    for (let j = 0; j < 5; j++) {
      const wave: Vector[] = [[x - w * .36, .006, z + (j - 2) * d / 6], [x, .006, z + (j - 2) * d / 6 + .08], [x + w * .36, .006, z + (j - 2) * d / 6]];
      if (wave.every(([px, , pz]) => insideShelf(px, pz))) curve(p, wave, .012, paleIce);
    }
    fix(p, [x + w * .30, .015, z - d * .26]);
  }
  // Terraces leave an open lake channel in front and clear paths between props.
  const terraces: ArcticPartId[] = [];
  for (const [name, x, y, z, w, d] of [
    ["hut", 1.05, 1.05, -2.5, 6.25, 3.35], ["sled", -3.25, .4, .8, 3.35, 2.75],
    ["fishing", 3.35, .55, .55, 3.0, 2.9], ["family", .05, .52, .1, 2.7, 2.65],
  ] as const) {
    const p = owner(`terrace-${name}`, [x, y, z]); terraces.push(p);
    box(p, [x, y, z], [w, y * 2, d], ice);
    for (let k = 0; k < 5; k++) iceChunk(p, [x + (k - 2) * w / 5, y * .8, z + d / 2 - .05], [w / 6, y + .15, .22], k % 2 ? deepIce : paleIce);
    fix(p, [x + w * .15, y * .6, z + d / 2 + .24], [0, 0, 1]);
    const cap = owner(`terrace-snow-${name}`, [x, y * 2 + .18, z]);
    snowbank(cap, x, y * 2 + .18, z, w, d, true);
    fix(cap, name === "hut" ? [x - w * .32, 2.40, z + d * .47] : [x - w * .32, y * 2 + .44, z + d * .28]);
  }
  // A real U-shaped portal: the cave mouth is not a painted-on rectangle.
  const caveX = -3.55, caveFront = -1.05;
  const caveFloor = owner("cave-floor", [caveX, .05, -2.2]);
  box(caveFloor, pivots[caveFloor], [2.8, .5, 2.7], deepIce);
  fix(caveFloor, [caveX - .7, .31, -2.3]);
  const caveArch = owner("cave-arch", [caveX, 1.7, caveFront]);
  const arch = new Shape(); arch.moveTo(-1.4, 0); arch.lineTo(-1.4, 1.6); arch.lineTo(-.94, 2.5); arch.lineTo(0, 2.75); arch.lineTo(.94, 2.5); arch.lineTo(1.4, 1.6); arch.lineTo(1.4, 0);
  arch.lineTo(.78, 0); arch.lineTo(.78, 1.35); arch.quadraticCurveTo(0, 2.95, -.78, 1.35); arch.lineTo(-.78, 0); arch.closePath();
  shape(caveArch, new ExtrudeGeometry(arch, { depth: .42, bevelEnabled: false, curveSegments: 16 }), [caveX, .3, caveFront - .3], [1, 1, 1], ice);
  for (let j = 0; j < 7; j++) iceChunk(caveArch, [caveX + (j % 2 ? -1.0 : 1.0), .65 + Math.floor(j / 2) * .5, caveFront + .08], [.32, .36, .16], j % 2 ? paleIce : deepIce);
  fix(caveArch, [caveX, 2.76, caveFront + .135], [0, 0, 1]);
  const caveWalls: ArcticPartId[] = [];
  for (const side of [-1, 1]) {
    const p = owner(`cave-wall-${side}`, [caveX + side * 1.16, 1.45, -2.25]); caveWalls.push(p);
    box(p, pivots[p], [.34, 2.3, 2.0], side < 0 ? deepIce : ice);
    fix(p, [caveX + side * .98, 1.23, -2.25], [-side, 0, 0]);
  }
  const caveBack = owner("cave-back", [caveX, 1.5, -3.32]);
  box(caveBack, pivots[caveBack], [2.5, 2.4, .3], deepIce); fix(caveBack, [caveX, 1.6, -3.155], [0, 0, 1]);
  const caveRoof = owner("cave-roof", [caveX, 2.85, -2.22]);
  box(caveRoof, pivots[caveRoof], [2.8, .42, 2.65], ice); fix(caveRoof, [caveX + .7, 3.07, -2.22]);
  const caveSnow = owner("cave-snow", [caveX, 3.10, -2.20]);
  snowbank(caveSnow, caveX, 3.10, -2.20, 2.95, 2.75, true); fix(caveSnow, [caveX - 1.0, 3.22, -1.55]);
  const summit = owner("ice-summit", [-4.1, 3.9, -3.2]);
  iceChunk(summit, [-4.15, 3.75, -3.25], [.95, 1.3, .85]); iceChunk(summit, [-3.50, 3.7, -3.45], [.55, .8, .55], paleIce);
  snowbank(summit, -4.15, 4.63, -3.25, 1.05, .85); fix(summit, [-4.15, 3.8, -2.57], [0, 0, 1]);
  for (let i = 0; i < 2; i++) {
    const p = owner(`cave-crystals-${i}`, [caveX + (i - .5) * .7, .53, -2.25]);
    for (let j = 0; j < 5; j++) iceChunk(p, [pivots[p][0] + Math.sin(j * 2.4) * .25, .7 + .07 * (j % 3), -2.25 + Math.cos(j * 2.4) * .22], [.16, .5 + .1 * (j % 3), .16], j % 2 ? "#4be5f5" : "#a5f7ff");
    box(p, [pivots[p][0], .37, -2.25], [.75, .16, .65], paleIce); fix(p, [pivots[p][0], .43, -1.90], [0, 0, 1]);
  }
  // Research hut: separate floor sectors, walls, door, windows, roofs and snow.
  const hx = .28, hz = -2.35, floorY = 2.5, eave = 4.45, ridge = 5.45;
  const hutFloors: ArcticPartId[] = [], walls: ArcticPartId[] = [], roofs: ArcticPartId[] = [];
  for (const side of [-1, 1]) for (const bay of [-1, 1]) {
    const x = hx + side * .83, z = hz + bay * .61;
    const p = owner(`hut-floor-${side}-${bay}`, [x, floorY, z]); hutFloors.push(p);
    box(p, pivots[p], [1.64, .15, 1.2], honey);
    for (let k = 0; k < 5; k++) box(p, [x + (k - 2) * .3, floorY + .08, z], [.014, .015, 1.18], wood);
    fix(p, [x, floorY + .09, z]);
  }
  const front = hz + 1.3;
  for (const side of [-1, 1]) {
    const x = hx + side * 1.15;
    const p = owner(`hut-front-${side}`, [x, 3.45, front]); walls.push(p);
    box(p, [x, 2.88, front], [.94, .64, .18], red); box(p, [x, 4.18, front], [.94, .5, .18], red);
    for (const edge of [-1, 1]) box(p, [x + edge * .41, 3.55, front], [.12, .9, .18], redShade);
    for (const edge of [-1, 1]) box(p, [x + edge * .48, 3.48, front + .10], [.10, 1.87, .10], honey);
    fix(p, [x + side * .41, 3.65, front - .1], [0, 0, -1]);
    const window = owner(`hut-window-${side}`, [x, 3.55, front + .12]);
    box(window, pivots[window], [.76, .86, .16], cream);
    box(window, [x, 3.55, front + .21], [.60, .69, .04], "#ffdc70");
    for (const edge of [-1, 1]) { box(window, [x + edge * .36, 3.55, front + .24], [.08, .88, .09], blue); box(window, [x, 3.55 + edge * .4, front + .24], [.8, .08, .09], blue); }
    box(window, [x, 3.55, front + .25], [.05, .78, .06], honey); box(window, [x, 3.55, front + .25], [.68, .045, .06], honey);
    snowbank(window, x, 4.03, front + .13, .88, .36); fix(window, [x + side * .35, 3.27, front + .295], [0, 0, 1]);
  }
  const doorFrame = owner("hut-door-frame", [hx, 3.45, front]); walls.push(doorFrame);
  for (const side of [-1, 1]) box(doorFrame, [hx + side * .48, 3.4, front], [.12, 1.8, .24], honey);
  box(doorFrame, [hx, 4.27, front], [1.05, .16, .24], honey); fix(doorFrame, [hx + .48, 3.8, front - .13], [0, 0, -1]);
  const door = owner("hut-door", [hx, 3.38, front + .03]);
  box(door, pivots[door], [.84, 1.66, .16], "#448fae"); box(door, [hx, 3.68, front + .12], [.52, .65, .045], "#99cfe0");
  box(door, [hx, 3.04, front + .125], [.57, .37, .045], blue); cyl(door, [hx + .29, 3.3, front + .16], .06, .09, gold, [Math.PI / 2, 0, 0]);
  fix(door, [hx - .27, 2.79, front + .12], [0, 0, 1]);
  for (const side of [-1, 1]) {
    const p = owner(`hut-back-${side}`, [hx + side * .83, 3.48, hz - 1.3]); walls.push(p);
    box(p, pivots[p], [1.64, 1.88, .18], red);
    for (let j = 0; j < 7; j++) box(p, [hx + side * .83 + (j - 3) * .22, 3.48, hz - 1.41], [.018, 1.84, .025], redShade);
    fix(p, [hx + side * .83, 3.18, hz - 1.19], [0, 0, 1]);
    for (const bay of [-1, 1]) {
      const s = owner(`hut-side-${side}-${bay}`, [hx + side * 1.68, 3.48, hz + bay * .65]); walls.push(s);
      box(s, pivots[s], [.18, 1.88, 1.28], red);
      for (let j = 0; j < 5; j++) box(s, [hx + side * 1.79, 3.48, hz + bay * .65 + (j - 2) * .23], [.025, 1.84, .018], redShade);
      box(s, [hx + side * 1.79, 2.64, hz + bay * .65], [.10, .14, 1.3], honey);
      fix(s, [hx + side * 1.58, 3.1, hz + bay * .65], [-side, 0, 0]);
    }
  }
  for (const bay of [-1, 1]) {
    const g = owner(`hut-gable-${bay}`, [hx, 4.64, hz + bay * 1.3]); walls.push(g);
    const s = new Shape(); s.moveTo(-1.73, 0); s.lineTo(0, 1.0); s.lineTo(1.73, 0); s.closePath();
    shape(g, new ExtrudeGeometry(s, { depth: .16, bevelEnabled: false }), [hx, 4.42, hz + bay * 1.3 - .08], [1, 1, 1], red);
    beam(g, [hx - 1.75, 4.43, hz + bay * 1.4], [hx, ridge + .02, hz + bay * 1.4], .16, honey);
    beam(g, [hx + 1.75, 4.43, hz + bay * 1.4], [hx, ridge + .02, hz + bay * 1.4], .16, honey);
    fix(g, [hx, 4.92, hz + bay * 1.4 + bay * .02], [0, 0, bay]);
  }
  for (const side of [-1, 1]) for (const bay of [-1, 1]) {
    const x = hx + side * .93, z = hz + bay * .72, angle = side * .50;
    const p = owner(`hut-roof-${side}-${bay}`, [x, 4.94, z]); roofs.push(p);
    box(p, pivots[p], [2.18, .15, 1.44], blue, [0, 0, -angle]);
    for (let j = 0; j < 5; j++) box(p, [x + side * .02, 5.02, z + (j - 2) * .26], [2.15, .035, .025], deepIce, [0, 0, -angle]);
    fix(p, [hx + side * 1.91, eave + .04, z], [side, 0, 0]);
    const cap = owner(`roof-snow-${side}-${bay}`, [x, 5.06, z]);
    for (let j = 0; j < 7; j++) {
      const dx = (j - 3) * .26;
      ball(cap, [x + dx, 5.06 - side * dx * .54, z], [.22, .10, .73], snow);
    }
    for (let j = 0; j < 6; j++) shape(cap, cone, [hx + side * 1.9, 4.42 - .04 * (j % 3), z + (j - 2.5) * .22], [.06, .25 + .1 * (j % 3), .06], shadowSnow, [Math.PI, 0, 0], "cone");
    fix(cap, [x, 5.19, z + .35]);
  }
  const chimney = owner("chimney", [hx - .65, 5.5, hz - .52]);
  box(chimney, pivots[chimney], [.33, .9, .36], charcoal);
  for (let k = 0; k < 4; k++) box(chimney, [hx - .65, 5.15 + k * .22, hz - .32], [.36, .025, .025], navy);
  cyl(chimney, [hx - .65, 6.0, hz - .52], .23, .11, wood);
  for (let k = 0; k < 4; k++) ball(chimney, [hx - .65 + k * .14, 6.16 + k * .22, hz - .52], [.18 + .02 * k, .19 + .03 * k, .18], snow);
  fix(chimney, [hx - .65, 5.67, hz - .325], [0, 0, 1]);
  const solar = owner("solar-array", [hx + .93, 5.15, hz - .72]);
  box(solar, pivots[solar], [1.46, .10, 1.05], cream, [0, 0, -.50]);
  box(solar, [hx + .93, 5.21, hz - .72], [1.32, .04, .93], "#3558a7", [0, 0, -.50]);
  for (let j = 0; j < 5; j++) beam(solar, [hx + .38 + j * .25, 5.25 - (j - 2) * .137, hz - 1.16], [hx + .38 + j * .25, 5.25 - (j - 2) * .137, hz - .28], .018, paleIce);
  for (let j = 0; j < 4; j++) beam(solar, [hx + .35, 5.54, hz - 1.12 + j * .26], [hx + 1.5, 4.91, hz - 1.12 + j * .26], .018, paleIce);
  fix(solar, [hx + .45, 5.55, hz - .65]);
  const dish = owner("satellite-dish", [hx - .62, 5.74, hz + .4]);
  cyl(dish, [hx - .62, 5.38, hz + .4], .12, .5, charcoal);
  const dishG = smooth(new LatheGeometry([[0, 0], [.2, .02], [.43, .13], [.57, .29], [.6, .31], [.57, .25], [.43, .09], [.2, -.02], [0, -.04]].reverse().map(v => new Vector2(...v)), 28));
  shape(dish, dishG, pivots[dish], [1, 1, 1], snow, [.72, 0, -.3]);
  beam(dish, [hx - .62, 5.8, hz + .4], [hx - .43, 6.14, hz + .69], .05, gold); fix(dish, [hx - .62, 5.58, hz + .265], [0, 0, -1]);
  // Separate furnishings sit behind the closed hut envelope.
  const furnishings: ArcticPartId[] = [];
  for (const [name, x, z] of [["desk", hx - .85, hz - .65], ["bunk", hx + .85, hz - .6], ["supply-locker", hx + .9, hz + .55]] as const) {
    const p = owner(name, [x, 2.95, z]); furnishings.push(p);
    box(p, pivots[p], [.74, name === "supply-locker" ? .9 : .18, .72], name === "bunk" ? navy : honey);
    for (const dx of [-.29, .29]) for (const dz of [-.27, .27]) box(p, [x + dx, 2.72, z + dz], [.07, .4, .07], wood);
    if (name === "bunk") { box(p, [x, 3.08, z], [.66, .17, .67], red); ball(p, [x, 3.2, z - .20], [.28, .09, .12], cream); }
    else if (name === "desk") { box(p, [x, 3.09, z], [.40, .035, .36], paleIce); cyl(p, [x + .25, 3.14, z + .16], .06, .15, cream); }
    fix(p, [x, name === "supply-locker" ? 3.2 : 2.95, z + .38], [0, 0, 1], roofs);
  }
  hutFloors.forEach(p => after(p, [...walls, ...roofs, ...furnishings]));
  walls.forEach(p => after(p, roofs));
  // Rear-right wooden observation tower, with warm windows and roof instruments.
  const tx = 3.35, tz = -3.0, towerSupports: ArcticPartId[] = [];
  for (const side of [-1, 1]) {
    const p = owner(`tower-frame-${side}`, [tx + side * .73, 3.5, tz]); towerSupports.push(p);
    for (const bay of [-1, 1]) box(p, [tx + side * .73, 3.76, tz + bay * .66], [.17, 2.6, .17], wood);
    beam(p, [tx + side * .73, 2.55, tz - .66], [tx + side * .73, 4.8, tz + .66], .12, honey);
    beam(p, [tx + side * .73, 2.55, tz + .66], [tx + side * .73, 4.8, tz - .66], .12, honey);
    fix(p, [tx + side * .83, 3.15, tz + .66], [side, 0, 0]);
  }
  const towerDeck = owner("tower-deck", [tx, 5.0, tz]);
  box(towerDeck, pivots[towerDeck], [1.95, .2, 1.9], honey); fix(towerDeck, [tx + .55, 4.89, tz + .5], [0, -1, 0]);
  const cabin: ArcticPartId[] = [];
  for (const side of [-1, 1]) {
    const p = owner(`tower-cabin-${side}`, [tx + side * .72, 5.63, tz]); cabin.push(p);
    box(p, pivots[p], [.12, 1.0, 1.48], "#ffe17e");
    for (const bay of [-1, 1]) box(p, [tx + side * .8, 5.63, tz + bay * .7], [.10, 1.05, .10], wood);
    box(p, [tx + side * .8, 5.63, tz], [.10, 1.05, .055], honey);
    fix(p, [tx + side * .80, 5.33, tz], [side, 0, 0]);
    const q = owner(`tower-window-${side}`, [tx, 5.63, tz + side * .73]); cabin.push(q);
    box(q, pivots[q], [1.48, 1.0, .12], "#ffe9a3");
    for (const dx of [-.73, 0, .73]) box(q, [tx + dx, 5.63, tz + side * .81], [.07, 1.03, .08], honey);
    fix(q, [tx + .48, 5.33, tz + side * .81], [0, 0, side]);
  }
  const towerRoof = owner("tower-roof", [tx, 6.2, tz]); box(towerRoof, pivots[towerRoof], [1.85, .15, 1.85], blue); fix(towerRoof, [tx - .5, 6.29, tz]);
  const towerSnow = owner("tower-roof-snow", [tx, 6.32, tz]); snowbank(towerSnow, tx, 6.32, tz, 2.0, 2.0); fix(towerSnow, [tx + .58, 6.62, tz + .5]);
  for (const side of [-1, 1]) {
    const p = owner(`tower-railing-${side}`, [tx, 5.22, tz + side * .98]);
    for (let j = 0; j < 5; j++) box(p, [tx + (j - 2) * .4, 5.28, tz + side * .98], [.07, .5, .07], gold);
    beam(p, [tx - .9, 5.53, tz + side * .98], [tx + .9, 5.53, tz + side * .98], .08, gold);
    fix(p, [tx - .8, 5.19, tz + side * 1.03], [0, 0, side]);
  }
  const wind = owner("weather-vane", [tx + .3, 6.9, tz]); cyl(wind, pivots[wind], .055, 1.1, charcoal);
  for (let j = 0; j < 3; j++) {
    const a = j * Math.PI * 2 / 3;
    beam(wind, [tx + .3, 7.36, tz], [tx + .3 + Math.cos(a) * .4, 7.36, tz + Math.sin(a) * .4], .035, charcoal);
    ball(wind, [tx + .3 + Math.cos(a) * .4, 7.36, tz + Math.sin(a) * .4], [.1, .13, .1], charcoal);
  }
  fix(wind, [tx + .3, 6.73, tz + .06], [0, 0, 1]);
  const beacon = owner("tower-beacon", [tx - .5, 6.62, tz + .3]); cyl(beacon, pivots[beacon], .13, .32, red); hoop(beacon, [tx - .5, 6.48, tz + .3], .15, charcoal); fix(beacon, [tx - .5, 6.62, tz + .44], [0, 0, 1]);
  cabin.forEach(p => after(p, [towerRoof, towerSnow])); after(towerDeck, [...cabin, towerRoof, towerSnow]); towerSupports.forEach(p => after(p, [towerDeck, ...cabin]));
  // Three broad stair sections rise naturally to the research hut terrace.
  for (let i = 0; i < 3; i++) {
    const p = owner(`snow-stairs-${i}`, [2.35, 1.3 + i * .36, -.25 - i * .44]);
    for (let j = 0; j < 2; j++) { box(p, [2.35, 1.2 + i * .36 + j * .18, -.10 - i * .44 - j * .22], [.95, .18, .45], ice); snowbank(p, 2.35, 1.30 + i * .36 + j * .18, -.10 - i * .44 - j * .22, .95, .43); }
    fix(p, [2.84, 1.25 + i * .36, -.15 - i * .44], [1, 0, 0]);
  }
  function penguin(name: string, x: number, y: number, z: number, scale: number, accessory: "scarf" | "earmuffs" | "hat" | "chick") {
    const s = scale, body = owner(`${name}-body`, [x, y + .53 * s, z]);
    ball(body, pivots[body], [.37 * s, .56 * s, .32 * s], charcoal); ball(body, [x, y + .49 * s, z + .22 * s], [.28 * s, .43 * s, .15 * s], cream);
    for (const side of [-1, 1]) ball(body, [x + side * .19 * s, y + .04 * s, z + .14 * s], [.15 * s, .06 * s, .22 * s], gold);
    fix(body, [x, y + .67 * s, z - .30 * s], [0, 0, -1]);
    const head = accessory === "chick" ? body : owner(`${name}-head`, [x, y + 1.03 * s, z]);
    ball(head, [x, y + 1.03 * s, z], [.32 * s, .32 * s, .29 * s], accessory === "chick" ? "#9baabd" : charcoal);
    for (const side of [-1, 1]) { ball(head, [x + side * .14 * s, y + 1.01 * s, z + .21 * s], [.16 * s, .19 * s, .10 * s], cream); ball(head, [x + side * .13 * s, y + 1.08 * s, z + .30 * s], [.027 * s, .033 * s, .02 * s], charcoal); }
    shape(head, cone, [x, y + .96 * s, z + .36 * s], [.09 * s, .20 * s, .065 * s], gold, [Math.PI / 2, 0, 0], "cone");
    if (head !== body) { fix(head, [x, y + 1.14 * s, z - .27 * s], [0, 0, -1]); after(body, [head]); }
    for (const side of [-1, 1]) {
      const wing = accessory === "chick" ? body : owner(`${name}-wing-${side}`, [x + side * .35 * s, y + .65 * s, z]);
      shape(wing, sphere, [x + side * .35 * s, y + .65 * s, z], [.12 * s, .34 * s, .12 * s], charcoal, [0, 0, side * .32], "ico-detail");
      if (wing !== body) fix(wing, [x + side * .46 * s, y + .66 * s, z], [side, 0, 0]);
    }
    if (accessory !== "chick") {
      const item = owner(`${name}-${accessory}`, [x, y + 1.18 * s, z]);
      if (accessory === "scarf") { hoop(item, [x, y + .89 * s, z], .32 * s, red); box(item, [x - .20 * s, y + .65 * s, z + .31 * s], [.14 * s, .5 * s, .10 * s], red); fix(item, [x - .20 * s, y + .69 * s, z + .37 * s], [0, 0, 1]); }
      if (accessory === "earmuffs") { hoop(item, [x, y + 1.10 * s, z], .34 * s, gold, [0, 0, 0]); for (const side of [-1, 1]) ball(item, [x + side * .34 * s, y + 1.05 * s, z], [.12 * s, .19 * s, .17 * s], gold); fix(item, [x + .35 * s, y + 1.24 * s, z]); }
      if (accessory === "hat") { ball(item, [x, y + 1.29 * s, z], [.35 * s, .22 * s, .30 * s], blue); hoop(item, [x, y + 1.19 * s, z], .31 * s, blue); ball(item, [x, y + 1.52 * s, z], [.10 * s, .10 * s, .10 * s], paleIce); fix(item, [x, y + 1.49 * s, z + .13 * s], [0, 1, .2]); }
      after(head, [item]);
    }
    return body;
  }
  const family: ArcticPartId[] = [];
  family.push(penguin("scarf-penguin", -.58, 1.25, .05, .9, "scarf"));
  family.push(penguin("earmuff-penguin", .6, 1.25, -.05, .85, "earmuffs"));
  family.push(penguin("nest-chick", .05, 1.25, .60, .46, "chick"));
  family.push(penguin("explorer-chick", -1.75, 1.03, 1.3, .58, "chick"));
  const fishingPenguin = penguin("fisher-penguin", 3.2, 1.37, .55, .90, "hat");
  const nest = owner("penguin-nest", [.05, 1.26, .6]);
  for (let j = 0; j < 24; j++) {
    const a = j * Math.PI / 12;
    box(nest, [.05 + Math.cos(a) * .45, 1.27, .6 + Math.sin(a) * .35], [.15, .04, .035], honey, [0, -a, 0]);
  }
  box(nest, [.05, 1.24, .6], [.86, .055, .66], gold); fix(nest, [.05, 1.24, .95], [0, 0, 1], [family[2]]);
  function seal(name: string, x: number, y: number, z: number, s: number, cub = false) {
    const body = owner(`${name}-body`, [x, y + .22 * s, z]);
    ball(body, pivots[body], [.68 * s, .28 * s, .32 * s], "#9aa9bd"); ball(body, [x, y + .12 * s, z + .18 * s], [.54 * s, .14 * s, .23 * s], cream);
    for (let j = 0; j < 9; j++) ball(body, [x + ((j % 3) - 1) * .27 * s, y + (.39 - .045 * (j % 3)) * s, z + (Math.floor(j / 3) - 1) * .14 * s], [.055 * s, .018 * s, .032 * s], "#7d8ea9");
    const head = cub ? body : owner(`${name}-head`, [x + .53 * s, y + .43 * s, z]);
    ball(head, [x + .53 * s, y + .43 * s, z], [.29 * s, .28 * s, .29 * s], "#aebacb");
    ball(head, [x + .59 * s, y + .36 * s, z + .20 * s], [.19 * s, .11 * s, .12 * s], cream);
    ball(head, [x + .59 * s, y + .43 * s, z + .29 * s], [.05 * s, .035 * s, .025 * s], charcoal);
    for (const side of [-1, 1]) {
      ball(head, [x + (.53 + side * .12) * s, y + .52 * s, z + .24 * s], [.024 * s, .017 * s, .018 * s], charcoal);
      for (let j = 0; j < 3; j++) beam(head, [x + .59 * s, y + (.37 + j * .025) * s, z + .30 * s], [x + (.59 + side * .20) * s, y + (.32 + j * .045) * s, z + .31 * s], .009 * s, charcoal);
    }
    ball(body, [x - .63 * s, y + .12 * s, z], [.24 * s, .06 * s, .18 * s], "#8e9fb7");
    if (cub) fix(body, [x - .18 * s, y + .47 * s, z - .08 * s]);
    else fix(body, [x - .18 * s, y + .23 * s, z - .31 * s], [0, 0, -1]);
    if (!cub) { fix(head, [x + .57 * s, y + .63 * s, z - .15 * s], [0, 1, 0]); after(body, [head]); }
    return body;
  }
  const seals = [seal("cave-seal", -3.85, 3.25, -1.98, 1.0), seal("cave-pup", -2.85, 3.25, -1.65, .46, true)];
  const floe = owner("seal-floe", [1.4, .22, 3.88]);
  cyl(floe, pivots[floe], 1.05, .42, ice); snowbank(floe, 1.4, .46, 3.88, 1.9, 1.4, true); fix(floe, [.9, .24, 4.78], [0, 0, 1]);
  seals.push(seal("lake-seal", .96, .6, 3.88, .83), seal("lake-pup", 1.96, .6, 3.96, .45, true));
  after(floe, seals.slice(2)); after(caveSnow, seals.slice(0, 2));
  function gull(name: string, x: number, y: number, z: number) {
    const p = owner(name, [x, y + .24, z]);
    ball(p, pivots[p], [.20, .24, .22], snow); ball(p, [x, y + .50, z + .03], [.14, .16, .14], snow);
    for (const side of [-1, 1]) ball(p, [x + side * .13, y + .24, z - .04], [.10, .11, .23], "#758aa1");
    for (const side of [-1, 1]) { cyl(p, [x + side * .07, y + .04, z], .018, .15, gold); ball(p, [x + side * .10, y + .53, z + .12], [.018, .02, .012], charcoal); }
    shape(p, cone, [x, y + .46, z + .22], [.055, .22, .035], gold, [Math.PI / 2, 0, 0], "cone"); fix(p, [x, y + .3, z - .23], [0, 0, -1]);
    return p;
  }
  gull("summit-gull", -4.1, 4.83, -3.25);
  gull("dock-gull", 4.53, 2.02, -.30);
  // Front-left expedition sled with independently fastened runners and luggage.
  const sx = -3.55, sz = 1.1;
  const sledParts: ArcticPartId[] = [];
  for (const side of [-1, 1]) {
    const p = owner(`sled-runner-${side}`, [sx + side * .57, 1.23, sz]); sledParts.push(p);
    curve(p, [[sx + side * .57, 1.12, sz - .75], [sx + side * .57, 1.08, sz + .8], [sx + side * .57, 1.25, sz + 1.02], [sx + side * .57, 1.43, sz + .88]], .085, honey);
    fix(p, [sx + side * .66, 1.1, sz + .36], [side, 0, 0]);
  }
  const sledBed = owner("sled-bed", [sx, 1.4, sz]); sledParts.push(sledBed);
  for (let j = 0; j < 6; j++) box(sledBed, [sx + (j - 2.5) * .19, 1.39, sz], [.18, .12, 1.45], honey);
  fix(sledBed, [sx + .095, 1.32, sz + .5], [0, -1, 0]);
  for (const side of [-1, 1]) {
    const p = owner(`sled-side-${side}`, [sx + side * .63, 1.66, sz]); sledParts.push(p);
    box(p, pivots[p], [.10, .18, 1.55], red); for (const bay of [-1, 1]) box(p, [sx + side * .63, 1.55, sz + bay * .53], [.09, .38, .09], wood);
    fix(p, [sx + side * .69, 1.66, sz + .3], [side, 0, 0]);
  }
  for (let i = 0; i < 2; i++) {
    const p = owner(`sled-bag-${i}`, [sx + (i - .5) * .55, 1.72, sz]);
    box(p, pivots[p], [.5, .52, .72], i ? "#75a365" : wood);
    for (const dz of [-.22, .22]) box(p, [pivots[p][0], 1.99, sz + dz], [.50, .035, .075], cream);
    box(p, [pivots[p][0], 1.73, sz + .38], [.14, .14, .045], gold); fix(p, [pivots[p][0], 1.72, sz + .41], [0, 0, 1]);
  }
  const roll = owner("sled-bedroll", [sx, 2.10, sz - .43]);
  cyl(roll, pivots[roll], .23, 1.15, gold, [0, 0, Math.PI / 2]);
  for (const side of [-1, 1]) hoop(roll, [sx + side * .3, 2.1, sz - .43], .24, "#76a275", [0, Math.PI / 2, 0]);
  fix(roll, [sx + .59, 2.1, sz - .43], [1, 0, 0]);
  // Camera tripod is a two-piece assembly, with a clear front-mounted head fixing.
  const tripod = owner("camera-tripod", [-2.0, 1.58, .15]);
  for (let i = 0; i < 3; i++) { const a = i * Math.PI * 2 / 3; beam(tripod, [-2, 1.98, .15], [-2 + Math.cos(a) * .38, 1.03, .15 + Math.sin(a) * .38], .08, gold); }
  cyl(tripod, [-2, 1.96, .15], .17, .12, charcoal); fix(tripod, [-2, 1.92, .33], [0, 0, 1]);
  const camera = owner("survey-camera", [-2.0, 2.15, .15]);
  box(camera, pivots[camera], [.62, .37, .33], cream); cyl(camera, [-2, 2.15, .38], .14, .16, charcoal, [Math.PI / 2, 0, 0]); cyl(camera, [-2, 2.15, .47], .10, .025, paleIce, [Math.PI / 2, 0, 0]);
  fix(camera, [-2.26, 2.15, .33], [0, 0, 1]); after(tripod, [camera]);
  // Fishing platform and boxes sit on the right shelf, away from the family.
  const pier: ArcticPartId[] = [];
  for (let i = 0; i < 3; i++) {
    const p = owner(`fishing-deck-${i}`, [3.6 + (i - 1) * .52, 1.36, 1.1]); pier.push(p);
    for (let j = 0; j < 3; j++) box(p, [pivots[p][0], 1.36, 1.1 + (j - 1) * .58], [.5, .13, .56], honey);
    for (const bay of [-1, 1]) box(p, [pivots[p][0], .94, 1.1 + bay * .72], [.13, .77, .13], wood);
    fix(p, [pivots[p][0], 1.31, 2.0], [0, 0, 1]);
  }
  for (const [i, x, z] of [[0, 3.8, .05], [1, 4.23, 1.35]] as const) {
    const body = owner(`fish-crate-${i}`, [x, 1.75, z]);
    for (const side of [-1, 1]) { box(body, [x + side * .4, 1.75, z], [.09, .62, .72], honey); box(body, [x, 1.75, z + side * .35], [.85, .62, .08], wood); }
    box(body, [x, 1.48, z], [.8, .10, .7], honey); fix(body, [x + .4, 2.07, z], [0, 1, 0]);
    const fish = owner(`fish-tray-${i}`, [x, 2.10, z]);
    box(fish, pivots[fish], [.82, .10, .72], shadowSnow);
    for (let j = 0; j < 5; j++) {
      const fx = x + ((j % 3) - 1) * .24, fz = z + (Math.floor(j / 3) - .5) * .28;
      ball(fish, [fx, 2.21, fz], [.11, .07, .24], j % 2 ? "#91b7cd" : "#b9dbe6");
      iceChunk(fish, [fx, 2.2, fz - .24], [.13, .06, .10], blue); ball(fish, [fx - .08, 2.24, fz + .12], [.015, .015, .015], charcoal);
    }
    fix(fish, [x + .42, 2.10, z + .1], [1, 0, 0]); after(body, [fish]);
  }
  for (const [i, x, y, z] of [[0, 4.53, 1.8, -.30], [1, 4.7, 1.35, 1.95], [2, 2.5, 1.35, 1.95]] as const) {
    const p = owner(`fishing-post-${i}`, [x, y, z]);
    cyl(p, pivots[p], .10, .74, wood); cyl(p, [x, y + .4, z], .12, .12, cream);
    if (i === 1) curve(p, [[x, y + .24, z], [3.6, y + .05, z], [2.5, y + .24, z]], .035, honey);
    fix(p, [x, y, z + .11], [0, 0, 1]);
  }
  // A short rope bridge over the central lake opening.
  for (let i = 0; i < 3; i++) {
    const p = owner(`bridge-deck-${i}`, [(i - 1) * .72, .83, 2.52]);
    for (let j = 0; j < 3; j++) box(p, [(i - 1) * .72 + (j - 1) * .23, .83 - .04 * (1 - Math.abs(i - 1)), 2.52], [.215, .12, .98], honey);
    fix(p, [(i - 1) * .72, .86 - .04 * (1 - Math.abs(i - 1)), 2.2]);
  }
  for (const side of [-1, 1]) for (const bay of [-1, 1]) {
    const p = owner(`bridge-post-${side}-${bay}`, [side * 1.24, 1.12, 2.52 + bay * .56]);
    cyl(p, pivots[p], .11, .9, wood); cyl(p, [side * 1.24, 1.61, 2.52 + bay * .56], .13, .12, cream);
    for (let j = 0; j < 3; j++) hoop(p, [side * 1.24, 1.38 + j * .045, 2.52 + bay * .56], .115, honey);
    fix(p, [side * 1.24, 1.15, 2.52 + bay * .56 + bay * .12], [0, 0, bay]);
  }
  for (const bay of [-1, 1]) {
    const p = owner(`bridge-rope-${bay}`, [0, 1.4, 2.52 + bay * .56]);
    curve(p, [[-1.24, 1.47, 2.52 + bay * .56], [0, 1.13, 2.52 + bay * .56], [1.24, 1.47, 2.52 + bay * .56]], .05, honey);
    cyl(p, [0, 1.17, 2.52 + bay * .56], .115, .12, gold, [Math.PI / 2, 0, 0]); fix(p, [0, 1.17, 2.52 + bay * .56 + bay * .08], [0, 0, bay]);
  }
  function flag(name: string, x: number, y: number, z: number, color: string) {
    const p = owner(name, [x, y, z]); cyl(p, [x, y + .6, z], .055, 1.3, charcoal);
    for (const h of [.08, 1.16]) cyl(p, [x, y + h, z], .085, .13, gold);
    const s = new Shape(); s.moveTo(0, -.3); s.bezierCurveTo(.3, -.42, .8, -.1, 1.05, -.2); s.lineTo(1.05, .4); s.bezierCurveTo(.8, .5, .3, .17, 0, .3); s.closePath();
    shape(p, new ExtrudeGeometry(s, { depth: .04, bevelEnabled: false, curveSegments: 10 }), [x + .08, y + .72, z], [1, 1, 1], color);
    flowerSnowflake(p, x + .75, y + .75, z + .055, .19);
    if (name === "research-flag") {
      ball(p, [x + .32, y + .72, z + .055], [.14, .20, .014], snow);
      ball(p, [x + .32, y + .92, z + .055], [.105, .11, .014], snow);
      for (const side of [-1, 1]) ball(p, [x + .32 + side * .035, y + .94, z + .073], [.012, .015, .009], navy);
      ball(p, [x + .32, y + .88, z + .075], [.03, .018, .01], gold);
    }
    fix(p, [x, y + .12, z + .065], [0, 0, 1]); return p;
  }
  flag("research-flag", -2.45, 4.3, -3.65, "#5464ce"); flag("expedition-flag", -1.65, 1.27, -.48, red);
  for (const [i, x, z] of [[0, -3.15, 4.0], [1, 4.1, 3.85]] as const) {
    const p = owner(`buoy-${i}`, [x, .3, z]);
    shape(p, smooth(new CylinderGeometry(.23, .42, .6, 24)), pivots[p], [1, 1, 1], i ? "#ee8d3d" : red, undefined, "cone");
    hoop(p, [x, .08, z], .4, cream); ball(p, [x, .61, z], [.27, .07, .27], snow); fix(p, [x, .3, z + .39], [0, 0, 1]);
    flag(`buoy-flag-${i}`, x, .68, z, i ? "#ed8b37" : red);
  }
  for (const [i, x, z] of [[0, -.55, 4.1], [1, -4.1, 3.0], [2, 3.5, 4.7]] as const) {
    const p = owner(`floating-ice-${i}`, [x, .18, z]); iceChunk(p, [x, .25, z], [.37, .45, .35], paleIce); ball(p, [x, .07, z], [.48, .07, .40], snow); fix(p, [x, .09, z + .41], [0, 0, 1]);
  }
  for (const [i, x] of [[0, 1.42], [1, 2.1]] as const) {
    const p = owner(`hut-barrel-${i}`, [x, 2.88, -.96]);
    cyl(p, pivots[p], .27, .72, i ? red : wood); for (const h of [2.63, 2.90, 3.12]) hoop(p, [x, h, -.96], .28, i ? gold : charcoal);
    fix(p, [x, 3.25, -.96]);
    const lid = owner(`barrel-snow-lid-${i}`, [x, 3.29, -.96]); cyl(lid, pivots[lid], .29, .08, honey); ball(lid, [x, 3.36, -.96], [.3, .09, .3], snow);
    fix(lid, [x, 3.47, -.96]); after(p, [lid]);
  }
  const chest = owner("supply-chest", [-.78, 2.78, -.71]); box(chest, pivots[chest], [.65, .48, .53], gold); fix(chest, [-.78, 2.8, -.425], [0, 0, 1]);
  const chestLid = owner("supply-chest-lid", [-.78, 3.09, -.71]); box(chestLid, pivots[chestLid], [.7, .14, .58], gold); snowbank(chestLid, -.78, 3.2, -.71, .73, .6); fix(chestLid, [-.51, 3.08, -.40], [0, 0, 1]);
  after(chest, [chestLid]);
  const lifeRing = owner("hut-life-ring", [2.12, 3.6, -2.25]);
  for (let i = 0; i < 4; i++) shape(lifeRing, smooth(new TorusGeometry(.44, .095, 8, 12, Math.PI / 2)), pivots[lifeRing], [1, 1, 1], i % 2 ? cream : red, [0, Math.PI / 2, i * Math.PI / 2], "ring");
  fix(lifeRing, [2.24, 3.6, -1.84], [1, 0, 0]);
  // Foundation generation waits for everything above; this is a construction
  // order only. Player eligibility always uses actual head/extraction geometry.
  for (const p of terrain) after(p, Object.keys(pivots).filter(id => !terrain.includes(id as ArcticPartId)) as ArcticPartId[]);
  after(caveRoof, [caveSnow, summit]); caveWalls.forEach(p => after(p, [caveRoof, caveSnow])); after(caveBack, [caveRoof, caveSnow]);
  after(sledBed, ["arctic-sled-bag-0", "arctic-sled-bag-1", roll]);
  pier.forEach(p => after(p, [fishingPenguin, "arctic-fish-crate-0", "arctic-fish-crate-1", "arctic-fish-tray-0", "arctic-fish-tray-1"]));
  return { model: { pieces, pivots, parts: Object.keys(pivots) as ArcticPartId[] }, mounts, detail: ARCTIC_DETAIL };
}
