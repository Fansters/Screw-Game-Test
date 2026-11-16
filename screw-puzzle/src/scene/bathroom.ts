import type { BATHROOM_IDS } from "../game/types.ts";
import type { Piece, Vector } from "./houseModel.ts";

type Fixture = typeof BATHROOM_IDS[number];
type BathroomItem = {
  id: Fixture;
  pivot: Vector;
  screws: { position: Vector; normal: Vector }[];
  after?: Fixture[];
};

const up: Vector = [0, 1, 0], intoRoom: Vector = [-1, 0, 0], towardDoor: Vector = [0, 0, 1];
export const BATHROOM: BathroomItem[] = [
  { id: "bath-toilet", pivot: [1.01, 0.54, 0.02], screws: [
    { position: [1.06, 0.939, -0.206], normal: up },
    { position: [1.01, 0.472, 0.265], normal: towardDoor },
  ] },
  { id: "bath-sink", pivot: [2.115, 0.64, 1.17], screws: [
    { position: [1.893, 0.73, 1.02], normal: intoRoom },
    { position: [1.893, 0.49, 1.32], normal: intoRoom },
  ] },
  { id: "bath-shower", pivot: [1.96, 1.03, 0.074], screws: [
    { position: [1.93, 1.53, 0.47], normal: towardDoor },
    { position: [2.19, 0.69, 0.47], normal: towardDoor },
    { position: [1.61, 1.25, 0.22], normal: intoRoom },
  ] },
  { id: "bath-tray", pivot: [1.96, 0.379, 0.074], after: ["bath-shower"],
    screws: [{ position: [1.96, 0.445, 0.428], normal: up }] },
  { id: "bath-mirror", pivot: [2.292, 1.37, 1.17],
    screws: [{ position: [2.239, 1.669, 1.17], normal: intoRoom }] },
  { id: "bath-towel", pivot: [0.69, 1.137, 1.417],
    screws: [{ position: [0.763, 1.357, 1.47], normal: [1, 0, 0] }] },
  { id: "bath-mat", pivot: [1.41, 0.346, 1.15],
    screws: [{ position: [1.44, 0.381, 1.37], normal: up }] },
  { id: "bath-paper", pivot: [0.678, 0.699, 0.265],
    screws: [{ position: [0.788, 0.709, 0.265], normal: [1, 0, 0] }] },
  { id: "bath-soap", pivot: [2.224, 0.94, 1.35],
    screws: [{ position: [2.224, 1.029, 1.35], normal: up }] },
];

