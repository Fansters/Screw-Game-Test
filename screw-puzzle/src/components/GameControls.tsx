import { Children, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { CSSProperties } from "react";
import type { AudioChannel } from "../game/audio";
import type { LevelId } from "../game/campaign";
import AudioButton from "./AudioButton";
import HelpDialog from "./HelpDialog";
import SoloLeaderboard from "./SoloLeaderboard";

export default function GameControls({ muted, toggle, onReset, onLeave, resetDisabled, leaderboardLevel }: {
  muted: Record<AudioChannel, boolean>; toggle: (channel: AudioChannel) => void;
  onReset?: () => void; onLeave?: () => void; resetDisabled?: boolean;
  leaderboardLevel?: LevelId;
}) {
  const help = useRef<HTMLDialogElement>(null);
  const controls = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const compact = useSyncExternalStore(subscribeCompact, isCompact);
  useEffect(() => {
    if (!expanded) return;
    const close = (event: PointerEvent) => {
      if (!controls.current?.contains(event.target as Node)) setExpanded(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [expanded]);
  function showHelp() {
    const dialog = help.current;
    if (!dialog) return;
    dialog.showModal();
    dialog.scrollTop = 0;
  }
  const buttons = Children.toArray([
      <button className="icon-button" type="button" onClick={showHelp} aria-label="How to play"
        aria-haspopup="dialog" aria-controls="game-help" title="How to play">
        <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 10h.01M14 15h2v7m-2 0h4" /></svg>
      </button>,
      leaderboardLevel && <SoloLeaderboard key="leaderboard" activeLevel={leaderboardLevel} />,
      <AudioButton key="music" channel="music" muted={muted.music} onToggle={() => toggle("music")} />,
      <AudioButton key="effects" channel="effects" muted={muted.effects} onToggle={() => toggle("effects")} />,
      onReset && <button className="icon-button" disabled={resetDisabled} onClick={onReset} aria-label="Reset level" title="Reset game">
        <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M7 13a10 10 0 1 1 0 7M7 6v7h7" /></svg>
      </button>,
      onLeave && <button className="icon-button" onClick={onLeave} aria-label="Exit game" title="Exit game">
        <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M15 5H7a2 2 0 0 0-2 2v18a2 2 0 0 0 2 2h8m-3-11h15m-6-6 6 6-6 6" /></svg>
      </button>,
  ]);
  return <>
    <div ref={controls} className={`game-controls${expanded ? " expanded" : ""}`} role="group" aria-label="Game controls"
      onKeyDown={(event) => { if (event.key === "Escape") setExpanded(false); }}>
      <button className="icon-button controls-toggle" type="button" aria-label={expanded ? "Close game menu" : "Open game menu"}
        aria-expanded={expanded} aria-controls="game-control-actions" onClick={() => setExpanded((open) => !open)}>
        <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M7 9h18" /><path d="M7 16h18" /><path d="M7 23h18" /></svg>
      </button>
      <div id="game-control-actions" className="control-actions" inert={compact && !expanded}>
        {buttons.map((button, index) => <div key={index} className="control-item" style={{
          "--control-index": index, "--control-reverse": buttons.length - index - 1,
        } as CSSProperties}>{button}</div>)}
      </div>
    </div>
    <HelpDialog dialogRef={help} />
  </>;
}
const compactQuery = window.matchMedia("(max-width: 1024px), (pointer: coarse)");
function isCompact() { return compactQuery.matches; }
function subscribeCompact(callback: () => void) {
  compactQuery.addEventListener("change", callback);
  return () => compactQuery.removeEventListener("change", callback);
}
