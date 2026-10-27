import test from 'node:test';
import assert from 'node:assert/strict';
import {hourlyCandidate} from './pump-data/hourly.ts';
import type {PumpBoard} from './pump-data/model';
const hour=3600000;
function board(at:number,scores:number[]):PumpBoard{return {builtAtMs:at,windowStartSec:0,periodLabel:'competition',totalRanked:scores.length,entries:scores.map((pnlUsd,i)=>({participantId:String(i),rank:i+1,username:null,profileImageUrl:null,pnlUsd,memberCount:2,lastRefreshedAtMs:at,topPositions:[]}))};}
test('hourly gain wins rather than cumulative rank; candidate is never verified',()=>{const r=hourlyCandidate(board(hour,[1000,10]),board(hour*2,[1001,30]),hour);assert.deepEqual(r.candidate,{participantId:'1',gainUsd:20});assert.equal(r.verified,false);});
test('nearby fetches cannot impersonate exact source boundaries',()=>{assert.throws(()=>hourlyCandidate(board(hour+1,[1]),board(hour*2,[2]),hour),/boundaries/);});
test('missing squads and roster changes block candidate selection',()=>{assert.throws(()=>hourlyCandidate(board(hour,[1,2]),board(hour*2,[3]),hour),/coverage/);const e=board(hour*2,[3]);e.entries[0].memberCount=3;assert.throws(()=>hourlyCandidate(board(hour,[1]),e,hour),/roster/);});
test('ties and nonpositive gains cannot choose a recipient silently',()=>{assert.equal(hourlyCandidate(board(hour,[1,2]),board(hour*2,[2,3]),hour).candidate,null);assert.equal(hourlyCandidate(board(hour,[2]),board(hour*2,[1]),hour).candidate,null);});
