import test from 'node:test';
import assert from 'node:assert/strict';
import {roundCandidate} from './pump-data/round.ts';
import type {PumpBoard,PumpRow} from './pump-data/model.ts';
const at=Date.parse('2026-10-27T17:00:00Z');
const row=(id:string,pnl:number):PumpRow=>({rank:1,participantId:id,username:id,profileImageUrl:null,pnlUsd:pnl,memberCount:2,lastRefreshedAtMs:at,topPositions:[]});
const board=(time:number,values:number[]):PumpBoard=>({builtAtMs:time+700,endSec:time/1000,periodLabel:'Competition',windowStartSec:at/1000-86400,totalRanked:values.length,entries:values.map((v,i)=>({...row('squad'+i,v),rank:i+1}))});
test('30-minute gain selects best gain, not largest cumulative score',()=>{
 const result=roundCandidate(board(at,[1000,10]),board(at+1800000,[1001,50]),at);assert.equal(result.candidate?.participantId,'squad1');assert.equal(result.candidate?.gainUsd,40);assert.equal(result.verified,false);
});
test('source cutoff defines boundary, fetch/build clock cannot substitute',()=>{
 const start=board(at,[1]),end=board(at+1800000,[2]);assert.throws(()=>roundCandidate({...start,endSec:start.endSec!+1},end,at),/boundaries/);assert.throws(()=>roundCandidate(start,{...end,builtAtMs:at+1860001},at),/boundaries/);
});
test('truncated top 100 cannot establish a winner across 954 squads',()=>{
 assert.throws(()=>roundCandidate({...board(at,[1]),totalRanked:954},board(at+1800000,[2]),at),/coverage/);
});
test('ties, identity changes, changed membership and nonpositive gains do not settle',()=>{
 const a=board(at,[1,2]),b=board(at+1800000,[2,3]);assert.equal(roundCandidate(a,b,at).reason,'tie_requires_resolution');
 assert.equal(roundCandidate(a,board(at+1800000,[0,1]),at).candidate,null);
 assert.throws(()=>roundCandidate(a,{...b,entries:[{...b.entries[0],memberCount:3},b.entries[1]]},at),/roster/);
 assert.throws(()=>roundCandidate(a,{...b,entries:[{...b.entries[0],participantId:'changed'},b.entries[1]]},at),/roster/);
});
