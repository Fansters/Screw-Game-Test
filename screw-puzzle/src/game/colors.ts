import type { ScrewColor } from "./types.ts";

export const SCREW_COLORS: Record<ScrewColor, { color: string; recess: string; label: string }> = {
  red: { color: "#f52b35", recess: "#aa1721", label: "Red" },
  blue: { color: "#2563eb", recess: "#173a9c", label: "Blue" },
  yellow: { color: "#fffa66", recess: "#b6a826", label: "Yellow" },
  green: { color: "#269e61", recess: "#17683e", label: "Green" },
  lime: { color: "#9be92f", recess: "#61941d", label: "Lime" },
  orange: { color: "#ffae24", recess: "#b85a05", label: "Orange" },
  purple: { color: "#a628da", recess: "#621087", label: "Purple" },
  brown: { color: "#9b502b", recess: "#64301c", label: "Brown" },
  pink: { color: "#ffaae3", recess: "#c04491", label: "Pink" },
  grey: { color: "#bac7d1", recess: "#657684", label: "Light grey" },
  cyan: { color: "#18e5e1", recess: "#087c89", label: "Cyan" },
  black: { color: "#18232e", recess: "#060d14", label: "Black" },
};
