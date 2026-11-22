import assert from "node:assert/strict";
import { test } from "node:test";
import { hasNoSafeMove } from "../src/game/deadEnd.ts";
import { createRun, runReducer } from "../src/animation/run.ts";
import type { GameState, Screw, ScrewColor } from "../src/game/types.ts";
const screw = (id: string, color: ScrewColor = "yellow", blocked = false): Screw => ({ id, color, removed: false, position: [100,0,0], normal: [1,0,0], ...(blocked ? { obstructedBy: ["roof-left-front-eave"] } : {}) });
function stuck(): GameState { return { screws: [screw("waiting"),screw("hidden", "red", true)],
  boxes: [{id:"r",color:"red",screws:[]},{id:"b",color:"blue",screws:[]}], boxQueue:[{id:"y",color:"yellow"}],
  tray:Array.from({length:4},(_,i)=>({screwId:`tray-${i}`,color:"green" as const})), clearedCount:0,status:"playing",removedParts:[] }; }
test("dead ends require no safe move across the whole level, including partner and bonus colours", () => {
  const game=stuck(); assert.equal(hasNoSafeMove(game,0),true);
  assert.equal(hasNoSafeMove(game,1),false,"an unused extra box is a rescue");
  assert.equal(hasNoSafeMove({...game,tray:game.tray.slice(0,3)},0),false,"nonmatching moves remain safe before four waiting screws");
  assert.equal(hasNoSafeMove({...game,screws:[...game.screws,screw("offscreen-partner","blue")]},0),false,"offscreen partner matches count");
  assert.equal(hasNoSafeMove({...game,boxes:[...game.boxes,{id:"extra",color:"yellow",screws:[]}]},0),false);
  assert.equal(hasNoSafeMove({...game,removedParts:["roof-left-front-eave"]},0),false,"revealed screws rescue a run");
  assert.equal(hasNoSafeMove({...game,status:"won"},0),false);
});
test("solo dead-end confirmation waits for jobs, falls and smoke, ignores stale rounds and stops the clock", () => {
  const run={...createRun(stuck(),1,4),ready:true,started:true,lifelines:0,timerStartedAt:10};
  const check={type:"check-dead-end" as const,now:2000,round:4};
  assert.equal(runReducer(run,{...check,round:3}),run);
  const falling={...run,fallingParts:["roof-left-front-eave" as const]};
  assert.equal(runReducer(falling,check),falling);
  const smoke={...run,releases:{"roof-left-front-eave":{releasedAt:1500,dismissedAt:1900}}};
  assert.equal(runReducer(smoke,check),smoke);
  const jobs={...run,jobs:[{id:1,frames:[],finalState:run.logical,readyAt:3000}]};
  assert.equal(runReducer(jobs,check),jobs);
  const lost=runReducer(run,check); assert.equal(lost.logical.status,"lost"); assert.equal(lost.logical.lossReason,"no-moves"); assert.equal(lost.timerStoppedAt,2000);
  assert.equal(runReducer(lost,{...check,now:4000}),lost);
  const reset=runReducer(lost,{type:"reset",game:stuck(),seed:2,enter:true}); assert.equal(reset.logical.status,"playing");assert.equal(reset.logical.lossReason,undefined);
});
