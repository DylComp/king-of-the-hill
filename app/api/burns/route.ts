import {publicState,state} from '@/lib/king-token/store';
import {kingMint} from '@/lib/king-token/config';
export async function GET(){try{return Response.json({mint:kingMint(),token:'KING',rounds:(publicState(await state())?.rounds??[]).filter(r=>BigInt(r.burned)>0n)});}catch{return Response.json({error:'Burn receipts unavailable'},{status:503});}}
