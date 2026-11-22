import type { LevelId } from "./types.ts";

// Menu metadata stays independent of 3D models: browsing never builds a level.
export const LEVEL_PRESENTATION = {
  cottage: { screws: 240, preview: "/images/levels/cottage.webp", tag: "Cosy & layered", description: "Snowy rooftops, festive details and hidden rooms to uncover.", accent: "#b7d8b0" },
  campsite: { screws: 240, preview: "/images/home/campsite.webp", tag: "Lakeside escape", description: "Explore the tent, camper and little surprises along the shore.", accent: "#c2dca3" },
  desert: { screws: 216, preview: "/images/home/desert.webp", tag: "Road trip", description: "A colourful roadside stop with a garage, pumps and desert secrets.", accent: "#edb696" },
  construction: { screws: 204, preview: "/images/levels/construction.webp", tag: "Work in progress", description: "Take apart the crane, bulldozer and a building full of layers.", accent: "#efcf8e" },
  carnival: { screws: 240, preview: "/images/home/carnival.webp", tag: "Big wheel, big fun", description: "Colourful stalls, a carousel and a towering panorama wheel.", accent: "#e6b5cf" },
  zoo: { screws: 231, preview: "/images/levels/zoo.webp", tag: "Wild discoveries", description: "Animal habitats, a waterfall and a lookout packed with surprises.", accent: "#a7cebb" },
  castle: { screws: 225, preview: "/images/levels/castle.webp", tag: "A royal adventure", description: "A grand castle, hidden chambers and a lively medieval courtyard.", accent: "#dfb067" },
  arctic: { screws: 150, preview: "/images/levels/arctic.webp", tag: "A frosty expedition", description: "Penguins, seals and a red research hut above sparkling icy caves.", accent: "#8dd7ed" },
} satisfies Partial<Record<LevelId, { screws: number; preview: string; tag: string; description: string; accent: string }>>;

export function savedScrewCount(moves: readonly string[]) {
  return moves.filter(move => move !== "boost" && move !== "peek" && !move.startsWith("find:")).length;
}
