import { CylinderGeometry, Euler, Float32BufferAttribute, LatheGeometry, Matrix4, Quaternion, SphereGeometry, TorusGeometry, Vector2, Vector3 } from "three";
import type { BufferGeometry } from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { ConvexGeometry } from "three/addons/geometries/ConvexGeometry.js";
import type { Screw, SpacePartId } from "../game/types.ts";
import type { Piece, Vector } from "./houseModel.ts";

type Mount = Pick<Screw, "position" | "normal" | "solutionAfter"> & { attachedTo: SpacePartId };
const pieces: Piece[] = [], pivots: Record<SpacePartId, Vector> = {};
export const SPACE_MOUNTS: Mount[] = [];
export const SPACE_BASE_SEGMENTS = 20, SPACE_SEGMENTS = 28, SPACE_RINGS = 12;
// 28 rather than 20 longitude segments gives curved surfaces 40% more faces.
export const SPACE_CURVED_GEOMETRY = new SphereGeometry(1, SPACE_SEGMENTS, SPACE_RINGS);
function smooth(geometry: BufferGeometry) {
  geometry.setAttribute("color", new Float32BufferAttribute(new Float32Array(geometry.getAttribute("position").count * 3).fill(1), 3));
  return geometry;
}
smooth(SPACE_CURVED_GEOMETRY);
const soft = new RoundedBoxGeometry(1, 1, 1, 3, .09), cylinder = smooth(new CylinderGeometry(1, 1, 1, 34));
const cream = "#f7ead7", white = "#fff6e9", violet = "#8d81b3", slate = "#596582", rock = "#aaa0bd";
const orange = "#ffc15b", red = "#f76e64", cyan = "#62e5ee", blue = "#4559aa", yellow = "#fff3a3";
export const SPACE_GLASS_COLOR = "#a7deed";
const domeParts: SpacePartId[] = [], hubWalls: SpacePartId[] = [], deckParts: SpacePartId[] = [];
function owner(name: string, pivot: Vector) { const id: SpacePartId = `space-${name}`; pivots[id] = pivot; return id; }
function piece(part: SpacePartId, geometry: BufferGeometry, position: Vector, size: Vector, color: string, rotation?: Vector, kind: Piece["kind"] = "box") {
  pieces.push({ part, geometry, position, size, color, rotation, kind });
}
function box(part: SpacePartId, p: Vector, s: Vector, c = cream, r?: Vector) { piece(part, soft, p, s, c, r); }
function ball(part: SpacePartId, p: Vector, s: Vector, c: string) { piece(part, SPACE_CURVED_GEOMETRY, p, s, c, undefined, "ico-detail"); }
function tube(part: SpacePartId, p: Vector, radius: number, h: number, c: string, r?: Vector) { piece(part, cylinder, p, [radius, h, radius], c, r, "cylinder"); }
function beam(part: SpacePartId, a: Vector, b: Vector, radius: number, c: string) {
  const start = new Vector3(...a), end = new Vector3(...b), direction = end.clone().sub(start);
  const rotation = new Euler().setFromQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), direction.clone().normalize()));
  tube(part, start.add(end).multiplyScalar(.5).toArray(), radius, direction.length(), c, [rotation.x, rotation.y, rotation.z]);
}
function ring(part: SpacePartId, p: Vector, radius: number, thickness: number, c: string, r: Vector = [Math.PI / 2, 0, 0], arc = Math.PI * 2) {
  piece(part, smooth(new TorusGeometry(radius, thickness, 10, Math.ceil(50 * arc / (Math.PI * 2)), arc)), p, [1, 1, 1], c, r, "ring");
}
function screw(part: SpacePartId, p: Vector, normal: Vector = [0, 1, 0], after?: SpacePartId[]) {
  SPACE_MOUNTS.push({ attachedTo: part, position: p, normal: new Vector3(...normal).normalize().toArray(), solutionAfter: after });
}
function panel(part: SpacePartId, p: Vector, w: number, h: number, color = slate) {
  box(part, p, [w, h, .1], color);
  box(part, [p[0], p[1], p[2] + .065], [w * .82, h * .72, .035], blue);
  for (let i = 0; i < 3; i++) box(part, [p[0] - w * .25, p[1] + h * (.23 - i * .23), p[2] + .09], [w * .35, .06, .02], cyan);
}
function sector(part: SpacePartId, p: Vector, radius: number, h: number, start: number, arc: number, c: string, inner = 0) {
  if (!inner) { piece(part, smooth(new CylinderGeometry(radius, radius, h, Math.max(4, Math.ceil(34 * arc / (Math.PI * 2))), 1, false, start, arc)), p, [1, 1, 1], c); return; }
  // A closed annular wedge gives real hollow rooms rather than a solid cylinder.
  const profile = [new Vector2(inner, -h/2), new Vector2(radius, -h/2), new Vector2(radius, h/2), new Vector2(inner, h/2), new Vector2(inner, -h/2)];
  piece(part, smooth(new LatheGeometry(profile, Math.max(5, Math.ceil(34 * arc / (Math.PI * 2))), start, arc)), p, [1, 1, 1], c);
}
function gem(part: SpacePartId, p: Vector, r: number, h: number, c: string) {
  const points: Vector3[] = [];
  for (const y of [0, h * .68]) for (let i = 0; i < 6; i++) points.push(new Vector3(Math.cos(i * Math.PI / 3) * r, y, Math.sin(i * Math.PI / 3) * r));
  points.push(new Vector3(0, h, 0));
  piece(part, new ConvexGeometry(points), p, [1, 1, 1], c);
}

