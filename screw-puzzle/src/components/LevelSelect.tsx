import { useEffect, useRef, useState } from "react";
import { CAMPAIGN_LEVELS, levelStatus, readLevelProgress } from "../game/campaign";
import type { LevelId } from "../game/campaign";
import { readSoloSave } from "../game/soloSave";
import { readSoloTimes } from "../game/leaderboard";
import { formatRunTime } from "../game/runTime";

export default function LevelSelect({ onBack, onSelect, mode = "solo" }: {
  onBack: () => void; onSelect: (level: LevelId) => void; mode?: "solo" | "multiplayer";
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [completed] = useState(readLevelProgress);
  const [details] = useState(() => CAMPAIGN_LEVELS.map(({ id }) => ({
    save: mode === "solo" ? readSoloSave(id) : null, best: mode === "solo" ? readSoloTimes(id)[0] : undefined,
  })));
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  return <dialog ref={dialog} className="help-dialog level-select" aria-labelledby="level-select-title"
    onCancel={(event) => { event.preventDefault(); onBack(); }}>
    <header className="help-header level-select-header">
      <h2 id="level-select-title">Choose a level</h2>
      <button className="room-button secondary" type="button" onClick={onBack}>Back</button>
    </header>
    <ol className="level-list">
      {CAMPAIGN_LEVELS.map(({ id, title }, index) => {
        const status = levelStatus(index, completed);
        const playable = status === "playable";
        const { save, best } = details[index];
        const removed = save?.moves.filter((move) => move !== "boost").length ?? 0;
        return <li key={id}>
          <button className="level-card" type="button" disabled={!playable} autoFocus={index === 0}
            aria-describedby={`level-${id}-status`} onClick={() => onSelect(id)}>
            <span className="level-number" aria-label={`Level ${index + 1}`}>{index + 1}</span>
            <span className="level-card-copy">
              <strong>{title}</strong>
              <span id={`level-${id}-status`}>
                {status === "locked" ? `Clear level ${index} to unlock` :
                  status === "coming-soon" ? "Coming soon" : save ? `Resume · ${removed} ${removed === 1 ? "screw" : "screws"} removed` :
                    completed.has(id) ? "Cleared · Play again" : "Ready to play"}
              </span>
              {playable && best && <span>Best {formatRunTime(best.elapsedMs, true)}</span>}
            </span>
            <span className={`level-indicator ${playable ? "play" : status === "locked" ? "locked" : "pending"}`} aria-hidden="true" />
          </button>
        </li>;
      })}
    </ol>
  </dialog>;
}
