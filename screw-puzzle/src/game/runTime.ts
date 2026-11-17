export function formatRunTime(elapsedMs: number, precise = false) {
  const ms = Math.max(0, precise ? Math.round(elapsedMs) : Math.floor(elapsedMs));
  const minutes = Math.floor(ms / 60_000).toString().padStart(2, "0");
  const seconds = Math.floor(ms / 1000 % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}${precise ? `.${(ms % 1000).toString().padStart(3, "0")}` : ""}`;
}