// Nine rocky foundation/terrain pairs. Natural props cover the upward heads.
for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) {
  const x = (col - 1) * 3.8, z = (row - 1) * 3.8;
  const base = owner(`foundation-${row}-${col}`, [x, -.5, z]);
  box(base, pivots[base], [3.78, .85, 3.78], violet);
  screw(base, [x, -.065, z]);
  if (row === 2) box(base, [x, -.45, z + 1.89], [1.0, .08, .035], orange);
  const terrain = owner(`terrain-${row}-${col}`, [x, .0, z]);
  box(terrain, pivots[terrain], [3.78, .16, 3.78], "#c7bdd8");
  // Small rocks and dust belong to the tile, not separate tiny screw owners.
  for (let i = 0; i < 11; i++) {
    const dx = Math.sin(i * 71 + col * 19) * 1.65, dz = Math.cos(i * 37 + row * 13) * 1.65;
    ball(terrain, [x + dx, .13, z + dz], [.06 + (i % 3) * .035, .04, .075], rock);
  }
  screw(terrain, [x + .74, .09, z - .7]);
}

// Six independently fastened deck wedges and supporting piers, with an open
// centre. Rails, stairs, walls and machinery hide different fixing directions.
const hubZ = -1.05;
for (let i = 0; i < 6; i++) {
  const a = i * Math.PI / 3, middle = a + Math.PI / 6;
  const p = owner(`hub-deck-${i}`, [Math.sin(middle) * 1.6, .72, hubZ + Math.cos(middle) * 1.6]);
  deckParts.push(p); sector(p, [0, .72, hubZ], 2.55, .24, a, Math.PI / 3 - .012, slate, .12);
  screw(p, [Math.sin(middle) * 2.56, .71, hubZ + Math.cos(middle) * 2.56], [Math.sin(middle), 0, Math.cos(middle)]);
  const leg = owner(`deck-pier-${i}`, [Math.sin(middle) * 2.0, .32, hubZ + Math.cos(middle) * 2.0]);
  tube(leg, pivots[leg], .15, .58, slate); box(leg, [pivots[leg][0], .1, pivots[leg][2]], [.4, .16, .4], violet);
  screw(leg, [pivots[leg][0], .43, pivots[leg][2] + .16], [0, 0, 1], [p]);
  if (i !== 0 && i !== 5) {
    const rail = owner(`deck-rail-${i}`, [Math.sin(middle) * 2.45, 1.17, hubZ + Math.cos(middle) * 2.45]);
    const points = [a + .12, a + Math.PI / 3 - .12].map((angle) => [Math.sin(angle) * 2.45, 1.05, hubZ + Math.cos(angle) * 2.45] as Vector);
    for (const v of points) tube(rail, v, .045, .63, orange);
    beam(rail, [points[0][0], 1.36, points[0][2]], [points[1][0], 1.36, points[1][2]], .045, orange);
    box(rail, pivots[rail], [.23, .23, .09], orange); screw(rail, [pivots[rail][0], 1.17, pivots[rail][2] + .06], [0, 0, 1]);
  }
}
for (let i = 0; i < 4; i++) {
  const y = .14 + i * .16, z = 2.1 - i * .33, p = owner(`entry-step-${i}`, [0, y, z]);
  box(p, pivots[p], [1.3, .15, .36], cream); box(p, [0, y + .084, z + .08], [.85, .015, .08], orange);
  screw(p, [i % 2 ? -.6 : .6, y, z], [i % 2 ? -1 : 1, 0, 0]);
}

// The habitat shell is assembled from real curved wall panels. Its front door
// is split from the jambs, leaving a genuine opening when removed.
for (let i = 0; i < 8; i++) {
  const a = .46 + i * (Math.PI * 2 - .92) / 8, arc = (Math.PI * 2 - .92) / 8 - .013, m = a + arc / 2;
  const p = owner(`habitat-wall-${i}`, [Math.sin(m) * 1.85, 1.9, hubZ + Math.cos(m) * 1.85]); hubWalls.push(p);
  sector(p, [0, 1.91, hubZ], 1.98, 2.12, a, arc, i % 2 ? cream : white, 1.78);
  for(const y of [1.14,2.78])sector(p,[0,y,hubZ],2.0,.11,a,arc,violet,1.96);
  // Inner wall fixings are revealed by dome/floor removal, never blanket locks.
  screw(p, [Math.sin(m) * 1.77, 2.12, hubZ + Math.cos(m) * 1.77], [-Math.sin(m), 0, -Math.cos(m)]);
  const equipment = owner(`habitat-terminal-${i}`, [Math.sin(m) * 2.0, 1.92, hubZ + Math.cos(m) * 2.0]);
  // A small radial box and cyan display read clearly from every side.
  box(equipment, pivots[equipment], [.32, .63, .18], slate, [0, m, 0]);
  box(equipment, [Math.sin(m) * 2.10, 1.95, hubZ + Math.cos(m) * 2.10], [.19, .36, .03], cyan, [0, m, 0]);
  screw(equipment, [Math.sin(m) * 2.11, 1.75, hubZ + Math.cos(m) * 2.11], [Math.sin(m), 0, Math.cos(m)]);
}
const doorFrame = owner("airlock-frame", [0, 1.77, 1.0]);
for (const x of [-.59, .59]) box(doorFrame, [x, 1.72, .99], [.18, 1.79, .30], slate);
box(doorFrame, [0, 2.57, .99], [1.32, .22, .3], slate);
for (const side of [-1, 1]) {
  const p = owner(`airlock-door-${side}`, [side * .26, 1.7, 1.03]);
  box(p, pivots[p], [.5, 1.57, .15], cream); box(p, [side * .26, 1.7, 1.12], [.38, 1.35, .035], orange);
  box(p, [side * .26, 1.75, 1.15], [.26, .8, .02], slate); box(p, [side * .1, 1.75, 1.18], [.045, .48, .025], yellow);
  screw(p, [side * .26, 1.23, 1.17], [0, 0, 1]);
}
screw(doorFrame, [.59, 2.35, 1.15], [0, 0, 1]);

