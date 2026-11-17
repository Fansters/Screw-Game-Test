export const SCREW_COLOR_ORDER = ["red", "blue", "yellow", "green", "orange", "purple", "brown", "pink", "grey", "cyan", "black", "lime"] as const;
export type ScrewColor = typeof SCREW_COLOR_ORDER[number];
export type GameStatus = "playing" | "won" | "lost";
export type LevelId = "cottage" | "titanic";
export const ROOF_SECTIONS = (["left", "right"] as const).flatMap((side) =>
  (["front", "middle", "back"] as const).flatMap((lane, index) =>
    (["eave", "ridge"] as const).map((band) => ({ id: `roof-${side}-${lane}-${band}` as const, side, lane, band, z: 1.4 - index * 1.4 }))));
export const ROOF_IDS = ROOF_SECTIONS.map((section) => section.id);
export const WALL_SECTIONS = (["front", "back", "left", "right"] as const).flatMap((face) =>
  (["lower", "upper"] as const).flatMap((story) =>
    ([1, 2, 3] as const).map((column) => ({ id: `wall-${face}-${story}-${column}` as const, face, story, column }))));
export const WALL_IDS = WALL_SECTIONS.map((section) => section.id);
export const CEILING_IDS = ["ceiling-front", "ceiling-middle", "ceiling-back"] as const;
export const PARTITION_IDS = ["partition-upper-left", "partition-upper-right", "partition-upper-cross-left", "partition-upper-cross-right",
  "partition-lower-left", "partition-lower-right", "partition-lower-cross-left"] as const;
export const INTERIOR_STORIES = [
  { story: "upper", bottom: 0.33, top: 1.99 },
  { story: "lower", bottom: -1.59, top: 0.18 },
] as const;
export const INTERIOR_DOORWAYS = [
  { bay: "rear", z: -1.15 },
  { bay: "front", z: 0.73 },
] as const;
export const INTERIOR_DOORS = INTERIOR_STORIES.flatMap(({ story, bottom, top }) =>
  (["left", "right"] as const).flatMap((room) => INTERIOR_DOORWAYS.map(({ bay, z }) => ({
    id: `interior-door-${story}-${room}-${bay}` as const, story, bay, z, bottom, top: top - 0.2,
    side: room === "left" ? -1 : 1,
  }))));
export const CHEST_PART_IDS = ["chest", "chest-lid", "chest-lock"] as const;
export type ChestPartId = typeof CHEST_PART_IDS[number];
export const BATHROOM_IDS = ["bath-toilet", "bath-sink", "bath-shower", "bath-tray", "bath-mirror", "bath-towel", "bath-mat", "bath-paper", "bath-soap"] as const;
export const FRAME_POSTS = (["nw", "ne", "sw", "se"] as const).flatMap((corner) =>
  (["lower", "upper"] as const).map((story) => ({
    id: `post-${corner}-${story}` as const, story,
    x: corner.endsWith("w") ? -2.37 : 2.37, z: corner.startsWith("n") ? -1.91 : 1.91,
  })));
export const FLOOR_BEAMS = ["beam-front", "beam-back"] as const;
export const INTERIOR_PROPS = ["reading-chair", "bedroom-rug", "bookcase", "study-rug", "sideboard", "hall-runner"] as const;
export const FURNISHING_IDS = ["bedroom-painting", "landing-painting", "dining-painting", "living-carpet", "bedside-runner",
  "blind-upper-left", "blind-upper-right", "blind-lower-left", "blind-lower-right"] as const;
export const DINING_CHAIRS = [
  { id: "chair-front", z: 1.5, outward: 1 },
  { id: "chair-back", z: -0.3, outward: -1 },
] as const;
export const HOUSE_PART_IDS = ["chimney", "window-upper-left", "window-upper-right", "window-lower-left", "window-lower-right", "door", "steps", "planter-left", "planter-right", "bed", "wardrobe", "desk", ...BATHROOM_IDS, "stairs", "floor-left", "floor-right", "sofa", "kitchen", "table", ...ROOF_IDS, ...WALL_IDS, ...CEILING_IDS, ...PARTITION_IDS] as const;
export const GROUND_IDS = ["ground-nw", "ground-ne", "ground-sw", "ground-se"] as const;
export const PLINTH_IDS = ["plinth-nw", "plinth-ne", "plinth-sw", "plinth-se"] as const;
export const TILE_IDS = ["tile-nw", "tile-n", "tile-ne", "tile-w", "tile-center", "tile-e", "tile-sw", "tile-s", "tile-se"] as const;
export const SNOW_ROOFS = (["left", "right"] as const).flatMap((side) =>
  (["front", "middle", "back"] as const).map((lane, index) => ({ id: `snow-${side}-${lane}` as const, side, lane, z: 1.4 - index * 1.4 })));
export const GARLANDS = (["front", "back", "left", "right"] as const).flatMap((face) =>
  (["lower", "upper"] as const).map((story) => ({ id: `garland-${face}-${story}` as const, face, story })));
export const DECOR_IDS = [...SNOW_ROOFS.map((part) => part.id), ...GARLANDS.map((part) => part.id),
  "icicles-front", "icicles-back", "snowbank-front", "snowbank-back", "snowbank-left", "snowbank-right",
  "wreath-upper-left", "wreath-upper-right", "wreath-lower-left", "wreath-lower-right",
  "christmas-tree", "tree-star", "gift-left", "holiday-lantern", "gift-right", "candy-left", "candy-right", "porch-snow", "chimney-snow",
  "roof-lights-left", "roof-lights-right", "present-bed", "present-desk", "present-sofa", "present-table", "roof-bauble"] as const;
export const PART_IDS = [...HOUSE_PART_IDS, ...DINING_CHAIRS.map((chair) => chair.id), "table-vase", ...FRAME_POSTS.map((post) => post.id), ...FLOOR_BEAMS, ...GROUND_IDS, ...PLINTH_IDS, ...TILE_IDS, ...DECOR_IDS, ...INTERIOR_PROPS, ...INTERIOR_DOORS.map((door) => door.id), ...FURNISHING_IDS] as const;
export type TitanicPartId = `ship-${string}`;
export type PartId = typeof PART_IDS[number] | TitanicPartId;

export type Screw = {
  id: string;
  color: ScrewColor;
  position: [number, number, number];
  normal: [number, number, number];
  removed: boolean;
  attachedTo?: PartId;
  /** Conservative peel order for generation, never a player-facing lock. */
  solutionAfter?: PartId[];
  /** Actual head / spin-out collisions, derived from model geometry. */
  obstructedBy?: PartId[];
};

export type CollectedScrew = { screwId: string; color: ScrewColor };
export type BoxTarget = { id: string; color: ScrewColor };
export type MatchBox = BoxTarget & { screws: CollectedScrew[] };

export type GameState = {
  screws: Screw[];
  tray: CollectedScrew[];
  boxes: (MatchBox | null)[];
  boxQueue: BoxTarget[];
  clearedCount: number;
  status: GameStatus;
  removedParts: PartId[];
};

export type CollectionState = Pick<GameState, "boxes" | "tray">;
export type Socket = { kind: "box"; slot: number; index: number } | { kind: "tray"; index: number };
type EventStates<State> = { before: State; after: State };
export type MoveEvent<State extends CollectionState = GameState> = EventStates<State> & (
  { kind: "collect"; screw: CollectedScrew; to: Socket } |
  { kind: "transfer"; screw: CollectedScrew; from: number; to: Socket } |
  { kind: "complete" | "replace"; slot: number; color: ScrewColor } |
  { kind: "bonus-open"; slot: number } |
  { kind: "detach"; part: PartId }
);
