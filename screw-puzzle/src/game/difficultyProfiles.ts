/** Authoring targets, not invisible gameplay locks. Existing worlds retain
 * their historical generation inputs; Jungle Temple first uses this profile. */
export const EASY_PROFILE = Object.freeze({
    screwBudget: [120, 150] as const,
    openingExposure: [.30, .40] as const,
    typicalCoverDepth: [1, 2] as const,
    openingMatches: [3, 5] as const,
    plannedTrayPeak: 1,
    colors: ["red", "blue", "yellow", "purple", "pink", "cyan"] as const,
});
