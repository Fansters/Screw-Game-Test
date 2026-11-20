import { useSyncExternalStore } from "react";
import { useAccountCard } from "./accountContext";
import { finishOutbox, SCORES_CHANGED } from "../online/scoreOutbox";
export function usePendingFinishes() {
  const snapshot = useSyncExternalStore(callback => {
    window.addEventListener(SCORES_CHANGED,callback); window.addEventListener("storage",callback);
    return () => { window.removeEventListener(SCORES_CHANGED,callback); window.removeEventListener("storage",callback); };
  },() => finishOutbox.snapshot());
  const {playerId} = useAccountCard();
  return playerId ? (JSON.parse(snapshot) as ReturnType<typeof finishOutbox.list>).filter(item => item.playerId === playerId) : [];
}
