import PixelWord from "./PixelWord";
import { TRAY_CAPACITY } from "../game/rules";

export default function GameOverlay({ mode, onStart, onRestart }: {
  mode: "loading" | "start" | "lost" | "won" | null; onStart: () => void; onRestart?: () => void;
}) {
  if (!mode) return null;
  if (mode === "loading") return <div className="game-overlay loading"><span className="loading-spinner" role="status" aria-label="Loading level" /></div>;
  return <div className={`game-overlay ${mode}`} role={mode === "start" ? undefined : "dialog"} aria-label={mode === "lost" ? "You lost" : mode === "won" ? "House cleared" : undefined}>
    {mode === "start" ? <button className="word-button start-word" type="button" aria-label="Start" onClick={onStart}><PixelWord text="START" /></button> :
      <div className="end-words">
        {mode === "lost" && <div className="loss-tray" aria-hidden="true">
          {Array.from({ length: TRAY_CAPACITY }, (_, index) => <span key={index}>+</span>)}
        </div>}
        <div className={`result-word ${mode}`}><span className="sr-only">{mode === "lost" ? "You lost" : "House cleared"}</span><PixelWord text={mode === "lost" ? "YOU\nLOST" : "HOUSE\nCLEARED"} /></div>
        {mode === "lost" && <p className="loss-caption">The cottage wins this round.</p>}
        {onRestart && <button className="word-button again-word" type="button" aria-label="Play again" onClick={onRestart}><PixelWord text="AGAIN" /></button>}
      </div>}
  </div>;
}
