import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
export default function AccountModal({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog?.open) dialog?.showModal();
    else if (!open && dialog?.open) dialog.close();
  }, [open]);
  return <dialog ref={ref} className="help-dialog account-dialog" aria-labelledby="account-title"
    onCancel={event => { event.preventDefault(); onClose(); }} onClose={onClose}>
    <header className="help-header account-header">
      <span className="account-header-icon" aria-hidden="true">★</span>
      <h2 id="account-title">Your player card</h2>
      <button className="icon-button" aria-label="Close player card" onClick={onClose}>×</button>
    </header>
    <div className="help-content account-content">{children}</div>
  </dialog>;
}
