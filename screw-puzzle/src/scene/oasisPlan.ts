export type OasisVector = [number, number, number];
export type OasisKind =
  | "stone"
  | "box"
  | "floor"
  | "foundation"
  | "palm-trunk"
  | "palm-crown"
  | "fronds"
  | "coconuts"
  | "camel-leg"
  | "camel-body"
  | "camel-neck"
  | "camel-head"
  | "blanket"
  | "roll"
  | "post"
  | "canvas"
  | "arch"
  | "sun"
  | "lantern"
  | "ivy"
  | "water"
  | "waterfall"
  | "lotus"
  | "reeds"
  | "animal-body"
  | "animal-head"
  | "animal-tail"
  | "animal-feet"
  | "crate"
  | "crate-lid"
  | "jug"
  | "rug"
  | "cushion"
  | "cactus"
  | "flowers"
  | "sign"
  | "skull"
  | "bones"
  | "rope"
  | "chest"
  | "chest-lid";
export type OasisNode = {
  key: string;
  group: string;
  kind: OasisKind;
  at: OasisVector;
  size: OasisVector;
  color: string;
  rotation?: OasisVector;
  covers: string[];
  proofAfter?: string[];
  outward?: OasisVector;
  contact?: { at?: OasisVector; normal: OasisVector };
};
export const OASIS_COLORS = {
  sand: "#f4c474",
  sandstone: "#e5a464",
  pale: "#ffdb94",
  rust: "#c8784d",
  cream: "#fff0cd",
  red: "#dc4d4f",
  teal: "#14b8b3",
  blue: "#208ca9",
  green: "#61a832",
  wood: "#af7342",
  gold: "#ffc23d",
};

