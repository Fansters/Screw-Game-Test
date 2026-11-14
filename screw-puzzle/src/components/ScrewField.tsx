import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import { Color, Object3D, Quaternion, Vector3 } from "three";
import type { InstancedMesh } from "three";
import type { GameState } from "../game/types";
import { SCREW_COLORS } from "../game/colors";
import { SCREW_SCALE } from "../game/levels";
import { SCREW_PULL_DISTANCE } from "../scene/screwDimensions";
import { headGeometry, recessGeometry, shaftGeometry } from "./screwGeometry";

// All screws stay resident, including concealed ones. Three instanced draws replace
// per-screw draws; instance IDs still identify each independently pickable head.
export default function ScrewField({ game, playable, onPick, wiggleRef }: {
  game: GameState; playable: boolean; onPick: (id: string, event: ThreeEvent<MouseEvent>) => void;
  wiggleRef: MutableRefObject<(id: string) => void>;
}) {
  const head = useRef<InstancedMesh>(null);
  const recess = useRef<InstancedMesh>(null);
  const shaft = useRef<InstancedMesh>(null);
  // The field is keyed by round. Taking one initial snapshot prevents later moves
  // from resetting resident matrices or replaying finished spin-outs.
  const [poses] = useState(() => game.screws.map((screw) => ({
    id: screw.id, color: screw.color,
    position: new Vector3(...screw.position), normal: new Vector3(...screw.normal),
    orientation: new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), new Vector3(...screw.normal)),
  })));
  const count = poses.length;
  const [initialElapsed] = useState(() => Float64Array.from(game.screws, (screw) => screw.removed ? 0.7 : -1));
  const elapsed = useRef(initialElapsed);
  const wiggles = useRef(new Float64Array(count).fill(-1));
  const transform = useMemo(() => new Object3D(), []);
  const twist = useMemo(() => new Quaternion(), []);
  const axis = useMemo(() => new Vector3(0, 0, 1), []);
  const ids = useMemo(() => poses.map((pose) => pose.id), [poses]);
  const meshRefs = useRef([head, recess, shaft]);
  useLayoutEffect(() => {
    wiggleRef.current = (id) => {
      const index = poses.findIndex((pose) => pose.id === id);
      if (index >= 0) wiggles.current[index] = 0;
    };
    return () => { wiggleRef.current = () => {}; };
  }, [poses, wiggleRef]);

  useLayoutEffect(() => {
    const tint = new Color();
    for (let index = 0; index < count; index += 1) {
      const pose = poses[index];
      transform.position.copy(pose.position); transform.quaternion.copy(pose.orientation);
      transform.scale.setScalar(initialElapsed[index] >= 0.7 ? 0 : SCREW_SCALE);
      transform.updateMatrix();
      for (const ref of meshRefs.current) ref.current?.setMatrixAt(index, transform.matrix);
      const palette = SCREW_COLORS[pose.color];
      head.current?.setColorAt(index, tint.set(palette.color));
      shaft.current?.setColorAt(index, tint.set(palette.color));
      recess.current?.setColorAt(index, tint.set(palette.recess));
    }
    for (const ref of meshRefs.current) { const mesh = ref.current; if (mesh) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
    } }
  }, [count, poses, transform, initialElapsed]);

  useFrame((_, delta) => {
    let dirty = false;
    for (let index = 0; index < count; index += 1) {
      const pose = poses[index];
      if (game.screws[index].removed) {
        if (elapsed.current[index] >= 0.7) continue;
        elapsed.current[index] = Math.min(0.7, Math.max(0, elapsed.current[index]) + delta);
        const t = elapsed.current[index] / 0.7;
        transform.position.copy(pose.position).addScaledVector(pose.normal, SCREW_SCALE * SCREW_PULL_DISTANCE * t);
        twist.setFromAxisAngle(axis, t * Math.PI * 6);
        transform.quaternion.copy(pose.orientation).multiply(twist);
        transform.scale.setScalar(SCREW_SCALE * (1 - Math.max(0, (t - 0.8) / 0.2)));
      } else {
        if (wiggles.current[index] < 0) continue;
        wiggles.current[index] = Math.min(0.34, wiggles.current[index] + delta);
        const t = wiggles.current[index] / 0.34;
        const bounce = Math.sin(t * Math.PI * 6) * (1 - t);
        transform.position.copy(pose.position).addScaledVector(pose.normal, 0.035 * bounce);
        twist.setFromAxisAngle(axis, bounce * 0.15);
        transform.quaternion.copy(pose.orientation).multiply(twist);
        transform.scale.setScalar(SCREW_SCALE);
        if (t === 1) wiggles.current[index] = -1;
      }
      transform.updateMatrix();
      for (const ref of meshRefs.current) ref.current?.setMatrixAt(index, transform.matrix);
      dirty = true;
    }
    if (dirty) {
      if (head.current) head.current.instanceMatrix.needsUpdate = true;
      if (recess.current) recess.current.instanceMatrix.needsUpdate = true;
      if (shaft.current) shaft.current.instanceMatrix.needsUpdate = true;
    }
  });
  function pick(event: ThreeEvent<MouseEvent>) {
    // Even an inaccessible/removed head blocks rays from reaching screws behind it.
    event.stopPropagation();
    const screw = event.instanceId === undefined ? undefined : game.screws[event.instanceId];
    if (playable && screw && !screw.removed) onPick(screw.id, event);
  }
  const metadata = { screwIds: ids };
  return <group>
    <instancedMesh ref={head} args={[headGeometry, undefined, count]} userData={metadata} onClick={pick} frustumCulled={false}>
      <meshStandardMaterial metalness={0.1} roughness={0.35} />
    </instancedMesh>
    <instancedMesh ref={recess} args={[recessGeometry, undefined, count]} userData={metadata} onClick={pick} frustumCulled={false}>
      <meshStandardMaterial roughness={0.8} />
    </instancedMesh>
    <instancedMesh ref={shaft} args={[shaftGeometry, undefined, count]} userData={{ pickBlocker: true }} frustumCulled={false}>
      <meshStandardMaterial metalness={0.15} roughness={0.35} />
    </instancedMesh>
  </group>;
}
