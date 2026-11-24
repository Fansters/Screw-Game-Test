import { BufferGeometry, CatmullRomCurve3, ConeGeometry, CylinderGeometry, DoubleSide, Euler, Float32BufferAttribute, IcosahedronGeometry, Matrix4, Mesh, MeshBasicMaterial, Quaternion, Raycaster, SphereGeometry, TorusGeometry, TubeGeometry, Vector3 } from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { createJunglePlan, JUNGLE_COLORS } from "./junglePlan.ts";
import type { JungleNode } from "./junglePlan.ts";
import type { JunglePartId, Screw } from "../game/types.ts";
import type { Piece, Vector } from "./houseModel.ts";
export const JUNGLE_DETAIL = { radialSegments: 20, sphereRings: 10, foliageSegments: 12, foliageRings: 6, bevelSegments: 1 } as const;
export function createJungleModel() {
    const plan = createJunglePlan(), pieces: Piece[] = [], pivots: Partial<Record<JunglePartId, Vector>> = {}, C = JUNGLE_COLORS;
    const smooth = (g: BufferGeometry) => { g.setAttribute("color", new Float32BufferAttribute(new Float32Array(g.getAttribute("position").count * 3).fill(1), 3)); return g; };
    const rounded = smooth(new RoundedBoxGeometry(1, 1, 1, 1, .075)), sphere = smooth(new SphereGeometry(1, 20, 10)), smallSphere = smooth(new SphereGeometry(1, 12, 6)), cylinder = smooth(new CylinderGeometry(1, 1, 1, 20)), cone = smooth(new ConeGeometry(1, 1, 16)), rock = smooth(new IcosahedronGeometry(1, 1)), ring = smooth(new TorusGeometry(1, .08, 6, 24));
    // Shared lanceolate leaf with a raised midrib and smooth, curled edges.
    const leaf = new BufferGeometry(), vertices: number[] = [], indices: number[] = [];
    for (let row = 0; row <= 10; row++) {
        const t = row / 10;
        for (let col = 0; col <= 4; col++) {
            const u = col / 2 - 1;
            vertices.push(Math.sin(Math.PI * t) ** .65 * u * .5, .17 * Math.sin(Math.PI * t) * (1 - u * u) + .12 * t * t, t - .5);
        }
    }
    for (let r = 0; r < 10; r++)
        for (let c = 0; c < 4; c++) {
            const i = r * 5 + c;
            indices.push(i, i + 5, i + 1, i + 1, i + 5, i + 6);
        }
    // Separate back vertices preserve smooth normals instead of cancelling them.
    leaf.setAttribute("position", new Float32BufferAttribute(vertices, 3));
    leaf.setIndex(indices);
    leaf.computeVertexNormals();
    const normals = Array.from(leaf.getAttribute("normal").array), offset = vertices.length / 3, back: number[] = [];
    for (let i = 0; i < indices.length; i += 3)
        back.push(indices[i + 2] + offset, indices[i + 1] + offset, indices[i] + offset);
    leaf.setAttribute("position", new Float32BufferAttribute([...vertices, ...vertices], 3));
    leaf.setAttribute("normal", new Float32BufferAttribute([...normals, ...normals.map(n => -n)], 3));
    leaf.setIndex([...indices, ...back]);
    smooth(leaf);
    function shape(n: JungleNode, g: BufferGeometry, at: Vector, size: Vector, color: string, rotation: Vector = [0, 0, 0], kind: Piece["kind"] = "box") {
        const frame = new Matrix4().makeRotationFromEuler(new Euler(...(n.rotation ?? [0, 0, 0]))), local = new Matrix4().makeRotationFromEuler(new Euler(...rotation));
        const world = new Vector3(...at).applyMatrix4(frame).add(new Vector3(...n.at));
        const e = new Euler().setFromRotationMatrix(frame.multiply(local));
        const p: Piece = { part: `jungle-${n.key}`, geometry: g, kind, position: world.toArray(), size, color, rotation: [e.x, e.y, e.z] };
        pieces.push(p);
        return p;
    }
    const box = (n: JungleNode, at: Vector, size: Vector, color: string, rotation?: Vector) => shape(n, rounded, at, size, color, rotation);
    const ball = (n: JungleNode, at: Vector, size: Vector, color: string, rotation?: Vector) => shape(n, Math.max(...size) < .75 && !(["idol", "statue", "hat", "toucan", "monkey", "frog"] as string[]).includes(n.kind) ? smallSphere : sphere, at, size, color, rotation, "ico-detail");
    const cyl = (n: JungleNode, at: Vector, r: number, h: number, color: string, rotation?: Vector) => shape(n, cylinder, at, [r, h, r], color, rotation, "cylinder");
    function beam(n: JungleNode, a: Vector, b: Vector, w: number, color: string) { const A = new Vector3(...a), B = new Vector3(...b), d = B.clone().sub(A); const q = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), d.clone().normalize()), e = new Euler().setFromQuaternion(q); box(n, A.add(B).multiplyScalar(.5).toArray(), [w, d.length(), w], color, [e.x, e.y, e.z]); }
    function curve(n: JungleNode, points: Vector[], r: number, color: string, segments = 14) { shape(n, smooth(new TubeGeometry(new CatmullRomCurve3(points.map(p => new Vector3(...p))), segments, r, 5, false)), [0, 0, 0], [1, 1, 1], color); }
    function leaves(n: JungleNode, at: Vector, r: number, count = 9, colour: string = C.leaf) { for (let i = 0; i < count; i++) {
        const a = i * Math.PI * 2 / count;
        shape(n, leaf, [at[0] + Math.sin(a) * r * .36, at[1] + .02 * (i % 3), at[2] + Math.cos(a) * r * .36], [r * .65, r * .7, r * 1.2], i % 3 === 0 ? C.lime : colour, [.1 + (i % 3) * .16, a, 0]);
    } }
    function moss(n: JungleNode, w: number, d: number, y: number) { for (let i = 0; i < 8; i++) {
        const a = i * 2.4;
        shape(n, rock, [Math.sin(a) * w * .4, y, Math.cos(a) * d * .4], [w * .14, .045, d * .14], i % 3 ? C.moss : C.lime, [0, i * .7, 0], "ico");
    } for (let i = 0; i < 3; i++) {
        const x = (i - 1) * w * .31;
        curve(n, [[x, y, d * .49], [x + .06, y - .22, d * .51], [x - .02, y - .42, d * .53]], .035, C.leaf, 8);
    } }
    function flowers(n: JungleNode, at: Vector, r: number) { leaves(n, at, r * 1.5, 7, C.deep); for (let k = 0; k < 3; k++) {
        const x = at[0] + Math.sin(k * 2.1) * r * .45, z = at[2] + Math.cos(k * 2.1) * r * .45;
        for (let j = 0; j < 5; j++) {
            const a = j * Math.PI * 2 / 5;
            ball(n, [x + Math.sin(a) * r * .29, at[1] + .12, z + Math.cos(a) * r * .29], [r * .26, r * .12, r * .26], k % 2 ? C.red : C.pink);
        }
        ball(n, [x, at[1] + .15, z], [r * .17, r * .1, r * .17], C.gold);
    } }
    function masonry(n: JungleNode, w: number, h: number, d: number) { box(n, [0, 0, 0], [w, h, d], n.color); const rows = Math.max(1, Math.round(h / .45)), cols = Math.max(1, Math.round(w / .55)); for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++) {
            box(n, [-w / 2 + (c + .5) * w / cols, (r + .5) * h / rows - h / 2, d / 2 + .012], [w / cols - .035, h / rows - .035, .035], (r + c) % 4 === 0 ? C.light : n.color);
        } if (h > .3)
        moss(n, w, d, h * .5 + .035); }
    function sun(n: JungleNode, at: Vector, r: number) { cyl(n, at, r, .09, C.gold, [Math.PI / 2, 0, 0]); for (let i = 0; i < 12; i++) {
        const a = i * Math.PI / 6;
        box(n, [at[0] + Math.sin(a) * r * 1.2, at[1] + Math.cos(a) * r * 1.2, at[2]], [r * .18, r * .38, .1], C.gold, [0, 0, -a]);
    } }
    function planks(n: JungleNode, w: number, d: number, y: number) { for (let i = 0; i < 7; i++) {
        box(n, [(i - 3) * w / 7, y, 0], [w / 7 - .022, .13, d], i % 3 ? C.honey : C.wood);
        for (const z of [-d * .4, d * .4])
            cyl(n, [(i - 3) * w / 7, y + .071, z], .019, .01, C.shade);
    } }
    function crate(n: JungleNode, w: number, h: number, d: number) { box(n, [0, 0, 0], [w, h, d], n.color); for (const z of [-1, 1]) {
        for (let j = 0; j < 4; j++)
            box(n, [(j - 1.5) * w / 4, 0, z * d * .505], [w / 4 - .02, h - .06, .04], j % 2 ? C.honey : C.wood);
        beam(n, [-w * .4, -h * .38, z * d * .535], [w * .4, h * .38, z * d * .535], .075, C.honey);
    } for (const x of [-1, 1])
        box(n, [x * w * .46, 0, 0], [.075, h + .03, d + .05], C.honey); }
    function lantern(n: JungleNode, w: number, h: number) { cyl(n, [0, -h * .35, 0], w * .5, h * .1, C.wood); box(n, [0, 0, 0], [w * .63, h * .55, w * .63], C.gold); for (const x of [-1, 1])
        for (const z of [-1, 1])
            beam(n, [x * w * .37, -h * .28, z * w * .37], [x * w * .37, h * .28, z * w * .37], .035, C.wood); shape(n, cone, [0, h * .35, 0], [w * .65, h * .25, w * .65], C.wood); shape(n, ring, [0, h * .61, 0], [w * .25, w * .25, w * .25], C.wood, [0, 0, 0], "ring"); }
    function chest(n: JungleNode, w: number, h: number, d: number, lid: boolean) { box(n, [0, 0, 0], [w, h, d], n.color); for (const x of [-w * .35, w * .35]) {
        box(n, [x, 0, d * .52], [.075, h + .04, .055], C.gold);
        box(n, [x, h * .51, 0], [.075, .04, d + .03], C.gold);
    } if (!lid) {
        box(n, [0, h * .08, d * .54], [.2, .27, .07], C.gold);
        ball(n, [0, h * .09, d * .59], [.034, .055, .018], C.wood);
    } for (const x of [-w * .43, w * .43])
        for (const y of [-h * .3, h * .3])
            ball(n, [x, y, d * .54], [.024, .024, .018], C.light); }
    for (const n of plan) {
        const [w, h, d] = n.size;
        pivots[`jungle-${n.key}`] = n.at;
        switch (n.kind) {
            case "foundation":
                masonry(n, w, h, d);
                if (n.key === "foundation-6")
                    box(n, [0, 0, -3.55], [w, h, d], n.color);
                break;
            case "ground":
                box(n, [0, 0, 0], [w, h, d], C.sand);
                for (let j = 0; j < 4; j++) {
                    const a = j * 2.4;
                    shape(n, rock, [Math.sin(a) * w * .28, h * .6, Math.cos(a) * d * .28], [w * .24, .035, d * .24], j % 2 ? C.moss : C.leaf, [0, j * .9, 0], "ico");
                }
                leaves(n, [w * .34, h * .65, -d * .29], .45, 6, C.deep);
                if (n.key === "ground-6")
                    box(n, [0, 0, -3.55], [w, h, d], C.sand);
                for (let i = 0; i < 15; i++) {
                    const x = Math.sin(i * 8.3) * w * .42, z = Math.cos(i * 3.1) * d * .42;
                    if (Math.abs(x) > .7 || Math.abs(z) > .65) {
                        ball(n, [x, h * .45, z], [.16, .055, .11], i % 3 ? C.light : C.shade);
                        if (i % 3 === 0)
                            leaves(n, [x, h * .5, z], .32, 5);
                    }
                }
                break;
            case "stone":
            case "wall":
            case "pillar":
                masonry(n, w, h, d);
                if (n.kind === "pillar") {
                    box(n, [0, -h * .42, 0], [w * 1.15, h * .13, d * 1.15], C.light);
                    for (const x of [-.28, .28])
                        box(n, [x * w, 0, d * .52], [w * .07, h * .7, .035], C.gold);
                }
                break;
            case "cap":
                box(n, [0, 0, 0], [w, h, d], n.color);
                moss(n, w, d, h / 2 + .015);
                if (n.key.includes("carving")) {
                    for (let k = 0; k < 4; k++)
                        box(n, [Math.sin(k * 1.7) * w * .25, h * .55, Math.cos(k * 1.7) * d * .25], [w * .2, .025, d * .2], C.honey);
                }
                break;
            case "path":
                box(n, [0, 0, 0], [w, h, d], n.color);
                for (let i = 0; i < 4; i++)
                    ball(n, [(i - 1.5) * w * .2, h * .5, -d * .4], [.045, .02, .04], C.shade);
                break;
            case "stairs":
                for (let i = 0; i < 3; i++) {
                    const y = n.at[1] + h * (1 - i) / 3, z = n.at[2] + d * (i - 1) / 3;
                    masonry({ ...n, at: [n.at[0], y, z] }, w, h / 3, d / 3 + .015);
                    // Each flight is solid stone down to the island, not three
                    // thin treads suspended above empty space. Keep the original
                    // top surfaces/fixings and give their owner the supporting mass.
                    const bottom = .10, top = y - h / 6 + .035;
                    // Recess the footing edge slightly beside the riverbank;
                    // the frog's existing fixing still has clear pull-out space.
                    box({ ...n, at: [n.at[0], (bottom + top) / 2, z] }, [0, 0, 0], [w - .10, top - bottom, d / 3 + .015], C.light);
                }
                if (n.key === "stairs-0") {
                    // Landing reaches into the temple floor and overlaps the
                    // upper tread, closing the former half-unit separation.
                    masonry({ ...n, at: [1, 1.255, -1.235] }, w, 2.31, .60);
                }
                if (n.key === "stairs-2") {
                    // Two shallow approach steps meet the island's walking surface.
                    for (let i = 1; i <= 2; i++) {
                        const top = n.at[1] - h / 6 - i * h / 3, bottom = .10;
                        masonry({ ...n, at: [n.at[0], (bottom + top) / 2, n.at[2] + d * (i + 1) / 3] }, w, top - bottom, d / 3 + .015);
                    }
                }
                break;
            case "lintel":
                masonry(n, w, h, d);
                for (let i = 0; i < 7; i++) {
                    box(n, [(i - 3) * w / 8, 0, d * .54], [w / 10, h * .47, .06], C.gold);
                    box(n, [(i - 3) * w / 8, .03, d * .58], [w / 18, h * .12, .02], C.honey);
                }
                break;
            case "door":
                for (let i = 0; i < 5; i++)
                    box(n, [(i - 2) * w / 5, 0, 0], [w / 5 - .014, h, d], i % 2 ? C.honey : C.wood);
                for (const y of [-h * .33, h * .33])
                    box(n, [0, y, d * .6], [w, .09, .06], C.gold);
                ball(n, [w * .3, 0, d * .8], [.07, .07, .04], C.gold);
                break;
            case "pyramid":
                masonry(n, w, h, d);
                if (n.key === "pyramid-lower") {
                    // A stone roof skirt closes the rear/side wall gap. It belongs
                    // to this roof assembly, so it falls away with the same fixing.
                    masonry({ ...n, at: [1, 4.83, -4.25] }, 3.8, .42, .4);
                    for (const x of [-.95, 2.95])
                        masonry({ ...n, at: [x, 4.83, -3.05] }, .4, .42, 2.45);
                }
                for (let i = 0; i < 6; i++)
                    box(n, [(i - 2.5) * w / 7, h * .56, d * .36], [w * .075, .16, d * .18], C.light);
                break;
            case "mask":
                box(n, [0, 0, 0], [w, h, d], C.stone);
                for (const side of [-1, 1]) {
                    box(n, [side * w * .26, h * .15, d * .62], [w * .38, h * .19, .15], C.light, [0, 0, side * .12]);
                    ball(n, [side * w * .24, h * .05, d * .67], [w * .12, h * .11, .07], C.honey);
                    box(n, [side * w * .38, -h * .22, d * .6], [w * .19, h * .35, .1], C.light);
                }
                box(n, [0, -h * .03, d * .76], [w * .18, h * .38, .2], C.gold);
                box(n, [0, -h * .38, d * .64], [w * .56, h * .14, .12], C.light);
                box(n, [0, -h * .38, d * .73], [w * .38, .05, .04], C.wood);
                break;
            case "sun":
                shape(n, smooth(new TorusGeometry(1, .12, 6, 20, Math.PI)), [0, -.1, 0], [w * .45, w * .45, w * .45], C.gold, undefined, "ring");
                for (let i = 0; i < 7; i++) {
                    const a = i * Math.PI / 6;
                    box(n, [Math.cos(a) * w * .56, Math.sin(a) * w * .56 - .1, 0], [w * .18, w * .36, .1], C.gold, [0, 0, Math.PI / 2 - a]);
                }
                for (const side of [-1, 1])
                    box(n, [side * .58, -.1, 0], [.3, .34, .1], C.gold);
                break;
            case "banner":
                box(n, [0, 0, 0], [w, h, d], n.color);
                cyl(n, [0, h * .5, 0], .07, w * 1.35, C.honey, [0, 0, Math.PI / 2]);
                sun(n, [0, h * .02, d * .65], w * .22);
                for (let i = 0; i < 5; i++)
                    box(n, [(i - 2) * w / 5, -h * .55, 0], [w * .12, h * .12, .06], C.red);
                break;
            case "torch":
                cyl(n, [0, -h * .21, 0], w * .25, h * .54, C.wood);
                ball(n, [0, h * .05, 0], [w * .55, .16, w * .55], C.gold);
                ball(n, [0, h * .32, 0], [w * .35, h * .35, w * .3], "#ff8b24");
                ball(n, [.02, h * .37, .02], [w * .18, h * .23, w * .15], "#ffe767");
                break;
            case "idol":
                ball(n, [0, 0, 0], [w * .42, h * .35, d * .36], C.gold);
                ball(n, [0, h * .4, 0], [w * .43, h * .35, d * .35], C.gold);
                for (const x of [-1, 1]) {
                    ball(n, [x * w * .24, h * .44, d * .31], [w * .11, h * .13, .025], C.honey);
                    ball(n, [x * w * .24, h * .44, d * .34], [.025, .035, .015], C.wood);
                    ball(n, [x * w * .42, 0, .03], [w * .12, h * .3, d * .15], C.gold);
                    ball(n, [x * w * .24, -h * .32, d * .17], [w * .2, h * .12, d * .26], C.gold);
                }
                box(n, [0, h * .18, d * .35], [w * .4, .08, .08], C.light);
                break;
            case "tree-trunk":
                cyl(n, [0, -h * .09, 0], w * .37, h * .85, C.wood);
                for (let j = 0; j < 4; j++) {
                    const a = j * 1.9;
                    curve(n, [[0, -h * .37, 0], [Math.cos(a) * w * .45, -h * .48, Math.sin(a) * d * .45], [Math.cos(a) * w * 1.12, -h * .49, Math.sin(a) * d * 1.12]], w * .17, C.wood, 9);
                }
                for (const side of [-1, 1])
                    curve(n, [[0, h * .08, 0], [side * w * .55, h * .28, 0], [side * w * .82, h * .48, .12]], w * .2, C.honey, 10);
                for (let i = 0; i < 9; i++)
                    box(n, [Math.sin(i * 2) * w * .34, (i - 4) * h / 11, Math.cos(i * 2) * d * .35], [.055, h * .1, .04], C.honey, [0, i * 2, .15]);
                break;
            case "tree-crown":
                for (let j = 0; j < 5; j++) {
                    const a = j * 2.4;
                    const x = Math.sin(a) * w * .27, z = Math.cos(a) * d * .26;
                    ball(n, [x, (j % 3) * h * .17, z], [w * .29, h * .48, d * .29], j % 2 ? C.leaf : C.deep);
                    for (let k = 0; k < 9; k++) {
                        const b = k * Math.PI * 2 / 9;
                        shape(n, leaf, [x + Math.sin(b) * w * .2, h * .30 + (j % 3) * h * .17 + Math.sin(k) * .05, z + Math.cos(b) * d * .2], [w * .20, h * .8, d * .34], k % 3 ? C.leaf : C.lime, [.65, b, .08]);
                    }
                }
                for (let i = 0; i < 3; i++) {
                    const x = (i - 1) * w * .32;
                    curve(n, [[x, 0, d * .25], [x + .2, -h * .75, d * .4], [x - .15, -h * 1.2, d * .25], [x - .42, -h * .85, .05]], .045, C.leaf, 18);
                    leaves(n, [x - .15, -h * 1.05, d * .28], .23, 4);
                }
                break;
            case "hut-deck":
                planks(n, w, d, 0);
                for (const x of [-w * .4, w * .4])
                    box(n, [x, -h * .5, 0], [.12, h, d], C.wood);
                break;
            case "hut-wall":
                for (const x of [-w * .43, w * .43])
                    box(n, [x, 0, 0], [Math.min(.12, w), h, d], C.wood);
                if (w > d)
                    for (let i = 0; i < 6; i++)
                        box(n, [(i - 2.5) * w / 6, -h * .25, 0], [w / 6 - .02, h * .5, d], C.honey);
                else
                    box(n, [0, -h * .25, 0], [w, h * .5, d], C.honey);
                break;
            case "thatch":
                box(n, [0, 0, 0], [w, h, d], C.honey);
                for (let i = 0; i < 13; i++)
                    box(n, [0, .08, (i - 6) * d / 13], [w + .08, .09, d / 13 - .012], i % 3 ? C.cream : C.sand, [0, 0, .02 * Math.sin(i)]);
                break;
            case "rail":
                for (const x of [-w * .4, w * .4])
                    box(n, [x, 0, 0], [.11, h, .11], C.wood);
                for (const y of [-h * .3, h * .3])
                    box(n, [0, y, 0], [w, .09, .09], C.honey);
                break;
            case "bridge":
                planks(n, w, d, 0);
                for (const z of [-d * .43, d * .43])
                    curve(n, [[-w * .5, -.1, z], [0, -.17, z], [w * .5, -.1, z]], .055, C.wood);
                break;
            case "rope":
                for (const z of [-d * .46, d * .46]) {
                    for (const x of [-w * .4, w * .4])
                        box(n, [x, 0, z], [.08, h, .08], C.honey);
                    curve(n, [[-w * .5, h * .45, z], [0, h * .31, z], [w * .5, h * .45, z]], .045, C.cream, 12);
                    curve(n, [[-w * .5, -h * .42, z], [0, -h * .5, z], [w * .5, -h * .42, z]], .04, C.cream, 12);
                }
                break;
            case "water":
                box(n, [0, 0, 0], [w, h, d], C.water);
                for (let i = 0; i < 6; i++)
                    curve(n, [[-w * .4, h * .55, (i - 2.5) * d / 7], [0, h * .57, (i - 2.5) * d / 7 + .03], [w * .4, h * .55, (i - 2.5) * d / 7]], .012, i % 2 ? "#75eff4" : "#c4faf0", 10);
                break;
            case "waterfall":
                box(n, [0, 0, 0], [w, h, d], C.water);
                for (let j = 0; j < 9; j++)
                    curve(n, [[(j - 4) * w / 10, h * .5, 0], [(j - 4) * w / 10, h * .1, d * .45], [(j - 4) * w / 10, -h * .48, d * .6]], .022, j % 3 ? "#93f1f1" : "#e6fff2", 12);
                for (let j = 0; j < 7; j++)
                    ball(n, [(j - 3) * w / 7, -h * .5, .09], [w * .12, .09, .13], "#e2fff2");
                break;
            case "lilies":
                for (let i = 0; i < 3; i++) {
                    const x = (i - 1) * w * .28, z = Math.sin(i * 2) * d * .2;
                    cyl(n, [x, 0, z], w * .2, .035, C.leaf);
                    if (i % 2 === 0)
                        flowers(n, [x, .04, z], w * .22);
                }
                break;
            case "boulders":
                for (let i = 0; i < 3; i++)
                    shape(n, rock, [(i - 1) * w * .24, Math.sin(i * 2) * h * .12, Math.cos(i * 2) * d * .15], [w * .39, h * (.4 + i * .04), d * .44], i % 2 ? n.color : C.light, [i * .3, 0, i * .2], "ico");
                moss(n, w, d, h * .42);
                break;
            case "statue":
                ball(n, [0, 0, 0], [w * .5, h * .5, d * .5], C.stone);
                for (const side of [-1, 1]) {
                    box(n, [side * w * .22, h * .14, d * .4], [w * .34, h * .14, .15], C.light, [0, 0, side * .15]);
                    curve(n, [[side * w * .35, h * .08, d * .49], [side * w * .23, .02, d * .54], [side * w * .1, h * .05, d * .5]], .035, C.shade);
                    ball(n, [side * w * .49, 0, 0], [w * .12, h * .18, d * .25], C.light);
                }
                box(n, [0, -h * .04, d * .55], [w * .15, h * .3, .24], C.light);
                box(n, [0, -h * .32, d * .4], [w * .5, h * .12, .13], C.light);
                box(n, [0, -h * .32, d * .49], [w * .32, .04, .03], C.shade);
                break;
            case "statue-crown":
                for (let i = 0; i < 9; i++) {
                    const a = Math.PI * (i / 8);
                    box(n, [Math.cos(a) * w * .47, Math.sin(a) * h * .46, 0], [w * .18, h * .23, d], i % 3 ? n.color : C.light, [0, 0, a - Math.PI / 2]);
                }
                curve(n, [[-w * .48, 0, d * .5], [-w * .1, h * .48, d * .5], [w * .48, 0, d * .5]], .065, C.moss, 20);
                break;
            case "statue-hand":
                box(n, [0, 0, 0], [w * .7, h * .65, d * .62], C.light);
                for (let i = 0; i < 4; i++)
                    box(n, [(i - 1.5) * w * .19, h * .3, -d * .15], [w * .17, h * .6, d * .43], C.light);
                break;
            case "tent-wall":
                box(n, [0, 0, 0], [w, h, d], C.cream);
                if (w > .3)
                    for (let i = 0; i < 5; i++)
                        box(n, [(i - 2) * w / 6, h * .25, d * .55], [w * .08, .04, .02], C.red);
                break;
            case "tent-roof":
                box(n, [0, 0, 0], [w, h, d], C.cream);
                for (const z of [-d * .45, d * .45]) {
                    box(n, [0, h * .65, z], [w, .025, .16], C.red);
                    for (let j = 0; j < 6; j++)
                        box(n, [(j - 2.5) * w / 7, h * .8, z], [.045, .02, .12], C.cream, [0, (j % 2 ? 1 : -1) * .6, 0]);
                }
                for (const x of [-w * .48, w * .48])
                    cyl(n, [x, -.02, 0], .045, d + .1, C.honey, [Math.PI / 2, 0, 0]);
                break;
            case "rug":
                box(n, [0, 0, 0], [w, h, d], C.red);
                for (const x of [-w * .45, w * .45])
                    box(n, [x, h * .6, 0], [.06, .02, d * .92], C.cream);
                for (let i = 0; i < 5; i++)
                    box(n, [(i - 2) * w / 6, h * .65, 0], [.14, .02, .14], C.gold, [0, Math.PI / 4, 0]);
                break;
            case "roll":
                cyl(n, [0, 0, 0], h * .5, w, n.color, [0, 0, Math.PI / 2]);
                for (const side of [-1, 1])
                    shape(n, ring, [side * w * .51, 0, 0], [h * .38, h * .38, h * .38], C.honey, [0, Math.PI / 2, 0], "ring");
                for (const x of [-w * .3, w * .3])
                    box(n, [x, 0, d * .45], [.07, h, .04], C.wood);
                break;
            case "lantern":
                lantern(n, w, h);
                break;
            case "chest":
            case "chest-lid":
                chest(n, w, h, d, n.kind === "chest-lid");
                break;
            case "crate":
                crate(n, w, h, d);
                break;
            case "crate-lid":
                planks(n, w, d, 0);
                if (n.key === "gem-tray")
                    for (let i = 0; i < 10; i++)
                        shape(n, rock, [Math.sin(i * 2.4) * w * .3, .1 + (i % 3) * .07, Math.cos(i * 2.4) * d * .3], [.1, .13, .1], [C.gold, C.blue, C.pink, "#4feddb"][i % 4], undefined, "ico");
                break;
            case "telescope":
                for (let i = 0; i < 3; i++) {
                    const a = i * Math.PI * 2 / 3;
                    beam(n, [0, .1, 0], [Math.cos(a) * w * .45, -h * .48, Math.sin(a) * d * .45], .055, C.honey);
                }
                beam(n, [0, 0, 0], [0, h * .28, 0], .1, C.gold);
                cyl(n, [0, h * .34, 0], .14, w, C.gold, [Math.PI / 2, 0, .12]);
                cyl(n, [0, h * .34, w * .51], .16, .05, C.blue, [Math.PI / 2, 0, .12]);
                break;
            case "table":
                box(n, [0, h * .45, 0], [w, .13, d], C.honey);
                for (const x of [-w * .4, w * .4])
                    for (const z of [-d * .33, d * .33])
                        box(n, [x, -.06, z], [.12, h, .12], C.wood, [0, 0, x < 0 ? -.08 : .08]);
                break;
            case "map":
                box(n, [0, 0, 0], [w, h, d], C.cream);
                curve(n, [[-w * .3, h * .65, -d * .2], [-w * .1, h * .65, .1], [w * .15, h * .65, -.1], [w * .35, h * .65, d * .3]], .018, C.red, 20);
                for (let j = 0; j < 3; j++)
                    ball(n, [(j - 1) * w * .25, h * .68, Math.sin(j * 3) * d * .3], [.04, .01, .04], C.honey);
                cyl(n, [-w * .45, .02, 0], .055, d, C.sand, [Math.PI / 2, 0, 0]);
                break;
            case "backpack":
                box(n, [0, 0, 0], [w, h, d], C.leaf);
                box(n, [0, -h * .18, d * .55], [w * .8, h * .34, .13], C.moss);
                for (const x of [-w * .3, w * .3]) {
                    box(n, [x, h * .1, d * .58], [.075, h * .6, .05], C.honey);
                    box(n, [x, -h * .1, d * .65], [.13, .1, .04], C.gold);
                }
                cyl(n, [w * .62, -.07, 0], .10, h * .55, C.blue);
                break;
            case "hat":
                ball(n, [0, h * .3, 0], [w * .33, h * .8, d * .35], C.sand);
                ball(n, [0, 0, 0], [w * .55, .045, d * .54], C.sand);
                box(n, [0, h * .18, d * .34], [w * .62, .08, .04], C.honey);
                break;
            case "toucan":
                ball(n, [0, 0, 0], [w * .34, h * .39, d * .33], C.red);
                ball(n, [0, h * .39, 0], [w * .34, h * .31, d * .3], C.red);
                ball(n, [-w * .39, h * .38, d * .15], [w * .48, h * .15, d * .21], C.gold);
                ball(n, [-w * .13, h * .4, d * .29], [.14, .16, .035], C.cream);
                ball(n, [-w * .13, h * .42, d * .33], [.057, .067, .025], C.wood);
                for (const side of [-1, 1])
                    ball(n, [side * w * .28, -.04, 0], [w * .13, h * .28, d * .32], C.blue);
                for (const x of [-.12, .12])
                    beam(n, [x, -h * .3, 0], [x, -h * .55, .1], .045, C.honey);
                break;
            case "monkey":
                ball(n, [0, 0, 0], [w * .38, h * .36, d * .35], C.wood);
                ball(n, [0, h * .36, 0], [w * .46, h * .32, d * .43], C.honey);
                ball(n, [0, h * .35, d * .33], [w * .33, h * .21, .06], C.cream);
                for (const side of [-1, 1]) {
                    ball(n, [side * w * .45, h * .4, 0], [w * .19, h * .15, .07], C.honey);
                    ball(n, [side * w * .15, h * .4, d * .4], [.025, .036, .02], C.wood);
                    beam(n, [side * w * .3, .02, 0], [side * w * .45, -h * .36, .1], .09, C.wood);
                }
                break;
            case "tail":
                curve(n, [[w * .3, h * .2, 0], [w * .2, -h * .35, 0], [-w * .3, -h * .3, .07], [-w * .33, h * .12, 0], [0, h * .2, 0]], .065, C.wood, 22);
                break;
            case "frog":
                ball(n, [0, 0, 0], [w * .45, h * .32, d * .4], C.gold);
                for (const side of [-1, 1]) {
                    ball(n, [side * w * .22, h * .25, d * .2], [w * .17, h * .3, d * .15], C.gold);
                    ball(n, [side * w * .22, h * .3, d * .3], [.03, .035, .016], C.wood);
                    ball(n, [side * w * .42, -h * .1, 0], [w * .23, .05, d * .32], C.gold);
                }
                break;
            case "ferns":
                ball(n, [0, -.12, 0], [w * .36, .12, d * .36], C.moss);
                for (let k = 0; k < 3; k++)
                    leaves(n, [Math.sin(k * 2) * w * .22, k * .04, Math.cos(k * 2) * d * .2], w * .55, 8, n.color);
                break;
            case "flowers":
                ball(n, [0, -.13, 0], [w * .4, .11, d * .4], C.moss);
                flowers(n, [0, 0, 0], w * .4);
                break;
        }
    }
    // Project each cap onto its own real geometry. Contacting caps/lids/panels,
    // rather than invisible dependency flags, provide the playable cover graph.
    const material = new MeshBasicMaterial({ side: DoubleSide }), meshes = new Map<string, Mesh[]>(), ray = new Raycaster();
    for (const p of pieces) {
        const m = new Mesh(p.geometry!, material);
        m.position.set(...p.position);
        m.scale.set(...p.size);
        if (p.rotation)
            m.rotation.set(...p.rotation);
        m.updateMatrixWorld();
        const list = meshes.get(p.part) ?? [];
        list.push(m);
        meshes.set(p.part, list);
    }
    const mounts: (Pick<Screw, "position" | "normal" | "solutionAfter"> & {
        attachedTo: JunglePartId;
    })[] = [];
    for (const n of plan) {
        const cover = plan.find(c => c.key === n.cover), origin = new Vector3(...(n.fix?.at ?? n.at));
        let normal = new Vector3(...(n.fix?.normal ?? [0, 0, 1]));
        if (!n.fix && cover) {
            const delta = new Vector3(...cover.at).sub(origin);
            const axes = [Math.abs(delta.x) / n.size[0], Math.abs(delta.y) / n.size[1], Math.abs(delta.z) / n.size[2]];
            const axis = axes.indexOf(Math.max(...axes));
            normal.set(0, 0, 0).setComponent(axis, Math.sign(delta.getComponent(axis)) || 1);
            for (let k = 0; k < 3; k++)
                if (k !== axis)
                    origin.setComponent(k, Math.max(n.at[k] - n.size[k] * .35, Math.min(n.at[k] + n.size[k] * .35, cover.at[k])));
        }
        if (n.rotation && n.fix)
            normal.applyEuler(new Euler(...n.rotation));
        normal.normalize();
        ray.set(origin.clone().addScaledVector(normal, 18), normal.clone().negate());
        ray.far = 36;
        const own = meshes.get(`jungle-${n.key}`)!;
        let hit = ray.intersectObjects(own, false)[0];
        // Open rails and organic silhouettes may have no material at their centre.
        // Recast at a real piece/face rather than inventing a floating mounting pad.
        if (!hit)
            for (const mesh of own) {
                const candidates = [mesh.position.clone()];
                const position = mesh.geometry.getAttribute("position"), index = mesh.geometry.index;
                for (let i = 0; i < Math.min(54, index?.count ?? position.count); i += 3) {
                    const centre = new Vector3();
                    for (let j = 0; j < 3; j++)
                        centre.add(new Vector3().fromBufferAttribute(position, index ? index.getX(i + j) : i + j));
                    candidates.push(centre.multiplyScalar(1 / 3).applyMatrix4(mesh.matrixWorld));
                }
                for (const point of candidates) {
                    ray.set(point.clone().addScaledVector(normal, 18), normal.clone().negate());
                    hit = ray.intersectObjects(own, false)[0];
                    if (hit)
                        break;
                }
                if (hit)
                    break;
            }
        if (!hit)
            throw Error(`No jungle attachment on ${n.key}`);
        // Keep the authored pull direction: a tiny leaf facet's normal can point
        // the head into an adjacent leaf of the same removable canopy.
        mounts.push({ attachedTo: `jungle-${n.key}`, position: hit.point.addScaledVector(normal, .008).toArray(), normal: normal.toArray(), solutionAfter: n.key === "golden-idol" ? ["jungle-portal-door-right"] : undefined });
    }
    material.dispose();
    return { model: { pieces, pivots, parts: plan.map(n => `jungle-${n.key}` as JunglePartId) }, mounts, plan, detail: JUNGLE_DETAIL };
}