// Plants sit on independent hydroponic trays and floor sectors. Dome frames and
// glass wedges peel away to expose these interior/sill and underside heads.
for (let i = 0; i < 4; i++) {
  const a = .4 + i * Math.PI / 2, x = Math.sin(a) * .92, z = hubZ + Math.cos(a) * .92;
  const floor = owner(`habitat-floor-${i}`, [x, .97, z]); sector(floor, [0, .97, hubZ], 1.76, .16, i * Math.PI / 2, Math.PI / 2 - .015, violet);
  screw(floor, [x, 1.06, z]);
  const tray = owner(`hydro-tray-${i}`, [x, 1.14, z]); box(tray, pivots[tray], [.79, .18, .7], slate);
  box(tray, [x, 1.26, z], [.67, .10, .58], "#a3b8a5"); screw(tray, [x + .4, 1.19, z], [1, 0, 0]);
  for (let j = 0; j < 2; j++) {
    const px = x + (j ? .2 : -.2), plant = owner(`hydro-plant-${i}-${j}`, [px, 1.45, z]);
    tube(plant, [px, 1.36, z], .12, .23, orange);
    for (let k = 0; k < 5; k++) { const a = k * Math.PI * .4; beam(plant, [px, 1.47, z], [px + Math.sin(a) * .18, 1.69 + k % 2 * .12, z + Math.cos(a) * .18], .045, k % 2 ? "#76c98b" : "#b4df83"); }
    screw(plant, [px, 1.44, z + .13], [0, 0, 1]);
  }
}
for (let i = 0; i < 8; i++) {
  const a = i * Math.PI / 4, middle = a + Math.PI / 8;
  const rim = owner(`dome-rim-${i}`, [Math.sin(middle) * 1.95, 3.02, hubZ + Math.cos(middle) * 1.95]);
  sector(rim, [0, 3.02, hubZ], 2.12, .22, a, Math.PI / 4 - .015, slate, 1.83);
  screw(rim, [Math.sin(middle) * 2.13, 3.02, hubZ + Math.cos(middle) * 2.13], [Math.sin(middle), 0, Math.cos(middle)]);
  const glass = owner(`greenhouse-glass-${i}`, [0, 3.12, hubZ]); domeParts.push(glass);
  const g = smooth(new SphereGeometry(1, 7, SPACE_RINGS, a, Math.PI / 4 - .018, .12, Math.PI / 2 - .12));
  piece(glass, g, [0, 3.12, hubZ], [1.97, 1.48, 1.97], SPACE_GLASS_COLOR, [0, Math.PI / 2, 0]);
  // The broad seam tab is part of the pane and has its own spaced outward head.
  const r = 1.72, y = 3.86;
  box(glass, [Math.sin(middle) * r, y, hubZ + Math.cos(middle) * r], [.27, .22, .13], white, [0, middle, 0]);
  screw(glass, [Math.sin(middle) * (r + .08), y, hubZ + Math.cos(middle) * (r + .08)], [Math.sin(middle), .25, Math.cos(middle)]);
  const frame = owner(`greenhouse-rib-${i}`, [0, 3.12, hubZ]);
  const points = Array.from({ length: 9 }, (_, j) => { const theta = .15 + j / 8 * (Math.PI / 2 - .15); return [Math.sin(a) * Math.sin(theta) * 2.0, 3.12 + Math.cos(theta) * 1.5, hubZ + Math.cos(a) * Math.sin(theta) * 2.0] as Vector; });
  for (let j = 1; j < points.length; j++) beam(frame, points[j-1], points[j], .045, white);
  const p = points[4], normal = new Vector3(Math.sin(a), .5, Math.cos(a)).normalize();
  ball(frame, p, [.14,.14,.14], orange);
  screw(frame, new Vector3(...p).addScaledVector(normal,.145).toArray(), normal.toArray());
}
for (let i = 0; i < 3; i++) {
  const p = owner(`dome-crown-${i}`, [0, 4.66 + i * .17, hubZ]);
  tube(p, pivots[p], .54 - i * .12, .16, i === 1 ? orange : white);
  const a=i*Math.PI*2/3, r=.545-i*.12;
  screw(p, [Math.sin(a)*r, 4.66 + i * .17, hubZ + Math.cos(a)*r], [Math.sin(a), 0, Math.cos(a)]);
}
const beacon = owner("habitat-beacon", [0, 5.2, hubZ]); tube(beacon, [0, 5.11, hubZ], .07, .35, orange); ball(beacon, [0, 5.35, hubZ], [.14, .14, .14], yellow);
screw(beacon, [0, 5.12, hubZ + .08], [0, 0, 1]);

