import {useCallback,useEffect,useRef,useState} from "react";
import type {ReactNode} from "react";
import {useAccountCard} from "./accountContext";
import {CloudContext} from "./cloudContext";
import type {CloudRecord} from "../game/cloudSession";
import {mergeCloudRecords} from "../game/cloudSession";
import type {LevelId} from "../game/types";
import {clearVisitProgress} from "../game/campaign";
export default function CloudProgressProvider({children}:{children:ReactNode}){
  const {playerId,restoring}=useAccountCard();const current=useRef(playerId);current.current=playerId;
  const [data,setData]=useState<{id:string|null;records:CloudRecord[];loading:boolean;error:string}>({id:null,records:[],loading:false,error:""});
  const [revision,setRevision]=useState(0);
  const refresh=useCallback(()=>setRevision(r=>r+1),[]);
  useEffect(()=>{clearVisitProgress();},[playerId]);
  useEffect(()=>{
    if(!playerId)return;const controller=new AbortController();
    setData(previous=>({id:playerId,records:previous.id===playerId?previous.records:[],loading:true,error:""}));
    void import("../online/cloudProgress").then(api=>api.readCloudProgress(playerId,controller.signal)).then(records=>{
      if(!controller.signal.aborted)setData(previous=>({id:playerId,records:mergeCloudRecords(previous.id===playerId?previous.records:[],records),loading:false,error:""}));
    }).catch(()=>{if(!controller.signal.aborted)setData(previous=>({...previous,loading:false,error:"Cloud progress couldn’t load. Please retry."}));});
    return()=>controller.abort();
  },[playerId,revision]);
  const merge=useCallback((id:string,record:CloudRecord)=>{
    if(current.current!==id)return;
    setData(previous=>({id,loading:false,error:"",records:mergeCloudRecords(previous.id===id?previous.records:[],[record])}));
  },[]);
  const begin=useCallback(async(level:LevelId)=>{
    if(!playerId)throw Error("Sign in to save progress");
    return(await import("../online/cloudProgress")).beginCloudSession(playerId,level,record=>merge(playerId,record));
  },[playerId,merge]);
  const markClear=useCallback((level:LevelId)=>{
    if(!playerId)return;void import("../online/cloudProgress").then(api=>api.markCloudClear(playerId,level)).then(record=>merge(playerId,record)).catch(()=>{
      if(current.current===playerId)setData(previous=>({...previous,error:"Completion couldn’t sync. Reconnect and retry."}));
    });
  },[playerId,merge]);
  return <CloudContext value={{records:data.id===playerId?data.records:[],loading:restoring||Boolean(playerId&&(data.id!==playerId||data.loading)),error:data.id===playerId?data.error:"",refresh,begin,markClear}}>{children}</CloudContext>;
}
