import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import type { LevelId } from "../game/campaign";
import type { PartId } from "../game/types";
import { LEVEL_MODELS, partPivot } from "../scene/levelModels";
import { modelBatches } from "../scene/modelBatches";
import { FALL_DURATION_MS } from "../game/fallTiming";
import { showPartAppearance } from "../scene/partAppearance";
import { isLooseVisible, loosePartPose, LOOSE_LIFETIME_MS, SMOKE_DURATION_MS, smokeScale } from "../scene/loosePhysics";
import type { LooseMotion, LooseParts } from "../scene/loosePhysics";
import SmokePuff from "./SmokePuff";
type ReadPhysics = () => { parts: LooseParts; now: number };
function FallingPart({ id, hidden, active, faded, outlined, readPhysics, looseNow, onFallFinished, children }: {
  id: PartId; hidden: boolean; active: boolean; onFallFinished: (id: PartId) => void; children: ReactNode;
  faded: boolean; outlined: boolean; readPhysics: ReadPhysics; looseNow: () => number;
}) {
  const root = useRef<Group>(null);
  const surface = useRef<Group>(null);
  const [retired, setRetired] = useState(false);
  const [smoke, setSmoke] = useState<LooseMotion["poof"]>();
  const finished = useRef(false);
  const pivot = partPivot(id);
  useLayoutEffect(() => {
    if (surface.current && (faded || outlined)) return showPartAppearance(surface.current, faded, outlined);
  }, [hidden, faded, outlined]);
  useFrame(() => {
    if (!root.current || !hidden || retired) return;
    const { parts, now } = readPhysics();
    const loose = parts[id];
    if (!loose) {
      root.current.visible = false;
      if (active && !finished.current) {
        finished.current = true;
        onFallFinished(id);
      }
      setRetired(true);
      return;
    }
    const { position, rotation } = loosePartPose(id, loose, now);
    const visible = isLooseVisible(loose, now, position[1]);
    root.current.visible = visible;
    if (visible) {
      root.current.position.set(...position);
      root.current.quaternion.set(...rotation).normalize();
    }
    if (active && !finished.current && (!visible || now >= loose.releasedAt + FALL_DURATION_MS)) {
      finished.current = true;
      onFallFinished(id);
    }
    const end = loose.poof?.at ?? loose.releasedAt + LOOSE_LIFETIME_MS;
    if (now >= end + SMOKE_DURATION_MS) setRetired(true);
    else if (loose.poof && now >= end && !smoke) setSmoke(loose.poof);
  });
  if (retired) return null;
  return <>
    <group ref={root} position={pivot}>
      <group ref={surface} name={`part-${id}`} position={[-pivot[0], -pivot[1], -pivot[2]]}
        userData={{ pickBlocker: true, part: id, loose: hidden }}>{children}</group>
    </group>
    {smoke && <SmokePuff position={smoke.position} startAt={smoke.at} now={looseNow} scale={smokeScale(id)} />}
  </>;
}
export default function House({ level, removedParts, fallingParts, fadedPart, outlinedPart, readPhysics, looseNow, onFallFinished }: {
  level: LevelId; removedParts: PartId[]; fallingParts: PartId[]; onFallFinished: (id: PartId) => void;
  fadedPart?: PartId; outlinedPart?: PartId; readPhysics: ReadPhysics; looseNow: () => number;
}) {
  const parts: readonly PartId[] = LEVEL_MODELS[level].parts;
  const batchesByPart = useMemo(() => {
    const batches = modelBatches(level);
    return new Map(parts.map((part) => [part, batches.filter((batch) => batch.part === part)]));
  }, [level, parts]);
  return <group>
    {parts.map((part) => <FallingPart key={part} id={part} hidden={removedParts.includes(part)} active={fallingParts.includes(part)}
      faded={part === fadedPart} outlined={part === outlinedPart} readPhysics={readPhysics} looseNow={looseNow} onFallFinished={onFallFinished}>
      {batchesByPart.get(part)!.map((batch) => <mesh key={`${batch.color}:${batch.smooth}`} geometry={batch.geometry}>
        <meshStandardMaterial color={batch.color} roughness={part.startsWith("ship-water-") ? 0.24 : 0.8}
          emissive={part.startsWith("fair-") && batch.color === "#fff3a0" ? "#ffe488" : part.startsWith("desert-") && batch.color === "#ffc546" ? "#eaa22d" : part === "camp-campfire" ? "#d96212" : /^camp-(lantern-|stump-lantern)/.test(part) && batch.color === "#f9d47a" ? "#b78424" : "#000000"}
          emissiveIntensity={.25}
          flatShading={!batch.smooth} vertexColors={batch.smooth} />
      </mesh>)}
    </FallingPart>)}
  </group>;
}
