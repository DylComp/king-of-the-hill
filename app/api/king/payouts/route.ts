export async function GET(){return Response.json({mode:"tracking-only",enabled:false,reigns:[]});}
export async function POST(){return Response.json({error:"Coin-based payouts are retired."},{status:410});}
