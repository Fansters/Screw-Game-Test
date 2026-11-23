import type { SoloSave } from "./soloSave.ts";
import type { LevelId } from "./types.ts";
export type CloudRecord = { level: LevelId; layout: number; revision: number; checkpoint: SoloSave | null; cleared: boolean; updatedAt: string };
export type CloudReply = {status:"saved";record:CloudRecord}|{status:"moved"}|{status:"retry";revision:number};
export type CloudStatus = "saved"|"saving"|"offline"|"retrying"|"moved";
/** Merge reads/writes that may arrive out of order; completion is monotonic. */
export function mergeCloudRecords(current:CloudRecord[],incoming:CloudRecord[]):CloudRecord[]{
  const records=[...current];
  for(const record of incoming){
    const index=records.findIndex(r=>r.level===record.level&&r.layout===record.layout);
    const existing=records[index];
    const latest=existing&&existing.revision>record.revision?existing:record;
    const merged={...latest,cleared:record.cleared||existing?.cleared===true};
    if(index===-1)records.push(merged);else records[index]=merged;
  }
  return records;
}
type Pending = {checkpoint:SoloSave|null;cleared:boolean};
/** One in-memory writer. No checkpoints or offline queues are persisted locally. */
export class CloudSession {
  private state:CloudStatus="saved";
  private revision:number;
  private pending:Pending|undefined;
  private running:Promise<void>|null=null;
  private listeners=new Set<()=>void>();
  readonly playerId:string;
  readonly initial:CloudRecord;
  private save:(pending:Pending,revision:number)=>Promise<CloudReply>;
  private onRecord:(record:CloudRecord)=>void;
  constructor(playerId:string,initial:CloudRecord,save:(pending:Pending,revision:number)=>Promise<CloudReply>,onRecord:(record:CloudRecord)=>void) {this.playerId=playerId;this.initial=initial;this.save=save;this.onRecord=onRecord;this.revision=initial.revision;}
  status=()=>this.state;
  subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>{this.listeners.delete(listener);};};
  private set(status:CloudStatus){if(this.state===status)return;this.state=status;this.listeners.forEach(listener=>listener());}
  private requeue(attempt:Pending){
    if(this.pending)this.pending.cleared ||= attempt.cleared;else this.pending=attempt;
  }
  submit(checkpoint:SoloSave|null,cleared=false){
    if(this.state==="moved")return;
    this.pending={checkpoint,cleared:cleared||this.pending?.cleared===true};
    if(this.state!=="offline")void this.flush();
  }
  retry=()=>{if(this.state!=="moved"){this.set("retrying");void this.flush();}};
  private flush():Promise<void>{
    if(this.running)return this.running;
    this.running=this.run().finally(()=>{this.running=null;});return this.running;
  }
  private async run(){
    let revisionRetries=0;
    while(this.pending&&this.state!=="moved"){
      const attempt=this.pending;this.pending=undefined;if(this.state!=="retrying")this.set("saving");
      try{
        const reply=await this.save(attempt,this.revision);
        if(reply.status==="moved"){this.pending=undefined;this.set("moved");return;}
        if(reply.status==="retry"){
          this.revision=reply.revision;
          this.requeue(attempt);
          if(++revisionRetries>2)throw Error("Save changed repeatedly");
          continue;
        }
        revisionRetries=0;this.revision=reply.record.revision;this.onRecord(reply.record);
      }catch(error){
        if(error&&typeof error==="object"&&"code" in error&&error.code==="identity_changed"){this.pending=undefined;this.set("moved");return;}
        this.requeue(attempt);
        this.set("offline");return;
      }
    }
    if(this.state!=="moved")this.set("saved");
  }
}
