import { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import type { Group } from "three";
import { Quaternion, Vector3 } from "three";
import { SCREW_SCALE } from "../game/screwScale";
import { SCREW_PULL_DISTANCE } from "../scene/screwDimensions";
import { headGeometry, recessGeometry, shaftGeometry } from "./screwGeometry";

type ScrewProps = {
  position: [number, number, number];
  normal: [number, number, number];
  color: string;
  recessColor: string;
  removing: boolean;
  selectable: boolean;
  onClick: (event: ThreeEvent<MouseEvent>) => void;
};

const REMOVE_DURATION = 0.7;

export default function Screw({ position, normal, color, recessColor, removing, selectable, onClick }: ScrewProps) {
  const movingPart = useRef<Group>(null);
  const elapsed = useRef(0);
  const completed = useRef(false);
  const [finished, setFinished] = useState(false);
  const orientation = useMemo(() => new Quaternion().setFromUnitVectors(
    new Vector3(0, 0, 1), new Vector3(...normal).normalize()
  ), [normal]);

  useFrame((_, delta) => {
    if (!removing || !movingPart.current || completed.current) return;
    elapsed.current += delta;
    const progress = Math.min(elapsed.current / REMOVE_DURATION, 1);
    movingPart.current.rotation.z = progress * Math.PI * 6;
    movingPart.current.position.z = progress * SCREW_PULL_DISTANCE;
    movingPart.current.scale.setScalar(1 - Math.max(0, (progress - 0.8) / 0.2));
    if (progress === 1) {
      completed.current = true;
      setFinished(true);
    }
  });

  if (finished) return null;

  return (
    <group position={position} quaternion={orientation} scale={SCREW_SCALE}>
      <group ref={movingPart}>
        {/* Only the head is pickable; shafts and tips never accept clicks. */}
        <group onClick={selectable ? onClick : undefined}>
          <mesh geometry={headGeometry}>
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.12} metalness={0.1} roughness={0.35} />
          </mesh>
          <mesh geometry={recessGeometry}>
            <meshStandardMaterial color={recessColor} roughness={0.8} />
          </mesh>
        </group>
        <mesh geometry={shaftGeometry}>
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.12} metalness={0.15} roughness={0.35} />
        </mesh>
      </group>
    </group>
  );
}
