import {parseBoard} from './model.ts';
import {closingLeader} from './round.ts';
import {validateWinnerRoster} from './roster.ts';
import {WINNER_RULE} from '../king-token/model.ts';
export function validateClosingEvidence(input:any,now=Date.now()){
 if(input?.competitionId!=='f0f80f25-3b5c-4996-8750-7940f6950965'||input.source!=='pump-browser')throw Error('wrong_source');
 const observed=Date.parse(input.observedAt);if(!Number.isFinite(observed)||observed>now+5000||now-observed>120000)throw Error('observation_stale');
 const board=parseBoard({leaderboard:input.board},'competition');const close=board.endSec!*1000;
 if(observed<board.builtAtMs!||observed-board.builtAtMs!>120000||now<close||now-close>180000)throw Error('closing_evidence_stale');
 const winner=closingLeader(board,close-1800000);const identity=validateWinnerRoster(board.entries[0],input.detail,input.roster);
 return {hour:close-1800000,rule:WINNER_RULE,source:'pump-direct' as const,end:board,rosterVerified:true as const,memberWallets:{[winner.participantId]:identity.members},ownerWallets:{[winner.participantId]:identity.ownerWallet},groupIds:{[winner.participantId]:identity.groupId}};
}
