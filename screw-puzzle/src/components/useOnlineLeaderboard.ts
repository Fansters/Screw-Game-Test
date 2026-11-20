import { useEffect, useState } from "react";
import type { LevelId } from "../game/types";
import type { CasualBoard } from "../game/casualLeaderboard";
import { PROFILE_CHANGED, readOnlineBoard } from "../online/casualScores";
import { SCORES_CHANGED } from "../online/scoreOutbox";
import { useAccountCard } from "./accountContext";

type Result = { level: LevelId; playerId: string | null; revision: number; board?: CasualBoard; error?: string };
export function useOnlineLeaderboard(level: LevelId) {
  const { playerId } = useAccountCard();
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void readOnlineBoard(level, controller.signal).then(board => {
      if (!controller.signal.aborted) setResult({ level, playerId, revision, board });
    }).catch(() => {
      if (!controller.signal.aborted) setResult(previous => ({ level, playerId, revision,
        board: previous?.level === level && previous.playerId === playerId ? previous.board : undefined,
        error: "Couldn’t load the leaderboard. Please try again." }));
    });
    return () => controller.abort();
  }, [level, playerId, revision]);
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === "visible") setRevision(value => value + 1); };
    window.addEventListener(SCORES_CHANGED, refresh);
    window.addEventListener(PROFILE_CHANGED, refresh);
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", refresh);
    const interval = window.setInterval(refresh, 30000);
    return () => {
      window.removeEventListener(SCORES_CHANGED, refresh);
      window.removeEventListener(PROFILE_CHANGED, refresh);
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", refresh);
      clearInterval(interval);
    };
  }, []);
  const current = result?.level === level && result.playerId === playerId ? result : null;
  return { board: current?.board, error: current?.error, loading: current?.revision !== revision,
    refresh: () => setRevision(value => value + 1) };
}
