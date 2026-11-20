import { isLevelId } from "./types.ts";
import type { LevelId } from "./types.ts";

export function soloRoute(href: string): LevelId | null {
  const url = new URL(href), level = url.searchParams.get("level");
  return !url.searchParams.has("room") && isLevelId(level) ? level : null;
}
export function soloRouteUrl(href: string, level: LevelId | null) {
  const url = new URL(href);
  if (level && isLevelId(level)) url.searchParams.set("level", level);
  else url.searchParams.delete("level");
  return url.href;
}
