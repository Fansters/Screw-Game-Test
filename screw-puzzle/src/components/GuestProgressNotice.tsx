import {useEffect,useRef} from "react";
export default function GuestProgressNotice({onPlay,onSignIn,onCancel}:{onPlay:()=>void;onSignIn:()=>void;onCancel:()=>void}){
  const ref=useRef<HTMLDialogElement>(null);useEffect(()=>{const d=ref.current;d?.showModal();return()=>d?.close();},[]);
  return <dialog ref={ref} className="reset-dialog" aria-labelledby="guest-progress-title" onCancel={event=>{event.preventDefault();onCancel();}}>
    <h2 id="guest-progress-title">Keep your adventure?</h2><p>Sign in with Google to save your puzzle and continue on any device. Guest progress won’t be saved.</p>
    <div className="dialog-actions"><button type="button" onClick={onSignIn}>Sign in to save</button><button type="button" onClick={onPlay}>Play without saving</button><button type="button" onClick={onCancel}>Back</button></div>
  </dialog>;
}