// Red-and-cream rocket and circular landing pad, offset from the habitat so both
// silhouettes remain readable. Individual fins, engines and hull courses detach.
const rx = -3.85, rz = 1.05;
const padBase = owner("launch-foundation", [rx, .23, rz]); tube(padBase, pivots[padBase], 1.62, .29, slate);
screw(padBase, [rx + .45, .385, rz]);
for (let i = 0; i < 4; i++) {
  const a = i * Math.PI / 2, m = a + Math.PI / 4;
  const pad = owner(`launch-deck-${i}`, [rx, .43, rz]); sector(pad, pivots[pad], 1.61, .15, a, Math.PI / 2 - .018, violet);
  screw(pad, [rx + Math.sin(m) * 1.24, .52, rz + Math.cos(m) * 1.24]);
  const lip = owner(`launch-lip-${i}`, [rx, .54, rz]); sector(lip, pivots[lip], 1.64, .15, a, Math.PI / 2 - .025, orange, 1.41);
  screw(lip, [rx + Math.sin(m) * 1.65, .54, rz + Math.cos(m) * 1.65], [Math.sin(m), 0, Math.cos(m)]);
  for (let j = 0; j < 4; j++) { const t = a + .1 + j * .34; ball(lip, [rx + Math.sin(t) * 1.53, .63, rz + Math.cos(t) * 1.53], [.05, .03, .05], yellow); }
}
const engine = owner("rocket-engine", [rx, .89, rz]); tube(engine, pivots[engine], .44, .32, slate);
screw(engine, [rx, .89, rz + .45], [0, 0, 1]);
for (let i = 0; i < 3; i++) {
  const a = .15 + i * Math.PI * 2 / 3;
  const nozzle = owner(`rocket-nozzle-${i}`, [rx + Math.sin(a) * .28, .75, rz + Math.cos(a) * .28]);
  tube(nozzle, pivots[nozzle], .15, .36, slate); ring(nozzle, [pivots[nozzle][0], .6, pivots[nozzle][2]], .15, .025, cyan);
  screw(nozzle, [pivots[nozzle][0], .565, pivots[nozzle][2]], [0, -1, 0]);
}
for (let course = 0; course < 2; course++) for (let i = 0; i < 3; i++) {
  const a = -.8 + i * Math.PI * 2 / 3, m = a + Math.PI / 3, y = 1.42 + course * .84;
  const hull = owner(`rocket-hull-${course}-${i}`, [rx, y, rz]);
  sector(hull, pivots[hull], .58 - course * .025, .83, a, Math.PI * 2 / 3 - .018, cream, .42);
  const r = .59 - course * .025;
  screw(hull, [rx + Math.sin(m) * r, y - .18, rz + Math.cos(m) * r], [Math.sin(m), 0, Math.cos(m)]);
  for (const dy of [-.33, .33]) ball(hull, [rx + Math.sin(m) * (r+.005), y + dy, rz + Math.cos(m) * (r+.005)], [.03, .03, .03], slate);
}
const nose = owner("rocket-nose", [rx, 3.14, rz]);
piece(nose, smooth(new LatheGeometry([new Vector2(0, .83), new Vector2(.1, .67), new Vector2(.35, .28), new Vector2(.53, -.27), new Vector2(.55, -.46), new Vector2(0, -.46)], 34)), pivots[nose], [1, 1, 1], red);
screw(nose, [rx, 2.91, rz + .56], [0, 0, 1]);
const window = owner("rocket-porthole", [rx, 2.22, rz + .57]);
ring(window, pivots[window], .31, .055, orange, [0, 0, 0]); ball(window, [rx, 2.22, rz + .57], [.27, .27, .075], cyan);
ball(window, [rx - .1, 2.32, rz + .64], [.06, .07, .015], white);
screw(window, [rx + .3, 2.22, rz + .64], [0, 0, 1]);
for (let i = 0; i < 3; i++) {
  const a = .8 + i * Math.PI * 2 / 3, dx = Math.sin(a), dz = Math.cos(a);
  const fin = owner(`rocket-fin-${i}`, [rx + dx * .63, 1.2, rz + dz * .63]);
  ball(fin, pivots[fin], [.19, .64, .25], red);
  tube(fin, [rx + dx * .7, .75, rz + dz * .7], .15, .39, cream);
  tube(fin, [rx + dx * .7, .56, rz + dz * .7], .16, .13, slate);
  screw(fin, [rx + dx * .8, 1.26, rz + dz * .85], [dx, 0, dz]);
}
// Open launch gantry: split columns and platforms rather than a single cage.
const gx = -5.08, gz = -.18;
for (let i = 0; i < 3; i++) {
  const y = .76 + i * 1.13, tower = owner(`gantry-course-${i}`, [gx, y, gz]);
  for (const x of [-.28, .28]) for (const z of [-.24, .24]) tube(tower, [gx+x, y, gz+z], .06, 1.08, slate);
  for (const z of [-.24, .24]) { beam(tower, [gx-.28,y-.5,gz+z], [gx+.28,y+.5,gz+z], .05, orange); beam(tower,[gx+.28,y-.5,gz+z],[gx-.28,y+.5,gz+z],.05,orange); }
  box(tower,[gx,y+.53,gz],[.75,.15,.74],orange); screw(tower,[gx-.39,y+.53,gz],[-1,0,0]);
  const bridge=owner(`gantry-platform-${i}`,[gx+.55,y+.54,gz]); box(bridge,pivots[bridge],[1.55,.12,.65],slate);
  box(bridge,[gx+.55,y+.61,gz+.28],[1.5,.08,.07],orange); screw(bridge,[gx+.54,y+.54,gz+.34],[0,0,1]);
}
for (let i = 0; i < 2; i++) {
  const p = owner(`gantry-floodlight-${i}`, [gx + (i ? .22 : -.22), 3.91, gz]);
  tube(p,[pivots[p][0],3.74,gz],.055,.35,slate); box(p,pivots[p],[.26,.28,.24],orange); ball(p,[pivots[p][0],3.91,gz+.14],[.1,.1,.025],yellow);
  screw(p,[pivots[p][0],3.91,gz-.13],[0,0,-1]);
}

