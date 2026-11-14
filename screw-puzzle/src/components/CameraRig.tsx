import { useEffect, useLayoutEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Vector3 } from "three";
import { CAMERA_POSES, recenterZoomOut, TITLE_CAMERA } from "../scene/camera";
import type { CameraView } from "../scene/camera";
type Flight = { from: Vector3; targetFrom: Vector3; to: Vector3; targetTo: Vector3; elapsed: number; round: number; view: CameraView };

// CAMERA SENSITIVITY: lower values rotate less for the same drag.
const TABLET_TOUCH_ROTATE_SPEED = 0.55;
const DEFAULT_ROTATE_SPEED = 1;
const TABLET_MIN_SCREEN_SIDE = 600;

export default function CameraRig({ view, round, playable, onArrive }: {
  view: CameraView; round: number; playable: boolean; onArrive: (view: CameraView, round: number) => void;
}) {
  const flight = useRef<Flight | null>(null);
  const initializedCamera = useRef<object | null>(null);
  const camera = useThree((state) => state.camera);
  const canvas = useThree((state) => state.gl.domElement);
  const controls = useRef<OrbitControls | null>(null);

  useLayoutEffect(() => {
    const orbit = new OrbitControls(camera);
    controls.current = orbit;
    orbit.enableDamping = false;
    orbit.zoomToCursor = true;
    orbit.minPolarAngle = 0;
    orbit.maxPolarAngle = Math.PI;
    orbit.maxDistance = 30;
    orbit.maxTargetRadius = 8;
    orbit.cursor.set(...CAMERA_POSES.house.target);
    orbit.connect(canvas);
    let previousDistance = orbit.getDistance();
    const previousTarget = orbit.target.clone();

    function followZoom() {
      if (orbit.enabled && !flight.current) {
        recenterZoomOut(camera.position, orbit.target, previousTarget, previousDistance);
        camera.updateMatrixWorld();
      }
      previousDistance = orbit.getDistance();
      previousTarget.copy(orbit.target);
    }
    function setRotateSpeed(event: PointerEvent) {
      // Use the shorter screen side so turning a phone sideways keeps its phone speed.
      const tabletScreen = Math.min(window.screen.width, window.screen.height) >= TABLET_MIN_SCREEN_SIDE;
      orbit.rotateSpeed = event.pointerType === "touch" && tabletScreen ? TABLET_TOUCH_ROTATE_SPEED : DEFAULT_ROTATE_SPEED;
    }
    orbit.addEventListener("change", followZoom);
    canvas.addEventListener("pointerdown", setRotateSpeed, true);
    return () => {
      canvas.removeEventListener("pointerdown", setRotateSpeed, true);
      orbit.removeEventListener("change", followZoom);
      orbit.dispose();
      controls.current = null;
    };
  }, [camera, canvas]);
  useLayoutEffect(() => {
    const orbit = controls.current;
    if (!orbit) return;
    orbit.enabled = playable;
    orbit.minDistance = view === "title" ? 0 : 6.9;
  }, [camera, canvas, playable, view]);
  useEffect(() => {
    const orbit = controls.current;
    if (!orbit) return;
    const pose = CAMERA_POSES[view];
    if (initializedCamera.current !== camera) {
      camera.position.set(...TITLE_CAMERA);
      orbit.target.set(...CAMERA_POSES.title.target);
      orbit.update();
      initializedCamera.current = camera;
    }
    flight.current = { from: camera.position.clone(), targetFrom: orbit.target.clone(),
      to: new Vector3(...pose.position), targetTo: new Vector3(...pose.target), elapsed: 0, round, view };
  }, [camera, canvas, view, round]);
  useFrame((_, delta) => {
    const current = flight.current;
    const orbit = controls.current;
    if (!current || !orbit) return;
    current.elapsed += delta;
    const progress = Math.min(1, current.elapsed / 1.25);
    const eased = progress * progress * (3 - 2 * progress);
    camera.position.lerpVectors(current.from, current.to, eased);
    orbit.target.lerpVectors(current.targetFrom, current.targetTo, eased);
    orbit.update();
    if (progress === 1) {
      flight.current = null;
      onArrive(current.view, current.round);
    }
  });
  return null;
}
