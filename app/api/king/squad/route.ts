import { fail, json, live } from "@/lib/api";
import { trackingBoard } from "@/lib/king/tracking";
export async function GET(req:Request) {
 try {
  const name=new URL(req.url).searchParams.get("name")?.toLowerCase();
  const board=await trackingBoard();const squad=board.squads.find(s=>s.name.toLowerCase()===name);
  if(!squad)return json({error:"Squad not found"},404);
  return live({mode:board.mode,squad,coin:null,crowns:board.crowns.filter(c=>c.groupId===squad.groupId)},10);
 }catch(e){return fail(e,"king squad");}
}
