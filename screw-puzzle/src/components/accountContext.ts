import { createContext, useContext } from "react";
export type PlayerKind = "guest" | "player" | null;
export const AccountContext = createContext<{ open: () => void; kind: PlayerKind }>({ open: () => {}, kind: null });
export const useAccountCard = () => useContext(AccountContext);
