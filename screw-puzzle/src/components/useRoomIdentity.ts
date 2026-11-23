import { useEffect, useState } from "react";
import { useAccountCard } from "./accountContext";
import { isAvatar } from "../game/playerIdentity";
import { normalizeNickname } from "../online/nickname";
import { PROFILE_CHANGED } from "../online/casualScores";
import type { RoomIdentity } from "../multiplayer/protocol";
const key="screw-it:guest-look:v1";
function guestIdentity():RoomIdentity {
  try { const saved=JSON.parse(localStorage.getItem(key)??"null"); if(saved && isAvatar(saved.avatar)) return {name:normalizeNickname(saved.name),avatar:saved.avatar}; } catch { /* Use a local guest. */ }
  return {name:"Guest Fox",avatar:"fox"};
}
export function useRoomIdentity() {
  const account=useAccountCard();
  const [guest,setGuest]=useState(guestIdentity);
  const [profile,setProfile]=useState<{playerId:string;identity:RoomIdentity}|null>(null);
  const [revision,refresh]=useState(0);
  useEffect(()=>{const changed=()=>refresh(value=>value+1);window.addEventListener(PROFILE_CHANGED,changed);return()=>window.removeEventListener(PROFILE_CHANGED,changed);},[]);
  useEffect(()=>{
    const playerId=account.playerId;if(!playerId)return;let alive=true;
    void import("../online/runtime").then(module=>module.bootAccount()).then(async({client})=>{
      const {data,error}=await client.from("player_profiles").select("nickname,avatar").eq("id",playerId).maybeSingle();
      if(alive && !error && data?.nickname) setProfile({playerId,identity:{name:normalizeNickname(data.nickname),avatar:isAvatar(data.avatar)?data.avatar:"fox"}});
    }).catch(()=>{});return()=>{alive=false;};
  },[account.playerId,revision]);
  function update(identity:RoomIdentity) {
    const next={name:normalizeNickname(identity.name),avatar:identity.avatar};
    if(!isAvatar(next.avatar))return;setGuest(next);try{localStorage.setItem(key,JSON.stringify(next));}catch{/* Session-only guest. */}
  }
  return {identity:profile?.playerId===account.playerId?profile.identity:guest,update,account};
}
