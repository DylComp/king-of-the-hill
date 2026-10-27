import {live} from '@/lib/api';
import {kingMint,enabled} from '@/lib/king-token/config';
import {state,publicState} from '@/lib/king-token/store';
import {SPLIT,TREASURY,END} from '@/lib/king-token/model';
export async function GET(){try{const mint=kingMint();return live({mode:'single-king',mint,status:!mint?'awaiting_mint':enabled()?'enabled':'configured_paused',splitBps:SPLIT,burnToken:'KING',treasury:TREASURY,launchesEnabled:false,endsAt:END,worker:publicState(await state())},5);}catch{return Response.json({error:'KING status unavailable'},{status:503});}}