// Communications mast: separate lattice courses, dishes, electronics and beacon.
const tx=-3.55, tz=-3.92;
const towerFoot=owner("comms-foot",[tx,.15,tz]);box(towerFoot,pivots[towerFoot],[1.25,.24,1.15],violet);screw(towerFoot,[tx,.28,tz]);
for(let i=0;i<5;i++) {
  const y=.72+i*1.12, p=owner(`comms-lattice-${i}`,[tx,y,tz]);
  for(const [dx,dz] of [[-.4,-.3],[.4,-.3],[0,.38]]) tube(p,[tx+dx,y,tz+dz],.065,1.1,slate);
  for(const z of [-.3,.18]) {beam(p,[tx-.35,y-.47,tz+z],[tx+.35,y+.47,tz+z],.045,white);beam(p,[tx+.35,y-.47,tz+z],[tx-.35,y+.47,tz+z],.045,white);}
  box(p,[tx,y+.51,tz],[1,.13,.93],i%2?orange:violet); screw(p,[tx-.51,y+.51,tz],[-1,0,0]);
  const boxPart=owner(`comms-control-${i}`,[tx+.48,y,tz]); box(boxPart,pivots[boxPart],[.25,.38,.35],i%2?red:slate); box(boxPart,[tx+.62,y,tz],[.03,.2,.19],cyan);
  screw(boxPart,[tx+.63,y-.12,tz],[1,0,0]);
}
function dish(name:string,p:Vector,r:number,rotation:Vector):SpacePartId {
  const id=owner(name,p);
  const profile=Array.from({length:15},(_,i)=>{const t=i/14;return new Vector2(r*t,.27*r*t*t);});
  // Concave dish bowl is real open geometry, with a thick rim and receiver.
  const geometry=smooth(new LatheGeometry(profile,42)); piece(id,geometry,p,[1,1,1],cream,rotation);
  const transform=new Matrix4().makeRotationFromEuler(new Euler(...rotation));
  const point=(v:Vector)=>new Vector3(...v).applyMatrix4(transform).add(new Vector3(...p)).toArray();
  ring(id,point([0,.27*r,0]),r,.045,white,[Math.PI/2+rotation[0],rotation[1],rotation[2]]);
  for(let i=0;i<3;i++){const a=i*Math.PI*2/3;beam(id,point([Math.sin(a)*r*.8,.18*r,Math.cos(a)*r*.8]),point([0,r*.73,0]),.035,orange);}
  ball(id,point([0,r*.73,0]),[.12,.12,.12],red);
  const n=new Vector3(0,-1,0).transformDirection(transform); screw(id,point([0,-.035,0]),n.toArray());
  return id;
}
dish("comms-dish-large",[tx,5.84,tz+.15],.72,[1.05,0,-.35]);
dish("comms-dish-small",[tx-.12,4.34,tz+.5],.34,[1.14,0,.35]);
const antenna=owner("comms-antenna",[tx,6.62,tz]); tube(antenna,pivots[antenna],.055,1.15,orange);ball(antenna,[tx,7.24,tz],[.11,.11,.11],red);
box(antenna,[tx,6.31,tz],[.27,.22,.27],orange);screw(antenna,[tx,6.31,tz+.145],[0,0,1]);

// Elevated deep-space radar and a pair of blue grid solar panels.
const dx=.8,dz=-4.4;
const radarRock=owner("radar-rock",[dx,.49,dz]);ball(radarRock,pivots[radarRock],[1.04,.57,.92],rock);screw(radarRock,[dx,1.07,dz]);
const radarBase=owner("radar-plinth",[dx,1.04,dz]);tube(radarBase,pivots[radarBase],.72,.25,violet);screw(radarBase,[dx+.74,1.04,dz],[1,0,0]);
const radarPost=owner("radar-pedestal",[dx,2.67,dz]);tube(radarPost,pivots[radarPost],.19,3.14,slate);ring(radarPost,[dx,4.0,dz],.4,.07,orange);screw(radarPost,[dx,2.1,dz+.20],[0,0,1]);
const radarYoke=owner("radar-yoke",[dx,4.31,dz]);box(radarYoke,pivots[radarYoke],[.9,.26,.5],violet);
for(const x of [-.38,.38])beam(radarYoke,[dx+x,4.31,dz],[dx+x,4.88,dz],.1,slate);
screw(radarYoke,[dx-.47,4.31,dz],[-1,0,0]);
dish("radar-bowl",[dx,5.0,dz],1.02,[.63,0,-.35]);
const radarConsole=owner("radar-console",[dx+.73,1.45,dz+.24]);panel(radarConsole,pivots[radarConsole],.4,.5);screw(radarConsole,[dx+.73,1.28,dz+.31],[0,0,1]);
for(let i=0;i<2;i++) {
  const x=3.12+i*1.5,z=-3.9;
  const foot=owner(`solar-foot-${i}`,[x,.36,z]);box(foot,pivots[foot],[.85,.55,.75],rock);screw(foot,[x,.65,z]);
  const mast=owner(`solar-mast-${i}`,[x,1.74,z]);tube(mast,pivots[mast],.12,2.58,slate);box(mast,[x,3.0,z],[.42,.2,.48],violet);screw(mast,[x,1.3,z+.13],[0,0,1]);
  const battery=owner(`solar-battery-${i}`,[x,.91,z+.6]);box(battery,pivots[battery],[1.0,.44,.53],cream);box(battery,[x,.91,z+.89],[.48,.22,.05],orange);screw(battery,[x+.43,.91,z+.9],[0,0,1]);
  const solar=owner(`solar-panel-${i}`,[x,3.4,z]),rotation:Vector=[.46,0,0];
  box(solar,pivots[solar],[1.42,.13,1.7],slate,rotation);
  box(solar,[x,3.47,z],[1.28,.04,1.57],blue,rotation);
  const matrix=new Matrix4().makeRotationFromEuler(new Euler(...rotation));
  const at=(v:Vector)=>new Vector3(...v).applyMatrix4(matrix).add(new Vector3(x,3.47,z)).toArray();
  for(let j=0;j<8;j++) box(solar,at([-.55+j*.157,.032,0]),[.012,.014,1.51],"#a7c7f4",rotation);
  for(let j=0;j<9;j++) box(solar,at([0,.032,-.69+j*.17]),[1.20,.014,.012],"#a7c7f4",rotation);
  const n=new Vector3(0,1,0).transformDirection(matrix);
  screw(solar,at([i? .5:-.5,.02,.57]),n.toArray());
}

