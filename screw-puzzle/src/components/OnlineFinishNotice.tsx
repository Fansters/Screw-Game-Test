import { useId } from "react";
import { CAMPAIGN_LEVELS } from "../game/campaign";
import type { LevelId } from "../game/types";
import OnlineLeaderboard from "./OnlineLeaderboard";
import type { FinishReceipt } from "./OnlineLeaderboard";
export default function FinishLeaderboard({level, elapsedMs, receipt}: {level: LevelId; elapsedMs: number; receipt?: FinishReceipt}) {
  const id = useId();
  const title = CAMPAIGN_LEVELS.find(world => world.id === level)!.title;
  return <section className="win-leaderboard" aria-labelledby={id} tabIndex={0}>
    <h2 id={id}>{title} leaderboard</h2>
    <OnlineLeaderboard level={level} finish={receipt ? {...receipt,elapsedMs} : undefined} />
  </section>;
}
