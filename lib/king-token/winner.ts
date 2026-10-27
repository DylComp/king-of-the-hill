import {getJson} from '../redis';
import {closingLeader} from '../pump-data/round';
import type {PumpBoard} from '../pump-data/model';
import {WINNER_RULE} from './model';
import {RANKINGS_VERIFIED} from './config';
// This record must come from an audited direct-source boundary/roster verifier.
// Display mirror observations and cash-flow scans cannot create settlement authority.
type VerifiedRound={hour:number;rule:typeof WINNER_RULE;source:'pump-direct';end:PumpBoard;rosterVerified:true;memberWallets:Record<string,string[]>;ownerWallets:Record<string,string>;groupIds:Record<string,string>;evidence:string[]};
export async function verifiedRoundWinner(hour:number){
 if(!RANKINGS_VERIFIED)return null;
 const e=await getJson<VerifiedRound>('king:pump:verified-close:30m:v3:'+hour);
 if(!e||e.hour!==hour||e.rule!==WINNER_RULE||e.source!=='pump-direct'||e.rosterVerified!==true||!e.evidence?.length)return null;
 const result=closingLeader(e.end,hour);
 const id=result.participantId,groupId=e.groupIds[id],members=e.memberWallets[id];
 const ownerWallet=e.ownerWallets?.[id];
 if(!groupId||!members?.length||!ownerWallet)return null;
 return {groupId,members,ownerWallet,name:e.end.entries.find(r=>(r.participantId??r.groupId)===id)?.username??null};
}
