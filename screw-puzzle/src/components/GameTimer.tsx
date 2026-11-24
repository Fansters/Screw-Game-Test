import { useEffect, useState } from "react";
import { formatRunTime } from "../game/runTime";

export function ScrewCounter({ removed, total }: { removed: number; total: number }) {
  return <div className="removed-counter" aria-label={`Screws removed: ${removed} of ${total}`}>
    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" /><path d="M12 8v8m-4-4h8" /></svg>
    <span className="screw-count-value">{removed}<small> / {total}</small></span>
  </div>;
}

export default function GameTimer({ startedAt, stoppedAt, clock = performance, elapsedBefore = 0 }: {
  startedAt: number | null; stoppedAt: number | null; clock?: { now: () => number }; elapsedBefore?: number;
}) {
  const [now, setNow] = useState(() => clock.now());
  useEffect(() => {
    if (startedAt === null || stoppedAt !== null) return;
    const timer = window.setInterval(() => setNow(clock.now()), 200);
    return () => window.clearInterval(timer);
  }, [startedAt, stoppedAt, clock]);
  const text = formatRunTime(elapsedBefore + (startedAt === null ? 0 : Math.max(0, (stoppedAt ?? now) - startedAt)));
  return <div className="game-timer" role="timer" aria-label={`Elapsed time ${text}`} aria-live="off">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 2h6M12 2v3m6 1 2-2" /><circle cx="12" cy="14" r="8" /><path d="M12 9v5l3 2" /></svg>
    <span>{text}</span>
  </div>;
}
