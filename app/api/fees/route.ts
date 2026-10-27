import {state} from '@/lib/king-token/store';
import {kingMint} from '@/lib/king-token/config';
import {SPLIT} from '@/lib/king-token/model';
export async function GET(){try{const s=await state();return Response.json({mint:kingMint(),token:'KOTH',collectedLamports:s?.collected??'0',splitBps:SPLIT,reservedCarry:s?.carry??null});}catch{return Response.json({error:'KOTH fees unavailable'},{status:503});}}
