import { useLayoutEffect, useMemo, useRef, useState } from "react";
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
import { showPartAppearance } from "../scene/partAppearance";
import { isLooseVisible, loosePartY, SMOKE_DURATION_MS, smokeScale } from "../scene/loosePhysics";
import type { LooseParts } from "../scene/loosePhysics";
import SmokePuff from "./SmokePuff";
function FallingPart({ id, hidden, active, faded, outlined, looseParts, looseNow, onFallFinished, children }: {
  id: PartId; hidden: boolean; active: boolean; onFallFinished: (id: PartId) => void; children: ReactNode;
  faded: boolean; outlined: boolean; looseParts: LooseParts; looseNow: () => number;
}) {
  const root = useRef<Group>(null);
  const surface = useRef<Group>(null);
  const [retired, setRetired] = useState(false);
  const finished = useRef(false);
  const loose = looseParts[id];
  const pivot = PART_PIVOTS[id];
  useLayoutEffect(() => {
    if (surface.current && (faded || outlined)) return showPartAppearance(surface.current, faded, outlined);
  }, [hidden, faded, outlined]);
  useFrame(() => {
    if (!root.current || !loose || retired) return;
    const now = looseNow();
    const visible = isLooseVisible(loose, now);
    root.current.visible = visible;
    if (visible) root.current.position.y = loosePartY(looseParts, id, now);
    if (active && !finished.current && (!visible || now >= loose.startedAt + FALL_DURATION_MS)) {
      finished.current = true;
      onFallFinished(id);
    }
    if (!visible && (!loose.poof || now >= loose.poof.at + SMOKE_DURATION_MS)) setRetired(true);
  });
  if (retired || (hidden && !loose)) return null;
  return <>
    <group ref={root} position={pivot} visible={!loose?.poof}>
      <group ref={surface} name={`part-${id}`} position={[-pivot[0], -pivot[1], -pivot[2]]}
        userData={{ pickBlocker: true, part: id, loose: Boolean(loose) }}>{children}</group>
    </group>
    {loose?.poof && <SmokePuff position={[pivot[0], loose.poof.y, pivot[2]]} startAt={loose.poof.at} now={looseNow} scale={smokeScale(id)} />}
  </>;
}
export default function House({ removedParts, fallingParts, fadedPart, outlinedPart, looseParts, looseNow, onFallFinished }: {
  removedParts: PartId[]; fallingParts: PartId[]; onFallFinished: (id: PartId) => void;
  fadedPart?: PartId; outlinedPart?: PartId; looseParts: LooseParts; looseNow: () => number;
}) {
  const { nodes } = useGLTF(chestUrl, false, false);
  const chest = useMemo(() => Object.fromEntries(CHEST_PART_IDS.map((part) => [part, nodes[part].clone(true)])), [nodes]);
  return <group>
    {PART_IDS.map((part) => <FallingPart key={part} id={part} hidden={removedParts.includes(part)} active={fallingParts.includes(part)}
      faded={part === fadedPart} outlined={part === outlinedPart} looseParts={looseParts} looseNow={looseNow} onFallFinished={onFallFinished}>
      {isChestPart(part) ? <group position={CHEST_ORIGIN}><primitive object={chest[part]} /></group> : MODEL_BATCHES.filter((batch) => batch.part === part).map((batch) => <mesh key={`${batch.color}:${batch.smooth}`} geometry={batch.geometry}>
        <meshStandardMaterial color={batch.color} roughness={0.8} flatShading={!batch.smooth} vertexColors={batch.smooth} />
      </mesh>)}
    </FallingPart>)}
  </group>;
}
