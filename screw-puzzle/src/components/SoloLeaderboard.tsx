import { useEffect, useRef, useState } from "react";
import { CAMPAIGN_LEVELS } from "../game/campaign";
import type { LevelId } from "../game/types";
import { readSoloTimes, SOLO_TIMES_LIMIT } from "../game/leaderboard";
import { formatRunTime } from "../game/runTime";
import type { CasualBoard, CasualEntry } from "../game/casualLeaderboard";
import { readOnlineBoard, retryFinishes } from "../online/casualScores";
import { SCORES_CHANGED } from "../online/scoreOutbox";
import { useAccountCard } from "./accountContext";
import { usePendingFinishes } from "./usePendingFinishes";

const scoreDate = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
const trophy = <path d="M11 6h10v7a5 5 0 0 1-10 0V6Zm0 3H6v2a5 5 0 0 0 5 5m10-7h5v2a5 5 0 0 1-5 5m-5 2v7m-5 1h10" />;
function OnlineRow({ entry }: { entry: CasualEntry }) {
  return <tr className={entry.isYou ? "leaderboard-you" : undefined}>
    <th scope="row"><span className="leaderboard-rank">{entry.rank}</span></th>
    <td><span className="leaderboard-name">{entry.nickname}{entry.isYou && <small> · You</small>}</span>
      <small className="leaderboard-details">Extra boxes {entry.extraBoxUses} · Hints {entry.findMatchUses}{entry.resumed ? " · Resumed" : ""}</small></td>
    <td><strong>{formatRunTime(entry.elapsedMs, true)}</strong></td>
  </tr>;
}
export default function SoloLeaderboard({ activeLevel, launcherClass = "icon-button" }: { activeLevel: LevelId; launcherClass?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [visible, setVisible] = useState(false), [tab, setTab] = useState<"online" | "local">("online");
  const [level, setLevel] = useState(activeLevel), [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{level: LevelId; accountId: string | null; board?: CasualBoard; error?: string} | null>(null);
  const account = useAccountCard(), pending = usePendingFinishes();
  const relevant = pending.filter(item => item.finish.level === level);
  const times = visible ? readSoloTimes(level) : [];
  useEffect(() => {
    if (!visible || tab !== "online") return;
    const controller = new AbortController();
    void readOnlineBoard(level,controller.signal).then(board => {
      if (!controller.signal.aborted) setResult({level,accountId:account.playerId,board});
    }).catch(() => { if (!controller.signal.aborted) setResult({level,accountId:account.playerId,error:"Couldn’t load the online times. Try again in a moment."}); });
    return () => controller.abort();
  },[visible,tab,level,account.playerId,revision]);
  useEffect(() => {
    if (!visible || tab !== "online") return;
    const refresh = () => { setResult(null); setRevision(value => value + 1); };
    window.addEventListener(SCORES_CHANGED,refresh);
    const interval = window.setInterval(refresh,30000);
    return () => { window.removeEventListener(SCORES_CHANGED,refresh); clearInterval(interval); };
  },[visible,tab]);
  function showLeaderboard() { setLevel(activeLevel); setResult(null); setVisible(true); dialog.current?.showModal(); if (dialog.current) dialog.current.scrollTop=0; }
  const currentResult = result?.level === level && result.accountId === account.playerId ? result : null;
  const board = currentResult?.board;
  const error = currentResult?.error;
  return <>
    <button className={launcherClass} type="button" onClick={showLeaderboard} aria-label="Solo leaderboard" aria-haspopup="dialog" aria-controls="solo-leaderboard" title="Solo leaderboard">
      <svg viewBox="0 0 32 32" aria-hidden="true">{trophy}</svg>{launcherClass !== "icon-button" && <span>Leaderboard</span>}
    </button>
    <dialog ref={dialog} id="solo-leaderboard" className="help-dialog leaderboard-dialog" aria-labelledby="leaderboard-title" onClose={() => setVisible(false)}>
      <header className="help-header leaderboard-header">
        <span className="leaderboard-trophy" aria-hidden="true"><svg viewBox="0 0 32 32">{trophy}</svg></span><h2 id="leaderboard-title">Solo leaderboard</h2>
        <form method="dialog"><button className="icon-button" type="submit" aria-label="Close leaderboard" autoFocus><svg viewBox="0 0 32 32" aria-hidden="true"><path d="m9 9 14 14M23 9 9 23" /></svg></button></form>
      </header>
      <div className="help-content leaderboard-content">
        <div className="leaderboard-tabs" role="group" aria-label="Leaderboard source">
          <button type="button" aria-pressed={tab === "online"} onClick={() => setTab("online")}>Online</button>
          <button type="button" aria-pressed={tab === "local"} onClick={() => setTab("local")}>This device</button>
        </div>
        <label className="leaderboard-level">Level<select value={level} onChange={event => { setLevel(event.target.value as LevelId); setResult(null); }}>
          {CAMPAIGN_LEVELS.map(({id,title}) => <option key={id} value={id}>{title}</option>)}
        </select></label>
        {tab === "online" ? <>
          <p className="leaderboard-note">Best time per player · All abilities welcome · Resumed runs count</p>
          {relevant.length > 0 && <div className="leaderboard-pending" role="status">
            <p>{relevant.some(item => item.status === "name") ? "Choose your public name to publish your finished time." : relevant.some(item => item.status === "failed") ? "An online result needs attention. Your local time is safe." : "Your finished time is waiting to upload. We’ll retry automatically."}</p>
            {relevant.some(item => item.status === "name") ? <button type="button" onClick={account.open}>Choose a name</button> : <button type="button" onClick={() => { if (account.playerId) void retryFinishes(account.playerId).catch(() => {}); }}>Retry upload</button>}
          </div>}
          {!board && !error && <p className="leaderboard-empty" role="status">Finding the fastest screw solvers…</p>}
          {error && <div className="leaderboard-empty" role="status"><p>{error}</p><button type="button" onClick={() => { setResult(null); setRevision(v => v + 1); }}>Try again</button></div>}
          {board && (!board.open ? <p className="leaderboard-empty">This layout’s board isn’t open yet.</p> : <>
            {board.entries.length ? <table className="leaderboard-times online-times"><caption>Top 10 · {board.players} {board.players === 1 ? "player" : "players"}</caption>
              <thead><tr><th scope="col" aria-label="Rank">#</th><th scope="col">Player</th><th scope="col">Time</th></tr></thead>
              <tbody>{board.entries.map(entry => <OnlineRow key={entry.rank+":"+entry.nickname} entry={entry} />)}</tbody>
            </table> : <p className="leaderboard-empty">The first spot is waiting for you! Finish this world while signed in with Google.</p>}
            {board.personal && !board.entries.some(entry => entry.isYou) && <table className="leaderboard-times online-times"><caption>Your best</caption><tbody><OnlineRow entry={board.personal} /></tbody></table>}
            <p className="leaderboard-note">Equal times share a rank. Fresh random puzzles keep each attempt different.</p>
          </>)}
          {!account.playerId && <div className="leaderboard-signin"><p>Play freely as a guest. Sign in with Google before you finish to join the online board. Earlier guest times stay on this device.</p><button type="button" onClick={account.open}>Sign in with Google</button></div>}
        </> : times.length ? <table className="leaderboard-times"><caption>Top {SOLO_TIMES_LIMIT} solo clears in this browser</caption><thead><tr><th scope="col">Rank</th><th scope="col">Time</th><th scope="col">Date</th></tr></thead>
          <tbody>{times.map(({elapsedMs,completedAt},index) => <tr key={completedAt+":"+elapsedMs+":"+index}><th scope="row"><span className="leaderboard-rank">{index+1}</span></th><td>{formatRunTime(elapsedMs,true)}</td><td><time dateTime={new Date(completedAt).toISOString()}>{scoreDate.format(completedAt)}</time></td></tr>)}</tbody>
        </table> : <p className="leaderboard-empty">Finish a solo round to set your first time.</p>}
      </div>
    </dialog>
  </>;
}
