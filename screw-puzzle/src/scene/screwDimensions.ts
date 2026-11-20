export const SCREW_SHAFT_LENGTH = 0.49;
// Head-only width increase. Shaft length, mounting depth and head height stay fixed.
export const SCREW_HEAD_WIDTH_SCALE = 1.15;
export const SCREW_HEAD_RADIUS = 0.25 * SCREW_HEAD_WIDTH_SCALE;
// The outer cap is a readability change. Keep the authored mechanical
// extraction envelope stable so colour proofs, fixing IDs and saves agree.
export const SCREW_HEAD_CLEARANCE_RADIUS = 0.24;
// A small gap beyond the tip lets the shaft fully clear its mounting surface.
export const SCREW_PULL_DISTANCE = SCREW_SHAFT_LENGTH + 0.01;
