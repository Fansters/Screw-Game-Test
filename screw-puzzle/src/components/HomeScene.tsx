import { useLayoutEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import FloatingTitle from "./FloatingTitle";
import { TITLE_CAMERA, CAMERA_POSES } from "../scene/camera";
function HomeCamera() {
  const { camera } = useThree();
  useLayoutEffect(() => { camera.lookAt(...CAMERA_POSES.title.target); camera.updateMatrixWorld(); }, [camera]);
  return null;
}
export default function HomeScene() {
  return <section className="scene home-scene" aria-label="Screw it! title">
    <Canvas dpr={[1,1.25]} camera={{ position: TITLE_CAMERA, fov: 42 }}>
      <ambientLight intensity={1.25} /><directionalLight position={[5,10,7]} intensity={2.2} />
      <HomeCamera /><FloatingTitle menu />
    </Canvas>
  </section>;
}
