import { useEffect, useRef } from "react";

export default function ResetDialog({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return <dialog ref={dialog} className="reset-dialog" aria-labelledby="reset-question" onCancel={(event) => {
    event.preventDefault();
    onCancel();
  }}>
    <h2 id="reset-question">Are you sure you want to reset?</h2>
    <div className="dialog-actions">
      <button type="button" autoFocus onClick={onCancel}>Keep playing</button>
      <button type="button" onClick={onConfirm}>Reset</button>
    </div>
  </dialog>;
}
