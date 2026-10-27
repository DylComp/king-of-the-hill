import {getJson} from '../redis';
import {roundCandidate} from '../pump-data/round';
import type {PumpBoard} from '../pump-data/model';
import {RANKINGS_VERIFIED} from './config';
// This record must come from an audited direct-source boundary/roster verifier.
// Display mirror observations and cash-flow scans cannot create settlement authority.
type VerifiedRound={hour:number;rule:'largest_30m_pnl_gain';source:'pump-direct';start:PumpBoard;end:PumpBoard;rosterVerified:true;memberWallets:Record<string,string[]>;ownerWallets:Record<string,string>;groupIds:Record<string,string>;evidence:string[]};
export async function verifiedRoundWinner(hour:number){
 if(!RANKINGS_VERIFIED)return null;
 const e=await getJson<VerifiedRound>('king:pump:verified-round:30m:v2:'+hour);
 if(!e||e.hour!==hour||e.rule!=='largest_30m_pnl_gain'||e.source!=='pump-direct'||e.rosterVerified!==true||!e.evidence?.length)return null;
 const result=roundCandidate(e.start,e.end,hour);
 if(result.reason==='tie_requires_resolution')return null;
 if(!result.candidate)return {groupId:null,name:null,members:[] as string[],ownerWallet:null};
 const id=result.candidate.participantId,groupId=e.groupIds[id],members=e.memberWallets[id];
 const ownerWallet=e.ownerWallets?.[id];
 if(!groupId||!members?.length||!ownerWallet)return null;
 return {groupId,members,ownerWallet,name:e.end.entries.find(r=>(r.participantId??r.groupId)===id)?.username??null};
}
