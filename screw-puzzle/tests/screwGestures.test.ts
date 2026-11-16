import { test } from "node:test";
import assert from "node:assert/strict";
import { createScrewGestures } from "../src/scene/screwGestures.ts";

const finger = {
  pointerId: 1, pointerType: "touch", isPrimary: true, button: 0, clientX: 40, clientY: 50,
};

test("a touch tap resolves once on lift", () => {
  const gestures = createScrewGestures();
  gestures.start(finger, true);
  gestures.move({ ...finger, clientX: 44, clientY: 54 });
  assert.equal(gestures.release({ ...finger, clientX: 44, clientY: 54 }, true), true);
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

test("a desktop tap resolves on lift, while movement cancels it", () => {
  const gestures = createScrewGestures();
  const mouse = { ...finger, pointerType: "mouse" };
  gestures.start(mouse, true);
  assert.equal(gestures.release(mouse, true), true);
  assert.equal(gestures.release(mouse, true), false);
  gestures.start(mouse, false);
  assert.equal(gestures.release(mouse, true), false);
  gestures.start(mouse, true);
  gestures.move({ ...mouse, clientX: 46 });
  assert.equal(gestures.release(mouse, true), false);
});

test("holding previews once and consumes release, while a drag or a second touch prevents a hold", () => {
  for (const pointerType of ["mouse", "touch"]) {
    const gestures = createScrewGestures();
    const contact = { ...finger, pointerType };
    gestures.start(contact, true);
    assert.equal(gestures.hold(contact.pointerId), true);
    assert.equal(gestures.hold(contact.pointerId), false);
    assert.equal(gestures.release(contact, true), false);
    gestures.start(contact, true);
    assert.equal(gestures.move({ ...contact, clientX: 51 }), true);
    assert.equal(gestures.hold(contact.pointerId), false);
    gestures.start(contact, true);
    gestures.start({ ...finger, pointerId: 2, isPrimary: false }, true);
    assert.equal(gestures.hold(contact.pointerId), false);
    assert.equal(gestures.release(contact, true), false);
  }
});
