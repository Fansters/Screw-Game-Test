import { createContext, useContext } from "react";
export type PlayerKind = "guest" | "player" | null;
export const AccountContext = createContext<{ open: () => void; kind: PlayerKind; playerId: string | null }>({ open: () => {}, kind: null, playerId: null });
export const useAccountCard = () => useContext(AccountContext);
