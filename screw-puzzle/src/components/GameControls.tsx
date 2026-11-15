import type { AudioChannel } from "../game/audio";
import AudioButton from "./AudioButton";

export default function GameControls({ muted, toggle, onReset, onLeave, resetDisabled }: {
  muted: Record<AudioChannel, boolean>; toggle: (channel: AudioChannel) => void;
  onReset?: () => void; onLeave?: () => void; resetDisabled?: boolean;
}) {
  return <div className="game-controls" role="group" aria-label="Game controls">
    <AudioButton channel="music" muted={muted.music} onToggle={() => toggle("music")} />
    <AudioButton channel="effects" muted={muted.effects} onToggle={() => toggle("effects")} />
    {onReset && <button className="icon-button" disabled={resetDisabled} onClick={onReset} aria-label="Reset level and return to title" title="Reset game">
      <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M7 13a10 10 0 1 1 0 7M7 6v7h7" /></svg>
    </button>}
    {onLeave && <button className="icon-button" onClick={onLeave} aria-label="Leave room" title="Leave room">
      <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M15 5H7a2 2 0 0 0-2 2v18a2 2 0 0 0 2 2h8m-3-11h15m-6-6 6 6-6 6" /></svg>
    </button>}
  </div>;
}
