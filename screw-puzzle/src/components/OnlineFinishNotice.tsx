import { useAccountCard } from "./accountContext";
import { usePendingFinishes } from "./usePendingFinishes";
export default function OnlineFinishNotice({runId, playerId}: {runId: string; playerId: string}) {
  const account = useAccountCard(), pending = usePendingFinishes();
  const item = pending.find(result => result.finish.runId === runId);
  return <div className="online-finish-notice" role="status">
    {account.playerId !== playerId ? "Your time belongs to the account that finished this run." :
      item?.status === "name" ? <>Your time is ready! <button type="button" onClick={account.open}>Choose a public name</button></> :
      item?.status === "failed" ? "Your time is saved locally. Check Leaderboard for upload details." :
      item ? "Your time is saved here. Uploading to the online board…" : "Your online time is saved! See where you placed in Leaderboard."}
  </div>;
}