// Side observatory is joined by an actual walk-through tunnel. Curved panels
// separate from the telescope, seat and instrument pedestal inside.
const ox=3.7,oz=-.25;
const obsFloor=owner("observatory-floor",[ox,.73,oz]);tube(obsFloor,pivots[obsFloor],1.17,.25,slate);screw(obsFloor,[ox+.44,.87,oz]);
for(let i=0;i<4;i++) {
  const a=i*Math.PI/2,m=a+Math.PI/4;
  const wall=owner(`observatory-wall-${i}`,[ox,1.36,oz]);sector(wall,pivots[wall],1.14,1.02,a,Math.PI/2-.025,cream,.95);
  const p=[ox+Math.sin(m)*1.16,1.38,oz+Math.cos(m)*1.16] as Vector;
  ball(wall,p,[.16,.17,.08],cyan);screw(wall,[ox+Math.sin(m)*.94,1.47,oz+Math.cos(m)*.94],[-Math.sin(m),0,-Math.cos(m)]);
  const rim=owner(`observatory-rim-${i}`,[ox,1.94,oz]);sector(rim,pivots[rim],1.21,.16,a,Math.PI/2-.025,slate,1.02);
  screw(rim,[ox+Math.sin(m)*1.22,1.94,oz+Math.cos(m)*1.22],[Math.sin(m),0,Math.cos(m)]);
  const glass=owner(`observatory-glass-${i}`,[ox,2.03,oz]);
  piece(glass,smooth(new SphereGeometry(1,7,SPACE_RINGS,a,Math.PI/2-.025,0,Math.PI/2)),pivots[glass],[1.12,.9,1.12],SPACE_GLASS_COLOR,[0,Math.PI/2,0]);
  const n=new Vector3(Math.sin(m),.55,Math.cos(m)).normalize(),p2=new Vector3(ox+Math.sin(m)*.95,2.48,oz+Math.cos(m)*.95);
  ball(glass,p2.toArray(),[.14,.14,.14],white);screw(glass,p2.clone().addScaledVector(n,.145).toArray(),n.toArray());
}
const telescopeBase=owner("telescope-tripod",[ox,1.15,oz]);
for(let i=0;i<3;i++){const a=i*Math.PI*2/3;beam(telescopeBase,[ox+Math.sin(a)*.42,.89,oz+Math.cos(a)*.42],[ox,1.64,oz],.045,orange);}
box(telescopeBase,[ox,1.62,oz],[.28,.2,.28],slate);screw(telescopeBase,[ox,1.62,oz+.15],[0,0,1]);
const scope=owner("telescope-optics",[ox,1.93,oz]);tube(scope,pivots[scope],.15,1.1,white,[1.25,0,.25]);
for(const z of [-.48,.42]){tube(scope,[ox,1.93+z*.27,oz+z],.19,.12,orange,[Math.PI/2,0,0]);ball(scope,[ox,1.93+z*.27,oz+z+.07],[.13,.13,.02],blue);}
screw(scope,[ox+.17,1.93,oz],[1,0,0]);
for(let i=0;i<3;i++) {
  const x=2.12+i*.39,p=owner(`air-tunnel-${i}`,[x,1.6,hubZ]);
  piece(p,smooth(new LatheGeometry([new Vector2(.35,-.185),new Vector2(.49,-.185),new Vector2(.49,.185),new Vector2(.35,.185),new Vector2(.35,-.185)],34)),pivots[p],[1,1,1],i===1?white:slate,[0,0,Math.PI/2]);
  ring(p,[x,1.6,hubZ],.49,.045,i===1?cyan:orange,[0,Math.PI/2,0]);
  screw(p,i===1?[x,2.14,hubZ]:[x,1.6,hubZ+(i===0?.54:-.54)],i===1?[0,1,0]:[0,0,i===0?1:-1]);
}

