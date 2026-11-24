export type JungleVector = [
    number,
    number,
    number
];
export type JungleKind = "foundation" | "ground" | "stone" | "stairs" | "wall" | "pillar" | "cap" | "lintel" | "door" | "pyramid" | "mask" | "sun" | "banner" | "torch" | "idol" | "tree-trunk" | "tree-crown" | "hut-deck" | "hut-wall" | "thatch" | "rail" | "bridge" | "rope" | "water" | "waterfall" | "lilies" | "statue" | "statue-crown" | "statue-hand" | "tent-wall" | "tent-roof" | "rug" | "roll" | "lantern" | "chest" | "chest-lid" | "crate" | "crate-lid" | "telescope" | "table" | "map" | "backpack" | "hat" | "toucan" | "monkey" | "tail" | "frog" | "ferns" | "flowers" | "boulders" | "path";
export type JungleNode = {
    key: string;
    zone: string;
    kind: JungleKind;
    at: JungleVector;
    size: JungleVector;
    color: string;
    rotation?: JungleVector;
    cover?: string;
    fix?: {
        at?: JungleVector;
        normal: JungleVector;
    };
};
export const JUNGLE_COLORS = { stone: "#c4bfa7", light: "#e6dfbd", shade: "#8f9782", sand: "#e8d49b", moss: "#8dca32", lime: "#b7e442", leaf: "#3baf49", deep: "#197f45", wood: "#986136", honey: "#c7914f", gold: "#ffbf27", red: "#ed5340", cream: "#ffedc4", water: "#26c9db", blue: "#1b96cb", pink: "#f46ca3" } as const;
/** Geometry-free Easy assembly plan. Covers name actual contacting objects,
 * never extra gameplay locks. Small decorative meshes belong to these owners. */
