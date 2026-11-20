import { useLayoutEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import FloatingTitle from "./FloatingTitle";
import { TITLE_CAMERA } from "../scene/camera";
function HomeCamera() {
  const { camera, invalidate } = useThree();
  useLayoutEffect(() => { camera.lookAt(0, 5.3, 0); camera.updateMatrixWorld(); invalidate(); }, [camera, invalidate]);
  return null;
}
export default function HomeScene() {
  return <section className="scene home-scene" aria-label="Screw it! title">
    <div className="home-gallery" aria-hidden="true">
      {["campsite", "carnival", "desert"].map((name, index) => <img key={name} src={`/images/home/${name}.webp`} alt="" fetchPriority={index === 0 ? "high" : "low"} decoding="async" />)}
    </div>
    <Canvas frameloop="demand" dpr={[1,1.25]} camera={{ position: TITLE_CAMERA, fov: 42 }}>
      <ambientLight intensity={1.25} /><directionalLight position={[5,10,7]} intensity={2.2} />
      <HomeCamera /><FloatingTitle menu fit />
    </Canvas>
  </section>;
}
