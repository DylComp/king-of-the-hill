import test from 'node:test';
import assert from 'node:assert/strict';
import {closingLeader} from './pump-data/round.ts';
import type {PumpBoard,PumpRow} from './pump-data/model.ts';
const start=Date.parse('2026-10-27T17:00:00Z'),close=start+1800000;
const row=(rank:number,pnl:number):PumpRow=>({rank,participantId:'squad'+rank,username:'squad'+rank,profileImageUrl:null,pnlUsd:pnl,memberCount:2,lastRefreshedAtMs:close,topPositions:[]});
const board=():PumpBoard=>({builtAtMs:close+700,endSec:close/1000,periodLabel:'Competition',windowStartSec:start/1000-86400,totalRanked:954,entries:[row(1,100),row(2,99)]});
test('published rank one wins with no opening snapshot or full-field coverage',()=>{
 const result=closingLeader(board(),start);assert.equal(result.participantId,'squad1');assert.equal(result.rule,'pump_rank_one_at_close');assert.equal(result.verified,false);
});
test('the same squad can win consecutive closes',()=>{
 assert.equal(closingLeader(board(),start).participantId,closingLeader({...board(),builtAtMs:close+1800700,endSec:(close+1800000)/1000},close).participantId);
});
test('source close timestamp is mandatory; stale, later and future-built boards fail',()=>{
 for(const endSec of [close/1000-30,close/1000+30])assert.throws(()=>closingLeader({...board(),endSec},start),/close_unverified/);
 assert.throws(()=>closingLeader({...board(),builtAtMs:close+60001},start),/close_unverified/);
 assert.throws(()=>closingLeader(board(),start+1),/close_unverified/);
});
test('Pump ranking resolves equal scores and negative scores without local re-ranking',()=>{
 assert.equal(closingLeader({...board(),entries:[row(1,50),row(2,50)]},start).participantId,'squad1');
 assert.equal(closingLeader({...board(),entries:[row(1,-1),row(2,-2)]},start).participantId,'squad1');
});
test('missing rank one, duplicate identities/ranks and invalid scores fail closed',()=>{
 assert.throws(()=>closingLeader({...board(),entries:[row(2,100)]},start),/rank_one_missing/);
 assert.throws(()=>closingLeader({...board(),entries:[row(1,100),row(1,90)]},start),/invalid/);
 assert.throws(()=>closingLeader({...board(),entries:[row(1,NaN)]},start),/invalid/);
});
