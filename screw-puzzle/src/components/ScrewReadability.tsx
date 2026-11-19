import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { CanvasTexture, DoubleSide, InstancedBufferAttribute, InstancedMesh, Matrix4, PlaneGeometry, RingGeometry, ShaderMaterial } from "three";
import type { RefObject } from "react";
import { COLOR_CODES } from "../game/colorLabels";
import { SCREW_COLOR_ORDER } from "../game/types";
import type { GameState } from "../game/types";
import { useReadability } from "./readability";

// Four extra instanced draws at most. Labels/outlines use the head's animated
// matrix and normal depth testing: covered screws never show through a wall.
export default function ScrewReadability({ game, head }: { game: GameState; head: RefObject<InstancedMesh | null> }) {
  const settings = useReadability();
  const [screws] = useState(() => game.screws);
  const outer = useRef<InstancedMesh>(null), inner = useRef<InstancedMesh>(null), labels = useRef<InstancedMesh>(null);
  const resources = useMemo(() => {
    const canvas = document.createElement("canvas"); canvas.width = 128 * SCREW_COLOR_ORDER.length; canvas.height = 128;
    const context = canvas.getContext("2d")!;
    SCREW_COLOR_ORDER.forEach((color, index) => {
      const x = index * 128;
      context.fillStyle = "#fff9e5"; context.beginPath(); context.roundRect(x + 3, 24, 122, 80, 18); context.fill();
      context.fillStyle = "#172231"; context.font = "900 64px Arial"; context.textAlign = "center"; context.textBaseline = "middle";
      context.fillText(COLOR_CODES[color], x + 64, 67);
    });
    const texture = new CanvasTexture(canvas);
    const plane = new PlaneGeometry(.40, .40); plane.translate(0, 0, .174);
    plane.setAttribute("code", new InstancedBufferAttribute(Float32Array.from(screws, (screw) => SCREW_COLOR_ORDER.indexOf(screw.color)), 1));
    const material = new ShaderMaterial({ uniforms: { atlas: { value: texture } }, transparent: true, side: DoubleSide,
      vertexShader: `attribute float code; varying vec2 vUv; void main(){ vUv=vec2((uv.x+code)/12.,uv.y); gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.); }`,
      fragmentShader: `uniform sampler2D atlas; varying vec2 vUv; void main(){ vec4 c=texture2D(atlas,vUv); if(c.a<.5)discard; gl_FragColor=c; }`,
    });
    const white = new RingGeometry(.245, .286, 32); white.translate(0, 0, .162);
    const dark = new RingGeometry(.231, .249, 32); dark.translate(0, 0, .166);
    return { texture, plane, material, white, dark };
  }, [screws]);
  useEffect(() => () => { Object.values(resources).forEach((resource) => resource.dispose()); }, [resources]);
  const matrix = useMemo(() => new Matrix4(), []);
  function sync() {
    if (!head.current || (!settings.outlines && !settings.labels)) return;
    for (let i = 0; i < game.screws.length; i++) {
      head.current.getMatrixAt(i, matrix);
      for (const mesh of [outer.current, inner.current, labels.current]) mesh?.setMatrixAt(i, matrix);
    }
    for (const mesh of [outer.current, inner.current, labels.current]) if (mesh) mesh.instanceMatrix.needsUpdate = true;
  }
  useLayoutEffect(sync);
  useFrame(sync);
  return <group>
    {settings.outlines && <>
      <instancedMesh ref={outer} args={[resources.white, undefined, game.screws.length]} frustumCulled={false} raycast={() => {}}><meshBasicMaterial color="#fffbe8" side={DoubleSide} /></instancedMesh>
      <instancedMesh ref={inner} args={[resources.dark, undefined, game.screws.length]} frustumCulled={false} raycast={() => {}}><meshBasicMaterial color="#172231" side={DoubleSide} /></instancedMesh>
    </>}
    {settings.labels && <instancedMesh ref={labels} args={[resources.plane, resources.material, game.screws.length]} frustumCulled={false} raycast={() => {}} />}
  </group>;
}
