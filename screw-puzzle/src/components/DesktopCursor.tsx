import { useEffect, useRef } from "react";

export default function DesktopCursor() {
  const root = useRef<HTMLDivElement>(null);
  const twist = useRef<SVGGElement>(null);
  useEffect(() => {
    const cursor = root.current;
    const area = cursor?.parentElement;
    if (!cursor || !area) return;
    const mouse = window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 651px)");
    let animation: Animation | undefined;
    function move(event: PointerEvent) {
      if (!cursor) return;
      const visible = mouse.matches && event.pointerType === "mouse";
      cursor.style.opacity = visible ? "1" : "0";
      if (visible) cursor.style.transform = `translate3d(${event.clientX - 8}px, ${event.clientY - 10}px, 0)`;
    }
    const hide = () => { cursor.style.opacity = "0"; };
    function spin(event: PointerEvent) {
      move(event);
      if (!mouse.matches || event.pointerType !== "mouse" || event.button !== 0) return;
      animation?.cancel();
      // Turn around the tool's own shaft, inside its fixed diagonal orientation.
      animation = twist.current?.animate([{ transform: "rotateY(0deg)" }, { transform: "rotateY(-360deg)" }], { duration: 260, easing: "cubic-bezier(.2,.7,.3,1)" });
    }
    area.addEventListener("pointermove", move);
    area.addEventListener("pointerdown", spin);
    area.addEventListener("pointerleave", hide);
    window.addEventListener("blur", hide);
    mouse.addEventListener("change", hide);
    return () => {
      animation?.cancel();
      area.removeEventListener("pointermove", move); area.removeEventListener("pointerdown", spin); area.removeEventListener("pointerleave", hide);
      window.removeEventListener("blur", hide); mouse.removeEventListener("change", hide);
    };
  }, []);
  return <div ref={root} className="desktop-cursor" aria-hidden="true">
    <svg viewBox="0 0 48 64"><g transform="rotate(-38 24 30)" stroke="#624477" strokeWidth="1.8" strokeLinejoin="round">
      <path d="M22.5 4h3v30h-3z" fill="#ffe4a0" />
      <rect x="16" y="29" width="16" height="29" rx="6" fill="#a875eb" />
      <rect x="16" y="29" width="16" height="7" rx="2" fill="#ffd76e" />
      {/* The round handle stays full-width as its face/ribs and flat blade turn. */}
      <g ref={twist} className="screwdriver-twist">
        <path d="M21.5 4h5v7h-5z" fill="#b7e5df" />
        <rect x="18" y="37" width="12" height="18" rx="4" fill="#bd91f3" stroke="none" />
        <path d="M21 40v11m6-11v11" fill="none" stroke="#f0dcff" strokeLinecap="round" />
      </g>
    </g></svg>
  </div>;
}