// Geometry-free assembly plan. covers names the removable component over this
// fixing, not a player lock. The mesh audit must prove each planned contact.
export function createOasisPlan() {
  const nodes: OasisNode[] = [],
    C = OASIS_COLORS;
  const byKey = new Map<string, OasisNode>();
  function add(
    group: string,
    key: string,
    kind: OasisKind,
    at: OasisVector,
    size: OasisVector,
    color: string,
    rotation?: OasisVector,
  ) {
    if (byKey.has(key)) throw Error(`Duplicate oasis assembly ${key}`);
    const n: OasisNode = {
      group,
      key,
      kind,
      at,
      size,
      color,
      rotation,
      covers: [],
    };
    nodes.push(n);
    byKey.set(key, n);
    return n;
  }
  function covered(lower: OasisNode, ...upper: OasisNode[]) {
    lower.covers.push(...upper.map((n) => n.key));
    return lower;
  }
  function stack(
    group: string,
    x: number,
    z: number,
    base: number,
    amount: number,
    w: number,
    d: number,
    h: number,
  ) {
    const result: OasisNode[] = [];
    for (let i = 0; i < amount; i++) {
      const n = add(
        group,
        `${group}-${i}`,
        "stone",
        [x, base + h * (i + 0.5), z],
        [w * (1 - 0.025 * i), h + 0.045, d],
        i % 3 === 0 ? C.pale : i % 3 === 1 ? C.sandstone : C.sand,
      );
      if (i) covered(result[i - 1], n);
      result.push(n);
    }
    return result;
  }
  const ground = add(
    "foundation",
    "foundation",
    "foundation",
    [0, -0.42, 0],
    [11.6, 0.7, 10.9],
    C.rust,
  );
  const floors: OasisNode[][] = [];
  for (let row = 0; row < 3; row++) {
    floors[row] = [];
    for (let col = 0; col < 3; col++) {
      const n = add(
        "floor",
        `paving-${row}-${col}`,
        "floor",
        [(col - 1) * 3.78, 0.03 + row * 0.1, (1 - row) * 3.58],
        [3.82, 0.3, 3.72],
        row % 2 ? C.pale : C.sand,
      );
      floors[row].push(n);
      if (row) covered(floors[row - 1][col], n);
      else covered(ground, n);
    }
  }
  function groundY(x: number, z: number) {
    const row = z > 1.79 ? 0 : z < -1.79 ? 2 : 1;
    return {
      floor: floors[row][x < -1.89 ? 0 : x > 1.89 ? 2 : 1],
      y: 0.18 + row * 0.1,
    };
  }
  function root(n: OasisNode) {
    // Only genuinely ground-bearing major roots secure the floor. Palm trunks
    // on cliffs and animals on ledges are carried by their stone supports.
    if (
      /palm/.test(n.group) ||
      /^(flowers|front|fence|camp)$/.test(n.group) ||
      n.key === "camel-leg--1--1" ||
      n.key === "camel-leg-1--1" ||
      n.key === "camel-leg-1-1" ||
      n.key === "cactus-pot-1"
    )
      return;
    covered(groundY(n.at[0], n.at[2]).floor, n);
  }
  // Monument at the rear: two seven-course piers, five arch stones and a sun.
  const piers = [-1, 1].map((side) => {
    const a = stack(
      `gate-pier-${side}`,
      side * 1.03,
      -3.66,
      0.38,
      6,
      0.62,
      0.72,
      0.49,
    );
    root(a[0]);
    return a;
  });
  const arch: OasisNode[] = [];
  for (let i = 0; i < 5; i++) {
    const a = Math.PI * (0.12 + i * 0.19),
      x = Math.cos(a) * 1.03,
      y = 3.37 + Math.sin(a) * 1.03;
    arch.push(
      add(
        "gate",
        `arch-stone-${i}`,
        "arch",
        [x, y, -3.66],
        [0.72, 0.74, 0.74],
        i % 2 ? C.pale : C.sandstone,
        [0, 0, a - Math.PI / 2],
      ),
    );
  }
  covered(piers[1].at(-1)!, arch[0]);
  covered(piers[0].at(-1)!, arch[4]);
  covered(arch[0], arch[1]);
  covered(arch[4], arch[3]);
  covered(arch[1], arch[2]);
  covered(arch[3], arch[2]);
  const sun = add(
    "gate",
    "sun-relief",
    "sun",
    [0, 4.42, -3.2],
    [0.53, 0.65, 0.16],
    C.gold,
  );
  covered(arch[2], sun);
  sun.outward = [0, 0, 1];
  const lamp = add(
    "gate",
    "gate-lantern",
    "lantern",
    [0, 3.44, -3.47],
    [0.38, 0.62, 0.32],
    C.gold,
  );
  lamp.outward = [0, 0, 1];
  // Independent ivy tassels are rooted to the gate, not arbitrary cover plates.
  for (const side of [-1, 1]) {
    const a = add(
      "gate",
      `ivy-stem-${side}`,
      "ivy",
      [side * 1.34, 2.39, -3.18],
      [0.3, 1.3, 0.14],
      C.green,
    );
    a.outward = [side, 0, 1];
  }
  // Layered cliffs at left, carrying the shade shelter and a palm.
  const cliff = stack("western-cliff", -4.45, -3.54, 0.38, 5, 1.65, 1.95, 0.56);
  root(cliff[0]);
  const east = stack("meerkat-ledge", 3.0, -2.15, 0.38, 4, 2.0, 1.85, 0.49);
  root(east[0]);
  const rear = stack("eastern-ruin", 4.6, -3.81, 0.38, 4, 0.66, 0.74, 0.58);
  root(rear[0]);
  const minor = stack("small-arch-pier", 3.27, -4.0, 0.38, 3, 0.6, 0.65, 0.74);
  root(minor[0]);
  const smallArch = add(
    "small-arch",
    "small-arch-crown",
    "arch",
    [3.94, 2.63, -4.0],
    [1.65, 0.48, 0.72],
    C.pale,
  );
  covered(rear.at(-1)!, smallArch);
  covered(minor.at(-1)!, smallArch);
  smallArch.outward = [0, 0, -1];
  // Palm crowns have removable foliage sectors and coconuts, above three trunk sections.
  function palm(name: string, x: number, z: number, y: number, s: number) {
    let previous: OasisNode | undefined;
    for (let i = 0; i < 3; i++) {
      const n = add(
        name,
        `${name}-trunk-${i}`,
        "palm-trunk",
        [x + 0.1 * i * s, y + (0.45 + i * 0.72) * s, z],
        [0.36 * s, 0.78 * s, 0.36 * s],
        C.wood,
        [0, 0, -0.12],
      );
      if (previous) covered(previous, n);
      else root(n);
      previous = n;
    }
    const crown = add(
      name,
      `${name}-crown`,
      "palm-crown",
      [x + 0.26 * s, y + 2.55 * s, z],
      [0.58 * s, 0.36 * s, 0.58 * s],
      C.green,
    );
    covered(previous!, crown);
    for (let j = 0; j < 3; j++) {
      const n = add(
        name,
        `${name}-leaves-${j}`,
        "fronds",
        [
          x + 0.26 * s + Math.cos((j * Math.PI * 2) / 3) * 0.5 * s,
          y + 2.75 * s,
          z + Math.sin((j * Math.PI * 2) / 3) * 0.5 * s,
        ],
        [s, s, s],
        j === 1 ? "#89bd36" : C.green,
        [0, (j * Math.PI * 2) / 3, 0],
      );
      n.outward = [
        Math.cos((j * Math.PI * 2) / 3),
        0.3,
        Math.sin((j * Math.PI * 2) / 3),
      ];
      covered(crown, n);
    }
    const nuts = add(
      name,
      `${name}-coconuts`,
      "coconuts",
      [x + 0.23 * s, y + 2.27 * s, z + 0.25 * s],
      [0.48 * s, 0.45 * s, 0.36 * s],
      "#a56b2c",
    );
    nuts.outward = [0, 0, 1];
    return crown;
  }
  const largePalm = palm("tall-palm", -3.95, -3.5, 1.68, 1.05);
  covered(cliff[2], byKey.get("tall-palm-trunk-0")!);
  palm("rear-palm", 4.42, -4.47, 2.5, 0.67);
  covered(rear.at(-1)!, byKey.get("rear-palm-trunk-0")!);
  // Shade shelter: canvas strips above crossbar and upright posts.
  const shadePosts = [-1, 1].map((side) => {
    const n = add(
      "shade",
      `shade-post-${side}`,
      "post",
      [-3.45 + side * 1.03, 1.42, -1.8],
      [0.16, 2.28, 0.16],
      C.wood,
    );
    root(n);
    return n;
  });
  const shadeBeam = add(
    "shade",
    "shade-crossbar",
    "post",
    [-3.45, 2.64, -1.8],
    [2.42, 0.15, 0.18],
    C.wood,
  );
  shadePosts.forEach((n) => covered(n, shadeBeam));
  for (let i = 0; i < 3; i++) {
    const n = add(
      "shade",
      `shade-cloth-${i}`,
      "canvas",
      [-4.22 + i * 0.77, 2.81, -1.6],
      [0.82, 0.1, 1.47],
      C.cream,
      [0.08, 0, 0],
    );
    n.outward = [0, 0, -1];
    covered(shadeBeam, n);
  }
  // Camel: four separate legs, torso, neck, head, saddlecloth and strapped roll.
  const cx = -3.1,
    cz = 0.12,
    cy = groundY(cx, cz).y;
  const legs: OasisNode[] = [];
  for (const side of [-1, 1])
    for (const bay of [-1, 1]) {
      const n = add(
        "camel",
        `camel-leg-${side}-${bay}`,
        "camel-leg",
        [cx + side * 0.65, cy + 0.49, cz + bay * 0.3],
        [0.25, 1.05, 0.26],
        "#d59d48",
      );
      legs.push(n);
      root(n);
    }
  const body = add(
    "camel",
    "camel-body",
    "camel-body",
    [cx, cy + 1.3, cz],
    [1.83, 0.98, 0.84],
    "#eabc64",
  );
  legs.forEach((n) => covered(n, body));
  const neck = add(
    "camel",
    "camel-neck",
    "camel-neck",
    [cx + 0.86, cy + 1.94, cz],
    [0.42, 1.46, 0.5],
    "#eabc64",
    [0, 0, -0.2],
  );
  covered(body, neck);
  const head = add(
    "camel",
    "camel-head",
    "camel-head",
    [cx + 1.08, cy + 2.65, cz],
    [0.87, 0.58, 0.52],
    "#efca7b",
  );
  covered(neck, head);
  head.outward = [1, 0.15, 0.3];
  const blanket = add(
    "camel",
    "camel-saddle",
    "blanket",
    [cx - 0.16, cy + 2.07, cz],
    [1.32, 0.25, 1.04],
    C.red,
  );
  covered(body, blanket);
  const roll = add(
    "camel",
    "camel-roll",
    "roll",
    [cx - 0.23, cy + 2.35, cz],
    [0.84, 0.41, 0.45],
    C.teal,
  );
  covered(blanket, roll);
  roll.outward = [0, 0, 1];
  // Oasis terraces and waterfall are separate stone ledges with a removable water skin.
  const spring = stack("spring-rock", 0.08, -1.6, 0.28, 3, 1.6, 1.05, 0.5);
  root(spring[0]);
  const fall = add(
    "oasis",
    "waterfall",
    "waterfall",
    [0.08, 1.08, -0.97],
    [1.23, 1.65, 0.19],
    C.teal,
  );
  fall.outward = [1, 0, 0];
  covered(spring[1], fall);
  const pool = add(
    "oasis",
    "pool-bed",
    "stone",
    [0.1, 0.37, 0.08],
    [3.12, 0.28, 2.36],
    "#4caba0",
  );
  root(pool);
  const water = add(
    "oasis",
    "pool-water",
    "water",
    [0.1, 0.56, 0.08],
    [2.98, 0.15, 2.19],
    C.teal,
  );
  covered(pool, water);
  for (let j = 0; j < 3; j++) {
    const n = add(
      "oasis",
      `lotus-${j}`,
      "lotus",
      [-0.78 + j * 0.83, 0.72, 0.17 + (j % 2) * 0.48],
      [0.49, 0.14, 0.49],
      j === 1 ? "#fa78a3" : "#f5adba",
    );
    n.outward = [0, 1, 0];
    covered(water, n);
  }
  for (const side of [-1, 1]) {
    const reed = add(
      "oasis",
      `reeds-${side}`,
      "reeds",
      [side * 1.46, 0.73, 0.3],
      [0.28, 0.82, 0.34],
      C.green,
    );
    root(reed);
    reed.outward = [side, 0, 0];
  }
  // Two meerkats on the eastern cliff, each with head, body and feet.
  function animal(
    name: string,
    x: number,
    y: number,
    z: number,
    s: number,
    fox = false,
    sleep = false,
  ) {
    const feet = add(
      name,
      `${name}-feet`,
      "animal-feet",
      [x, y + 0.1 * s, z],
      [0.55 * s, 0.26 * s, 0.47 * s],
      "#e1aa5c",
    );
    const body = add(
      name,
      `${name}-body`,
      "animal-body",
      [x, y + 0.47 * s, z],
      [0.48 * s, 0.8 * s, 0.45 * s],
      fox ? "#e8a35d" : "#e5b65b",
      sleep ? [0, 0, Math.PI / 2] : undefined,
    );
    covered(feet, body);
    const head = add(
      name,
      `${name}-head`,
      "animal-head",
      [x + (sleep ? 0.29 : 0) * s, y + (sleep ? 0.55 : 0.99) * s, z + 0.02 * s],
      [0.58 * s, 0.48 * s, 0.47 * s],
      fox ? "#ffe0a0" : "#f8d48a",
    );
    covered(body, head);
    head.outward = [0, 0.25, 1];
    const tail = add(
      name,
      `${name}-tail`,
      "animal-tail",
      [x - 0.34 * s, y + 0.24 * s, z - 0.12 * s],
      [0.7 * s, 0.24 * s, 0.28 * s],
      fox ? "#e5a357" : "#ca994f",
      [0, fox ? -0.5 : 0.3, 0],
    );
    tail.outward = [-1, 0.2, 0];
    return { feet, body, head, tail };
  }
  const cat = animal("meerkat-adult", 3.22, 2.34, -2.35, 0.94);
  covered(east.at(-1)!, cat.feet);
  const cub = animal("meerkat-cub", 2.48, 2.34, -1.88, 0.65);
  covered(east.at(-1)!, cub.feet);
  // Tent has a real empty interior and independently removable canvas walls.
  const tx = 2.75,
    tz = 1.5,
    ty = 0.28;
  const deck = add(
    "tent",
    "tent-deck",
    "box",
    [tx, ty + 0.05, tz],
    [2.65, 0.17, 2.25],
    C.wood,
  );
  root(deck);
  const back = add(
    "tent",
    "tent-back",
    "canvas",
    [tx, ty + 1.215, tz - 0.97],
    [2.65, 2.43, 0.12],
    C.cream,
  );
  covered(deck, back);
  const poles = [-1, 1].map((side) =>
    add(
      "tent",
      `tent-pole-${side}`,
      "post",
      [tx, ty + 1.26, tz + side * 1.05],
      [0.11, 2.1, 0.11],
      C.wood,
    ),
  );
  poles.forEach((n) => covered(deck, n));
  const ridge = add(
    "tent",
    "tent-ridge",
    "post",
    [tx, ty + 2.34, tz],
    [0.14, 0.14, 2.48],
    C.wood,
  );
  poles.forEach((n) => covered(n, ridge));
  for (const side of [-1, 1]) {
    const cloth = add(
      "tent",
      `tent-roof-${side}`,
      "canvas",
      [tx + side * 0.68, ty + 1.2, tz],
      [2.9, 0.1, 2.43],
      C.cream,
      [0, 0, -side * 1.07],
    );
    covered(ridge, cloth);
    covered(back, cloth);
    cloth.outward = [side * 0.82, 0.57, 0];
    const drape = add(
      "tent",
      `tent-door-${side}`,
      "canvas",
      [tx + side * 0.85, ty + 0.77, tz + 1.31],
      [0.68, 1.38, 0.1],
      C.cream,
      [0, 0, side * -0.18],
    );
    covered(cloth, drape);
    drape.outward = [0, 0, 1];
  }
  const rug = add(
    "tent",
    "tent-rug",
    "rug",
    [tx, ty + 0.17, tz + 0.07],
    [2.05, 0.06, 1.7],
    C.red,
  );
  covered(deck, rug);
  const bed = add(
    "tent",
    "tent-cushion",
    "cushion",
    [tx, ty + 0.34, tz - 0.31],
    [1.42, 0.3, 0.69],
    C.gold,
  );
  covered(rug, bed);
  covered(bed, back);
  const pillow = add(
    "tent",
    "tent-pillow",
    "roll",
    [tx, ty + 0.62, tz - 0.65],
    [1.23, 0.35, 0.45],
    C.teal,
  );
  covered(bed, pillow);
  covered(pillow, back);
  pillow.outward = [0, 0, -1];
  const sleepy = animal(
    "sleeping-fox",
    tx + 0.2,
    ty + 0.25,
    tz + 0.45,
    0.65,
    true,
    true,
  );
  covered(rug, sleepy.feet);
  covered(sleepy.head, byKey.get("tent-door-1")!);
  covered(sleepy.tail, byKey.get("tent-door-1")!);
  // Three layered crates and camp chest to the right of the tent, not across its doorway.
  for (const [i, x, z] of [
    [0, 4.52, 1.55],
    [1, 4.5, 2.56],
    [2, 3.96, 3.5],
  ] as const) {
    const y = groundY(x, z).y;
    const crate = add(
      "cargo",
      `crate-${i}`,
      "crate",
      [x, y + 0.4, z],
      [0.82, 0.74, 0.82],
      C.wood,
    );
    root(crate);
    const lid = add(
      "cargo",
      `crate-lid-${i}`,
      "crate-lid",
      [x, y + 0.81, z],
      [0.9, 0.12, 0.9],
      C.wood,
    );
    covered(crate, lid);
    const top = add(
      "cargo",
      `crate-prop-${i}`,
      i === 0 ? "lantern" : i === 1 ? "roll" : "jug",
      [x, y + 1.14, z],
      [0.46, 0.6, 0.46],
      i === 1 ? C.gold : C.teal,
    );
    covered(lid, top);
    top.outward = [1, 0.15, 0];
  }
  const chest = add(
    "cargo",
    "camp-chest",
    "chest",
    [1.37, 0.52, 3.3],
    [1.16, 0.61, 0.77],
    C.red,
  );
  root(chest);
  const chestLid = add(
    "cargo",
    "camp-chest-lid",
    "chest-lid",
    [1.37, 0.91, 3.3],
    [1.21, 0.19, 0.83],
    C.wood,
  );
  covered(chest, chestLid);
  chestLid.outward = [0, 0, 1];
  const jug = add(
    "camp",
    "camp-jug",
    "jug",
    [1.03, 0.63, 2.21],
    [0.4, 0.66, 0.4],
    "#b7859e",
  );
  root(jug);
  const campLamp = add(
    "camp",
    "camp-lantern",
    "lantern",
    [1.03, 1.05, 2.21],
    [0.4, 0.57, 0.4],
    C.gold,
  );
  covered(jug, campLamp);
  campLamp.outward = [0, 0, 1];
  // Foreground fennec and richly flowering cacti, separated by the central path.
  const foxRocks = stack("fox-rock", -3.0, 2.74, 0.18, 2, 1.18, 1.05, 0.28);
  root(foxRocks[0]);
  const fox = animal("fennec", -3.0, 0.77, 2.74, 0.94, true);
  covered(foxRocks.at(-1)!, fox.feet);
  for (const [i, x, z, h] of [
    [0, -4.63, 2.3, 1.8],
    [1, -4.26, 3.86, 0.9],
    [2, 4.94, -0.23, 1.18],
  ] as const) {
    const y = groundY(x, z).y;
    const rock = add(
      "cacti",
      `cactus-pot-${i}`,
      "stone",
      [x, y + 0.12, z],
      [0.75, 0.27, 0.77],
      C.sandstone,
    );
    root(rock);
    const trunk = add(
      "cacti",
      `cactus-trunk-${i}`,
      "cactus",
      [x, y + 0.25 + h / 2, z],
      [0.36, h, 0.36],
      C.green,
    );
    covered(rock, trunk);
    const top = add(
      "cacti",
      `cactus-flower-${i}`,
      "flowers",
      [x, y + 0.29 + h, z],
      [0.49, 0.26, 0.49],
      "#ee6da6",
    );
    covered(trunk, top);
    top.outward = [0, 1, 0];
    const arm = add(
      "cacti",
      `cactus-arm-${i}`,
      "cactus",
      [x + 0.37, y + 0.45 + h * 0.35, z],
      [0.22, h * 0.54, 0.25],
      "#86b63d",
      [0, 0, -0.3],
    );
    covered(trunk, arm);
    arm.outward = [1, 0, 0];
  }
  // Pathside sign and rope fence are separate wood/rope assemblies.
  const signPost = add(
    "front",
    "sign-post",
    "post",
    [-0.7, 0.93, 3.8],
    [0.18, 1.5, 0.18],
    C.wood,
  );
  root(signPost);
  for (let i = 0; i < 2; i++) {
    const n = add(
      "front",
      `sign-board-${i}`,
      "sign",
      [-0.7, 1.14 + i * 0.48, 4.03],
      [1.4, 0.48, 0.14],
      C.wood,
    );
    covered(signPost, n);
    n.outward = [0, 0, 1];
  }
  for (let i = 0; i < 4; i++) {
    const x = -3.4 + i * 2.2,
      z = 4.5,
      y = 0.18;
    const post = add(
      "fence",
      `rope-post-${i}`,
      "post",
      [x, y + 0.45, z],
      [0.18, 0.9, 0.18],
      C.wood,
    );
    root(post);
    const cap = add(
      "fence",
      `rope-cap-${i}`,
      "post",
      [x, y + 0.94, z],
      [0.29, 0.15, 0.29],
      C.sandstone,
    );
    covered(post, cap);
    cap.outward = [0, 0, 1];
    if (i < 3) {
      const rope = add(
        "fence",
        `rope-${i}`,
        "rope",
        [x + 1.1, y + 0.67, z],
        [2.18, 0.12, 0.12],
        C.cream,
      );
      rope.outward = [0, 0, 1];
    }
  }
  const skull = add(
    "front",
    "horned-skull",
    "skull",
    [1.15, 0.43, 4.54],
    [0.71, 0.52, 0.64],
    C.cream,
  );
  root(skull);
  skull.outward = [0, 0, 1];
  for (let i = 0; i < 2; i++) {
    const n = add(
      "front",
      `ribs-${i}`,
      "bones",
      [2.2 + i * 0.57, 0.31, 4.3],
      [0.45, 0.3, 0.55],
      C.cream,
    );
    root(n);
    n.outward = [0, 0, 1];
  }
  // Flower rock clusters are rooted scenic layers, not scatter-only filler.
  for (const [i, x, z] of [
    [0, -4.75, 0.56],
    [1, 4.8, 3.82],
    [2, -1.53, -1.2],
    [3, 1.72, -2.3],
  ] as const) {
    const y = groundY(x, z).y;
    const rock = add(
      "flowers",
      `flower-rock-${i}`,
      "stone",
      [x, y + 0.19, z],
      [0.76, 0.42, 0.66],
      C.sandstone,
    );
    root(rock);
    const plant = add(
      "flowers",
      `flower-bed-${i}`,
      "reeds",
      [x, y + 0.49, z],
      [0.52, 0.53, 0.52],
      C.green,
    );
    covered(rock, plant);
    const blooms = add(
      "flowers",
      `flower-tops-${i}`,
      "flowers",
      [x, y + 0.78, z],
      [0.6, 0.27, 0.55],
      i % 2 ? "#e6568c" : "#f9bfce",
    );
    covered(plant, blooms);
    blooms.outward = [0, 0.4, 1];
  }
  // Explicit outward heads avoid top-only play. Sun and lanterns are front/rear,
  // canopy edges side-facing; contacts below crowns/skins are genuinely covered.

  for (const name of ["meerkat-adult", "meerkat-cub", "fennec", "sleeping-fox"])
    covered(byKey.get(name + "-tail")!, byKey.get(name + "-body")!);
  for (let i = 0; i < 3; i++)
    covered(byKey.get("rope-" + i)!, byKey.get("rope-cap-" + i)!);
  covered(byKey.get("sign-board-0")!, byKey.get("sign-board-1")!);
  covered(byKey.get("shade-cloth-0")!, byKey.get("shade-cloth-1")!);
  covered(byKey.get("shade-cloth-1")!, byKey.get("shade-cloth-2")!);
  for (const name of ["tall-palm", "rear-palm"])
    for (let j = 0; j < 3; j++) {
      const leaf = byKey.get(name + "-leaves-" + j)!;
      covered(leaf, byKey.get(name + "-coconuts")!);
      leaf.contact = { normal: [0, -1, 0] };
    }
  for (const n of nodes)
    if (
      n.kind === "camel-leg" ||
      n.key.startsWith("shade-post-") ||
      n.key.startsWith("tent-pole-")
    )
      n.contact = { normal: [0, 1, 0] };
  for (let i = 0; i < 3; i++) {
    const n = byKey.get("rope-" + i)!;
    n.contact = {
      at: [n.at[0] - n.size[0] / 2, n.at[1] + 0.12, n.at[2]],
      normal: [0, 1, 0],
    };
    const arm = byKey.get("cactus-arm-" + i)!;
    covered(arm, byKey.get("cactus-flower-" + i)!);
    arm.contact = { normal: [Math.sin(0.3), Math.cos(0.3), 0] };
  }
  ["camel-body", "crate-2", "spring-rock-1", "meerkat-ledge-1"].forEach(
    (key, i) => covered(byKey.get("flower-tops-" + i)!, byKey.get(key)!),
  );
  water.covers = [];
  water.contact = { at: [1.2, 0.56, -0.5], normal: [0, 1, 0] };
  for (let i = 0; i < 3; i++) {
    const n = byKey.get("lotus-" + i)!;
    covered(n, water);
    n.at[1] = 0.65;
    n.contact = { at: [n.at[0], 0.61, n.at[2]], normal: [0, 0, 1] };
    covered(pool, n);
  }
  const blooms = byKey.get("flower-tops-1")!;
  blooms.contact = {
    at: [blooms.at[0], blooms.at[1] - 0.07, blooms.at[2]],
    normal: [-1, 0, 0],
  };
  const pillowNode = byKey.get("tent-pillow")!;
  pillowNode.contact = { normal: [0, 0, -1] };
  for (const side of [-1, 1]) {
    const n = byKey.get("tent-roof-" + side)!;
    n.contact = {
      at: [tx + side * 0.85, ty + 1.2 - (0.85 - 0.68) * Math.tan(1.07), tz],
      normal: [0, 0, 1],
    };
  }
  for (const n of nodes) {
    if (n.kind === "animal-head") n.outward = [0, 0.05, -1];
    if (n.kind === "animal-tail") n.contact = { normal: [-1, 0, 0] };
    if (n.key.startsWith("cactus-flower-")) n.at[1] += 0.14;
  }
  for (const n of nodes) {
    const cover = byKey.get(n.covers[0]);
    if (
      n.kind === "stone" &&
      cover &&
      (cover.kind === "stone" || cover.kind === "arch")
    )
      n.contact = {
        at: [n.at[0], n.at[1] + n.size[1] * 0.38, n.at[2]],
        normal: [0, 0, -1],
      };
  }
  const retired = new Set([
    "ivy-stem--1",
    "ivy-stem-1",
    "camp-lantern",
    "ribs-1",
  ]);
  for (let i = nodes.length - 1; i >= 0; i--)
    if (retired.has(nodes[i].key)) nodes.splice(i, 1);
  for (const n of nodes) {
    n.covers = n.covers.filter((key) => !retired.has(key));
    if (n.kind === "palm-crown") n.contact = { normal: [0, 1, 0] };
  }
  for (const n of nodes)
    if (n.key.startsWith("tent-pole-")) {
      n.at[1] -= 0.07;
      n.size[1] += 0.14;
    }
  // Solution construction finishes the load-bearing skin after its contents.
  // These ordering hints never enter player eligibility; real meshes do that.
  for (const n of nodes) {
    if (n.kind === "floor")
      n.proofAfter = nodes
        .filter((p) => p.kind !== "floor" && p.kind !== "foundation")
        .map((p) => p.key);
    if (n.kind === "foundation")
      n.proofAfter = nodes.filter((p) => p !== n).map((p) => p.key);
  }
  // Real knot wraps create a short fence branch rather than four free caps.
  for (let i = 1; i < 4; i++) {
    const cap = byKey.get("rope-cap-" + i)!;
    covered(cap, byKey.get("rope-" + (i - 1))!);
    cap.contact = { normal: [-1, 0, 0] };
  }
  const hanging = byKey.get("gate-lantern")!;
  covered(hanging, arch[2]);
  hanging.contact = { at: [0, 3.99, -3.47], normal: [0, 1, 0] };
  const skullNode = byKey.get("horned-skull")!;
  skullNode.at[2] = 4.0;
  covered(skullNode, chest);
  skullNode.contact = { normal: [0, 0, -1] };
  const ribsNode = byKey.get("ribs-0")!;
  ribsNode.at[0] = 1.73;
  ribsNode.at[1] = 0.37;
  ribsNode.at[2] = 4.1;
  covered(ribsNode, skullNode);
  ribsNode.contact = { normal: [-1, 0, 0] };
  for (const n of nodes)
    if (n.kind === "camel-leg")
      n.contact = {
        at: [n.at[0], n.at[1] + 0.46, n.at[2]],
        normal: [body.at[0] > n.at[0] ? 1 : -1, 0, 0],
      };
  void largePalm;
  validateOasisPlan(nodes);
  return nodes;
}
export function validateOasisPlan(nodes: readonly OasisNode[]) {
  const keys = new Set(nodes.map((n) => n.key)),
    visiting = new Set<string>(),
    done = new Set<string>();
  const visit = (key: string) => {
    if (done.has(key)) return;
    if (visiting.has(key)) throw Error(`Oasis cycle at ${key}`);
    if (!keys.has(key)) throw Error(`Missing oasis part ${key}`);
    visiting.add(key);
    [
      ...nodes.find((n) => n.key === key)!.covers,
      ...(nodes.find((n) => n.key === key)!.proofAfter ?? []),
    ].forEach(visit);
    visiting.delete(key);
    done.add(key);
  };
  nodes.forEach((n) => visit(n.key));
}
