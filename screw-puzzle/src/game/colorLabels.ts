import type { ScrewColor } from "./types.ts";
// Unique two-letter codes keep nearby colours distinguishable without colour vision.
export const COLOR_CODES: Record<ScrewColor, string> = {
  red: "RD", blue: "BL", yellow: "YL", green: "GN", lime: "LM", orange: "OR",
  purple: "PU", brown: "BR", pink: "PK", grey: "GY", cyan: "CY", black: "BK",
};
