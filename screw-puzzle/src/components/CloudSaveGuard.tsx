import {useEffect,useRef} from "react";
import type {CloudSession,CloudStatus} from "../game/cloudSession";
export default function CloudSaveGuard({session,status,onLevels,onHome}:{session:CloudSession;status:CloudStatus;onLevels:()=>void;onHome:()=>void}){
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const d=ref.current;d?.showModal();return()=>d?.close();},[]);
  useEffect(()=>{
    if(status!=="offline")return;
    const timer=window.setTimeout(session.retry,5000);window.addEventListener("online",session.retry);
    return()=>{window.clearTimeout(timer);window.removeEventListener("online",session.retry);};
  },[session,status]);
  const moved=status==="moved";
  return <dialog ref={ref} className="reset-dialog" aria-labelledby="cloud-save-title" onCancel={event=>event.preventDefault()}>
    <h2 id="cloud-save-title">{moved?"Playing on another device":"Reconnecting to your save"}</h2>
    <p>{moved?"Your account’s current puzzle is in the cloud. Open it from level select to continue here.":"Screw collection is paused; the timer keeps running. Keep this tab open to retry. If you leave now, only the last confirmed cloud checkpoint is kept."}</p>
    <div className="dialog-actions">{moved?<><button onClick={onLevels}>Select Level</button><button onClick={onHome}>Home</button></>:<><button disabled={status==="retrying"} onClick={session.retry}>{status==="retrying"?"Reconnecting…":"Retry connection"}</button><button onClick={onHome}>Home</button></>}</div>
  </dialog>;
}
