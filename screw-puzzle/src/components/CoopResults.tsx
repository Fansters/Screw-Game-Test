import { useEffect, useRef } from "react";
import type { RoomCommand, RoomSnapshot } from "../multiplayer/protocol";
import { levelIdentity } from "../game/campaign";
import { formatRunTime } from "../game/runTime";
import PlayerAvatar from "./PlayerAvatar";
export default function CoopResults({snapshot,player,connected,send,onLevels,onHome,syncError,onRetrySave}:{snapshot:RoomSnapshot;player:string|null;connected:boolean;send:(command:RoomCommand)=>unknown;onLevels:()=>void;onHome:()=>void;syncError?:string;onRetrySave?:()=>void}) {
  const ref=useRef<HTMLDialogElement>(null),leader=snapshot.leader===player,next=snapshot.nextRound;
  const world=levelIdentity(next?.level??snapshot.level);
  const contributors=[...snapshot.players.map(seat=>({...seat,left:false})),...(snapshot.pastPlayers??[]).map(seat=>({...seat,left:true}))];
  useEffect(()=>{const d=ref.current;d?.showModal();return()=>d?.close();},[]);
  return <dialog ref={ref} className="help-dialog coop-results player-card-dialog" aria-labelledby="coop-result-title" onCancel={event=>event.preventDefault()}>
    <header className="help-header"><div><small>BETTER TOGETHER</small><h2 id="coop-result-title">{snapshot.game.status==="won"?"World cleared!":"Round over"}</h2></div></header>
    <div className="help-content"><p className="team-finish-time"><span>Team time</span><strong>{formatRunTime(snapshot.elapsedMs,true)}</strong></p>
      {snapshot.game.lossReason==="no-moves"&&<p>No safe moves left. Another adventure?</p>}
      {syncError&&<p className="team-results-note" role="status">{syncError} <button className="account-link" onClick={onRetrySave}>Retry saving completion</button></p>}
      <div className="team-result-players">{contributors.map(seat=><article key={seat.id}><div className="team-player-heading"><PlayerAvatar avatar={seat.identity?.avatar}/><strong>{seat.identity?.name??`Player ${seat.number}`}{seat.id===player&&<small> · You</small>}{seat.left&&<small> · Left room</small>}</strong></div>
        <dl>{[["Screws",seat.collected],["Boxes",seat.stats?.boxes??0],["Parts freed",seat.stats?.parts??0],["Helpful pings",seat.stats?.assists??0],["Extra boxes",seat.stats?.extraBoxes??0],["Hints",seat.stats?.hints??0]].map(([name,count])=><div key={name}><dt>{name}</dt><dd>{count}</dd></div>)}</dl></article>)}</div>
      {next&&<section className="next-round-card"><small>{next.approved?"NEXT ADVENTURE":`${snapshot.players.find(seat=>seat.id===next.proposedBy)?.identity?.name??"Your partner"} suggests`}</small><h3>{world?.title}</h3><p className="next-round-world">{world?.difficulty} · Level {world?.number}</p>
        {!next.approved ? leader ? <button className="room-button" disabled={!connected} onClick={()=>send({type:"approve",round:snapshot.round,proposal:next.revision})}>Confirm level</button> : <p>Waiting for the leader to confirm.</p> : <>
          <div className="team-ready-list">{snapshot.players.map(seat=><span key={seat.id}>{next.ready.includes(seat.id)?"✓":"○"} {seat.identity?.name??`Player ${seat.number}`}{!seat.connected?" · reconnecting":""}</span>)}</div>
          <button className="room-button" disabled={!connected} aria-pressed={next.ready.includes(player??"")} onClick={()=>send({type:"next-ready",round:snapshot.round,proposal:next.revision,ready:!next.ready.includes(player??"")})}>{next.ready.includes(player??"")?"Ready! · click to undo":"I’m ready"}</button>
        </>}
      </section>}
      <div className="coop-result-actions"><button className="room-button" disabled={!connected} onClick={()=>send({type:"propose",round:snapshot.round,level:snapshot.level})}>{leader?"Restart":"Suggest restart"}</button><button className="room-button secondary" disabled={!connected} onClick={onLevels}>Select Level</button><button className="room-button secondary" onClick={onHome}>Home</button></div>
      <small className="team-results-note">{leader?"Confirm the level, then everyone readies up.":"Suggest a world for the leader to confirm."} Your invite link stays the same.</small>
    </div>
  </dialog>;
}
