import test from 'node:test';
import assert from 'node:assert/strict';
import {cacheDisplayResult} from './pump-data/display-cache.ts';
test('Redis quota exhaustion cannot turn a fresh standings response into a source outage',async()=>{
 const fresh={status:'available',sourceReadAt:123,rankingsVerified:false,hourlyWinnersVerified:false,data:{entries:[{rank:1,pnlUsd:10}]}};
 const result=await cacheDisplayResult(fresh,async()=>{throw Error('ERR max requests limit exceeded');});
 assert.strictEqual(result,fresh);assert.equal(result.rankingsVerified,false);assert.equal(result.hourlyWinnersVerified,false);
});
test('successful cache writes preserve the validated source response',async()=>{const value={status:'available'};let saved;assert.strictEqual(await cacheDisplayResult(value,async v=>{saved=v;}),value);assert.strictEqual(saved,value);});
