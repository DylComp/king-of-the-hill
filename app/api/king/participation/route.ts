import {sessionWallet} from '@/lib/auth';
import {json,body} from '@/lib/api';
import {challenge,apply,type Action} from '@/lib/king-token/participation';
import {backings} from '@/lib/king-token/store';
import {trackedSquads,squadMembers} from '@/lib/king/source';
export async function GET(){const wallet=await sessionWallet();return json({wallet,memberGroups:wallet?[...trackedSquads()].filter(id=>squadMembers(id).some(m=>m.wallet===wallet)):[],backing:wallet?(await backings())[wallet]??null:null});}
export async function POST(req:Request){
 const wallet=await sessionWallet();if(!wallet)return json({error:'Sign in first.'},401);
 const b=await body<{groupId:string;action:Action;nonce:string;signature:string}>(req);
 try{
  if(b.nonce&&b.signature)return json(await apply(wallet,b.nonce,b.signature));
  if(!b.groupId||!b.action)return json({error:'Select a squad and action.'},400);
  return json(await challenge(wallet,b.groupId,b.action));
 }catch(e){const known=['competition_ended','invalid_squad','invalid_action','not_a_squad_member','invalid_signature','expired_signature','signature_replayed','selection_changed_retry','switch_cooldown'];const code=e instanceof Error&&known.includes(e.message)?e.message:'participation_unavailable';return json({error:code},400);}
}
