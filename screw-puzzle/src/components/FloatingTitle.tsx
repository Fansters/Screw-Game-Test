import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard } from "@react-three/drei";
import { BoxGeometry } from "three";
import type { Group } from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { GLYPHS } from "./lettering";

// Original block-letter glyphs create real extruded geometry without a remote font.

export default function FloatingTitle({ menu }: { menu: boolean }) {
  const root = useRef<Group>(null);
  const geometry = useMemo(() => {
    const pieces: BoxGeometry[] = [];
    ["SCREW", "COTTAGE"].forEach((word, line) => {
      const unit = 0.075;
      const width = (word.length * 6 - 1) * unit;
      [...word].forEach((letter, column) => GLYPHS[letter].forEach((row, y) => [...row].forEach((pixel, x) => {
        if (pixel === "1") pieces.push(new BoxGeometry(unit * 1.02, unit * 1.02, 0.11)
          .translate(column * 6 * unit + x * unit - width / 2, (6 - y) * unit - line * 0.63, 0));
      })));
    });
    const merged = mergeGeometries(pieces)!;
    pieces.forEach((piece) => piece.dispose());
    return merged;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame(({ clock, camera }) => {
    if (root.current) {
      root.current.position.set(0, 6 + Math.sin(clock.elapsedTime * 1.7) * 0.055, 0);
      // Keep the title away from the exposed interior when orbiting above the house.
      root.current.visible = menu || camera.position.y / camera.position.length() < 0.8;
    }
  });
  return <group ref={root} position={[0, 6, 0]}>
    <Billboard>
      <mesh geometry={geometry} position={[0.035, -0.04, -0.06]}><meshStandardMaterial color="#ffc34f" roughness={0.5} /></mesh>
      <mesh geometry={geometry}><meshStandardMaterial color="#713db3" emissive="#51258e" emissiveIntensity={0.08} roughness={0.5} /></mesh>
    </Billboard>
  </group>;
}
