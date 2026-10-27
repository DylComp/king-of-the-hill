import {createHash,timingSafeEqual} from 'node:crypto';
import {validateClosingEvidence} from '@/lib/pump-data/closing-evidence';
import {getJson,redis} from '@/lib/redis';
export const runtime='nodejs';
export async function POST(request:Request){
 const secret=process.env.KING_CLOSING_SECRET;const token=request.headers.get('authorization')?.replace(/^Bearer /,'')??'';
 if(!secret||Buffer.byteLength(token)!==Buffer.byteLength(secret)||!timingSafeEqual(Buffer.from(token),Buffer.from(secret)))return Response.json({error:'Unauthorized'},{status:401});
 const raw=await request.text();if(Buffer.byteLength(raw)>1000000)return Response.json({error:'Evidence too large'},{status:413});
 let proof;try{proof=validateClosingEvidence(JSON.parse(raw));}catch{return Response.json({error:'Closing evidence failed validation'},{status:422});}
 const hash=createHash('sha256').update(raw).digest('hex');const key='king:pump:verified-close:30m:v3:'+proof.hour;
 try{
  // Immutable first accepted record. Trusted collector authentication is required;
  // a matching hash alone is never treated as source authentication.
  const saved=await redis('EVAL',"if redis.call('EXISTS',KEYS[1])==1 then return 0 end; redis.call('SET',KEYS[2],ARGV[2]); redis.call('SET',KEYS[1],ARGV[1]); return 1",2,key,'king:pump:closing-evidence:'+hash,JSON.stringify({...proof,evidence:[hash],receivedAt:Date.now(),collector:'authorized-existing-chrome'}),raw);
  if(!saved){const old=await getJson<{evidence:string[]}>(key);return Response.json({stored:false,duplicate:old?.evidence.includes(hash)??false,round:proof.hour,payoutsEnabled:false},{status:old?.evidence.includes(hash)?200:409});}
  return Response.json({stored:true,round:proof.hour,evidence:hash,payoutsEnabled:false});
 }catch{return Response.json({error:'Evidence storage unavailable'},{status:503});}
}
