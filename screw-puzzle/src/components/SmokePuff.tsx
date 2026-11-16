import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Object3D } from "three";
import type { InstancedMesh, MeshBasicMaterial } from "three";
import { SMOKE_DURATION_MS } from "../scene/loosePhysics";
import type { Vector } from "../scene/houseModel";

const PUFF_COUNT = 8;

export default function SmokePuff({ position, startAt, now, scale }: { position: Vector; startAt: number; now: () => number; scale: number }) {
  const mesh = useRef<InstancedMesh>(null);
  const material = useRef<MeshBasicMaterial>(null);
  const transform = useMemo(() => new Object3D(), []);
  useFrame(() => {
    if (!mesh.current || !material.current) return;
    const t = (now() - startAt) / SMOKE_DURATION_MS;
    mesh.current.visible = t >= 0 && t < 1;
    if (!mesh.current.visible) return;
    material.current.opacity = 0.75 * (1 - t) ** 1.6;
    for (let index = 0; index < PUFF_COUNT; index += 1) {
      const angle = index * Math.PI * 2 / PUFF_COUNT;
      const spread = (0.12 + t * 0.46) * (1 + (index % 3) * 0.17);
      transform.position.set(Math.cos(angle) * spread, t * 0.55 + (index % 3) * 0.065, Math.sin(angle) * spread);
      transform.scale.setScalar((0.14 + t * 0.23) * (1 + (index % 2) * 0.3));
      transform.updateMatrix();
      mesh.current.setMatrixAt(index, transform.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh name="loose-smoke" ref={mesh} args={[undefined, undefined, PUFF_COUNT]} position={position} scale={scale}
    visible={false} frustumCulled={false} raycast={() => {}}>
    <icosahedronGeometry args={[1, 1]} />
    <meshBasicMaterial ref={material} color="#f8eee6" transparent opacity={0} depthWrite={false} />
  </instancedMesh>;
}
