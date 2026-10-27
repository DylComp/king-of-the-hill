import test from 'node:test';
import assert from 'node:assert/strict';
import {GET,POST} from '../app/api/cron/king-worker/route.ts';
import {GET as queue} from '../app/api/king/launch/next/route.ts';
import {POST as prepare} from '../app/api/king/launch/prepare/route.ts';
import {POST as send} from '../app/api/launch/send/route.ts';
import {POST as genericPrepare} from '../app/api/launch/prepare/route.ts';
import {POST as confirm} from '../app/api/king/launch/confirm/route.ts';
test('funding or stale enabling env cannot restart the retired signer',async()=>{
 const prev=process.env.KING_WORKER_ENABLED;process.env.KING_WORKER_ENABLED='true';
 try{for(const fn of [GET,POST]){const r=await fn();const d=await r.json();assert.equal(d.enabled,false);assert.equal(d.launchesEnabled,false);assert.equal(d.payoutsEnabled,false);}}finally{if(prev===undefined)delete process.env.KING_WORKER_ENABLED;else process.env.KING_WORKER_ENABLED=prev;}
});
test('all launch and legacy payout paths reject before signing or preparing',async()=>{
 for(const fn of [prepare,send,genericPrepare,confirm]) assert.equal((await fn()).status,410);
 assert.deepEqual((await (await queue()).json()).squads,[]);
});

// Stale clients and manually invoked old crons must not reach transaction builders.
import {POST as asset} from '../app/api/launch/asset/route.ts';
import {POST as legacyConfirm} from '../app/api/launch/confirm/route.ts';
import {POST as collect} from '../app/api/token/[mint]/collect/route.ts';
import {GET as devFees} from '../app/api/cron/dev-fees/route.ts';
import {GET as profileFees} from '../app/api/cron/profile-fees/route.ts';
import {GET as launchStatus} from '../app/api/launch/status/route.ts';
test('legacy fee workers and transaction builders are retired without credentials',async()=>{
 for(const fn of [asset,legacyConfirm,collect,devFees,profileFees]) assert.equal((await fn()).status,410);
 assert.equal((await (await launchStatus()).json()).open,false);
});
