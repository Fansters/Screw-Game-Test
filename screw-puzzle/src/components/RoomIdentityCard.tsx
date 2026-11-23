import { useState } from "react";
import type { RoomIdentity } from "../multiplayer/protocol";
import { AVATARS } from "../game/playerIdentity";
import PlayerAvatar from "./PlayerAvatar";
export default function RoomIdentityCard({identity,onChange,signedIn,onAccount}:{identity:RoomIdentity;onChange:(identity:RoomIdentity)=>void;signedIn:boolean;onAccount:()=>void}) {
  const [name,setName]=useState(identity.name),[error,setError]=useState("");
  return <details className="room-identity-card"><summary><PlayerAvatar avatar={identity.avatar}/><span>{identity.name}<small>Your player</small></span></summary>
    {signedIn ? <button className="account-link" type="button" onClick={onAccount}>Edit your player card</button> : <>
      <label>Room name<input value={name} maxLength={20} onChange={event=>setName(event.target.value)} onBlur={()=>{try{onChange({...identity,name});setError("");}catch{setError("Use 3–20 letters, numbers, spaces, _ or -.");}}}/></label>
      <div className="room-avatar-options">{AVATARS.map(avatar=><button type="button" key={avatar} aria-label={`Use ${avatar} in this room`} aria-pressed={identity.avatar===avatar} onClick={()=>onChange({...identity,avatar})}><PlayerAvatar avatar={avatar}/></button>)}</div>
      {error&&<small role="status">{error}</small>}<small>No account needed. This name is just for co-op.</small>
    </>}
  </details>;
}
