import type {PumpBoard} from './model';
import {ROUND,WINNER_RULE} from '../king-token/model.ts';
// Pump's rank is authoritative; do not re-sort scores or calculate a gain.
// The direct-source/roster verifier must still authenticate the enclosing record.
export function closingLeader(board:PumpBoard,start:number){
 const close=start+ROUND;
 if(!Number.isSafeInteger(start)||start%ROUND!==0||board.endSec!==close/1000||!Number.isFinite(board.builtAtMs)||board.builtAtMs!<close||board.builtAtMs!>close+60000)throw Error('round_close_unverified');
 if(!Number.isSafeInteger(board.totalRanked)||board.totalRanked<1||board.entries.length<1||board.entries.length>board.totalRanked)throw Error('closing_board_invalid');
 const ids=new Set<string>();let previous=0;
 for(const row of board.entries){const id=row.participantId??row.groupId;if(!id||ids.has(id)||!Number.isSafeInteger(row.rank)||row.rank<=previous||!Number.isFinite(row.pnlUsd))throw Error('closing_board_invalid');ids.add(id);previous=row.rank;}
 const leader=board.entries[0];if(leader.rank!==1)throw Error('closing_rank_one_missing');
 return {start,end:close,rule:WINNER_RULE,participantId:(leader.participantId??leader.groupId)!,name:leader.username,rank:1 as const,pnlUsd:leader.pnlUsd,verified:false as const};
}
