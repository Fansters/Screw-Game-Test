import { useLayoutEffect, useRef } from "react";
import ScrewCross from "./ScrewCross";

export default function LevelLoading({ title, stage, error, ready = false, onFinished, onCancel }: {
  title: string; stage?: string; error?: string; ready?: boolean;
  onFinished?: () => void; onCancel?: () => void;
}) {
  const fill = useRef<HTMLSpanElement>(null);
  const phase = stage?.toLowerCase() ?? "";
  // Stage estimates, not downloaded-byte percentages. Completion requires real
  // geometry, physics, shader warmup and camera arrival, not an elapsed timer.
  const target = ready ? 1 : phase.includes("camera") ? .98 : phase.includes("scene") ? .94 :
    phase.includes("puzzle") ? .76 : phase.includes("geometry") ? .52 : .22;
  useLayoutEffect(() => {
    const bar = fill.current;
    if (!bar || error) return;
    let active = true;
    const transform = getComputedStyle(bar).transform;
    const previous = transform === "none" ? 0 : new DOMMatrixReadOnly(transform).a;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Compositor transforms continue during synchronous scene construction.
    const animation = bar.animate([{ transform: `scaleX(${previous})` }, { transform: `scaleX(${Math.max(previous, target)})` }], {
      duration: reduced ? 0 : ready ? 300 : 2400,
      easing: ready ? "ease-in-out" : "cubic-bezier(.15,.45,.3,1)", fill: "forwards",
    });
    void animation.finished.then(() => { if (active && ready) onFinished?.(); }).catch(() => {});
    return () => {
      active = false;
      bar.style.transform = getComputedStyle(bar).transform;
      animation.cancel();
    };
  }, [target, ready, error, onFinished]);
  return <div className={`level-loading-screen${ready ? " loading-finished" : ""}`}><section className="level-loading-card" aria-label={`Loading ${title}`} aria-busy={!error && !ready}>
    {!error && <div className="screw-loader" aria-hidden="true">{[0, 1, 2].map(index =>
      <span className="loader-screw" key={index}><span className="loader-screw-turn"><ScrewCross /></span></span>)}
    </div>}
    <small>{error ? "A little snag" : ready ? "Ready to play" : "Getting things screwed in"}</small>
    <strong>{title}</strong>
    {!error && <div className="screw-loading-track" role="progressbar" aria-label="Preparing level" aria-valuemin={0} aria-valuemax={100}
      aria-valuenow={ready ? 100 : undefined} aria-valuetext={ready ? "Ready" : stage ?? "Downloading level"}><span ref={fill} /></div>}
    <p role="status">{error ?? (ready ? "All screwed in!" : `${stage ?? "Preparing graphics"}…`)}</p>
    {error && <button className="room-button" onClick={() => location.reload()}>Reload game</button>}
    {onCancel && <button className="room-button secondary" onClick={onCancel}>Back to levels</button>}
  </section></div>;
}
