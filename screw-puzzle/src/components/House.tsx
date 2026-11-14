import { useMemo, useRef } from "react";
import type { ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import type { Group } from "three";
import { CHEST_PART_IDS, PART_IDS } from "../game/types";
import type { PartId } from "../game/types";
import { PART_PIVOTS } from "../scene/houseModel";
import { MODEL_BATCHES } from "../scene/modelBatches";
import { CHEST_ORIGIN, isChestPart } from "../scene/chestModel";
import chestUrl from "../assets/treasure_chest_parts.glb?url";
import { FALL_DURATION_MS } from "../game/fallTiming";
const FALL_SECONDS = FALL_DURATION_MS / 1000;

function FallingPart({ id, hidden, active, startAt, onFallFinished, children }: {
  id: PartId; hidden: boolean; active: boolean; startAt?: number; onFallFinished: (id: PartId) => void; children: ReactNode;
}) {
  const root = useRef<Group>(null);
  const elapsed = useRef(0);
  const pivot = PART_PIVOTS[id];
  useFrame((_, delta) => {
    if (!root.current || !active || hidden || elapsed.current >= FALL_SECONDS) return;
    const seconds = startAt === undefined ? elapsed.current + delta : (Date.now() - startAt) / 1000;
    if (seconds <= 0) return;
    elapsed.current = Math.min(seconds, FALL_SECONDS);
    const t = elapsed.current / FALL_SECONDS;
    const side = pivot[0] < 0 ? -1 : 1;
    const lid = id === "chest-lid";
    root.current.position.set(pivot[0] + side * 1.7 * t, pivot[1] + (lid ? 0.42 : 0.15) * Math.sin(t * Math.PI) - 2.8 * t * t, pivot[2] + 0.65 * t);
    root.current.rotation.set(t * (lid ? -0.9 : 0.7), t * 0.25, -side * t * 0.7);
    root.current.scale.setScalar(1 - Math.max(0, (t - 0.65) / 0.35));
    if (t === 1) onFallFinished(id);
  });
  if (hidden) return null;
  return <group ref={root} position={pivot}><group name={`part-${id}`} position={[-pivot[0], -pivot[1], -pivot[2]]}>{children}</group></group>;
}
export default function House({ removedParts, fallingParts, fallStarts, onFallFinished }: {
  removedParts: PartId[]; fallingParts: PartId[]; fallStarts?: Partial<Record<PartId, number>>; onFallFinished: (id: PartId) => void;
}) {
  const { nodes } = useGLTF(chestUrl, false, false);
  const chest = useMemo(() => Object.fromEntries(CHEST_PART_IDS.map((part) => [part, nodes[part].clone(true)])), [nodes]);
  return <group userData={{ pickBlocker: true }} onClick={(event) => event.stopPropagation()}>
    {PART_IDS.map((part) => <FallingPart key={part} id={part} hidden={removedParts.includes(part)} active={fallingParts.includes(part)} startAt={fallStarts?.[part]}
      onFallFinished={onFallFinished}>
      {isChestPart(part) ? <group position={CHEST_ORIGIN}><primitive object={chest[part]} /></group> : MODEL_BATCHES.filter((batch) => batch.part === part).map((batch) => <mesh key={batch.color} geometry={batch.geometry}>
        <meshStandardMaterial color={batch.color} roughness={0.8} flatShading />
      </mesh>)}
    </FallingPart>)}
  </group>;
}
