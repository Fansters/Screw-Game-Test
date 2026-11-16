import { Suspense, useEffect, useEffectEvent, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import type { MutableRefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Billboard, PerspectiveCamera } from "@react-three/drei";
import { Vector3 } from "three";
import type { Group } from "three";
import type { GameState, PartId, Screw } from "../game/types";
import { PART_LABELS } from "../game/types";
import { SCREW_SCALE } from "../game/levels";
import { pickSceneTarget } from "../scene/picking";
import { createScrewGestures } from "../scene/screwGestures";
import { isScrewAccessible } from "../game/rules";
import { findScrewObstructions } from "../scene/obstructions";
import { settledParts } from "../animation/run";
import House from "./House";
import ScrewField from "./ScrewField";
import FloatingTitle from "./FloatingTitle";
import CameraRig from "./CameraRig";
import { TITLE_CAMERA } from "../scene/camera";
import type { CameraView } from "../scene/camera";

type GameSceneProps = { logical: GameState; fallingParts: PartId[]; round: number; playable: boolean;
  orbitable?: boolean;
  fallStarts?: Partial<Record<PartId, number>>;
  pingMode?: boolean; pingScrew?: Screw; pingSequence?: number; onScrewPing?: (id: string) => void;
  rejectedScrew?: { screw: string; sequence: number } | null;
  view: CameraView; onCameraArrive: (view: CameraView, round: number) => void;
  onReady: (round: number) => void;
  onFallFinished: (part: PartId, round: number) => void;
  onScrewSelect: (id: string, clearedParts?: readonly PartId[]) => void;
  onBlockedScrew: () => void;
  projectorRef: MutableRefObject<(id: string) => [number, number]> };
function PingMarker({ screw }: { screw: Screw }) {
  const ring = useRef<Group>(null);
  const elapsed = useRef(0);
  useFrame((_, delta) => {
    if (!ring.current || reducedMotion.matches) return;
    elapsed.current += delta;
    ring.current.scale.setScalar(1 + 0.17 * Math.sin(elapsed.current * 2 * Math.PI / 0.9));
  });
  const center = new Vector3(...screw.position).addScaledVector(new Vector3(...screw.normal), SCREW_SCALE * 0.144);
  return <Billboard position={center}>
    <group ref={ring}>
      <mesh renderOrder={20} raycast={() => {}}>
        <ringGeometry args={[0.165, 0.305, 40]} />
        <meshBasicMaterial color="#fff7f3" toneMapped={false} depthTest={false} depthWrite={false} />
      </mesh>
      <mesh renderOrder={21} raycast={() => {}}>
        <ringGeometry args={[0.19, 0.28, 40]} />
        <meshBasicMaterial color="#f01836" toneMapped={false} depthTest={false} depthWrite={false} />
      </mesh>
    </group>
  </Billboard>;
}
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const PREVIEW_HOLD_MS = 420;
type PartPreview = { part: PartId; round: number; x: number; y: number };

function SceneContents({ logical, fallingParts, fallStarts, round, playable, orbitable, pingMode, pingScrew, pingSequence, onScrewPing, rejectedScrew,
  view, onCameraArrive, onReady, onFallFinished, onScrewSelect, onBlockedScrew, projectorRef, outlinedPart, onPreview }: GameSceneProps & {
    outlinedPart?: PartId; onPreview: (preview: PartPreview | null) => void;
  }) {
  const { camera, gl, scene, size } = useThree();
  const [gestures] = useState(createScrewGestures);
  const [fade, setFade] = useState<{ part: PartId; round: number } | null>(null);
  const wiggle = useRef<(id: string) => void>(() => {});
  useEffect(() => {
    if (rejectedScrew) wiggle.current(rejectedScrew.screw);
  }, [rejectedScrew]);
  useEffect(() => {
    let active = true;
    let frameId = 0;
    // All covered meshes are present too: warm every shader before exposing Start.
    void gl.compileAsync(scene, camera).then(() => {
      if (active) frameId = requestAnimationFrame(() => {
        gl.render(scene, camera);
        if (import.meta.env.DEV) console.debug(`Level render: ${gl.info.render.calls} draws`);
        onReady(round);
      });
    });
    return () => { active = false; cancelAnimationFrame(frameId); };
  }, [camera, gl, scene, round, onReady]);
  useLayoutEffect(() => {
    projectorRef.current = (id) => {
      const screw = logical.screws.find((candidate) => candidate.id === id);
      if (!screw) return [0, 0];
      const projected = new Vector3(...screw.position).addScaledVector(new Vector3(...screw.normal), SCREW_SCALE * 0.144).project(camera);
      const rect = gl.domElement.getBoundingClientRect();
      return [rect.left + (projected.x + 1) * rect.width / 2, rect.top + (1 - projected.y) * rect.height / 2];
    };
  }, [projectorRef, logical.screws, camera, gl]);
  const visible = { ...logical, removedParts: settledParts({ logical, fallingParts }) };
  const fadedPart = view === "house" && logical.status === "playing" && fade?.round === round && !logical.removedParts.includes(fade.part)
    ? fade.part : undefined;
  function attempt(id: string) {
    if (!playable) return;
    const screw = logical.screws.find((candidate) => candidate.id === id);
    if (!screw || screw.removed) return;
    if (pingMode) {
      onScrewPing?.(id);
      return;
    }
    if (fallStarts) {
      if (isScrewAccessible(visible, screw)) onScrewSelect(id);
      else blocked();
      return;
    }
    const clearedParts: PartId[] = [];
    for (const fallingPart of fallingParts) {
      const cover = scene.getObjectByName(`part-${fallingPart}`);
      if (!cover) continue;
      if (findScrewObstructions(screw, SCREW_SCALE, { root: cover, part: fallingPart }).length) {
        blocked();
        return;
      }
      clearedParts.push(fallingPart);
    }
    if (isScrewAccessible({ ...visible, removedParts: [...visible.removedParts, ...clearedParts] }, screw)) onScrewSelect(id, clearedParts);
    else blocked();

    function blocked() {
      wiggle.current(id);
      onBlockedScrew();
    }
  }
  function targetAt(event: PointerEvent) {
    const rect = gl.domElement.getBoundingClientRect();
    const { clientX: x, clientY: y } = event;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) return null;
    const radius = pingMode || event.pointerType === "touch" || event.pointerType === "pen" ? 22 : 0;
    return pickSceneTarget(scene, camera, rect, [x, y], visible, radius, pingMode ? undefined : fadedPart);
  }
  const pickTap = useEffectEvent((event: PointerEvent) => {
    if (!playable) return;
    const target = targetAt(event);
    if (target?.kind === "screw") attempt(target.id);
    if (target?.kind === "part" && !pingMode && !logical.removedParts.includes(target.id)) {
      setFade((current) => current?.round === round && current.part === target.id ? null : { part: target.id, round });
    }
  });
  const startGesture = useEffectEvent((event: PointerEvent) => {
    return gestures.start(event, playable && event.target === gl.domElement) && !pingMode;
  });
  const previewHold = useEffectEvent((event: PointerEvent) => {
    if (!playable || pingMode) return false;
    const target = targetAt(event);
    const part = target?.kind === "screw" ? logical.screws.find((screw) => screw.id === target.id)?.attachedTo : undefined;
    if (!part || logical.removedParts.includes(part) || !gestures.hold(event.pointerId)) return false;
    onPreview({ part, round, x: event.clientX, y: event.clientY });
    return true;
  });
  useEffect(() => {
    const canvas = gl.domElement;
    const doc = canvas.ownerDocument;
    const listeners = new AbortController();
    const options = { capture: true, signal: listeners.signal };
    let holdTimer: number | undefined;
    let showingPreview = false;
    function cancelHold() {
      window.clearTimeout(holdTimer);
      if (showingPreview) onPreview(null);
      showingPreview = false;
    }
    // Watch the whole document so a second finger landing outside the canvas cancels a tap.
    doc.addEventListener("pointerdown", (event) => {
      cancelHold();
      if (startGesture(event)) holdTimer = window.setTimeout(() => { showingPreview = previewHold(event); }, PREVIEW_HOLD_MS);
    }, options);
    doc.addEventListener("pointermove", (event) => {
      if (gestures.move(event)) cancelHold();
    }, options);
    doc.addEventListener("pointerup", (event) => {
      cancelHold();
      if (gestures.release(event, event.target === canvas)) pickTap(event);
    }, options);
    doc.addEventListener("pointercancel", (event) => {
      cancelHold();
      gestures.cancel(event.pointerId);
    }, options);
    // Moving focus from a HUD button onto the canvas is part of the tap.
    doc.defaultView?.addEventListener("blur", () => {
      cancelHold();
      gestures.reset();
    }, { signal: listeners.signal });
    return () => {
      listeners.abort();
      cancelHold();
      gestures.reset();
    };
  }, [gl, gestures, playable, round, onPreview]);
  return <>
    <PerspectiveCamera makeDefault position={TITLE_CAMERA} fov={42} near={0.1} far={65} zoom={Math.min(1, size.width / size.height / 0.85)} />
    <ambientLight intensity={0.8} /><hemisphereLight args={["#fff5df", "#91aab4", 1.25]} />
    <directionalLight position={[5, 10, 7]} intensity={2.2} /><directionalLight position={[-6, 5, -5]} intensity={1.2} color="#d7eeff" />
    <FloatingTitle menu={view === "title"} />
    <House key={`house-${round}`} removedParts={visible.removedParts} fallingParts={fallingParts} fallStarts={fallStarts}
      outlinedPart={outlinedPart} fadedPart={fadedPart} onFallFinished={(part) => onFallFinished(part, round)} />
    <ScrewField key={`screws-${round}`} game={visible} wiggleRef={wiggle} />
    {pingScrew && <PingMarker key={pingSequence} screw={pingScrew} />}
    <CameraRig view={view} round={round} playable={orbitable ?? playable} onArrive={onCameraArrive} />
  </>;
}
export default function GameScene(props: GameSceneProps) {
  const phone = useSyncExternalStore(subscribeMobile, isMobile);
  const [preview, setPreview] = useState<PartPreview | null>(null);
  const activePreview = props.playable && preview?.round === props.round && !props.logical.removedParts.includes(preview.part) ? preview : null;
  const remaining = activePreview ? props.logical.screws.filter((screw) => screw.attachedTo === activePreview.part && !screw.removed).length : 0;
  return <section className="scene" aria-label="3D puzzle for Screw it!">
    <Canvas dpr={[1, phone ? 1.25 : 1.5]} camera={{ position: TITLE_CAMERA, fov: 42, near: 0.1, far: 65 }}>
      <Suspense fallback={null}><SceneContents {...props} outlinedPart={activePreview?.part} onPreview={setPreview} /></Suspense>
    </Canvas>
    {activePreview && <output className="part-preview" style={{
      left: `clamp(115px, ${activePreview.x}px, calc(100vw - 115px))`, top: Math.max(72, activePreview.y - 24),
    }}>
      <strong>{PART_LABELS[activePreview.part]}</strong>
      <span>{remaining} {remaining === 1 ? "screw" : "screws"} left</span>
    </output>}
  </section>;
}
const mobileQuery = window.matchMedia("(pointer: coarse), (max-width: 650px)");
function isMobile() { return mobileQuery.matches; }
function subscribeMobile(callback: () => void) { mobileQuery.addEventListener("change", callback); return () => mobileQuery.removeEventListener("change", callback); }