export function addBathroom(pieces: Piece[], pivots: Record<Fixture, Vector>) {
  for (const { id, pivot } of BATHROOM) pivots[id] = pivot;
  const add = (part: Fixture, kind: Piece["kind"], position: Vector, size: Vector, color: string, rotation?: Vector) =>
    pieces.push({ part, kind, position, size, color, rotation });
  const porcelain = "#f1f4e5", satin = "#cadfe0", steel = "#718e94", deep = "#4e8c88", trim = "#e4c493";
  const at = (part: Fixture) => (kind: Piece["kind"], offset: Vector, size: Vector, color: string, rotation?: Vector) => {
    const [x, y, z] = pivots[part];
    add(part, kind, [x + offset[0], y + offset[1], z + offset[2]], size, color, rotation);
  };

  const toilet = at("bath-toilet");
  toilet("cylinder", [0, -0.148, 0.035], [0.147, 0.157, 0.178], porcelain);
  toilet("ico", [0, 0.025, 0.023], [0.205, 0.14, 0.236], porcelain);
  toilet("ico", [0, 0.138, 0.023], [0.141, 0.018, 0.17], "#86b7bc");
  for (const y of [0.116, 0.157]) toilet("ring", [0, y, 0.023], [0.184, 0.17, 0.209], porcelain);
  toilet("snow-slab", [0, 0.195, -0.231], [0.41, 0.31, 0.189], porcelain);
  toilet("snow-slab", [0, 0.369, -0.231], [0.431, 0.053, 0.207], porcelain);
  toilet("cylinder", [-0.088, 0.402, -0.231], [0.033, 0.022, 0.033], steel);

  const sink = at("bath-sink");
  sink("box", [0, -0.032, 0], [0.416, 0.486, 0.568], deep);
  for (const z of [-0.135, 0.135]) {
    sink("box", [-0.21, -0.031, z], [0.026, 0.397, 0.251], "#68a39e");
    sink("box", [-0.234, 0.006, z * 0.4], [0.026, 0.068, 0.026], trim);
  }
  sink("snow-slab", [-0.014, 0.225, 0], [0.47, 0.092, 0.60], porcelain);
  sink("ico", [-0.039, 0.273, -0.028], [0.146, 0.012, 0.205], "#9ac4c5");
  sink("ring", [-0.039, 0.274, -0.028], [0.17, 0.115, 0.22], porcelain);
  sink("cylinder", [0.139, 0.327, -0.045], [0.026, 0.117, 0.026], steel);
  sink("box", [0.091, 0.381, -0.045], [0.114, 0.031, 0.036], satin);
  sink("cylinder", [-0.059, 0.285, -0.028], [0.027, 0.008, 0.027], steel);

  const mirror = at("bath-mirror");
  mirror("snow-slab", [0, 0, 0], [0.085, 0.65, 0.48], trim);
  mirror("box", [-0.047, -0.009, 0], [0.02, 0.535, 0.382], "#a9d6dd");
  for (const z of [-0.055, 0.04]) mirror("box", [-0.059, 0.078, z], [0.006, 0.31, 0.041], "#e1f1ef", [0.42, 0, 0]);

  const shower = at("bath-shower");
  for (const z of [-0.357, 0.368]) {
    shower("box", [0, 0.621, z], [0.72, 0.052, 0.055], steel);
    shower("box", [-0.335, 0, z], [0.045, 1.293, 0.052], steel);
  }
  shower("box", [-0.334, 0.62, 0], [0.051, 0.047, 0.75], steel);
  shower("box", [0, -0.534, 0.371], [0.69, 0.103, 0.12], steel);
  for (let i = 0; i < 10; i += 1) {
    const x = -0.302 + i * 0.063;
    shower("box", [x, -0.048, 0.367 + (i % 2) * 0.024], [0.075, 1.22, 0.035], i % 2 ? "#81b6b3" : "#a1ceca");
    shower("cylinder", [x, 0.597, 0.371], [0.014, 0.071, 0.014], trim);
  }
  shower("cylinder", [0.302, 0.172, -0.202], [0.021, 0.72, 0.021], steel);
  shower("box", [0.234, 0.53, -0.202], [0.165, 0.039, 0.04], steel);
  shower("cylinder", [0.144, 0.504, -0.202], [0.095, 0.041, 0.095], satin);

  const tray = at("bath-tray");
  tray("snow-slab", [0, -0.019, 0], [0.744, 0.092, 0.78], porcelain);
  for (const x of [-0.35, 0.35]) tray("box", [x, 0.035, 0], [0.045, 0.056, 0.78], satin);
  for (const z of [-0.369, 0.369]) tray("box", [0, 0.035, z], [0.654, 0.056, 0.045], satin);
  tray("cylinder", [0.18, 0.031, -0.14], [0.056, 0.011, 0.056], steel);

  const towel = at("bath-towel");
  towel("box", [0.04, 0.217, 0], [0.071, 0.038, 0.377], trim);
  for (let i = 0; i < 4; i += 1) {
    towel("box", [0.035 + (i % 2) * 0.009, -0.015, -0.14 + i * 0.091], [0.052, 0.407, 0.101], i % 2 ? "#b7748d" : "#ca8b9d");
  }
  towel("box", [0.067, -0.16, 0], [0.014, 0.045, 0.376], "#e9b6bd");

  const mat = at("bath-mat");
  mat("snow-slab", [0, -0.001, 0], [0.529, 0.037, 0.58], "#a27091");
  for (let i = 0; i < 7; i += 1) mat("box", [0, 0.02, -0.224 + i * 0.075], [0.45, 0.01, 0.036], i % 2 ? "#d094b0" : "#bb85a7");

  const paper = at("bath-paper");
  paper("box", [-0.02, -0.004, 0], [0.105, 0.068, 0.061], steel);
  paper("cylinder", [0.045, 0, 0], [0.073, 0.145, 0.073], porcelain, [Math.PI / 2, 0, 0]);
  paper("cylinder", [0.045, 0, 0.076], [0.027, 0.01, 0.027], "#ae9e89", [Math.PI / 2, 0, 0]);
  paper("box", [0.084, -0.071, 0], [0.011, 0.105, 0.136], porcelain);

  const soap = at("bath-soap");
  soap("cylinder", [0, 0, 0], [0.047, 0.114, 0.047], "#da8da5");
  soap("cylinder", [0, 0.067, 0], [0.026, 0.028, 0.026], satin);
  soap("box", [-0.012, 0.083, 0], [0.073, 0.02, 0.026], porcelain);
}
