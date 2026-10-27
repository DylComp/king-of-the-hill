import {publicState,state} from '@/lib/king-token/store';
import {enabled} from '@/lib/king-token/config';
export async function GET(){try{return Response.json({mode:'single-king',enabled:enabled(),rounds:publicState(await state())?.rounds??[]},{headers:{'cache-control':'no-store'}});}catch{return Response.json({error:'Rewards unavailable'},{status:503});}}
// Only the internal receipt-verified worker can finalize rounds. Old callers cannot mark them paid.
export async function POST(){return Response.json({error:'Legacy payout acknowledgement is retired; rounds require verified receipts.'},{status:410});}
