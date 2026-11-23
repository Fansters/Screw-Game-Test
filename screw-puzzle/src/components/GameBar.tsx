import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { levelIdentity } from "../game/campaign";
import type { LevelId } from "../game/types";

const tips = [
  { name: "Extra box", icon: <path d="m17 4-9 14h7l-1 10 10-15h-8z" />, text: "Open a third matching box. It stays until you fill it.", tone: "gold" },
  { name: "Find a match", icon: <><circle cx="14" cy="14" r="8" /><path d="m20 20 8 8M14 9v10M9 14h10" /></>, text: "Spot a reachable match. Use Show me for a better angle, then tap the screw.", tone: "mint" },
];

export default function GameBar({ level, progress, lifelines, canBoost, onBoost, onResetCamera, canResetCamera, abilities, players, ping, connection, shared = false }: {
  level: LevelId; progress: ReactNode; lifelines: number; canBoost: boolean; onBoost: () => void;
  abilities: ReactNode; players?: ReactNode; ping?: ReactNode; connection?: ReactNode; shared?: boolean;
  onResetCamera: () => void; canResetCamera: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const rootRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const identity = levelIdentity(level);
  const number = identity?.number ?? 1, title = identity?.title;
  useEffect(() => {
    if (!expanded) return;
    const controller = new AbortController();
    document.addEventListener("pointerdown", (event) => {
      if (!rootRef.current?.contains(event.target as Node)) setExpanded(false);
    }, { capture: true, signal: controller.signal });
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      setExpanded(false);
      toggleRef.current?.focus({ preventScroll: true });
    }, { signal: controller.signal });
    return () => controller.abort();
  }, [expanded]);
  return <nav ref={rootRef} className={`game-navbar${expanded ? " abilities-expanded" : ""}${shared ? " shared-navbar" : ""}`} aria-label="Game status and abilities">
    <section id={panelId} className="ability-guide" aria-label="Ability details" inert={!expanded}>
      <div className="ability-tips">{tips.map((tip) => <article className={`ability-tip ${tip.tone}`} key={tip.name}>
        <span className="ability-tip-icon"><svg viewBox="0 0 32 32" aria-hidden="true">{tip.icon}</svg></span>
        <div><h3>{tip.name}</h3><p>{tip.text}</p></div>
      </article>)}</div>
      <p className="ability-guide-note">Extra box: 3 uses. Find a match: unlimited · 1-minute cooldown.{shared && " Leader activates for the team."}</p>
    </section>
    <div className="navbar-progress">{progress}{players}</div>
    <div className="navbar-actions">
      <button className="camera-reset-button icon-button" type="button" disabled={!canResetCamera} aria-label="Reset camera" title="Reset camera" onClick={() => { setExpanded(false); onResetCamera(); }}>
        <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M10 5H5v5m17-5h5v5M5 22v5h5m17-5v5h-5M10 15a7 7 0 1 1 2 6m-2-6h5m-5 0v-5" /></svg>
      </button>
    <section className="ability-hub" aria-label="Abilities">
      <button ref={toggleRef} className="ability-expand" aria-expanded={expanded} aria-controls={panelId}
        aria-label={expanded ? "Hide ability details" : "Show ability details"} onClick={() => setExpanded((open) => !open)}>
        <span>Abilities</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 14 5-5 5 5" /></svg>
      </button>
      <div className="ability-row" onClickCapture={() => setExpanded(false)}>
        <button className="lifeline-button icon-button" onClick={onBoost} disabled={!canBoost}
          aria-label={`Open a lifeline box, ${lifelines} remaining`} title="Extra box">
          <svg viewBox="0 0 32 32" aria-hidden="true"><path d="m17 4-9 14h7l-1 10 10-15h-8z" /></svg><span>{lifelines}</span>
        </button>
        {abilities}
      </div>
    </section>
    </div>
    <div className="navbar-level">
      <span className={`level-indicator-hud level-${identity?.difficulty}`} aria-label={`Current ${identity?.difficulty} level ${number}: ${title}`}><strong>Level {number}</strong><span className="level-difficulty">{identity?.difficulty}</span></span>
      {ping && <div className="navbar-ping" onClickCapture={() => setExpanded(false)}>{ping}</div>}
      {connection}
    </div>
  </nav>;
}
