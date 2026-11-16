type Contact = Pick<PointerEvent, "pointerId" | "pointerType" | "isPrimary" | "button" | "clientX" | "clientY">;
type Gesture = {
  pointerId: number;
  x: number;
  y: number;
  tolerance: number;
  held: boolean;
};

export function createScrewGestures() {
  const touches = new Set<number>();
  let gesture: Gesture | null = null;

  function move(event: Contact) {
    if (gesture?.pointerId !== event.pointerId ||
      Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) <= gesture.tolerance) return false;
    gesture = null;
    return true;
  }

  return {
    start(event: Contact, onCanvas: boolean) {
      if (event.pointerType === "touch") touches.add(event.pointerId);
      gesture = null;
      if (!onCanvas || !event.isPrimary || event.button !== 0 || touches.size > 1) return false;
      gesture = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        tolerance: event.pointerType === "touch" || event.pointerType === "pen" ? 10 : 5,
        held: false,
      };
      return true;
    },
    move,
    hold(pointerId: number) {
      if (gesture?.pointerId !== pointerId || gesture.held) return false;
      gesture.held = true;
      return true;
    },
    release(event: Contact, onCanvas: boolean) {
      touches.delete(event.pointerId);
      move(event);
      if (gesture?.pointerId !== event.pointerId) return false;
      const tapped = onCanvas && event.button === 0 && !gesture.held;
      gesture = null;
      return tapped;
    },
    cancel(pointerId: number) {
      touches.delete(pointerId);
      if (gesture?.pointerId === pointerId) gesture = null;
    },
    reset() {
      touches.clear();
      gesture = null;
    },
  };
}
