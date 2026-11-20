import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Billboard } from "@react-three/drei";
import { Vector3 } from "three";
import type { Group } from "three";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import fontData from "../assets/fonts/helvetiker_bold.typeface.json";

// Local font outlines keep the title truly 3D without a runtime font download.
// MAGENTA licence retained beside the font and in deployed asset credits.
const font = new FontLoader().parse(fontData);
const TITLE_HEIGHT = 6.3;

export default function FloatingTitle({ menu, height = TITLE_HEIGHT, fit = false }: { menu: boolean; height?: number; fit?: boolean }) {
  const { camera, viewport } = useThree();
  const root = useRef<Group>(null);
  const geometry = useMemo(() => new TextGeometry("Screw it!", { font, size: 0.6, depth: 0.12,
    curveSegments: 8, bevelEnabled: true, bevelSize: 0.009, bevelThickness: 0.012, bevelSegments: 2,
  }).center(), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame(({ clock, camera }) => {
    if (root.current) {
      // The home canvas is static; its float is a compositor animation. The
      // in-level title follows the scene's existing animation loop.
      root.current.position.set(0, (menu ? TITLE_HEIGHT : height) + (fit ? 0 : Math.sin(clock.elapsedTime * 1.7) * 0.055), 0);
      // Keep the title away from the exposed interior when orbiting above the house.
      root.current.visible = menu || camera.position.y / camera.position.length() < 0.8;
    }
  });
  geometry.computeBoundingBox();
  const width = geometry.boundingBox!.max.x - geometry.boundingBox!.min.x + 0.1;
  const scale = fit ? Math.min(1.15, viewport.getCurrentViewport(camera, new Vector3(0, TITLE_HEIGHT, 0)).width * 0.78 / width) : 1;
  return <group ref={root} name="game-title" scale={scale} position={[0, TITLE_HEIGHT, 0]}>
    <Billboard>
      <mesh geometry={geometry} position={[0.035, -0.04, -0.06]}><meshStandardMaterial color="#ffc34f" roughness={0.5} /></mesh>
      <mesh geometry={geometry}><meshStandardMaterial color={fit ? "#c7a1ff" : "#713db3"} emissive="#51258e" emissiveIntensity={fit ? 0.3 : 0.08} roughness={0.5} /></mesh>
    </Billboard>
  </group>;
}
