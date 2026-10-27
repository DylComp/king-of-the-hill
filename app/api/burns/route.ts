// Retained for old clients; the single-KOTH system no longer buys or burns tokens.
export async function GET(){return Response.json({token:'KOTH',enabled:false,reason:'replaced_by_holder_sol_airdrops',rounds:[]});}
