// Bounded, read-only Chrome evidence collector. No server writes or financial execution.
import {spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync,openSync,closeSync,unlinkSync} from 'node:fs';
const out=new URL('../output/',import.meta.url);mkdirSync(out,{recursive:true});
const lock=new URL('pump-close-collector.lock',out);let fd;
try{fd=openSync(lock,'wx');}catch{console.error('Collector lock exists; check the running process before removing it.');process.exit(1);}
const started=Date.now();const stopAt=Math.min(started+2*60*60*1000,Date.parse('2026-11-09T14:02:00Z'));
let stopping=false;process.on('SIGTERM',()=>{stopping=true});process.on('SIGINT',()=>{stopping=true});
writeFileSync(fd,String(process.pid));
try{while(!stopping&&Date.now()<stopAt){
 const run=spawnSync(process.execPath,['--disable-warning=MODULE_TYPELESS_PACKAGE_JSON',new URL('read-pump-chrome.mjs',import.meta.url).pathname],{encoding:'utf8',timeout:45000,stdio:['ignore','pipe','pipe']});
 let observation;try{observation=JSON.parse(run.stdout.trim());}catch{observation={connected:false,error:'chrome_capture_failed'};}
 const status={pid:process.pid,startedAt:new Date(started).toISOString(),stopAt:new Date(stopAt).toISOString(),checkedAt:new Date().toISOString(),running:true,readOnly:true,observation};
 writeFileSync(new URL('pump-close-collector.json',out),JSON.stringify(status,null,2)+'\n');
 console.log(JSON.stringify({at:status.checkedAt,connected:observation.connected,sourceCutoff:observation.endSec,closingSnapshot:observation.closingSnapshot,identityError:observation.identityError}));
 const phase=Date.now()%1800000;const delay=phase<90000||phase>1710000?3000:60000;
 await new Promise(r=>setTimeout(r,delay));
}}finally{closeSync(fd);unlinkSync(lock);writeFileSync(new URL('pump-close-collector.json',out),JSON.stringify({running:false,readOnly:true,stoppedAt:new Date().toISOString()})+'\n');}
