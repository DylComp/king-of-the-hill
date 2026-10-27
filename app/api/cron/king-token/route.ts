import {timingSafeEqual} from 'node:crypto';
import {runSingleKing} from '@/lib/king-token/worker';
export const runtime='nodejs';
export const maxDuration=60;
export const dynamic='force-dynamic';
export async function GET(req:Request){
 const expected=Buffer.from('Bearer '+(process.env.CRON_SECRET??'')),actual=Buffer.from(req.headers.get('authorization')??'');
 if(!process.env.CRON_SECRET||expected.length!==actual.length||!timingSafeEqual(expected,actual))return Response.json({error:'Unauthorized'},{status:401});
 try{const result=await runSingleKing();return Response.json(result,{status:'failed' in result&&result.failed?503:200});}catch{return Response.json({error:'KING worker unavailable'},{status:503});}
}
