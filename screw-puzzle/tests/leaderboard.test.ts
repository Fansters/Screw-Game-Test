import { test } from "node:test";
import assert from "node:assert/strict";
import { readLegacyCottageClear } from "../src/game/leaderboard.ts";

test("retired device times are read only to preserve legacy completion, never recorded or rewritten", t => {
  const values = new Map<string,string>();
  let writes = 0;
  Object.defineProperty(globalThis, "window", {configurable:true,value:{localStorage:{
    getItem:(key:string)=>values.get(key)??null, setItem:()=>{writes++;}
  }}});
  t.after(()=>Reflect.deleteProperty(globalThis,"window"));
  assert.equal(readLegacyCottageClear(),false);
  values.set("screw-it:solo-times:cottage:v1","{bad");
  values.set("screw-it:solo-times:cottage:v2",JSON.stringify([{elapsedMs:-1}]));
  assert.equal(readLegacyCottageClear(),false);
  values.set("screw-it:solo-times:cottage:v2",JSON.stringify([{elapsedMs:12345}]));
  assert.equal(readLegacyCottageClear(),true);
  assert.equal(writes,0);
  Object.defineProperty(globalThis,"window",{configurable:true,value:{localStorage:{getItem:()=>{throw Error();}}}});
  assert.equal(readLegacyCottageClear(),false);
});
