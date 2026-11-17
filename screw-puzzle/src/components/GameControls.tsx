import { useRef } from "react";
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
  function showHelp() {
    const dialog = help.current;
    if (!dialog) return;
    dialog.showModal();
    dialog.scrollTop = 0;
  }
  return <>
    <div className="game-controls" role="group" aria-label="Game controls">
      <button className="icon-button" type="button" onClick={showHelp} aria-label="How to play"
        aria-haspopup="dialog" aria-controls="game-help" title="How to play">
        <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 10h.01M14 15h2v7m-2 0h4" /></svg>
      </button>
      {leaderboardLevel && <SoloLeaderboard activeLevel={leaderboardLevel} />}
      <AudioButton channel="music" muted={muted.music} onToggle={() => toggle("music")} />
      <AudioButton channel="effects" muted={muted.effects} onToggle={() => toggle("effects")} />
      {onReset && <button className="icon-button" disabled={resetDisabled} onClick={onReset} aria-label="Reset level and return to title" title="Reset game">
        <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M7 13a10 10 0 1 1 0 7M7 6v7h7" /></svg>
      </button>}
      {onLeave && <button className="icon-button" onClick={onLeave} aria-label="Leave room" title="Leave room">
        <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M15 5H7a2 2 0 0 0-2 2v18a2 2 0 0 0 2 2h8m-3-11h15m-6-6 6 6-6 6" /></svg>
      </button>}
    </div>
    <HelpDialog dialogRef={help} />
  </>;
}
