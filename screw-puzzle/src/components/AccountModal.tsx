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
      <h2 id="account-title">Player card</h2>
    </header>
    <div className="help-content account-content">{children}</div>
  </dialog>;
}
