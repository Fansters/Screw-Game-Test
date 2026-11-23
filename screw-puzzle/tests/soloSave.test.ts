import '../src/game/allLevels.ts';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createRun,elapsedRunTime,runReducer} from '../src/animation/run.ts';
import {restoreSoloSave,retireLocalProgress} from '../src/game/soloSave.ts';
import {generateSoloPuzzle} from '../src/game/soloLevels.ts';
import {LEVEL_IDS} from '../src/game/types.ts';
import {removeScrew,planBonusBox,isScrewAccessible} from '../src/game/rules.ts';
test('cloud checkpoints reconstruct the same puzzle and clock without browser storage',()=>{
 for(const level of LEVEL_IDS){
  const puzzle=generateSoloPuzzle(level,245),moves=puzzle.solution.slice(0,5),runId=createRun(puzzle.state).runId;
  const restored=restoreSoloSave(level,{runId,seed:puzzle.seed,moves,elapsedMs:12345,findReadyAt:1795450000000})!;
  assert.ok(restored,level);assert.deepEqual(restored.game,moves.reduce(removeScrew,puzzle.state));assert.equal(restored.checkpoint.runId,runId);assert.equal(restored.checkpoint.elapsedBefore,12345);assert.equal(restored.checkpoint.abilities.findReadyAt,1795450000000);
  const run=runReducer(createRun(puzzle.state),{type:'reset',...restored,enter:true});assert.equal(elapsedRunTime(run,20000),12345);
 }
 const p=generateSoloPuzzle('campsite',7);const waiting=p.state.screws.find(s=>!p.state.boxes.some(b=>b?.color===s.color)&&isScrewAccessible(p.state,s))!;
 const r=restoreSoloSave('campsite',{seed:p.seed,moves:[waiting.id,'boost'],elapsedMs:4500})!;assert.deepEqual(r.game,planBonusBox(removeScrew(p.state,waiting.id)).finalState);assert.equal(r.checkpoint.lifelines,2);
 assert.equal(restoreSoloSave('campsite',{seed:p.seed,moves:[waiting.id,waiting.id],elapsedMs:0}),null);
});
test('retiring local progress removes only puzzle keys, retaining credentials and preferences',t=>{
 const storage=new Map([['screw-it:solo-save:arctic:v1','old'],['screw-it:cleared:arctic','1'],['screw-it:auth:host','keep'],['screw-it:preferences:v1','keep'],['screw-it:casual-finish-outbox:v1','keep']]);
 Object.defineProperty(globalThis,'window',{configurable:true,value:{localStorage:{get length(){return storage.size;},key:(index:number)=>[...storage.keys()][index],removeItem:(key:string)=>storage.delete(key)}}});t.after(()=>Reflect.deleteProperty(globalThis,'window'));
 retireLocalProgress();assert.deepEqual([...storage.keys()],['screw-it:auth:host','screw-it:preferences:v1','screw-it:casual-finish-outbox:v1']);
});
