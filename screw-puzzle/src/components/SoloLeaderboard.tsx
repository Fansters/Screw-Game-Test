import { useRef, useState } from "react";
import { readSoloTimes, SOLO_TIMES_LIMIT } from "../game/leaderboard";
import { CAMPAIGN_LEVELS } from "../game/campaign";
import type { LevelId } from "../game/campaign";
import { formatRunTime } from "../game/runTime";
import type { SoloTime } from "../game/leaderboard";

const scoreDate = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" });

const trophy = <path d="M11 6h10v7a5 5 0 0 1-10 0V6Zm0 3H6v2a5 5 0 0 0 5 5m10-7h5v2a5 5 0 0 1-5 5m-5 2v7m-5 1h10" />;

export default function SoloLeaderboard({ activeLevel }: { activeLevel: LevelId }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [times, setTimes] = useState<SoloTime[]>([]);
  const [level, setLevel] = useState(activeLevel);

  function showLeaderboard() {
    setLevel(activeLevel);
    setTimes(readSoloTimes(activeLevel));
    dialog.current?.showModal();
    if (dialog.current) dialog.current.scrollTop = 0;
  }

  return <>
    <button className="icon-button" type="button" onClick={showLeaderboard} aria-label="Solo leaderboard"
      aria-haspopup="dialog" aria-controls="solo-leaderboard" title="Solo leaderboard">
      <svg viewBox="0 0 32 32" aria-hidden="true">{trophy}</svg>
    </button>
    <dialog ref={dialog} id="solo-leaderboard" className="help-dialog leaderboard-dialog" aria-labelledby="leaderboard-title">
      <header className="help-header leaderboard-header">
        <span className="leaderboard-trophy" aria-hidden="true"><svg viewBox="0 0 32 32">{trophy}</svg></span>
        <h2 id="leaderboard-title">Solo leaderboard</h2>
        <form method="dialog">
          <button className="icon-button" type="submit" aria-label="Close leaderboard" autoFocus>
            <svg viewBox="0 0 32 32" aria-hidden="true"><path d="m9 9 14 14M23 9 9 23" /></svg>
          </button>
        </form>
      </header>
      <div className="help-content leaderboard-content">
        <label className="leaderboard-level">Level
          <select value={level} onChange={(event) => {
            const id = event.target.value as LevelId;
            setLevel(id);
            setTimes(readSoloTimes(id));
          }}>
            {CAMPAIGN_LEVELS.map(({ id, title }) => <option key={id} value={id}>{title}</option>)}
          </select>
        </label>
        {times.length ? <table className="leaderboard-times">
          <caption>Top {SOLO_TIMES_LIMIT} solo clears in this browser</caption>
          <thead><tr><th scope="col">Rank</th><th scope="col">Time</th><th scope="col">Date</th></tr></thead>
          <tbody>{times.map(({ elapsedMs, completedAt }, index) =>
            <tr key={`${completedAt}:${elapsedMs}:${index}`}>
              <th scope="row"><span className="leaderboard-rank">{index + 1}</span></th>
              <td>{formatRunTime(elapsedMs, true)}</td>
              <td><time dateTime={new Date(completedAt).toISOString()}>{scoreDate.format(completedAt)}</time></td>
            </tr>)}</tbody>
        </table> : <p className="leaderboard-empty">Finish a solo round to set your first time.</p>}
      </div>
    </dialog>
  </>;
}
