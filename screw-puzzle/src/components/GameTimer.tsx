import { useEffect, useState } from "react";

export default function GameTimer({ startedAt, stoppedAt, clock = performance }: {
  startedAt: number | null; stoppedAt: number | null; clock?: { now: () => number };
}) {
  const [now, setNow] = useState(() => clock.now());
  useEffect(() => {
    if (startedAt === null || stoppedAt !== null) return;
    const timer = window.setInterval(() => setNow(clock.now()), 200);
    return () => window.clearInterval(timer);
  }, [startedAt, stoppedAt, clock]);
  const seconds = startedAt === null ? 0 : Math.floor(Math.max(0, (stoppedAt ?? now) - startedAt) / 1000);
  const text = `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
  return <div className="game-timer" role="timer" aria-label={`Elapsed time ${text}`} aria-live="off">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 2h6M12 2v3m6 1 2-2" /><circle cx="12" cy="14" r="8" /><path d="M12 9v5l3 2" /></svg>
    <span>{text}</span>
  </div>;
}
