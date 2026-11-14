import { GLYPHS } from "./lettering";
export default function PixelWord({ text }: { text: string }) {
  const lines = text.split("\n");
  const width = Math.max(...lines.map((line) => line.length * 6 - 1));
  return <svg className="pixel-word" viewBox={`-0.3 -0.3 ${width + 0.6} ${lines.length * 9 - 2 + 0.6}`} aria-hidden="true">
    {lines.flatMap((line, lineIndex) => [...line].flatMap((letter, x) => (GLYPHS[letter] ?? []).flatMap((row, y) => [...row].flatMap((value, pixel) => value === "1" ?
      [<rect key={`${lineIndex}-${x}-${y}-${pixel}`} x={(width - (line.length * 6 - 1)) / 2 + x * 6 + pixel} y={lineIndex * 9 + y} width={1.02} height={1.02} />] : []))))}
  </svg>;
}
