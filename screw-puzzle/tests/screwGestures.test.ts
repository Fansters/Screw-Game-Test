import { test } from "node:test";
import assert from "node:assert/strict";
import { createScrewGestures } from "../src/scene/screwGestures.ts";

const finger = {
  pointerId: 1, pointerType: "touch", isPrimary: true, button: 0, clientX: 40, clientY: 50,
};

test("a touch tap resolves on lift and cannot be repeated by the browser click", () => {
  const gestures = createScrewGestures();
  gestures.start(finger, true);
  gestures.move({ ...finger, clientX: 44, clientY: 54 });
  assert.equal(gestures.release({ ...finger, clientX: 44, clientY: 54 }, true), true);
  assert.equal(gestures.consumeClick(0), false);
  assert.equal(gestures.release(finger, true), false);
});

test("dragging back to a screw and cancelling a contact cannot turn into taps", () => {
  const gestures = createScrewGestures();
  gestures.start(finger, true);
  gestures.move({ ...finger, clientX: 53 });
  assert.equal(gestures.release(finger, true), false);
  gestures.start(finger, true);
  gestures.cancel(finger.pointerId);
  assert.equal(gestures.release(finger, true), false);
  gestures.start(finger, true);
  assert.equal(gestures.release({ ...finger, clientY: 61 }, true), false);
  gestures.start(finger, true);
  assert.equal(gestures.release(finger, false), false);
});

test("a second touch cancels the first even when it lands outside the canvas", () => {
  const gestures = createScrewGestures();
  const second = { ...finger, pointerId: 2, isPrimary: false };
  gestures.start(finger, true);
  gestures.start(second, false);
  assert.equal(gestures.release(second, false), false);
  assert.equal(gestures.release(finger, true), false);
  gestures.start(finger, true);
  assert.equal(gestures.release(finger, true), true);
});

test("desktop picking still uses a single primary click after release", () => {
  const gestures = createScrewGestures();
  const mouse = { ...finger, pointerType: "mouse" };
  gestures.start(mouse, true);
  assert.equal(gestures.release(mouse, true), false);
  assert.equal(gestures.consumeClick(0), true);
  assert.equal(gestures.consumeClick(0), false);
  gestures.start(mouse, false);
  gestures.release(mouse, true);
  assert.equal(gestures.consumeClick(0), false);
  gestures.start(mouse, true);
  gestures.move({ ...mouse, clientX: 46 });
  gestures.release(mouse, true);
  assert.equal(gestures.consumeClick(0), false);
});
