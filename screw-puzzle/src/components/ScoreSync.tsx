import { useEffect } from "react";
import { useAccountCard } from "./accountContext";
import { SCORES_CHANGED } from "../online/scoreOutbox";
import { PROFILE_CHANGED, retryFinishes, syncFinishes } from "../online/casualScores";
export default function ScoreSync() {
  const {playerId} = useAccountCard();
  useEffect(() => {
    if (!playerId) return;
    let cancelled = false, running = false, retryAfterSync = false;
    async function flush() {
      if (running || cancelled) return;
      running = true;
      try { await syncFinishes(playerId!,() => cancelled); } catch { /* Pending results stay queued. */ }
      finally {
        running = false;
        // A nickname can be saved while its first upload is still returning.
        if (retryAfterSync && !cancelled) {
          retryAfterSync = false;
          void retryFinishes(playerId!).then(flush).catch(() => {});
        }
      }
    }
    const profile = () => {
      if (running) retryAfterSync = true;
      else void retryFinishes(playerId).then(flush).catch(() => {});
    };
    const wake = () => { void flush(); };
    window.addEventListener("online",wake); window.addEventListener("storage",wake); window.addEventListener(SCORES_CHANGED,wake); window.addEventListener(PROFILE_CHANGED,profile);
    const interval = window.setInterval(wake,30000); profile();
    return () => { cancelled=true; clearInterval(interval); window.removeEventListener("online",wake); window.removeEventListener("storage",wake); window.removeEventListener(SCORES_CHANGED,wake); window.removeEventListener(PROFILE_CHANGED,profile); };
  },[playerId]);
  return null;
}