// Six-wheeled survey rover, with removable undercarriage, shell, camera mast,
// instrument rack and wheels; underside fixings reward looking below the body.
const vx=2.25,vz=3.8;
const chassis=owner("rover-chassis",[vx,.64,vz]);box(chassis,pivots[chassis],[1.30,.23,1.93],slate);screw(chassis,[vx,.515,vz],[0,-1,0]);
const shell=owner("rover-shell",[vx,.95,vz]);box(shell,pivots[shell],[1.37,.42,1.99],cream);box(shell,[vx,.97,vz+1.04],[1.2,.36,.14],orange);
for(const x of [-.4,.4])ball(shell,[vx+x,.98,vz+1.13],[.16,.12,.04],cyan);
screw(shell,[vx-.70,.95,vz+.52],[-1,0,0]);
const bonnet=owner("rover-bonnet",[vx,1.21,vz+.47]);box(bonnet,pivots[bonnet],[1.21,.16,.92],white);box(bonnet,[vx,1.305,vz+.47],[.65,.035,.57],orange);
screw(bonnet,[vx+.5,1.30,vz+.47]);
const power=owner("rover-power-pack",[vx,1.2,vz-.5]);box(power,pivots[power],[1.12,.18,.73],violet);for(let i=0;i<5;i++)box(power,[vx-.4+i*.2,1.3,vz-.5],[.1,.03,.57],cyan);
screw(power,[vx+.57,1.2,vz-.5],[1,0,0]);
const mast=owner("rover-camera-mast",[vx,1.52,vz+.18]);tube(mast,pivots[mast],.09,.55,orange);box(mast,[vx,1.28,vz+.18],[.38,.11,.38],orange);
screw(mast,[vx,1.28,vz+.39],[0,0,1]);
const camera=owner("rover-stereo-camera",[vx,1.87,vz+.18]);box(camera,pivots[camera],[.82,.38,.42],white);box(camera,[vx,1.87,vz+.405],[.71,.27,.03],slate);
for(const x of [-.22,.22])ball(camera,[vx+x,1.87,vz+.44],[.13,.13,.03],cyan);
screw(camera,[vx,1.87,vz-.04],[0,0,-1]);
const scanner=owner("rover-beacon",[vx+.45,1.43,vz-.67]);tube(scanner,[vx+.45,1.35,vz-.67],.06,.4,slate);ball(scanner,[vx+.45,1.61,vz-.67],[.13,.16,.13],orange);
box(scanner,[vx+.45,1.21,vz-.67],[.25,.14,.25],orange);screw(scanner,[vx+.45,1.21,vz-.81],[0,0,-1]);
for(const side of [-1,1])for(let i=0;i<3;i++){
  const x=vx+side*.82,z=vz-.67+i*.67,p=owner(`rover-wheel-${side}-${i}`,[x,.5,z]);
  tube(p,pivots[p],.34,.31,slate,[0,0,Math.PI/2]);tube(p,[x+side*.17,.5,z],.21,.08,orange,[0,0,Math.PI/2]);
  for(let k=0;k<14;k++){const a=k*Math.PI/7;box(p,[x,.5+Math.sin(a)*.325,z+Math.cos(a)*.325],[.32,.06,.1],"#414a62",[a,0,0]);}
  screw(p,[x+side*.22,.5,z],[side,0,0]);
}

// Colourful supply crates are offset from the observatory and rover. Lids
// conceal their own box fixings, while straps and corner guards add real depth.
for(let i=0;i<3;i++) {
  const x=4.55+(i===2?-.1:0),z=1.73+(i===1?.94:0),y=i===2?1.49:.62;
  const base=owner(`cargo-box-${i}`,[x,y,z]);box(base,pivots[base],[1.08,.91,.81],[blue,cream,red][i]);
  for(const dx of [-.43,.43])box(base,[x+dx,y,z+.43],[.11,.9,.07],slate);
  for(const dy of [-.37,.37])box(base,[x,y+dy,z+.43],[.98,.07,.06],slate);
  screw(base,[x,y+.465,z]);
  const lid=owner(`cargo-lid-${i}`,[x,y+.51,z]);box(lid,pivots[lid],[1.15,.13,.88],[blue,cream,red][i]);
  for(const dx of [-.36,.36])box(lid,[x+dx,y+.59,z],[.1,.04,.87],orange);
  screw(lid,[x+.48,y+.51,z+.45],[0,0,1]);
}

// Hollow craters, crystals, oxygen tanks and lights fill the remaining clear
// spaces. They are cover chains, not decorative screw-count padding.
for(const [i,x,z,r] of [[0,-3.77,4.32,1.02],[1,-.22,3.5,.57]] as const) {
  const bowl=owner(`crater-bed-${i}`,[x,.09,z]);tube(bowl,pivots[bowl],r*.68,.13,"#9389ad");screw(bowl,[x,.17,z]);
  for(let j=0;j<2;j++) {
    const lip=owner(`crater-rim-${i}-${j}`,[x,.14,z]);
    const profile=[new Vector2(r*.50,-.01),new Vector2(r*.64,.10),new Vector2(r*.72,.33),new Vector2(r*.88,.25),new Vector2(r,.03),new Vector2(r*.50,-.01)];
    piece(lip,new LatheGeometry(profile,20,j*Math.PI,Math.PI-.02),pivots[lip],[1,1,1],rock);
    const a=j*Math.PI+Math.PI/2; screw(lip,[x+Math.sin(a)*r*.80,.43,z+Math.cos(a)*r*.80],[Math.sin(a)*.5/r,1,Math.cos(a)*.5/r]);
  }
}
for(const [i,x,z,c] of [[0,-5.15,3.3,"#d78af5"],[1,5.1,4.28,"#61e3f5"],[2,5.25,-1.95,"#be87ee"],[3,-5.15,-3.5,"#72dbe9"]] as const) {
  const rockPart=owner(`crystal-rock-${i}`,[x,.17,z]);ball(rockPart,pivots[rockPart],[.49,.24,.43],rock);screw(rockPart,[x,.41,z]);
  const crystal=owner(`crystal-cluster-${i}`,[x,.2,z]);
  for(let j=0;j<3;j++)gem(crystal,[x+(j-1)*.19,.2,z+(j%2)*.18],.14,.47+(j===1?.33:0),c);
  box(crystal,[x,.50,z+.26],[.25,.2,.11],c);screw(crystal,[x,.52,z+.325],[0,0,1]);
}
for(const [i,x,z] of [[0,-5.05,1.95],[1,-5.15,-1.7],[2,5.1,.65],[3,4.55,5.03],[4,-1.7,4.8],[5,1.0,2.65]] as const) {
  const p=owner(`path-light-${i}`,[x,.41,z]);tube(p,[x,.22,z],.18,.28,slate);tube(p,[x,.46,z],.13,.25,orange);ball(p,[x,.61,z],[.13,.12,.13],yellow);
  screw(p,[x,.25,z+.19],[0,0,1]);
}
for(const [i,x,z] of [[0,-2.49,-3.72],[1,2.59,-2.8]] as const) {
  const tank=owner(`oxygen-tank-${i}`,[x,.85,z]);tube(tank,pivots[tank],.25,1.23,white);ball(tank,[x,1.44,z],[.25,.14,.25],white);
  ring(tank,[x,1.16,z],.255,.035,cyan);ring(tank,[x,.56,z],.255,.035,cyan);tube(tank,[x,1.61,z],.07,.19,orange);
  screw(tank,[x,.84,z+.26],[0,0,1]);
}
const marker=owner("arrival-sign",[-.45,.28,5.12]);box(marker,pivots[marker],[1.6,.13,.66],slate,[-.3,0,0]);
ring(marker,[-.45,.38,5.12],.21,.025,white,[-1.27,0,0]);beam(marker,[-.85,.44,5.12],[-.1,.44,5.12],.025,white);
screw(marker,[.20,.415,5.29],[0,.955,-.295]);
const barrier=owner("arrival-barrier",[-.45,.69,4.9]);box(barrier,pivots[barrier],[1.56,.15,.15],orange);
for(const x of [-1.13,.23])tube(barrier,[x,.45,4.9],.05,.61,white);
screw(barrier,[-1.14,.7,5.0],[0,0,1]);

