import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { useBackdropDismiss } from "./useBackdropDismiss";
export default function AccountModal({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const backdrop = useBackdropDismiss(onClose);
  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog?.open) dialog?.showModal();
    else if (!open && dialog?.open) dialog.close();
  }, [open]);
  return <dialog ref={ref} {...backdrop} className="help-dialog account-dialog player-card-dialog" aria-labelledby="account-title"
    onCancel={event => { event.preventDefault(); onClose(); }} onClose={onClose}>
    <header className="help-header account-header">
      <h2 id="account-title">Your player card</h2>
      <button className="icon-button card-close" aria-label="Close player card" onClick={onClose}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg></button>
    </header>
    <div className="help-content account-content">{children}</div>
  </dialog>;
}
