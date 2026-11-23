import { createContext, useContext } from "react";
export type PlayerKind = "guest" | "player" | null;
export const AccountContext = createContext<{ open: () => void; kind: PlayerKind; playerId: string | null; restoring: boolean }>({ open: () => {}, kind: null, playerId: null, restoring:false });
export const useAccountCard = () => useContext(AccountContext);
