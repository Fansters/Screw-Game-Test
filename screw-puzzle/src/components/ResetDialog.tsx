import { useEffect, useRef } from "react";

export default function ResetDialog({ action = "reset", onCancel, onConfirm, onSave }: {
  action?: "reset" | "leave"; onCancel: () => void; onConfirm: () => void; onSave?: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return <dialog ref={dialog} className="reset-dialog" aria-labelledby="confirmation-question" onCancel={(event) => {
    event.preventDefault();
    onCancel();
  }}>
    <h2 id="confirmation-question">Are you sure you want to {action === "leave" ? "leave the game" : "reset"}?</h2>
    <div className="dialog-actions">
      <button type="button" autoFocus onClick={onCancel}>Keep playing</button>
      {onSave && <button type="button" onClick={onSave}>Save &amp; exit</button>}
      <button type="button" onClick={onConfirm}>{action === "leave" ? "Leave game" : "Reset"}</button>
    </div>
  </dialog>;
}
