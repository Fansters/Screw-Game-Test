import type { ScrewColor } from "./types.ts";

export const SCREW_COLORS: Record<ScrewColor, { color: string; recess: string; label: string }> = {
  red: { color: "#f52b35", recess: "#aa1721", label: "Red" },
  blue: { color: "#2563eb", recess: "#173a9c", label: "Blue" },
  yellow: { color: "#ffe333", recess: "#c6a91b", label: "Yellow" },
  green: { color: "#46df85", recess: "#249b58", label: "Green" },
  orange: { color: "#ffae24", recess: "#b85a05", label: "Orange" },
  purple: { color: "#a628da", recess: "#621087", label: "Purple" },
  brown: { color: "#9b502b", recess: "#64301c", label: "Brown" },
  pink: { color: "#ffaae3", recess: "#c04491", label: "Pink" },
  grey: { color: "#bac7d1", recess: "#657684", label: "Light grey" },
  cyan: { color: "#18e5e1", recess: "#087c89", label: "Cyan" },
  black: { color: "#18232e", recess: "#060d14", label: "Black" },
};
