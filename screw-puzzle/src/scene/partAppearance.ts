import { EdgesGeometry, LineBasicMaterial, LineSegments, Mesh } from "three";
import type { Material, Object3D } from "three";

function transparentCopy(source: Material) {
  const material = source.clone();
  material.transparent = true;
  material.opacity *= 0.4;
  material.depthWrite = false;
  return material;
}

export function showPartAppearance(part: Object3D, faded: boolean, outlined: boolean) {
  const restore: (() => void)[] = [];
  const accent = outlined ? new LineBasicMaterial({ color: "#ff244b", toneMapped: false, transparent: true, depthWrite: false }) : null;
  part.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    if (faded) {
      const original = object.material;
      const copies = (Array.isArray(original) ? original : [original]).map(transparentCopy);
      object.material = Array.isArray(original) ? copies : copies[0];
      restore.push(() => {
        object.material = original;
        copies.forEach((material) => material.dispose());
      });
    }
    if (accent) {
      const edges = new LineSegments(new EdgesGeometry(object.geometry, 35), accent);
      edges.raycast = () => {};
      edges.renderOrder = 3;
      object.add(edges);
      restore.push(() => {
        object.remove(edges);
        edges.geometry.dispose();
      });
    }
  });
  return () => {
    restore.forEach((restoreObject) => restoreObject());
    accent?.dispose();
  };
}
