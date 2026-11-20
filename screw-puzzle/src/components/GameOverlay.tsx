import PixelWord from "./PixelWord";
import type { ReactNode } from "react";
import { TRAY_CAPACITY } from "../game/rules";
import { formatRunTime } from "../game/runTime";

export default function GameOverlay({ mode, onStart, onRestart, onLevels, elapsedMs, finishNotice, timeLabel = "Your time", levelTitle = "The cottage" }: {
  mode: "loading" | "start" | "lost" | "won" | null; onStart: () => void; onRestart?: () => void;
  onLevels?: () => void; elapsedMs?: number; finishNotice?: ReactNode; timeLabel?: string; levelTitle?: string;
}) {
  if (!mode) return null;
  if (mode === "loading") return <div className="game-overlay loading"><span className="loading-spinner" role="status" aria-label="Loading level" /></div>;
  return <div className={`game-overlay ${mode}`} role={mode === "start" ? undefined : "dialog"} aria-label={mode === "lost" ? "You lost" : mode === "won" ? "Level cleared" : undefined}>
    {mode === "start" ? <button className="word-button start-word" type="button" aria-label="Start" onClick={onStart} autoFocus><span className="start-label">Start</span></button> :
      <div className="end-words">
        {mode === "lost" && <div className="loss-tray" aria-hidden="true">
          {Array.from({ length: TRAY_CAPACITY }, (_, index) => <span key={index}>+</span>)}
        </div>}
        <div className={`result-word ${mode}`}><span className="sr-only">{mode === "lost" ? "You lost" : "Congratulations!"}</span><PixelWord text={mode === "lost" ? "YOU\nLOST" : "CONGRATULATIONS!"} /></div>
        {mode === "won" && elapsedMs !== undefined && <p className="finish-time">
          <span>{timeLabel}</span> <strong>{formatRunTime(elapsedMs, true)}</strong>
        </p>}
        {mode === "won" && finishNotice}
        {mode === "lost" && <p className="loss-caption">{levelTitle} wins this round.</p>}
        {(onRestart || (mode === "won" && onLevels)) && <div className="result-actions">
          {onRestart && <button className="word-button again-word" type="button" aria-label="Play again" onClick={onRestart}><PixelWord text="AGAIN" /></button>}
          {mode === "won" && onLevels && <button className="room-button" type="button" onClick={onLevels}>Levels</button>}
        </div>}
      </div>}
  </div>;
}
