import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DoubleSide, Group, InstancedMesh, Mesh, MeshBasicMaterial, Object3D, PerspectiveCamera, Raycaster, Vector3 } from "three";
import { FRONT_OPENINGS, PART_PIVOTS, PIECES } from "../src/scene/houseModel.ts";
import { geometryFor } from "../src/scene/geometry.ts";
import { MODEL_BATCHES } from "../src/scene/modelBatches.ts";
import { headGeometry } from "../src/components/screwGeometry.ts";
import { DEMO_LEVEL, SCREW_SCALE } from "../src/game/levels.ts";
import { createInitialState, isScrewAccessible } from "../src/game/rules.ts";
import { CHEST_PART_IDS, DECOR_IDS, PARTITION_IDS, ROOF_IDS, TILE_IDS, WALL_IDS } from "../src/game/types.ts";
import type { Screw } from "../src/game/types.ts";
import { pickNearbyHead, pickNearbyScrew } from "../src/scene/picking.ts";
import { findScrewObstructions } from "../src/scene/obstructions.ts";
import { SCREW_PULL_DISTANCE } from "../src/scene/screwDimensions.ts";
import { SCREW_COLORS } from "../src/game/colors.ts";
import { CHEST_SURFACES } from "../src/scene/chestModel.ts";
import { CAMERA_POSES, recenterZoomOut } from "../src/scene/camera.ts";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const material = new MeshBasicMaterial();
test("similar palette pairs have distinct luminance", () => {
  const luminance = (hex: string) => {
    const channels = hex.slice(1).match(/../g)!.map((channel) => {
      const value = parseInt(channel, 16) / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  for (const [dark, bright] of [["brown", "orange"], ["purple", "pink"], ["blue", "cyan"], ["black", "grey"]] as const) {
    assert.ok((luminance(SCREW_COLORS[bright].color) + 0.05) / (luminance(SCREW_COLORS[dark].color) + 0.05) >= 3);
  }
  assert.ok(luminance(SCREW_COLORS.brown.color) > luminance(SCREW_COLORS.black.color) * 5);
  assert.ok(luminance(SCREW_COLORS.yellow.color) - luminance(SCREW_COLORS.orange.color) > 0.35);
  assert.ok(luminance(SCREW_COLORS.lime.color) - luminance(SCREW_COLORS.green.color) > 0.35);
});

test("zooming out eases an offset orbit target back to the house at overview distance", () => {
  const center = new Vector3(...CAMERA_POSES.house.target);
  const start = new Vector3(3, 1, -2);
  const zoomedTarget = new Vector3(4, 2, -2);
  const position = zoomedTarget.clone().add(new Vector3(0, 0, 9));
  recenterZoomOut(position, zoomedTarget, start, 10);
  assert.deepEqual(zoomedTarget.toArray(), [4, 2, -2], "Zoom in keeps its pointer focus");
  position.z += 4;
  recenterZoomOut(position, zoomedTarget, start, 9);
  assert.ok(zoomedTarget.distanceTo(center) < start.distanceTo(center));
  assert.ok(zoomedTarget.distanceTo(center) > 0);
  const previousTarget = zoomedTarget.clone();
  position.z += 7;
  recenterZoomOut(position, zoomedTarget, previousTarget, 13);
  assert.deepEqual(zoomedTarget.toArray(), center.toArray());
  assert.ok(position.clone().sub(zoomedTarget).distanceTo(new Vector3(0, 0, 20)) < 1e-10);
});

test("the Three.js controls zoom toward an off-center pinch and pan when both fingers move", () => {
  const camera = new PerspectiveCamera(42, 1, 0.1, 65);
  camera.position.set(0, 0, 18);
  const controls = new OrbitControls(camera);
  const doc = new EventTarget();
  const canvas = Object.assign(new EventTarget(), {
    ownerDocument: doc, clientWidth: 400, clientHeight: 400, style: {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 400, height: 400 }),
    setPointerCapture() {},
    releasePointerCapture() {},
  });
  controls.zoomToCursor = true;
  controls.connect(canvas as unknown as HTMLElement);
  const send = (target: EventTarget, type: string, pointerId: number, x: number, y: number) => {
    target.dispatchEvent(Object.assign(new Event(type), {
      pointerType: "touch", pointerId, pageX: x, pageY: y, clientX: x, clientY: y,
    }));
  };
  send(canvas, "pointerdown", 1, 270, 190);
  send(canvas, "pointerdown", 2, 330, 190);
  send(doc, "pointermove", 1, 240, 190);
  send(doc, "pointermove", 2, 360, 190);
  assert.ok(controls.getDistance() < 12);
  assert.ok(controls.target.x > 0, "The pinch midpoint is right of center");
  const beforePan = controls.target.x;
  const beforeDistance = controls.getDistance();
  send(doc, "pointermove", 1, 239, 190);
  send(doc, "pointermove", 2, 359, 190);
  assert.ok(controls.target.x > beforePan);
  assert.ok(Math.abs(controls.getDistance() - beforeDistance) < 0.02);
  send(doc, "pointerup", 1, 239, 190);
  send(doc, "pointerup", 2, 359, 190);
  controls.dispose();
});

test("interior partitions separate rooms while their actual doorways remain open", () => {
  const partitions = solids().filter((mesh) => PARTITION_IDS.includes(mesh.userData.part));
  const ray = new Raycaster();
  for (const [story, y] of [["upper", 1.2], ["lower", -0.6]] as const) {
    const walls = partitions.filter((mesh) => mesh.userData.part === `partition-${story}-left`);
    for (const z of [-1.15, 0.73]) {
      ray.set(new Vector3(0, y, z), new Vector3(-1, 0, 0));
      assert.equal(ray.intersectObjects(walls, false).length, 0, "A doorway must be an actual opening");
    }
    ray.set(new Vector3(0, y, 0), new Vector3(-1, 0, 0));
    assert.ok(ray.intersectObjects(walls, false).length > 0, "The adjoining wall must obstruct the room");
  }
  ray.set(new Vector3(-1.5, 1.6, 0.6), new Vector3(0, 0, -1));
  assert.ok(ray.intersectObjects(partitions.filter((mesh) => mesh.userData.part === "partition-upper-cross-left"), false).length > 0);
  for (const screw of DEMO_LEVEL.filter((screw) => WALL_IDS.includes(screw.attachedTo as typeof WALL_IDS[number]))) {
    const inward = new Vector3(...screw.position).multiplyScalar(-1);
    assert.ok(new Vector3(...screw.normal).dot(inward) > 0, "Outer wall heads face into the house");
  }
});
function solids(pieces = PIECES) {
  return pieces.map((piece) => {
    const mesh = new Mesh(geometryFor(piece), material);
    mesh.position.set(...piece.position); mesh.scale.set(...piece.size);
    if (piece.rotation) mesh.rotation.set(...piece.rotation);
    mesh.userData = { part: piece.part, pickBlocker: true };
    mesh.updateMatrixWorld();
    return mesh;
  });
}

test("the chest GLB has separate textured meshes and the lid physically conceals the interior screw", () => {
  const bytes = readFileSync(new URL("../src/assets/treasure_chest_parts.glb", import.meta.url));
  const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString("utf8"));
  assert.deepEqual(gltf.nodes.map((node) => node.extras.partId), [...CHEST_PART_IDS]);
  assert.equal(new Set(gltf.nodes.map((node) => node.mesh)).size, 3);
  assert.equal(new Set(gltf.nodes.map((node) => JSON.stringify(node.translation))).size, 3);
  assert.match(gltf.asset.extras.license, /CC-BY-4.0/);
  for (const part of CHEST_PART_IDS) {
    const node = gltf.nodes.find((candidate) => candidate.name === part);
    const primitives = gltf.meshes[node.mesh].primitives;
    const indices = primitives.reduce((sum, primitive) => sum + gltf.accessors[primitive.indices].count, 0);
    assert.equal(indices, CHEST_SURFACES[part].indices.length);
    assert.ok(primitives.every((primitive) => primitive.attributes.TEXCOORD_0 !== undefined &&
      gltf.materials[primitive.material].pbrMetallicRoughness.baseColorTexture));
  }
  const doubleSide = new MeshBasicMaterial({ side: DoubleSide });
  const chest = solids(PIECES.filter((piece) => piece.kind === "chest-surface"));
  chest.forEach((mesh) => { mesh.material = doubleSide; });
  const interior = DEMO_LEVEL.find((screw) => screw.attachedTo === "chest" && screw.normal[1] === 1)!;
  const origin = new Vector3(...interior.position).add(new Vector3(0, 2, 0));
  const ray = new Raycaster(origin, new Vector3(0, -1, 0), 0, 2 - SCREW_SCALE * 0.144);
  assert.equal(ray.intersectObjects(chest, false)[0]?.object.userData.part, "chest-lid");
  assert.equal(ray.intersectObjects(chest.filter((mesh) => mesh.userData.part !== "chest-lid"), false).length, 0);
  doubleSide.dispose();
});

test("every window and door opening passes a ray through the actual front wall", () => {
  const walls = solids().filter((mesh) => mesh.userData.part.startsWith("wall-front-"));
  const ray = new Raycaster();
  for (const hole of FRONT_OPENINGS) {
    for (const dx of [-0.35, 0, 0.35]) for (const dy of [-0.35, 0, 0.35]) {
      ray.set(new Vector3(hole.x + dx * hole.width, hole.y + dy * hole.height, 4), new Vector3(0, 0, -1));
      assert.equal(ray.intersectObjects(walls).length, 0);
    }
  }
  ray.set(new Vector3(0.75, -1.35, 4), new Vector3(0, 0, -1));
  assert.ok(ray.intersectObjects(walls).length > 0, "The moved jamb fastener still sits on solid wall");
});

test("the enlarged square platform consists of nine independently fastened tiles", () => {
  const tiles = PIECES.filter((piece) => TILE_IDS.includes(piece.part as typeof TILE_IDS[number]) && piece.size[1] === 0.24);
  assert.equal(tiles.length, 9);
  const width = Math.max(...tiles.map((piece) => piece.position[0] + piece.size[0] / 2)) - Math.min(...tiles.map((piece) => piece.position[0] - piece.size[0] / 2));
  const depth = Math.max(...tiles.map((piece) => piece.position[2] + piece.size[2] / 2)) - Math.min(...tiles.map((piece) => piece.position[2] - piece.size[2] / 2));
  assert.equal(width, depth);
  assert.ok(width > 8);
  for (const tile of TILE_IDS) {
    assert.equal(DEMO_LEVEL.filter((screw) => screw.attachedTo === tile).length, 5);
    assert.deepEqual(tiles.find((piece) => piece.part === tile)!.position, PART_PIVOTS[tile]);
  }
});

test("touch assistance finds a nearby instanced head but rejects covered, locked, rear-facing, or removed screws", () => {
  const camera = new PerspectiveCamera(42, 1, 0.1, 65);
  camera.position.set(-1.5, 1.49, 10); camera.lookAt(-1.5, 1.49, 0); camera.updateMatrixWorld();
  const rect = { left: 0, top: 0, width: 390, height: 390 };
  const scene = new Group(); scene.add(...solids().filter((mesh) => !DECOR_IDS.includes(mesh.userData.part)));
  const screw: Screw = { id: "test-head", position: [-1.5, 1.49, 2.14], normal: [0, 0, 1], color: "orange", removed: false };
  const field = new InstancedMesh(headGeometry, material, 1);
  field.userData.screwIds = [screw.id];
  const pose = new Object3D();
  function placeHead() {
    pose.position.set(...screw.position); pose.scale.setScalar(SCREW_SCALE); pose.updateMatrix();
    field.setMatrixAt(0, pose.matrix); field.computeBoundingSphere(); scene.updateMatrixWorld(true);
  }
  scene.add(field); placeHead();
  let game = createInitialState([screw]);
  assert.equal(pickNearbyScrew(scene, camera, rect, [211, 195], game), screw.id);
  assert.equal(pickNearbyScrew(scene, camera, rect, [220, 195], game), null, "Touches outside 44px target do not snap");
  game = { ...game, screws: [{ ...screw, obstructedBy: ["roof-left-front-ridge"] }] };
  assert.equal(pickNearbyScrew(scene, camera, rect, [195, 195], game), null);
  assert.deepEqual(pickNearbyHead(scene, camera, rect, [195, 195], game), { id: screw.id, blocked: true }, "A visible but blocked head can receive wiggle feedback");
  game = { ...game, screws: [{ ...screw, removed: true }] };
  assert.equal(pickNearbyScrew(scene, camera, rect, [195, 195], game), null);
  assert.equal(pickNearbyHead(scene, camera, rect, [195, 195], game), null, "Removed heads cannot be targeted again");
  game = { ...game, screws: [{ ...screw, normal: [0, 0, -1] }] };
  assert.equal(pickNearbyScrew(scene, camera, rect, [195, 195], game), null);
  // A resident screw behind the window must remain untouchable until the cover falls.
  screw.position[2] = 1.97; placeHead(); game = createInitialState([screw]);
  assert.equal(pickNearbyScrew(scene, camera, rect, [195, 195], game), null);
  assert.equal(pickNearbyHead(scene, camera, rect, [195, 195], game), null, "Fully covered heads cannot receive removal or feedback clicks");
  for (const child of [...scene.children]) if (child.userData.part === "window-upper-left") scene.remove(child);
  assert.equal(pickNearbyScrew(scene, camera, rect, [195, 195], game), screw.id, "The same resident instance becomes visible through the real opening");
  field.dispose();
});

test("clearance detects snow covers and partial snowbank overlap without blanket tile locks", () => {
  const roof = DEMO_LEVEL.find((screw) => screw.attachedTo?.startsWith("roof-left-front") && screw.obstructedBy?.includes("snow-left-front"))!;
  assert.ok(findScrewObstructions(roof, SCREW_SCALE).includes("snow-left-front"));
  const side = DEMO_LEVEL.find((screw) => screw.attachedTo === "tile-s" && screw.normal[2] === 1)!;
  assert.ok(findScrewObstructions(side, SCREW_SCALE).includes("snowbank-front"));
  assert.ok(isScrewAccessible({ ...createInitialState(), removedParts: ["snowbank-front"] }, side));
  const underHouse = DEMO_LEVEL.find((screw) => screw.attachedTo === "tile-s" && screw.position[2] < 2)!;
  assert.ok(findScrewObstructions(underHouse, SCREW_SCALE).some((part) => part.startsWith("plinth-")));
  const partlyCovered = DEMO_LEVEL.find((screw) => screw.attachedTo === "gift-left" && screw.position[1] === -1.1)!;
  assert.ok(findScrewObstructions(partlyCovered, SCREW_SCALE).includes("snowbank-front"));
});

test("falling covers use their live world transforms, without changing rendering materials", () => {
  const roof = DEMO_LEVEL.find((screw) => screw.attachedTo?.startsWith("roof-left-front") && screw.obstructedBy?.includes("snow-left-front"))!;
  const snow = new Group();
  snow.add(...solids().filter((mesh) => mesh.userData.part === "snow-left-front"));
  const original = (snow.children[0] as Mesh).material;
  assert.deepEqual(findScrewObstructions(roof, SCREW_SCALE, { root: snow, part: "snow-left-front" }), ["snow-left-front"]);
  snow.position.set(4, -4, 3);
  assert.deepEqual(findScrewObstructions(roof, SCREW_SCALE, { root: snow, part: "snow-left-front" }), []);
  assert.equal((snow.children[0] as Mesh).material, original);
});

test("attic clearance follows the actual shaft pull and covered floor heads align under partitions", () => {
  const attic = DEMO_LEVEL.find((screw) => screw.attachedTo === "ceiling-front" && screw.position[0] < 0)!;
  const roof = new Group();
  const roofId = "roof-left-front-eave";
  roof.add(...solids().filter((mesh) => mesh.userData.part === roofId));
  const face = new Vector3(...attic.position).add(new Vector3(0, SCREW_SCALE * 0.144, 0));
  const outsideRim = face.clone().add(new Vector3(-SCREW_SCALE * 0.24, 0, 0));
  const ray = new Raycaster(outsideRim, new Vector3(0, 1, 0));
  roof.updateMatrixWorld(true);
  const distance = ray.intersectObject(roof)[0].distance;
  assert.ok(distance > SCREW_SCALE * SCREW_PULL_DISTANCE + 0.01 && distance < SCREW_SCALE * 1.05 + 0.01);
  assert.ok(isScrewAccessible(createInitialState(), attic));
  roof.position.y = -distance + SCREW_SCALE * 0.25;
  assert.deepEqual(findScrewObstructions(attic, SCREW_SCALE, { root: roof, part: roofId }), [roofId]);

  const cover = "partition-lower-left";
  const floor = DEMO_LEVEL.find((screw) => screw.attachedTo === "ground-sw" && screw.position[0] === -0.55)!;
  assert.ok(floor.obstructedBy?.includes(cover));
  const floorFace = new Vector3(...floor.position).add(new Vector3(0, SCREW_SCALE * 0.144, 0));
  const coverMeshes = solids().filter((mesh) => mesh.userData.part === cover);
  const camera = floorFace.clone().add(new Vector3(0, 3, 0));
  const centerRay = new Raycaster(camera, new Vector3(0, -1, 0), 0, 2.99);
  assert.ok(centerRay.intersectObjects(coverMeshes).length, "The partition hides the center of the screw from above");
});

test("roof and wall sections are independently fastened with actual panel seams", () => {
  assert.equal(ROOF_IDS.length, 12);
  assert.equal(WALL_IDS.length, 24);
  for (const part of [...ROOF_IDS, ...WALL_IDS]) {
    assert.equal(DEMO_LEVEL.filter((screw) => screw.attachedTo === part).length, 2);
    assert.ok(PIECES.some((piece) => piece.part === part));
  }
});

test("batched detail geometry preserves the original model's picking and occlusion surfaces", () => {
  assert.ok(MODEL_BATCHES.length < PIECES.length / 2);
  const original = solids(PIECES.filter((piece) => piece.kind !== "chest-surface"));
  const batched = MODEL_BATCHES.map((batch) => { const mesh = new Mesh(batch.geometry, material); mesh.updateMatrixWorld(); return mesh; });
  const ray = new Raycaster();
  for (const origin of [new Vector3(10, 8, 13), new Vector3(-10, 7, -13)]) {
    for (const screw of DEMO_LEVEL.filter((_, index) => index % 17 === 0)) {
      ray.set(origin, new Vector3(...screw.position).sub(origin).normalize());
      const a = ray.intersectObjects(original, false)[0]?.distance;
      const b = ray.intersectObjects(batched, false)[0]?.distance;
      if (a === undefined || b === undefined) assert.equal(a, b);
      else assert.ok(Math.abs(a - b) < 0.0001, `${screw.id}: merged detail changed a ray hit`);
    }
  }
});
