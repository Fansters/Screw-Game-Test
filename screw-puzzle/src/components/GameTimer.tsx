import { CAMPAIGN_LEVELS } from "../game/campaign";
import type { LevelId } from "../game/types";
import { useEffect, useState } from "react";
import { formatRunTime } from "../game/runTime";

export default function GameTimer({ level, startedAt, stoppedAt, clock = performance, removed, total, elapsedBefore = 0 }: {
  level: LevelId; startedAt: number | null; stoppedAt: number | null; clock?: { now: () => number }; removed: number; total: number; elapsedBefore?: number;
}) {
  const [now, setNow] = useState(() => clock.now());
  useEffect(() => {
    if (startedAt === null || stoppedAt !== null) return;
    const timer = window.setInterval(() => setNow(clock.now()), 200);
    return () => window.clearInterval(timer);
  }, [startedAt, stoppedAt, clock]);
  const text = formatRunTime(elapsedBefore + (startedAt === null ? 0 : Math.max(0, (stoppedAt ?? now) - startedAt)));
  const levelNumber = CAMPAIGN_LEVELS.findIndex(({ id }) => id === level) + 1;
  return <><div className="game-progress">
    <div className="removed-counter" aria-label={`Screws removed: ${removed} of ${total}`}>{removed}<span> / {total}</span></div>
    <div className="game-timer" role="timer" aria-label={`Elapsed time ${text}`} aria-live="off">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 2h6M12 2v3m6 1 2-2" /><circle cx="12" cy="14" r="8" /><path d="M12 9v5l3 2" /></svg>
      <span>{text}</span>
    </div>
  </div><span className="level-indicator-hud" aria-label={`Current level ${levelNumber}`}>Level {levelNumber}</span></>;
}