// A planted greenhouse sits ABOVE the habitat, as in the reference. Its floor
// is the removable ceiling of the furnished lab below, making a real reveal.
const gardenParts=new Set(SPACE_MOUNTS.filter(m=>/^space-(hydro-|habitat-floor-)/.test(m.attachedTo)).map(m=>m.attachedTo));
for(const p of pieces)if(gardenParts.has(p.part as SpacePartId))p.position=[p.position[0],p.position[1]+2.1,p.position[2]];
for(const id of gardenParts)pivots[id]=[pivots[id][0],pivots[id][1]+2.1,pivots[id][2]];
for(const m of SPACE_MOUNTS)if(gardenParts.has(m.attachedTo))m.position=[m.position[0],m.position[1]+2.1,m.position[2]];
const desk=owner("lab-desk",[-.83,1.32,-1.35]);box(desk,pivots[desk],[1.12,.14,.62],white);
for(const x of [-1.27,-.39])for(const z of [-1.56,-1.14])tube(desk,[x,1.06,z],.045,.46,slate);
panel(desk,[-.83,1.64,-1.48],.56,.4);screw(desk,[-.83,1.24,-1.35],[0,-1,0]);
const seat=owner("lab-seat",[-.83,1.16,-.48]);tube(seat,[-.83,1.04,-.48],.08,.39,slate);box(seat,pivots[seat],[.5,.17,.5],orange);
box(seat,[-.83,1.43,-.69],[.5,.44,.1],orange);screw(seat,[-.83,1.16,-.22],[0,0,1]);
const bunk=owner("lab-sleep-pod",[.83,1.21,-1.30]);box(bunk,[.83,.98,-1.30],[.72,.3,1.49],slate);box(bunk,pivots[bunk],[.7,.19,1.45],white);
box(bunk,[.83,1.35,-1.72],[.53,.13,.35],cyan);box(bunk,[.83,1.32,-1.04],[.7,.07,.85],violet);
screw(bunk,[.46,1.0,-1.3],[-1,0,0]);

// Constructor-only room access orders. Mesh clearance is the live rule.
for(const m of SPACE_MOUNTS) {
  if(m.attachedTo.startsWith("space-hydro-")) m.solutionAfter=[...domeParts];
  if(m.attachedTo.startsWith("space-habitat-wall-")) m.solutionAfter=[...domeParts,...gardenParts].filter(p=>p.startsWith("space-habitat-floor-")||domeParts.includes(p));
  if(m.attachedTo.startsWith("space-habitat-floor-")) m.solutionAfter=SPACE_MOUNTS.filter((s)=>s.attachedTo.startsWith("space-hydro-tray-")).map(s=>s.attachedTo);
  if(m.attachedTo.startsWith("space-lab-"))m.solutionAfter=[...hubWalls];
  if(m.attachedTo==="space-observatory-floor" || m.attachedTo.startsWith("space-observatory-wall-") || m.attachedTo.startsWith("space-telescope-"))
    m.solutionAfter=SPACE_MOUNTS.filter(s=>s.attachedTo.startsWith("space-observatory-glass-")).map(s=>s.attachedTo);
}
// Baking custom rotated primitives keeps convex collider offsets consistent
// with the renderer and physical clearance, as in the other procedural levels.
const bake=new Matrix4();
for(const p of pieces) if(p.rotation && p.geometry) {
  bake.makeRotationFromEuler(new Euler(...p.rotation)).scale(new Vector3(...p.size));
  p.geometry=p.geometry.clone().applyMatrix4(bake);p.size=[1,1,1];p.rotation=undefined;
}
export const SPACE_MODEL={pieces,pivots,parts:Object.keys(pivots) as SpacePartId[],domeParts,hubWalls,deckParts};
if(import.meta.hot)import.meta.hot.dispose(()=>{for(const g of new Set([...pieces.map(p=>p.geometry),soft,cylinder,SPACE_CURVED_GEOMETRY]))g?.dispose();});
