import type { LevelId, PartId, Screw } from './types.ts';
import { LEVEL_LAYOUT_VERSIONS } from './layoutVersions.ts';

// Freeze colour-proof inputs for existing seed-only checkpoints when a bug fix
// REMOVES false covers. These conservative ordering hints never reach live
// screw eligibility; returned game states always use the real physical template.
// A future layout revision automatically stops using its historical snapshot.
const snapshots: Partial<Record<LevelId, { layout: number; blockers: Record<string, readonly PartId[]>; opening?: readonly string[] }>> = {
  "jungle": {
    "layout": 2,
    "blockers": {
      "jungle-1": [
        "jungle-ground-0",
        "jungle-tree-left-crown"
      ],
      "jungle-2": [
        "jungle-tree-left-trunk",
        "jungle-tree-left-crown"
      ],
      "jungle-5": [
        "jungle-ground-2",
        "jungle-temple-lower-1",
        "jungle-tree-right-crown"
      ],
      "jungle-6": [
        "jungle-tree-right-trunk",
        "jungle-tree-right-crown"
      ],
      "jungle-7": [
        "jungle-ground-3",
        "jungle-tree-river-crown"
      ],
      "jungle-8": [
        "jungle-tree-left-crown"
      ],
      "jungle-18": [
        "jungle-temple-upper-1",
        "jungle-tree-right-crown"
      ],
      "jungle-27": [
        "jungle-pyramid-lower",
        "jungle-tree-right-crown"
      ],
      "jungle-37": [
        "jungle-golden-idol",
        "jungle-pyramid-crown"
      ],
      "jungle-44": [
        "jungle-sun-crown"
      ],
      "jungle-51": [
        "jungle-tree-left-crown"
      ],
      "jungle-53": [
        "jungle-tree-right-crown"
      ],
      "jungle-57": [
        "jungle-tree-left-crown",
        "jungle-hut-wall-back"
      ],
      "jungle-61": [
        "jungle-tree-river-crown"
      ],
      "jungle-63": [
        "jungle-tree-river-crown",
        "jungle-hut-wall-left"
      ],
      "jungle-72": [
        "jungle-tree-left-crown"
      ],
      "jungle-118": [
        "jungle-tree-left-crown"
      ],
      "jungle-119": [
        "jungle-tree-river-crown"
      ],
      "jungle-120": [
        "jungle-river-lilies-1"
      ],
      "jungle-123": [
        "jungle-tree-right-crown"
      ],
      "jungle-132": [
        "jungle-tree-right-trunk",
        "jungle-fern-grove-2",
        "jungle-fern-grove-3",
        "jungle-flower-grove-3"
      ]
    },
    "opening": [
      "jungle-29",
      "jungle-30",
      "jungle-32",
      "jungle-33",
      "jungle-35",
      "jungle-36",
      "jungle-41",
      "jungle-43",
      "jungle-45",
      "jungle-46",
      "jungle-50",
      "jungle-52",
      "jungle-54",
      "jungle-56",
      "jungle-59",
      "jungle-65",
      "jungle-67",
      "jungle-73",
      "jungle-74",
      "jungle-76",
      "jungle-78",
      "jungle-81",
      "jungle-85",
      "jungle-89",
      "jungle-91",
      "jungle-92",
      "jungle-93",
      "jungle-94",
      "jungle-96",
      "jungle-98",
      "jungle-100",
      "jungle-104",
      "jungle-106",
      "jungle-107",
      "jungle-109",
      "jungle-111",
      "jungle-113",
      "jungle-114",
      "jungle-117",
      "jungle-121",
      "jungle-122",
      "jungle-127",
      "jungle-128",
      "jungle-129",
      "jungle-131",
      "jungle-133",
      "jungle-134",
      "jungle-135",
      "jungle-137",
      "jungle-144"
    ]
  },
  "campsite": {
    "layout": 3,
    "blockers": {
      "campsite-45": [
        "camp-van-chassis",
        "camp-van-wheel-1--1.15"
      ],
      "campsite-46": [
        "camp-van-chassis",
        "camp-van-wheel-1-1.15"
      ]
    }
  }
};

export function colorProofInputs(level: LevelId, template: readonly Screw[], opening?: ReadonlySet<string>) {
  const snapshot = snapshots[level];
  if (!snapshot || snapshot.layout !== LEVEL_LAYOUT_VERSIONS[level]) return { template, opening };
  return {
    template: template.map(screw => snapshot.blockers[screw.id]
      ? { ...screw, obstructedBy: [...snapshot.blockers[screw.id]] } : screw),
    opening: snapshot.opening ? new Set(snapshot.opening) : opening,
  };
}
