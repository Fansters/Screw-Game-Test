import { useRef, useState } from "react";
import { CAMPAIGN_LEVELS, DIFFICULTIES, levelsForDifficulty } from "../game/campaign";
import type { LevelId } from "../game/types";
import OnlineLeaderboard from "./OnlineLeaderboard";
import { useBackdropDismiss } from "./useBackdropDismiss";
const trophy = <path d="M11 6h10v7a5 5 0 0 1-10 0V6Zm0 3H6v2a5 5 0 0 0 5 5m10-7h5v2a5 5 0 0 1-5 5m-5 2v7m-5 1h10" />;

export default function SoloLeaderboard({ activeLevel, allowLevelSelection = false, launcherClass = "icon-button" }: {
  activeLevel: LevelId; allowLevelSelection?: boolean; launcherClass?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [visible, setVisible] = useState(false), [selected, setSelected] = useState(activeLevel);
  const level = allowLevelSelection ? selected : activeLevel;
  const title = CAMPAIGN_LEVELS.find(world => world.id === level)!.title;
  const backdrop = useBackdropDismiss(() => dialog.current?.close());
  function show() { setSelected(activeLevel); setVisible(true); dialog.current?.showModal(); if (dialog.current) dialog.current.scrollTop = 0; }
  return <>
    <button className={launcherClass} type="button" onClick={show} aria-label="Solo leaderboard" aria-haspopup="dialog" aria-controls="solo-leaderboard" title="Solo leaderboard">
      {launcherClass === "icon-button" ? <svg viewBox="0 0 32 32" aria-hidden="true">{trophy}</svg> : <span>Leaderboard</span>}
    </button>
    <dialog ref={dialog} {...backdrop} id="solo-leaderboard" className="help-dialog leaderboard-dialog player-card-dialog" aria-labelledby="leaderboard-title" onClose={() => setVisible(false)}>
      <header className="help-header leaderboard-header">
        <span className="leaderboard-trophy" aria-hidden="true"><svg viewBox="0 0 32 32">{trophy}</svg></span><h2 id="leaderboard-title">Leaderboard</h2>
        <form method="dialog"><button className="icon-button card-close" type="submit" aria-label="Close leaderboard" autoFocus><svg viewBox="0 0 32 32" aria-hidden="true"><path d="m9 9 14 14M23 9 9 23" /></svg></button></form>
      </header>
      <div className="help-content leaderboard-content">
        {allowLevelSelection ? <label className="leaderboard-level">Level<select value={level} onChange={event => setSelected(event.target.value as LevelId)}>
          {DIFFICULTIES.map(difficulty => <optgroup key={difficulty} label={difficulty[0].toUpperCase() + difficulty.slice(1)}>{levelsForDifficulty(difficulty).map(({id,title},index) => <option key={id} value={id}>Level {index + 1} · {title}</option>)}</optgroup>)}
        </select></label> : <h3 className="leaderboard-world">{title}</h3>}
        {visible && <OnlineLeaderboard level={level} />}
      </div>
    </dialog>
  </>;
}
