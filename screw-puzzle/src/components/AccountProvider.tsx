import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { AccountContext } from "./accountContext";
import type { PlayerKind } from "./accountContext";
import ScoreSync from "./ScoreSync";
import AccountModal from "./AccountModal";
import { accountStorageKey, parseOnlineConfig } from "../online/config";
import { cleanAccountUrl, isAccountReturn } from "../online/browserState";

const AccountDialog = lazy(() => import("./AccountDialog"));
function configuration() {
  try { return parseOnlineConfig(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY); }
  catch { return null; }
}
const config = configuration();
function hasStoredAccount() {
  try { return Boolean(config && localStorage.getItem(accountStorageKey(config))); } catch { return false; }
}
export default function AccountProvider({ children }: { children: ReactNode }) {
  const [returning] = useState(() => isAccountReturn(location.href));
  const [open, setOpen] = useState(returning);
  const [active, setActive] = useState(() => open || hasStoredAccount());
  const [identity, setIdentity] = useState<{kind: PlayerKind; playerId: string | null}>({kind:null,playerId:null});
  const setKind = useCallback((kind: PlayerKind, playerId: string | null = null) => setIdentity({kind,playerId}),[]);
  const close = useCallback(() => setOpen(false), []);
  const show = useCallback(() => { setActive(true); setOpen(true); }, []);
  useEffect(() => {
    if (returning && !config) history.replaceState(history.state, "", cleanAccountUrl(location.href));
  }, [returning]);
  return <AccountContext value={{ open: show, ...identity }}>
    {children}
    <ScoreSync />
    {active && (config ? <Suspense fallback={open && <AccountModal open onClose={close}><p role="status">Getting your player card…</p></AccountModal>}>
      <AccountDialog open={open} onClose={close} onKind={setKind} />
    </Suspense> : <AccountModal open={open} onClose={close}>
      <p>Online accounts are not available right now. You can still play and save puzzle progress on this device.</p>
      <button className="account-button primary" onClick={close}>Keep playing</button>
    </AccountModal>)}
  </AccountContext>;
}
