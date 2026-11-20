import { Color, SRGBColorSpace } from "three";

const cache = new Map<string, string>();
// Grade authored surface colours in sRGB: richer paints/foliage, with snow,
// porcelain, neutrals and near-black details retaining their original balance.
export function levelMaterialColor(source: string) {
  const saved = cache.get(source);
  if (saved) return saved;
  const color = new Color(source), hsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl, SRGBColorSpace);
  if (hsl.s > 0.15 && hsl.l > 0.16 && hsl.l < 0.87) {
    color.setHSL(hsl.h, Math.min(0.96, hsl.s * 1.3), Math.max(0.12, 0.5 + (hsl.l - 0.5) * 1.05 - 0.035), SRGBColorSpace);
  }
  const result = `#${color.getHexString(SRGBColorSpace)}`;
  cache.set(source, result);
  return result;
}
