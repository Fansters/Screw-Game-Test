import assert from 'node:assert/strict';import {test} from 'node:test';import {CloudSession,mergeCloudRecords} from '../src/game/cloudSession.ts';import type {CloudRecord,CloudReply} from '../src/game/cloudSession.ts';import {newRunId} from '../src/game/runId.ts';import {checkedPreferences} from '../src/game/preferences.ts';
const idle=()=>new Promise<void>(resolve=>setImmediate(resolve));
const record:CloudRecord={level:'arctic',layout:1,revision:1,checkpoint:null,cleared:false,updatedAt:'2026-11-23T12:00:00Z'};
const save=(n:number)=>({runId:newRunId(),seed:n,moves:[],elapsedMs:100});
test('single writer coalesces fast moves, retries transient errors, and stops after another device takes over',async()=>{
 let release!:(reply:CloudReply)=>void;const calls:{seed:number|null;revision:number}[]=[];let next=1;let fail=false;let moved=false;
 const writer=new CloudSession('owner',record,async(pending,revision)=>{calls.push({seed:pending.checkpoint?.seed??null,revision});if(fail)throw Error('offline');if(moved)return{status:'moved'};if(next++===1)return await new Promise(resolve=>release=resolve);return{status:'saved',record:{...record,checkpoint:pending.checkpoint,revision:revision+1}};},()=>{});
 writer.submit(save(1));writer.submit(save(2));writer.submit(save(3));assert.equal(calls.length,1);release({status:'saved',record:{...record,revision:2}});await idle();assert.deepEqual(calls,[{seed:1,revision:1},{seed:3,revision:2}]);assert.equal(writer.status(),'saved');
 fail=true;writer.submit(save(4));await idle();assert.equal(writer.status(),'offline');writer.submit(save(5));const count=calls.length;assert.equal(calls.length,count);fail=false;writer.retry();await idle();assert.equal(calls.at(-1)?.seed,5);assert.equal(writer.status(),'saved');
 moved=true;writer.submit(save(6));await idle();assert.equal(writer.status(),'moved');const total=calls.length;writer.submit(save(7));writer.retry();await idle();assert.equal(calls.length,total);
});
test('an ambiguous committed request refreshes its revision without offering competing local saves',async()=>{
 let calls=0;const revisions:number[]=[];const writer=new CloudSession('owner',record,async(pending,revision)=>{revisions.push(revision);return ++calls===1?{status:'retry',revision:8}:{status:'saved',record:{...record,checkpoint:pending.checkpoint,revision:9}};},()=>{});writer.submit(save(1));await idle();assert.deepEqual(revisions,[1,8]);assert.equal(writer.status(),'saved');
});
test('device preferences clamp malformed values and preserve comfortable defaults',()=>{
 assert.deepEqual(checkedPreferences(null),{uiScale:1,rotation:1,zoom:1});assert.deepEqual(checkedPreferences({uiScale:9,rotation:-3,zoom:NaN}),{uiScale:1.15,rotation:.4,zoom:1});
});


test('delayed cloud reads never roll back checkpoints or cleared badges',()=>{
 const latest={...record,revision:8,checkpoint:save(8),cleared:true};
 const old={...record,revision:7,checkpoint:save(7),cleared:false};
 assert.deepEqual(mergeCloudRecords([latest],[old]),[latest]);
 const saved={...latest,revision:9,checkpoint:save(9),cleared:false};
 const result=mergeCloudRecords([latest],[saved])[0];assert.equal(result.checkpoint?.seed,9);assert.equal(result.cleared,true);
});

test('winning clear is retained when a quick restart coalesces with a revision retry',async()=>{
 let release:(reply:CloudReply)=>void=()=>{};const calls:{cleared:boolean;seed:number|null;revision:number}[]=[];
 const writer=new CloudSession('owner',record,async(pending,revision)=>{
  calls.push({cleared:pending.cleared,seed:pending.checkpoint?.seed??null,revision});
  if(calls.length===1)return await new Promise(resolve=>release=resolve);
  return{status:'saved',record:{...record,checkpoint:pending.checkpoint,cleared:pending.cleared,revision:revision+1}};
 },()=>{});
 writer.submit(null,true);writer.submit(save(2));release({status:'retry',revision:5});await idle();
 assert.deepEqual(calls,[{cleared:true,seed:null,revision:1},{cleared:true,seed:2,revision:5}]);assert.equal(writer.status(),'saved');
});
