// Read-only compatibility for wins saved before completion badges existed.
// Device leaderboards are retired: never append, rank or display these times.
export function readLegacyCottageClear(): boolean {
  for (const key of ["screw-it:solo-times:cottage:v1", "screw-it:solo-times:cottage:v2"]) {
    try {
      const values: unknown = JSON.parse(window.localStorage.getItem(key) ?? "[]");
      if (Array.isArray(values) && values.some(value => value && typeof value.elapsedMs === "number" &&
        Number.isFinite(value.elapsedMs) && value.elapsedMs > 0)) return true;
    } catch { /* Completion compatibility is optional when storage is unavailable. */ }
  }
  return false;
}
