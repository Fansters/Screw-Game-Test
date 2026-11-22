import { useRef } from "react";
import type { MouseEvent, PointerEvent } from "react";
// Require the whole gesture outside: dragging from an input onto the backdrop
// must not close the card or pass the click to the game below it.
export function useBackdropDismiss(close: () => void) {
  const outsideStart = useRef(false);
  const outsideEnd = useRef(false);
  function outside(event: PointerEvent<HTMLDialogElement> | MouseEvent<HTMLDialogElement>) {
    const r = event.currentTarget.getBoundingClientRect();
    return event.target === event.currentTarget && (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom);
  }
  return { onPointerDown: (event: PointerEvent<HTMLDialogElement>) => { outsideStart.current = outside(event); outsideEnd.current = false; },
    onPointerUp: (event: PointerEvent<HTMLDialogElement>) => { outsideEnd.current = outside(event); },
    onClick: (event: MouseEvent<HTMLDialogElement>) => {
      const dismiss = outsideStart.current && outsideEnd.current && outside(event);
      outsideStart.current = false; outsideEnd.current = false;
      // Close on the click, not pointer-up, so it cannot retarget the game.
      if (dismiss) { event.preventDefault(); event.stopPropagation(); close(); }
    },
    onPointerCancel: () => { outsideStart.current = false; outsideEnd.current = false; } };
}
