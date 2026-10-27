// Read public Pump standings through the user's existing macOS Chrome session.
// Never launches Chrome, reads wallet data, signs, or submits transactions.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parseBoard } from '../lib/pump-data/model.ts';
import { closingLeader } from '../lib/pump-data/round.ts';
import { validateWinnerRoster } from '../lib/pump-data/roster.ts';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const temp = mkdtempSync(join(tmpdir(), 'koth-chrome-'));
try {
 const processes = execFileSync('ps', ['-axo','pid=,command='], {encoding:'utf8'}).split('\n');
 const matches = processes.filter(p => p.includes('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome') && !p.includes('--user-data-dir') && !p.includes('--remote-debugging') && !p.includes('--headless'));
 if(matches.length !== 1) throw Error('Open your usual Chrome profile; a unique existing session is required.');
 const pid = Number(matches[0].trim().split(/\s+/)[0]);
 const src = join(temp,'read.m');
 writeFileSync(src, `#import <Foundation/Foundation.h>
#import <ScriptingBridge/ScriptingBridge.h>
@interface SBObject (ChromeRead)
- (SBElementArray *)windows;
- (SBElementArray *)tabs;
- (NSString *)URL;
- (NSString *)executeJavascript:(NSString *)script;
@end
int main(int argc,const char **argv){@autoreleasepool{
 if(argc!=3)return 2;
 SBApplication *app=[SBApplication applicationWithProcessIdentifier:atoi(argv[1])];
 NSString *code=[NSString stringWithContentsOfFile:[NSString stringWithUTF8String:argv[2]] encoding:NSUTF8StringEncoding error:nil];
 for(SBObject *window in [app windows])for(SBObject *tab in [window tabs]){
 NSURL *url=[NSURL URLWithString:[tab URL]];
 if([[url host] isEqualToString:@"pump.fun"] && [[url path] isEqualToString:@"/leaderboard"]){
 NSString *result=[tab executeJavascript:code];if(result){puts([result UTF8String]);return 0;}return 3;
 }}return 4;
}}
`);
 const bin=join(temp,'read');
 execFileSync('clang',['-w','-framework','Foundation','-framework','ScriptingBridge',src,'-o',bin],{stdio:'pipe'});
 function read(code){const path=join(temp,'code.js');writeFileSync(path,code);try{return execFileSync(bin,[String(pid),path],{encoding:'utf8',timeout:15000,stdio:['ignore','pipe','pipe']}).trim();}catch{throw Error('Pump leaderboard tab unavailable or Chrome JavaScript access disabled. Open Pump squads in your existing Chrome and enable View > Developer > Allow JavaScript from Apple Events.');}}
 const key='__kothPublicRead'+Date.now();
 read(`window.${key}={pending:true};fetch('https://frontend-api-v3.pump.fun/competitions/f0f80f25-3b5c-4996-8750-7940f6950965',{credentials:'omit',signal:AbortSignal.timeout(15000)}).then(async r=>{const j=await r.json();const leader=j.leaderboard?.entries?.[0];let detail=null,roster=null;if(r.ok&&leader?.entryId&&leader?.participantId){const base='https://frontend-api-v3.pump.fun';const results=await Promise.all([fetch(base+'/competitions/f0f80f25-3b5c-4996-8750-7940f6950965/entries/'+encodeURIComponent(leader.entryId),{credentials:'omit',signal:AbortSignal.timeout(10000)}),fetch(base+'/groups/'+encodeURIComponent(leader.participantId)+'/members?status=ACTIVE&limit=200&offset=0',{credentials:'omit',signal:AbortSignal.timeout(10000)})]);if(results[0].ok)detail=await results[0].json();if(results[1].ok)roster=await results[1].json();}window.${key}={status:r.status,board:j.leaderboard,detail,roster};}).catch(()=>{window.${key}={error:'public_fetch_failed'};});'started'`);
 let result;
 try {for(let i=0;i<20;i++){await new Promise(r=>setTimeout(r,1000));result=JSON.parse(read(`JSON.stringify(window.${key})`));if(!result.pending)break;}}
 finally{read(`delete window.${key};'cleared'`);}
 if(result?.status!==200 || !Array.isArray(result.board?.entries) || !result.board.entries.length)throw Error('Public Pump feed did not return valid standings.');
 const b=result.board;const board=parseBoard({leaderboard:b},'competition');
 let identity=null,identityError=null;try{identity=validateWinnerRoster(b.entries[0],result.detail,result.roster);}catch(e){identityError=e.message;}
 const observedAt=new Date().toISOString();const close=Number(b.endSec)*1000;let closingSnapshot=false;
 try{closingLeader(board,close-1800000);closingSnapshot=Date.now()>=b.builtAtMs&&Date.now()-b.builtAtMs<=120000;}catch{}
 const snapshot={observedAt,source:'pump-browser',verified:false,competitionId:'f0f80f25-3b5c-4996-8750-7940f6950965',board:b,detail:result.detail,roster:result.roster,identity,identityError,closingSnapshot};
 // Local research evidence only: never writes production settlement authority.
 const out=new URL('../output/',import.meta.url);mkdirSync(out,{recursive:true});const body=JSON.stringify(snapshot,null,2)+'\n';
 const digest=createHash('sha256').update(body).digest('hex');const archive=new URL('pump-closing-evidence/',out);mkdirSync(archive,{recursive:true});
 writeFileSync(new URL(`${Date.now()}-${digest.slice(0,12)}.json`,archive),body,{flag:'wx'});
 writeFileSync(new URL('pump-chrome-latest.json',out),body);
 console.log(JSON.stringify({connected:true,httpStatus:result.status,observedAt,rows:b.entries.length,totalRanked:b.totalRanked,builtAtMs:b.builtAtMs,endSec:b.endSec,leader:{rank:b.entries[0].rank,name:b.entries[0].username,participantId:b.entries[0].participantId},identity,identityError,closingSnapshot,settlementVerified:false,sha256:digest}));
} catch(e){console.error(JSON.stringify({connected:false,error:e instanceof Error?e.message:'Chrome check failed'}));process.exitCode=1;}
finally{rmSync(temp,{recursive:true,force:true});}
