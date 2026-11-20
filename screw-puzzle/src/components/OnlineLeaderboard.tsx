import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import type { LevelId } from "../game/types";
import type { CasualEntry } from "../game/casualLeaderboard";
import { formatRunTime } from "../game/runTime";
import { retryFinishes } from "../online/casualScores";
import { useAccountCard } from "./accountContext";
import { usePendingFinishes } from "./usePendingFinishes";
import { useOnlineLeaderboard } from "./useOnlineLeaderboard";

export type FinishReceipt = { runId: string; playerId: string | null; error: boolean };
function OnlineRow({ entry, ownRow }: { entry: CasualEntry; ownRow: RefObject<HTMLTableRowElement | null> }) {
  return <tr ref={entry.isYou ? ownRow : undefined} className={entry.isYou ? "leaderboard-you" : undefined} aria-label={entry.isYou ? "Your best result" : undefined}>
    <th scope="row"><span className="leaderboard-rank">{entry.rank}</span></th>
    <td><span className="leaderboard-name">{entry.nickname}{entry.isYou && <small> · You</small>}</span>
      <small className="leaderboard-details">Extra boxes {entry.extraBoxUses} · Hints {entry.findMatchUses}{entry.resumed ? " · Resumed" : ""}</small></td>
    <td><strong>{formatRunTime(entry.elapsedMs, true)}</strong></td>
  </tr>;
}
export default function OnlineLeaderboard({ level, finish }: { level: LevelId; finish?: FinishReceipt & { elapsedMs: number } }) {
  const account = useAccountCard();
  const { board, error, loading, refresh } = useOnlineLeaderboard(level);
  const pending = usePendingFinishes().filter(item => item.finish.level === level && (!finish || item.finish.runId === finish.runId));
  const needsName = pending.some(item => item.status === "name"), failed = pending.some(item => item.status === "failed");
  const sameAccount = Boolean(finish?.playerId && finish.playerId === account.playerId);
  const ownRow = useRef<HTMLTableRowElement>(null), centered = useRef<string | null>(null);
  const runId = finish?.runId;
  const canCenter = Boolean(finish && sameAccount && !finish.error && !pending.length && !loading && !error);
  useEffect(() => {
    if (!canCenter || !runId || centered.current === runId || !ownRow.current) return;
    const row = ownRow.current, container = row.closest<HTMLElement>(".win-leaderboard");
    if (!container) return;
    centered.current = runId;
    const bounds = container.getBoundingClientRect(), target = row.getBoundingClientRect();
    if (target.top >= bounds.top + 48 && target.bottom <= bounds.bottom - 8) return;
    // Move only the card, once per finish. Refreshes must not fight manual scrolling.
    container.scrollTo({ top: container.scrollTop + target.top - bounds.top - (container.clientHeight - target.height) / 2,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }, [canCenter, runId, board]);
  return <div className="online-leaderboard">
    {!finish && <p className="leaderboard-note">Best time per player · All abilities welcome · Resumed runs count</p>}
    {finish?.error && <p className="leaderboard-pending" role="status">Couldn’t queue this result for upload. Your finishing time is shown above.</p>}
    {finish?.playerId && !sameAccount && <p className="leaderboard-pending">Sign back into the account that finished this run to see its result.</p>}
    {pending.length > 0 && <div className="leaderboard-pending" role="status">
      <p>{needsName ? "Choose your public name to publish your time." : failed ? "This result couldn’t be published. Check your connection and try again." : "Adding your time to the leaderboard… We’ll retry if you’re offline."}</p>
      {needsName ? <button type="button" onClick={account.open}>Choose a name</button> : <button type="button" onClick={() => { if (account.playerId) void retryFinishes(account.playerId).catch(() => {}); }}>Retry upload</button>}
    </div>}
    {!board && !error && <p className="leaderboard-empty" role="status">Finding the fastest screw solvers…</p>}
    {error && <div className="leaderboard-error" role="status"><p>{error}</p><button type="button" disabled={loading} onClick={refresh}>{loading ? "Trying again…" : "Try again"}</button></div>}
    {board && (!board.open ? <p className="leaderboard-empty">This layout’s board isn’t open yet.</p> : <>
      {finish && sameAccount && !finish.error && !pending.length && !loading && !error && board.personal && <p className="leaderboard-finish-summary" role="status">
        {Math.round(finish.elapsedMs) === board.personal.elapsedMs ? board.entries.some(entry => entry.isYou) ? `You made the board! #${board.personal.rank}` : `Your best is #${board.personal.rank}. Keep chasing the top 10!` : `Your best remains ${formatRunTime(board.personal.elapsedMs, true)} · #${board.personal.rank}`}
      </p>}
      {board.entries.length ? <table className="leaderboard-times online-times"><caption>Top 10 · {board.players} {board.players === 1 ? "player" : "players"}</caption>
        <thead><tr><th scope="col" aria-label="Rank">#</th><th scope="col">Player</th><th scope="col">Time</th></tr></thead>
        <tbody>{board.entries.map(entry => <OnlineRow key={entry.rank + ":" + entry.nickname} entry={entry} ownRow={ownRow} />)}</tbody>
      </table> : <p className="leaderboard-empty">The first spot is waiting for you! Finish this world while signed in with Google.</p>}
      {board.personal && !board.entries.some(entry => entry.isYou) && <table className="leaderboard-times online-times"><caption>Your best · outside the top 10</caption><tbody><OnlineRow entry={board.personal} ownRow={ownRow} /></tbody></table>}
      {!finish && <p className="leaderboard-note">Equal times share a rank. Fresh random puzzles keep each attempt different.</p>}
    </>)}
    {((finish && !finish.playerId) || (!finish && !account.playerId)) && <div className="leaderboard-signin">
      <p>{finish ? "This run was played as a guest. Sign in before your next finish to save a time." : "Everyone can play and view the board. Sign in with Google before you finish to save your time."}</p>
      {!account.playerId && <button type="button" onClick={account.open}>Sign in with Google</button>}
    </div>}
  </div>;
}
