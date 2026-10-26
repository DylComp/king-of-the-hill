import test from 'node:test';
import assert from 'node:assert/strict';
import {GET,POST} from '../app/api/cron/king-worker/route.ts';
import {GET as queue} from '../app/api/king/launch/next/route.ts';
import {POST as prepare} from '../app/api/king/launch/prepare/route.ts';
import {POST as send} from '../app/api/launch/send/route.ts';
import {POST as genericPrepare} from '../app/api/launch/prepare/route.ts';
import {POST as confirm} from '../app/api/king/launch/confirm/route.ts';
import {POST as pay} from '../app/api/king/payouts/route.ts';
test('funding or stale enabling env cannot restart the retired signer',async()=>{
 const prev=process.env.KING_WORKER_ENABLED;process.env.KING_WORKER_ENABLED='true';
 try{for(const fn of [GET,POST]){const r=await fn();const d=await r.json();assert.equal(d.enabled,false);assert.equal(d.launchesEnabled,false);assert.equal(d.payoutsEnabled,false);}}finally{if(prev===undefined)delete process.env.KING_WORKER_ENABLED;else process.env.KING_WORKER_ENABLED=prev;}
});
test('all launch and legacy payout paths reject before signing or preparing',async()=>{
 for(const fn of [prepare,send,genericPrepare,confirm,pay]) assert.equal((await fn()).status,410);
 assert.deepEqual((await (await queue()).json()).squads,[]);
});
