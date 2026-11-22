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
    const clipped = getComputedStyle(bar).clipPath.match(/inset\(0(?:px|%)?\s+([\d.]+)%/);
    const previous = clipped ? 1 - Number(clipped[1]) / 100 : 0;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Reveal a full-sized rail rather than stretching its bevels, thread marks
    // and highlights. WAAPI keeps interpolating during scene construction.
    const animation = bar.animate([{ clipPath: `inset(0 ${(1 - previous) * 100}% 0 0)` },
      { clipPath: `inset(0 ${(1 - Math.max(previous, target)) * 100}% 0 0)` }], {
      duration: reduced ? 0 : ready ? 420 : 2400,
      easing: ready ? "ease-in-out" : "cubic-bezier(.15,.45,.3,1)", fill: "forwards",
    });
    void animation.finished.then(() => { if (active && ready) onFinished?.(); }).catch(() => {});
    return () => {
      active = false;
      bar.style.clipPath = getComputedStyle(bar).clipPath;
      animation.cancel();
    };
  }, [target, ready, error, onFinished]);
  const steps = ["World", "Details", "Puzzle", "Polish", "Ready"];
  const step = ready ? 5 : phase.includes("camera") ? 4 : phase.includes("scene") ? 3 : phase.includes("puzzle") ? 2 : phase.includes("geometry") ? 1 : 0;
  return <div className={`level-loading-screen${ready ? " loading-finished" : ""}`}>
    <div className="loading-ambience" aria-hidden="true"><i /><i /><i /></div>
    <section className="level-loading-card" aria-label={`Loading ${title}`} aria-busy={!error && !ready}>
    <span className="loading-brand">Screw it!</span>
    {!error && <div className="assembly-loader" aria-hidden="true">
      <div className="assembly-orbit" /><span className="assembly-spark">✦</span><span className="assembly-spark second">✧</span>
      <div className="assembly-plate"><i /><i /><i /><i />
        {[0, 1, 2].map(index => <span className="assembly-fastener" key={index}>
          <span className="assembly-shaft" /><span className="loader-screw"><span className="loader-screw-turn"><ScrewCross /></span></span>
        </span>)}
      </div>
      <span className="assembly-shadow" />
    </div>}
    <small>{error ? "A little snag" : ready ? "Let’s play" : "Building your next adventure"}</small>
    <strong>{title}</strong>
    {!error && <div className="screw-loading-track" role="progressbar" aria-label="Preparing level" aria-valuemin={0} aria-valuemax={100}
      aria-valuenow={ready ? 100 : undefined} aria-valuetext={ready ? "Ready" : stage ?? "Downloading level"}>
      <span ref={fill} className="screw-loading-fill"><i /></span>
      <span className="loading-rail-bolts" aria-hidden="true">{steps.map(label => <i key={label}><ScrewCross /></i>)}</span>
    </div>}
    {!error && <ol className="loading-milestones" aria-hidden="true">{steps.map((label, index) =>
      <li key={label} data-state={index < step ? "done" : index === step ? "active" : "waiting"}>{label}</li>)}</ol>}
    <p role="status">{error ?? (ready ? "All screwed in!" : `${stage ?? "Preparing graphics"}…`)}</p>
    {error && <button className="room-button" onClick={() => location.reload()}>Reload game</button>}
    {onCancel && <button className="room-button secondary" onClick={onCancel}>Back to levels</button>}
  </section></div>;
}
