import type { LevelId } from "../game/types";
import { isLevelId } from "../game/types";
import { LEVEL_LAYOUT_VERSIONS } from "../game/layoutVersions";
import { validSave } from "../game/soloSave";
import { newRunId } from "../game/runId";
import { CloudSession } from "../game/cloudSession";
import type { CloudRecord, CloudReply } from "../game/cloudSession";
// Rapid selections in one browser claim writers in request order, even if an
// earlier selection was cancelled while its network request was in flight.
const claims=new Map<string,Promise<CloudReply>>();
async function clientFor(playerId:string){
  const {client}=await (await import("./runtime")).bootAccount();
  const {data,error}=await client.auth.getSession();if(error)throw error;
  if(data.session?.user.id!==playerId||data.session.user.is_anonymous)throw Object.assign(Error("Account changed"),{code:"identity_changed"});
  return client;
}
function record(value:unknown):CloudRecord{
  const r=value as Record<string,unknown>;
  if(!r||!isLevelId(r.level_id)||!Number.isSafeInteger(r.layout_version)||!Number.isSafeInteger(r.revision)||Number(r.revision)<0||typeof r.cleared!=="boolean"||typeof r.updated_at!=="string"||
    (r.checkpoint!==null&&!validSave(r.checkpoint)))throw Error("Invalid cloud progress");
  return {level:r.level_id,layout:Number(r.layout_version),revision:Number(r.revision),checkpoint:r.checkpoint as CloudRecord["checkpoint"],cleared:r.cleared,updatedAt:r.updated_at};
}
export async function readCloudProgress(playerId:string,signal:AbortSignal){
  const client=await clientFor(playerId);
  const {data,error}=await client.from("player_progress").select("level_id,layout_version,revision,checkpoint,cleared,updated_at").eq("player_id",playerId).abortSignal(AbortSignal.any([signal,AbortSignal.timeout(10000)]));
  if(error)throw error;return(data??[]).map(record);
}
export async function beginCloudSession(playerId:string,level:LevelId,onRecord:(record:CloudRecord)=>void){
  const session=newRunId(),layout=LEVEL_LAYOUT_VERSIONS[level];
  const invoke=async(action:"begin"|"save",revision:number,checkpoint:CloudRecord["checkpoint"],cleared=false):Promise<CloudReply>=>{
    const client=await clientFor(playerId);
    const {data,error}=await client.rpc("cloud_progress",{p_action:action,p_level:level,p_layout:layout,p_session:session,p_revision:revision,p_checkpoint:checkpoint,p_cleared:cleared,p_expected_player:playerId}).abortSignal(AbortSignal.timeout(10000));
    if(error)throw error;
    if(data?.status==="moved")return {status:"moved"};
    if(data?.status==="retry"&&Number.isSafeInteger(data.revision))return {status:"retry",revision:data.revision};
    if(data?.status!=="saved")throw Error("Cloud save unavailable");
    return {status:"saved",record:record({...data.record,checkpoint:action==="save"?checkpoint:data.record.checkpoint})};
  };
  const key=`${playerId}:${level}`;
  const claim=(claims.get(key)??Promise.resolve()).catch(()=>undefined).then(()=>invoke("begin",0,null));
  claims.set(key,claim);
  let first:CloudReply;
  try{first=await claim;}finally{if(claims.get(key)===claim)claims.delete(key);}
  if(first.status!=="saved")throw Error("Cloud save unavailable");
  onRecord(first.record);
  return new CloudSession(playerId,first.record,(pending,revision)=>invoke("save",revision,pending.checkpoint,pending.cleared),onRecord);
}
export async function markCloudClear(playerId:string,level:LevelId){
  const client=await clientFor(playerId);const {data,error}=await client.rpc("cloud_progress",{p_action:"completed",p_level:level,p_layout:LEVEL_LAYOUT_VERSIONS[level],p_session:null,p_revision:0,p_checkpoint:null,p_cleared:true,p_expected_player:playerId}).abortSignal(AbortSignal.timeout(10000));
  if(error)throw error;return record(data.record);
}
