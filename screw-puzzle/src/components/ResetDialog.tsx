import { useEffect, useRef } from "react";

export default function ResetDialog({ action = "reset", onCancel, onConfirm, onLevels }: {
  action?: "reset" | "leave"; onCancel: () => void; onConfirm: () => void; onLevels?: () => void;
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
    <h2 id="confirmation-question">{action === "leave" ? "Leave this game?" : "Restart this level?"}</h2>
    <div className="dialog-actions">
      <button type="button" autoFocus onClick={onCancel}>Keep playing</button>
      {action === "leave" && onLevels && <button type="button" onClick={onLevels}>Level select</button>}
      <button type="button" onClick={onConfirm}>{action === "leave" ? "Home" : "Reset"}</button>
    </div>
  </dialog>;
}