export function createJunglePlan() {
    const nodes: JungleNode[] = [], C = JUNGLE_COLORS;
    function add(zone: string, key: string, kind: JungleKind, at: JungleVector, size: JungleVector, color: string = C.stone, cover?: string, rotation?: JungleVector) { const n: JungleNode = { zone, key, kind, at, size, color, cover, rotation }; if (nodes.some(o => o.key === key))
        throw Error(`Duplicate jungle owner ${key}`); nodes.push(n); return n; }
    const top = (n: JungleNode, at?: JungleVector) => { n.fix = { normal: [0, 1, 0], at }; return n; };
    // Low stone island, its eight visible edge courses and rich grass/paving caps.
    const anchors: [
        number,
        number,
        string
    ][] = [[-3.75, -3.55, "tree-left-trunk"], [0, -3.55, "temple-lower-0"], [3.75, -3.55, "tree-right-trunk"], [-3.75, 0, "river-rock-0"], [3.75, 0, "tent-deck"], [-3.75, 3.55, "statue-head"], [0, 3.55, "map-table"], [3.75, 3.55, "chest-blue"]];
    for (const [i, [x, z, cover]] of anchors.entries()) {
        add("island", `foundation-${i}`, "foundation", [x, -.48, z], [3.75, .8, 3.55], C.stone, `ground-${i}`);
        add("island", `ground-${i}`, "ground", [x, .015, z], [3.73, .20, 3.53], C.sand, cover);
    }
    // A stepped, open temple: substantial pieces rather than one screw per brick.
    for (const [i, [x, z]] of [[-.35, -3.9], [2.35, -3.9], [-.35, -2.0], [2.35, -2.0]].entries())
        add("temple", `temple-lower-${i}`, "stone", [x, .75, z], [2.68, 1.25, 1.88], C.shade, `temple-upper-${i % 2}`);
    for (const [i, x] of [-.2, 2.2].entries())
        add("temple", `temple-upper-${i}`, "stone", [x, 1.75, -3.05], [2.35, .75, 3.3], C.stone, `temple-floor-${i}`);
    for (const [i, x] of [.0, 2.0].entries())
        add("temple", `temple-floor-${i}`, "stone", [x, 2.27, -2.95], [1.98, .28, 2.95], C.light, i ? "portal-pillar-right" : "portal-pillar-left");
    add("temple", "temple-wall-back", "wall", [1, 3.55, -4.25], [3.8, 2.3, .38], C.stone, "pyramid-lower");
    add("temple", "temple-wall-left", "wall", [-.95, 3.5, -3.05], [.4, 2.3, 2.45], C.stone, "banner-left");
    add("temple", "temple-wall-right", "wall", [2.95, 3.5, -3.05], [.4, 2.3, 2.45], C.stone, "banner-right");
    for (const [side, x] of [["left", -.42], ["right", 2.42]] as const) {
        add("temple", `portal-pillar-${side}`, "pillar", [x, 3.5, -1.69], [.63, 2.3, .64], C.light, `torch-${side}`);
        top(add("temple", `torch-${side}`, "torch", [x, 3.24, -1.18], [.43, 1.0, .42], C.honey));
        add("temple", `banner-${side}`, "banner", [side === "left" ? -1.45 : 3.45, 3.77, -1.48], [.7, 1.65, .12], C.red);
    }
    add("temple", "portal-lintel", "lintel", [1, 4.72, -1.64], [3.8, .64, .78], C.light, "sun-mask");
    add("temple", "portal-door-left", "door", [.39, 3.38, -1.8], [1.15, 1.88, .2], C.wood);
    add("temple", "portal-door-right", "door", [1.61, 3.38, -1.8], [1.15, 1.88, .2], C.wood);
    add("treasure", "idol-plinth", "stone", [1, 2.63, -2.6], [1.1, .44, .85], C.honey, "golden-idol");
    add("treasure", "golden-idol", "idol", [1, 3.12, -2.6], [.65, .65, .6], C.gold, "portal-door-right");
    add("temple", "pyramid-lower", "pyramid", [1, 5.22, -3.02], [4.45, .44, 3.18], C.shade, "pyramid-middle");
    add("temple", "pyramid-middle", "pyramid", [1, 5.73, -3.3], [3.45, .6, 2.55], C.stone, "pyramid-crown");
    add("temple", "pyramid-crown", "pyramid", [1, 6.29, -3.53], [2.35, .55, 1.95], C.light);
    add("temple", "sun-mask", "mask", [1, 5.42, -1.3], [1.5, 1.25, .45], C.light, "sun-crown");
    add("temple", "sun-crown", "sun", [1, 5.71, -.89], [1.35, 1.35, .18], C.gold);
    for (let i = 0; i < 3; i++)
        add("temple", `stairs-${i}`, "stairs", [1, 1.91 - i * .6, -.48 + i * .92], [2.15, .6, .95], C.light, i === 0 ? "portal-door-left" : i === 1 ? "stairs-0" : "stairs-1");
    for (const [side, x] of [["left", -1.85], ["right", 4.05]] as const) {
        add("temple", `column-${side}`, "pillar", [x, 1.57, -.7], [.7, 1.8, .7], C.stone, `column-cap-${side}`);
        top(add("temple", `column-cap-${side}`, "cap", [x, 2.56, -.7], [1.0, .36, 1.0], C.light));
    }
    // Three lush trees: trunk/roots and canopy/vines are just two assemblies each.
    for (const [name, x, y, z, s] of [["left", -3.8, .18, -2.75, 1.25], ["right", 4.28, .18, -3.65, 1.12], ["river", -4.75, .16, .35, .59]] as const) {
        add("canopy", `tree-${name}-trunk`, "tree-trunk", [x, y + 2.12 * s, z], [.84 * s, 4.25 * s, .9 * s], C.wood, `tree-${name}-crown`);
        top(add("canopy", `tree-${name}-crown`, "tree-crown", [x, y + 4.4 * s, z], [3.45 * s, 1.65 * s, 3.0 * s], C.leaf));
    }
    add("treehouse", "hut-deck", "hut-deck", [-3.9, 3.12, -1.53], [2.05, .28, 1.72], C.honey, "hut-wall-back");
    add("treehouse", "hut-wall-back", "hut-wall", [-3.9, 3.8, -2.25], [1.8, 1.15, .14], C.honey, "hut-roof-left");
    add("treehouse", "hut-wall-left", "hut-wall", [-4.82, 3.8, -1.53], [.14, 1.15, 1.6], C.honey, "hut-roof-left");
    for (const side of [-1, 1]) {
        const label = side < 0 ? "left" : "right";
        top(add("treehouse", `hut-roof-${label}`, "thatch", [-3.9 + side * .56, 4.48, -1.53], [1.42, .16, 2.14], C.cream, undefined, [0, 0, side * .42]));
        add("treehouse", `hut-rail-${label}`, "rail", side < 0 ? [-4.0, 3.5, -.62] : [-4.9, 3.5, -1.53], [side < 0 ? 1.75 : 1.6, .6, .13], C.honey, undefined, [0, side < 0 ? 0 : Math.PI / 2, 0]);
    }
    for (let i = 0; i < 2; i++) {
        const x = -2.475 + i * .99, y = 3.04 - i * .25;
        add("bridge", `bridge-deck-${i}`, "bridge", [x, y, -.93], [.99, .17, 1.0], C.honey, `bridge-rope-${i}`);
        add("bridge", `bridge-rope-${i}`, "rope", [x, y + .37, -.93], [.99, .65, 1.0], C.wood);
    }
    // A real turquoise watercourse, two cascades and stone/moss banks.
    for (const [i, [x, y, z, w, d]] of [[-2.45, 1.9, -2.0, 1.15, 1.1], [-2.45, .92, -.35, 1.35, 1.45], [-1.83, .18, 1.12, 1.6, 1.65], [-.68, .12, 2.72, 2.05, 1.75]].entries())
        add("river", `water-${i}`, "water", [x, y, z], [w, .16, d], C.water, i < 2 ? `fall-${i}` : i === 2 ? "river-lilies-0" : "river-lilies-1");
    top(add("river", "fall-0", "waterfall", [-2.45, 1.5, -1.34], [1.0, 1.0, .22], C.water));
    top(add("river", "fall-1", "waterfall", [-2.42, .59, .48], [1.18, .8, .24], C.water));
    for (let i = 0; i < 2; i++)
        top(add("river", `river-lilies-${i}`, "lilies", [-1.78 + i * 1.15, .32 - i * .08, 1.16 + i * 1.5], [.8, .2, .62], C.leaf));
    for (const [i, [x, y, z]] of [[-3.3, 1.42, -1.5], [-1.65, 1.28, -1.1], [-3.3, .65, .15], [-1.52, .55, .25]].entries())
        add("river", `river-rock-${i}`, "boulders", [x, y, z], [1.0, 1.2, 1.12], C.shade, i === 0 ? "tree-river-trunk" : i === 1 ? "column-left" : undefined);
    // Fallen monument and broken hands, with carved face and a removable headdress.
    add("ruins", "statue-head", "statue", [-3.72, .95, 2.24], [1.85, 1.75, 1.1], C.light, "statue-headdress", [.1, 0, .18]);
    add("ruins", "statue-headdress", "statue-crown", [-3.68, 1.22, 2.03], [2.18, 2.0, .64], C.stone);
    for (const [side, x] of [["left", -4.67], ["right", -2.74]] as const)
        add("ruins", `statue-hand-${side}`, "statue-hand", [x, .44, 3.07], [.79, .62, .78], C.light);
    add("ruins", "statue-plinth", "stone", [-3.73, .24, 2.58], [2.25, .34, 1.8], C.shade, "statue-head");
    add("ruins", "fallen-arm", "pillar", [-2.88, .4, 3.76], [.55, .65, 1.0], C.stone, undefined, [0, 0, Math.PI / 2]);
    // Explorer tent: an open, furnished interior with shallow wall/roof covers.
    add("camp", "tent-deck", "hut-deck", [3.05, .32, 1.67], [2.9, .28, 2.6], C.wood, "tent-back");
    add("camp", "tent-back", "tent-wall", [3.05, 1.3, .45], [2.65, 1.8, .13], C.cream, "tent-roof-right");
    for (const side of [-1, 1]) {
        const label = side < 0 ? "left" : "right";
        add("camp", `tent-wall-${label}`, "tent-wall", [3.05 + side * 1.25, .92, 1.65], [.12, 1.08, 2.28], C.cream, `tent-roof-${label}`);
        top(add("camp", `tent-roof-${label}`, "tent-roof", [3.05 + side * .69, 1.88, 1.65], [1.8, .12, 2.85], C.cream, undefined, [0, 0, -side * .68]));
    }
    add("camp", "tent-front-flap", "tent-wall", [3.87, 1.14, 2.93], [.8, 1.5, .11], C.cream);
    add("camp", "camp-rug", "rug", [2.95, .52, 2.17], [1.55, .07, 1.37], C.red, "bedroll");
    add("camp", "bedroll", "roll", [2.92, .68, 1.38], [1.45, .35, .65], C.blue, "tent-roof-left");
    add("camp", "camp-pillow", "roll", [3.43, .86, 1.35], [.48, .18, .5], C.gold);
    add("camp", "hanging-lantern", "lantern", [3.03, 1.67, 2.36], [.38, .67, .38], C.gold);
    // Real separate treasure, luggage and equipment rather than decorative filler.
    for (const [name, x, z, color] of [["gold", -1.12, 2.2, C.gold], ["blue", 3.05, 3.9, C.blue], ["temple", 1.15, -3.52, C.wood]] as const) {
        add("treasure", `chest-${name}`, "chest", [x, .53, z], [1.03, .68, .72], color, `chest-lid-${name}`);
        top(add("treasure", `chest-lid-${name}`, "chest-lid", name === "gold" ? [x, 1.35, z - .36] : [x, .96, z], [1.1, .24, .78], color, undefined, name === "gold" ? [-.9, 0, 0] : undefined));
    }
    for (const [i, [x, z]] of [[4.52, 2.3], [4.52, 3.48]].entries()) {
        add("camp", `crate-${i}`, "crate", [x, .47, z], [.83, .75, .8], C.honey, `crate-lid-${i}`);
        top(add("camp", `crate-lid-${i}`, "crate-lid", [x, .9, z], [.89, .15, .86], C.wood));
    }
    add("camp", "telescope", "telescope", [4.95, .93, 1.12], [1.0, 1.55, .7], C.gold);
    add("camp", "map-table", "table", [.6, .67, 3.99], [1.95, 1.1, 1.0], C.wood, "map-scroll");
    top(add("camp", "map-scroll", "map", [.6, 1.25, 3.99], [1.82, .08, .91], C.cream));
    add("camp", "backpack", "backpack", [1.55, .75, 2.28], [.62, 1.0, .53], C.deep, "pack-roll");
    top(add("camp", "pack-roll", "roll", [1.55, 1.33, 2.28], [.8, .32, .34], C.cream));
    add("camp", "hat-crate", "crate", [-.8, .56, 3.95], [.88, .9, .9], C.honey, "explorer-hat");
    top(add("camp", "explorer-hat", "hat", [-.8, 1.06, 3.95], [.92, .39, .78], C.sand));
    add("camp", "camp-lantern", "lantern", [1.79, .62, 3.43], [.36, .76, .36], C.red);
    // Wildlife and lush undergrowth frame the paths without tiny separate fixings.
    add("wildlife", "bird-perch", "pillar", [4.62, 1.22, -.7], [.7, 2.1, .7], C.stone, "bird-perch-cap");
    add("wildlife", "bird-perch-cap", "cap", [4.62, 2.34, -.7], [.93, .32, .94], C.light, "toucan");
    add("wildlife", "toucan", "toucan", [4.62, 2.94, -.68], [.8, 1.0, .8], C.red);
    add("wildlife", "monkey", "monkey", [-4.03, 3.41, -1.32], [.5, .65, .45], C.honey, "hut-roof-right");
    add("wildlife", "monkey-tail", "tail", [-4.48, 3.33, -1.25], [.5, .65, .42], C.wood);
    add("wildlife", "golden-frog", "frog", [-.15, .32, 1.37], [.47, .36, .44], C.gold);
    for (const [i, [x, z]] of [[-5.0, 2.37], [-4.78, 4.0], [4.9, -2.2], [4.88, 4.33], [-.1, -4.77], [2.6, -4.79]].entries())
        top(add("jungle", `fern-grove-${i}`, "ferns", [x, .36, z], [1.15, .7, .95], i % 2 ? C.deep : C.leaf));
    for (const [i, [x, z]] of [[-4.85, 1.6], [-1.5, 4.5], [2.26, 4.75], [4.72, 2.95]].entries())
        top(add("jungle", `flower-grove-${i}`, "flowers", [x, .32, z], [1.0, .55, .8], C.pink));
    for (const [i, [x, z]] of [[-5.1, -3.1], [4.8, -4.45], [-4.95, 4.5], [4.83, 4.6]].entries())
        add("jungle", `border-rock-${i}`, "boulders", [x, .43, z], [.9, .8, .8], C.stone, i < 2 ? `fern-grove-${i + 2}` : undefined);
    for (const [i, [x, z]] of [[-.0, 3.04], [1.7, 3.52], [3.78, -.05], [-.1, .1]].entries())
        top(add("paths", `path-${i}`, "path", [x, .19, z], [.82, .17, .68], C.light));
    add("ruins", "river-column", "pillar", [-3.9, 1.0, .98], [.68, 1.58, .68], C.light, "river-column-cap");
    top(add("ruins", "river-column-cap", "cap", [-3.9, 1.88, .98], [.98, .28, .98], C.light));
    top(add("treasure", "relic-tablet", "cap", [-1.85, .3, 4.47], [.65, .2, .48], C.gold));
    for (const [i, x] of [.0, 2.0].entries())
        add("temple", `rear-carving-${i}`, "cap", [x, 3.62, -4.49], [1.0, 1.0, .15], C.gold, undefined, [Math.PI / 2, 0, 0]);
    top(add("treasure", "gem-tray", "crate-lid", [-1.12, .87, 2.2], [.76, .15, .55], C.gold, "chest-lid-gold"));
    // Put support fixings at the actual timber/stone contacts, not below empty air.
    nodes.find(n => n.key === "ground-6")!.fix = { at: [-.18, .015, 3.66], normal: [0, 1, 0] };
    nodes.find(n => n.key === "temple-wall-left")!.fix = { at: [-.95, 4.55, -3.05], normal: [0, 1, 0] };
    nodes.find(n => n.key === "temple-wall-right")!.fix = { at: [2.95, 4.55, -3.05], normal: [0, 1, 0] };
    nodes.find(n => n.key === "tent-wall-left")!.fix = { at: [1.8, .95, 1.65], normal: [0, 1, 0] };
    nodes.find(n => n.key === "tent-wall-right")!.fix = { at: [4.3, .95, 1.65], normal: [0, 1, 0] };
    nodes.find(n => n.key === "camp-rug")!.fix = { at: [2.95, .52, 1.65], normal: [0, 1, 0] };
    nodes.find(n => n.key === "bridge-deck-0")!.fix = { at: [-2.87, 3.04, -.47], normal: [0, 1, 0] };
    nodes.find(n => n.key === "bridge-deck-1")!.fix = { at: [-1.88, 2.79, -.47], normal: [0, 1, 0] };
    nodes.find(n => n.key === "path-3")!.fix = { normal: [0, -1, 0] };
    nodes.find(n => n.key === "sun-mask")!.fix = { at: [.42, 5.61, -1.3], normal: [0, 0, 1] };
    nodes.find(n => n.key === "sun-crown")!.fix = { at: [1, 6.37, -.89], normal: [0, 0, 1] };
    nodes.find(n => n.key === "statue-head")!.fix = { at: [-3.72, 1.8, 2.03], normal: [0, 1, 0] };
    nodes.find(n => n.key === "statue-headdress")!.fix = { at: [-3.68, 2.1, 2.03], normal: [0, 0, 1] };
    return nodes;
}
