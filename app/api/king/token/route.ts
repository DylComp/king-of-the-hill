import {live} from '@/lib/api';
import {kingMint,enabled} from '@/lib/king-token/config';
import {state,publicState} from '@/lib/king-token/store';
import {SPLIT,TREASURY,END} from '@/lib/king-token/model';
export async function GET(){try{const mint=kingMint();let ledgerAvailable=true;const ledger=await state().catch(()=>{ledgerAvailable=false;return null;});return live({mode:'single-king',mint,status:!mint?'awaiting_mint':enabled()?'enabled':'configured_paused',splitBps:SPLIT,rewardAsset:'SOL',holderEligibility:{token:'KOTH',minimumUsdExclusive:1,overlappingRewards:true,weight:'snapshot_token_balance'},burnsEnabled:false,treasury:TREASURY,launchesEnabled:false,endsAt:END,ledgerAvailable,worker:publicState(ledger)},5);}catch{return Response.json({error:'KOTH status unavailable'},{status:503});}}
