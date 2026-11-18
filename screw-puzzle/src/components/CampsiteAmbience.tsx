import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BufferGeometry, Float32BufferAttribute } from "three";
import type { Points } from "three";
import type { PartId } from "../game/types";

export default function CampsiteAmbience({ removedParts }: { removedParts: readonly PartId[] }) {
  const sparks = useRef<Points>(null);
  const geometry = useMemo(() => {
    const result = new BufferGeometry();
    result.setAttribute("position", new Float32BufferAttribute(new Float32Array(30), 3));
    return result;
  }, []);
  const burning = !removedParts.includes("camp-campfire");
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame(({ clock }) => {
    if (!sparks.current) return;
    sparks.current.visible = burning && !reducedMotion.matches;
    if (!sparks.current.visible) return;
    const positions = geometry.getAttribute("position");
    for (let i = 0; i < positions.count; i += 1) {
      const phase = (clock.elapsedTime * .28 + i * .137) % 1;
      const angle = i * 2.4 + clock.elapsedTime * .4;
      positions.setXYZ(i, Math.sin(angle) * phase * .18, .32 + phase * 1.25, Math.cos(angle) * phase * .18);
    }
    positions.needsUpdate = true;
  });
  return <points ref={sparks} geometry={geometry} position={[-.65, .3, 1.1]} visible={burning} raycast={() => {}}>
    <pointsMaterial color="#ffcb65" size={.035} transparent opacity={.65} depthWrite={false} toneMapped={false} />
  </points>;
}
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
