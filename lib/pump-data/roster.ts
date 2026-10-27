import {PublicKey} from '@solana/web3.js';
/** Cross-check two first-party public responses; never infer ownership by name/order. */
export function validateWinnerRoster(leader:any,detail:any,roster:any){
 if(!leader?.participantId||!leader.entryId||leader.rank!==1||leader.kind!=='group'||leader.struck!==false)throw Error('invalid_leader');
 if(detail?.entry?.participantId!==leader.participantId||detail.entry.entryId!==leader.entryId||detail.entry.struck!==false)throw Error('winner_identity_mismatch');
 if(roster?.hasMore!==false||!Array.isArray(roster.members)||!Array.isArray(detail.members))throw Error('incomplete_roster');
 const active=roster.members.filter((m:any)=>m.status==='ACTIVE'&&m.inCompetition===true);
 if(!Number.isSafeInteger(leader.memberCount)||leader.memberCount<1||active.length!==leader.memberCount||detail.members.length!==leader.memberCount)throw Error('roster_count_mismatch');
 const ids=new Set<string>(),wallets=new Set<string>();
 for(const member of active){const p=member.profile;let valid=false;try{const key=new PublicKey(p.walletAddress);valid=key.toBase58()===p.walletAddress&&PublicKey.isOnCurve(key.toBytes());}catch{}
  if(!p?.userId||!valid||ids.has(p.userId)||wallets.has(p.walletAddress))throw Error('invalid_member_identity');
  ids.add(p.userId);wallets.add(p.walletAddress);
 }
 const detailIds=new Set<string>();
 for(const m of detail.members){if(detailIds.has(m.userId)||!active.some((a:any)=>a.profile.userId===m.userId&&a.profile.walletAddress===m.walletAddress))throw Error('competition_wallet_mismatch');detailIds.add(m.userId);}
 const owners=active.filter((m:any)=>m.role==='OWNER');if(owners.length!==1)throw Error('owner_unverified');
 return {groupId:leader.participantId,ownerWallet:owners[0].profile.walletAddress as string,members:[...wallets].sort(),identitySource:'pump-public-group-and-competition' as const};
}
