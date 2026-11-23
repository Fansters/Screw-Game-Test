export type Preferences = { uiScale: number; rotation: number; zoom: number };
export const DEFAULT_PREFERENCES: Preferences = { uiScale: 1, rotation: 1, zoom: 1 };
export function checkedPreferences(value: unknown): Preferences {
  const v = value as Partial<Preferences> | null;
  const clamp = (n: unknown, min: number, max: number) => typeof n === "number" && Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : 1;
  return { uiScale: clamp(v?.uiScale,.85,1.15), rotation: clamp(v?.rotation,.4,1.6), zoom: clamp(v?.zoom,.4,1.6) };
}
