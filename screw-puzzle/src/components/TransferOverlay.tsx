import { useLayoutEffect, useRef } from "react";
import type { CSSProperties } from "react";
import { SCREW_COLORS } from "../game/colors";
import type { PlaybackFrame } from "../animation/sequence";

export default function TransferOverlay({ frame, getOrigin }: { frame: PlaybackFrame | null; getOrigin: (id: string) => [number, number] }) {
  const token = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    if (!frame || frame.kind !== "fly" || !frame.to || !token.current) return;
    const destination = frame.to.kind === "box" ? `box-${frame.to.slot}-${frame.to.index}` : `tray-${frame.to.index}`;
    const to = document.querySelector(`[data-socket="${destination}"]`);
    const target = to?.getBoundingClientRect();
    const source = frame.from?.kind === "tray" ? document.querySelector(`[data-socket="tray-${frame.from.index}"]`)?.getBoundingClientRect() : null;
    if (!target) return;
    const start = source ? [source.left + source.width / 2, source.top + source.height / 2] : getOrigin(frame.screw!.screwId);
    const end = [target.left + target.width / 2, target.top + target.height / 2];
    const transform = (x: number, y: number, scale: number, angle: number) => `translate(${x - 17}px, ${y - 17}px) scale(${scale}) rotate(${angle}deg)`;
    const animation = token.current.animate([
      { transform: transform(start[0], start[1], source ? 1 : 0.45, 0), opacity: 1 },
      { transform: transform((start[0] + end[0]) / 2, Math.min(start[1], end[1]) - 65, 1.15, 180), opacity: 1, offset: 0.5 },
      { transform: transform(end[0], end[1], 1, 360), opacity: 1 },
    ], { duration: frame.duration, easing: "cubic-bezier(.3,.1,.35,1)", fill: "forwards" });
    return () => animation.cancel();
  }, [frame, getOrigin]);
  if (frame?.kind !== "fly" || !frame.screw) return null;
  const color = SCREW_COLORS[frame.screw.color];
  return <span className="flying-screw" ref={token} aria-hidden="true"
    style={{ "--screw-color": color.color, "--recess-color": color.recess } as CSSProperties}>+</span>;
}
