import { useEffect, useEffectEvent, useLayoutEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Vector3 } from "three";
import { CAMERA_POSES, PLAY_CAMERA_POSES, recenterZoomOut, TITLE_CAMERA } from "../scene/camera";
import type { CameraView } from "../scene/camera";
import type { LevelId } from "../game/campaign";
import type { HintView } from "../scene/matchHint";
import { usePreferences } from "./preferences";
type Flight = { from: Vector3; targetFrom: Vector3; to: Vector3; targetTo: Vector3; elapsed: number; round: number; view: CameraView; kind: "entry" | "hint" | "reset" };

// CAMERA SENSITIVITY: lower values rotate less for the same drag.
const TABLET_TOUCH_ROTATE_SPEED = 0.55;
const DEFAULT_ROTATE_SPEED = 1;
const TABLET_MIN_SCREEN_SIDE = 600;

export default function CameraRig({ level, view, round, playable, onArrive, hintFlight, resetCameraSequence = 0 }: {
  level: LevelId; view: CameraView; round: number; playable: boolean; onArrive: (view: CameraView, round: number) => void;
  hintFlight?: HintView & { sequence: number };
  resetCameraSequence?: number;
}) {
  const flight = useRef<Flight | null>(null);
  const initializedCamera = useRef<object | null>(null);
  const camera = useThree((state) => state.camera);
  const canvas = useThree((state) => state.gl.domElement);
  const controls = useRef<OrbitControls | null>(null);
  const lastTarget = useRef(new Vector3());
  const preferences = usePreferences();
  const rotation = useRef(preferences.rotation);
  const zoom = useRef(preferences.zoom);
  const tabletTouch = useRef(false);
  useLayoutEffect(() => {
    rotation.current = preferences.rotation;
    zoom.current = preferences.zoom;
    if (controls.current) {
      controls.current.rotateSpeed = (tabletTouch.current ? TABLET_TOUCH_ROTATE_SPEED : DEFAULT_ROTATE_SPEED) * preferences.rotation;
      controls.current.zoomSpeed = preferences.zoom;
    }
  }, [preferences.rotation, preferences.zoom]);

  useLayoutEffect(() => {
    const orbit = new OrbitControls(camera);
    const savedTarget = lastTarget.current;
    controls.current = orbit;
    orbit.rotateSpeed = rotation.current;
    orbit.zoomSpeed = zoom.current;
    orbit.enableDamping = false;
    orbit.zoomToCursor = true;
    orbit.minPolarAngle = 0;
    orbit.maxPolarAngle = Math.PI;
    orbit.maxDistance = level === "titanic" ? 34 : 30;
    orbit.maxTargetRadius = level === "titanic" ? 10 : 8;
    orbit.cursor.set(...PLAY_CAMERA_POSES[level].target);
    orbit.target.copy(savedTarget);
    orbit.update();
    orbit.connect(canvas);
    let previousDistance = orbit.getDistance();
    const previousTarget = orbit.target.clone();

    function followZoom() {
      if (orbit.enabled && !flight.current) {
        recenterZoomOut(camera.position, orbit.target, previousTarget, previousDistance, level);
        camera.updateMatrixWorld();
      }
      previousDistance = orbit.getDistance();
      previousTarget.copy(orbit.target);
    }
    function setRotateSpeed(event: PointerEvent) {
      if (flight.current && flight.current.kind !== "entry") flight.current = null;
      // Use the shorter screen side so turning a phone sideways keeps its phone speed.
      const tabletScreen = Math.min(window.screen.width, window.screen.height) >= TABLET_MIN_SCREEN_SIDE;
      tabletTouch.current = event.pointerType === "touch" && tabletScreen;
      orbit.rotateSpeed = (tabletTouch.current ? TABLET_TOUCH_ROTATE_SPEED : DEFAULT_ROTATE_SPEED) * rotation.current;
    }
    orbit.addEventListener("change", followZoom);
    const cancelHint = () => { if (flight.current && flight.current.kind !== "entry") flight.current = null; };
    orbit.addEventListener("start", cancelHint);
    canvas.addEventListener("pointerdown", setRotateSpeed, true);
    return () => {
      savedTarget.copy(orbit.target);
      canvas.removeEventListener("pointerdown", setRotateSpeed, true);
      orbit.removeEventListener("change", followZoom);
      orbit.removeEventListener("start", cancelHint);
      orbit.dispose();
      controls.current = null;
    };
  }, [camera, canvas, level]);
  useLayoutEffect(() => {
    const orbit = controls.current;
    if (!orbit) return;
    orbit.enabled = playable;
    orbit.minDistance = view === "title" ? 0 : level === "titanic" ? 4.8 : 6.9;
  }, [camera, canvas, level, playable, view]);
  useEffect(() => {
    const orbit = controls.current;
    if (!orbit) return;
    const pose = view === "title" ? CAMERA_POSES.title : PLAY_CAMERA_POSES[level];
    if (initializedCamera.current !== camera) {
      camera.position.set(...TITLE_CAMERA);
      orbit.target.set(...CAMERA_POSES.title.target);
      orbit.update();
      initializedCamera.current = camera;
    }
    flight.current = { from: camera.position.clone(), targetFrom: orbit.target.clone(),
      to: new Vector3(...pose.position), targetTo: new Vector3(...pose.target), elapsed: 0, round, view, kind: "entry" };
  }, [camera, canvas, level, view, round]);
  const startHintFlight = useEffectEvent(() => {
    const orbit = controls.current;
    if (!hintFlight) { if (flight.current?.kind === "hint") flight.current = null; return; }
    if (!orbit || view !== "house" || !playable) return;
    flight.current = { from: camera.position.clone(), targetFrom: orbit.target.clone(),
      to: new Vector3(...hintFlight.position), targetTo: new Vector3(...hintFlight.target),
      elapsed: 0, round, view, kind: "hint" };
  });
  useEffect(() => { startHintFlight(); }, [hintFlight]);
  const resetCamera = useEffectEvent(() => {
    const orbit = controls.current;
    if (!resetCameraSequence || !orbit || view !== "house" || !playable) return;
    const pose = PLAY_CAMERA_POSES[level];
    flight.current = { from: camera.position.clone(), targetFrom: orbit.target.clone(),
      to: new Vector3(...pose.position), targetTo: new Vector3(...pose.target),
      elapsed: 0, round, view, kind: "reset" };
  });
  useEffect(() => { resetCamera(); }, [resetCameraSequence]);
  useFrame((_, delta) => {
    const current = flight.current;
    const orbit = controls.current;
    if (!current || !orbit) return;
    current.elapsed += delta;
    if (current.kind !== "entry" && !playable) { flight.current = null; return; }
    const seconds = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? .001 : current.kind === "entry" ? 1.25 : .7;
    const progress = Math.min(1, current.elapsed / seconds);
    const eased = progress * progress * (3 - 2 * progress);
    camera.position.lerpVectors(current.from, current.to, eased);
    orbit.target.lerpVectors(current.targetFrom, current.targetTo, eased);
    orbit.update();
    if (progress === 1) {
      flight.current = null;
      if (current.kind === "entry") onArrive(current.view, current.round);
    }
  });
  return null;
}
