import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
const uuid=(n:number)=>`00000000-0000-4000-8000-${n.toString().padStart(12,"0")}`;
type Board={open:boolean;players:number;entries:{rank:number;nickname:string;elapsed_ms:number;extra_box_uses:number;resumed:boolean;is_you:boolean}[];personal:{rank:number;nickname:string}|null};
test("casual PostgreSQL endpoint enforces Google ownership, immutable retries, per-player bests, ties and private history",async t=>{
  const db=new PGlite(); t.after(()=>db.close());
  await db.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    alter default privileges grant all on tables to anon,authenticated,service_role;
    alter default privileges grant all on functions to anon,authenticated,service_role;
    create schema auth;
    create table auth.users(id uuid primary key,email text,is_anonymous boolean not null default false,email_confirmed_at timestamptz);
    create table auth.identities(user_id uuid references auth.users(id) on delete cascade,provider text);
    revoke all on auth.users,auth.identities from public,anon,authenticated;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to anon,authenticated,service_role;`);
  const root=new URL("../supabase/migrations/",import.meta.url);
  for(const name of (await readdir(root)).filter(n=>n.endsWith(".sql")).sort()) await db.exec(await readFile(new URL(name,root),"utf8"));
  async function role<T>(who:"anon"|"authenticated",id:string,sql:string,args:unknown[]=[]){
    await db.exec(`set role ${who}`);
    try{await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);return await db.query<T>(sql,args);}
    finally{await db.exec("reset role");}
  }
  const board="cottage:layout-2:casual-1";
  const payload=(run:number,time=10000)=>({run_id:uuid(run),board_id:board,elapsed_ms:time,extra_box_uses:2,find_match_uses:1,resumed:true,screw_count:240});
  const submit=(id:number,p=payload(100+id),expected=uuid(id))=>role("authenticated",uuid(id),"select public.submit_casual_finish($1,$2)",[p,expected]);
  async function read(id=""){return (await role<{b:Board}>(id?"authenticated":"anon",id,"select public.get_casual_leaderboard($1) b",[board])).rows[0].b;}
  assert.equal((await read()).players,0);
  for(let i=1;i<=14;i++){
    await db.query("insert into auth.users(id,email,is_anonymous,email_confirmed_at) values($1,$2,$3,now())",[uuid(i),`private-${i}@example.com`,i===13]);
    if(i!==12) await db.query("insert into auth.identities values($1,'google')",[uuid(i)]);
    if(i!==14) await role("authenticated",uuid(i),"insert into public.player_profiles(id,nickname) values($1,$2)",[uuid(i),`Player ${i}`]);
  }
  await assert.rejects(role("anon","","select public.submit_casual_finish($1,$2)",[payload(1),uuid(1)]));
  await assert.rejects(submit(12)); await assert.rejects(submit(13)); await assert.rejects(submit(14),/nickname_required/);
  await assert.rejects(submit(1,payload(101),uuid(2)),/google_required/);
  for(const who of ["anon","authenticated"] as const){
    await assert.rejects(role(who,who==="anon"?"":uuid(1),"select * from leaderboard_private.casual_finishes"));
    await assert.rejects(role(who,who==="anon"?"":uuid(1),"update public.casual_boards set active=false"));
  }
  for(const change of [{elapsed_ms:0},{elapsed_ms:1.5},{extra_box_uses:4},{screw_count:200},{resumed:"true"},{board_id:"titanic:layout-1:casual-1"}]) await assert.rejects(submit(1,{...payload(101),...change} as ReturnType<typeof payload>));
  for(let i=1;i<=11;i++) await submit(i,payload(100+i,i<=2?10000:10000+i*100));
  await submit(1,payload(101)); // Idempotent retry.
  assert.equal((await db.query<{n:number}>("select count(*)::integer n from leaderboard_private.casual_finishes")).rows[0].n,11);
  await assert.rejects(submit(1,payload(101,1)),/finish_conflict/);
  await submit(1,payload(500,50000)); // Slower finish does not replace the best.
  const publicBoard=await read(); assert.equal(publicBoard.entries.length,10); assert.equal(publicBoard.players,11);
  assert.deepEqual(publicBoard.entries.slice(0,3).map(e=>e.rank),[1,1,3]);
  assert.equal(new Set(publicBoard.entries.map(e=>e.nickname)).size,10);
  assert.equal(publicBoard.entries[0].elapsed_ms,10000); assert.equal(publicBoard.entries[0].extra_box_uses,2); assert.equal(publicBoard.entries[0].resumed,true);
  const outside=await read(uuid(11)); assert.equal(outside.personal?.rank,11); assert.ok(outside.entries.every(e=>!e.is_you));
  const own=await read(uuid(1)); assert.equal(own.entries[0].is_you,true);
  const json=JSON.stringify(publicBoard); assert.ok(!json.includes("@example.com")&&!json.includes("player_id")&&!json.includes("run_id"));
  await role("authenticated",uuid(1),"update public.player_profiles set nickname='New Name' where id=$1",[uuid(1)]);
  assert.equal((await read()).entries[0].nickname,"New Name");
  await submit(11,payload(511,9000)); assert.equal((await read()).entries[0].nickname,"Player 11");
  const closed=(await role<{b:Board}>("anon","","select public.get_casual_leaderboard('unknown') b")).rows[0].b;
  assert.equal(closed.open,false); assert.equal(closed.entries.length,0);
  for(let i=1000;i<1118;i++) await submit(1,payload(i,20000+i));
  await assert.rejects(submit(1,payload(2000)),/too_many_finishes/);
  await submit(1,payload(101)); // Retries still succeed after the rate limit is reached.
});
