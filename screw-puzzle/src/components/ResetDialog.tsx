import { useEffect, useRef } from "react";

export default function ResetDialog({ action = "reset", onCancel, onConfirm, onLevels, shared = false }: {
  action?: "reset" | "leave"; onCancel: () => void; onConfirm: () => void; onLevels?: () => void; shared?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return <dialog ref={dialog} className="reset-dialog" aria-labelledby="confirmation-question" aria-describedby="confirmation-note" onCancel={(event) => {
    event.preventDefault();
    onCancel();
  }}>
    <h2 id="confirmation-question">{action === "leave" ? "Leave this game?" : "Restart this level?"}</h2>
    <p id="confirmation-note" className="confirmation-note">{action === "leave" ? shared ? "Your partner can keep playing. This room won’t be saved as a solo game." :
      "Your progress is saved on this device. Pick up where you left off." : "A fresh puzzle, with all your abilities back."}</p>
    <div className="dialog-actions">
      <button type="button" autoFocus onClick={onCancel}>Keep playing</button>
      {action === "leave" && onLevels && <button type="button" onClick={onLevels}>Level select</button>}
      <button type="button" onClick={onConfirm}>{action === "leave" ? "Home" : "Reset"}</button>
    </div>
  </dialog>;
}
