type Contact = Pick<PointerEvent, "pointerId" | "pointerType" | "isPrimary" | "button" | "clientX" | "clientY">;
type Gesture = {
  pointerId: number;
  x: number;
  y: number;
  direct: boolean;
  released: boolean;
};

export function createScrewGestures() {
  const touches = new Set<number>();
  let gesture: Gesture | null = null;

  function move(event: Contact) {
    if (gesture?.pointerId !== event.pointerId) return;
    const tolerance = gesture.direct ? 10 : 5;
    if (Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > tolerance) gesture = null;
  }

  return {
    start(event: Contact, onCanvas: boolean) {
      if (event.pointerType === "touch") touches.add(event.pointerId);
      gesture = null;
      if (!onCanvas || !event.isPrimary || event.button !== 0 || touches.size > 1) return;
      gesture = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        direct: event.pointerType === "touch" || event.pointerType === "pen",
        released: false,
      };
    },
    move,
    release(event: Contact, onCanvas: boolean) {
      touches.delete(event.pointerId);
      move(event);
      if (gesture?.pointerId !== event.pointerId) return false;
      if (onCanvas && event.button === 0 && !gesture.direct) {
        gesture.released = true;
        return false;
      }
      const tapped = onCanvas && event.button === 0 && gesture.direct;
      gesture = null;
      return tapped;
    },
    cancel(pointerId: number) {
      touches.delete(pointerId);
      if (gesture?.pointerId === pointerId) gesture = null;
    },
    consumeClick(button: number) {
      const clicked = button === 0 && gesture?.released === true;
      gesture = null;
      return clicked;
    },
    reset() {
      touches.clear();
      gesture = null;
    },
  };
}
