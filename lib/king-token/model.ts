// One official KOTH token; all three allocations are paid in SOL.
export const SPLIT = { squad: 4000, supporters: 4000, holders: 2000 } as const;
export const HOUR = 3_600_000;
export const END = Date.parse('2026-11-09T14:00:00Z');
export const TREASURY = 'kiNGXkmkJSMPQoFEdUZs68nANK16C1AjyQD2jVPY46C';
export const DEV = 'KiNgDiSzoX9Z69LoRZh73QkBhJNLqxDbJKgQ2bHmon7';
export const RESERVE = 50_000_000n;
export type Backing = { groupId: string; selectedAt: number; eligibleAt: number };
export type Buckets = { squad: string; supporters: string; holders: string };
export type Payee = { wallet: string; lamports: string; kind: 'squad' | 'supporter' | 'holder' };
export const ZERO: Buckets = {squad:'0',supporters:'0',holders:'0'};
export function amount(raw: string) {if (!/^(0|[1-9][0-9]*)$/.test(raw)) throw Error('invalid_amount');return BigInt(raw);}
export function splitFees(fees: string): Buckets {
 const n=amount(fees), squad=n*4000n/10000n, supporters=n*4000n/10000n;
 return {squad:String(squad),supporters:String(supporters),holders:String(n-squad-supporters)};
}
export function addBuckets(a: Buckets,b: Buckets): Buckets {
 return {squad:String(amount(a.squad)+amount(b.squad)),supporters:String(amount(a.supporters)+amount(b.supporters)),holders:String(amount(a.holders)+amount(b.holders))};
}
export function selectBacking(previous: Backing|null,groupId:string,now:number):Backing {
 if(previous?.groupId===groupId)return previous;
 if(previous && now<previous.eligibleAt)throw Error('switch_cooldown');
 return {groupId,selectedAt:now,eligibleAt:previous?now+HOUR:now};
}
export function allocate(buckets:Buckets,members:string[],supporters:Record<string,string>,holders:Record<string,string>={}) {
 const payouts:Payee[]=[],recipients=[...new Set(members)].sort();
 const each=recipients.length?amount(buckets.squad)/BigInt(recipients.length):0n;
 for(const wallet of recipients)if(each>0n)payouts.push({wallet,lamports:String(each),kind:'squad'});
 function proportional(weights:Record<string,string>,pool:string,kind:'supporter'|'holder'){
  const entries=Object.entries(weights).filter(([,v])=>amount(v)>0n).sort(([a],[b])=>a.localeCompare(b));
  const total=entries.reduce((n,[,v])=>n+amount(v),0n);let paid=0n;
  for(const [wallet,tokens] of entries){const n=amount(pool)*amount(tokens)/total;if(n>0n){payouts.push({wallet,lamports:String(n),kind});paid+=n;}}
  return String(amount(pool)-paid);
 }
 const carry={squad:String(amount(buckets.squad)-each*BigInt(recipients.length)),supporters:proportional(supporters,buckets.supporters,'supporter'),holders:proportional(holders,buckets.holders,'holder')};
 return {payouts,carry};
}
export function validateAllocation(buckets:Buckets,payouts:Payee[]) {
 const sums={squad:0n,supporter:0n,holder:0n},seen=new Set<string>();
 for(const p of payouts){const id=p.kind+':'+p.wallet;if(seen.has(id)||!(p.kind in sums)||amount(p.lamports)===0n)throw Error('invalid_payout');seen.add(id);sums[p.kind]+=amount(p.lamports);}
 if(sums.squad>amount(buckets.squad)||sums.supporter>amount(buckets.supporters)||sums.holder>amount(buckets.holders))throw Error('allocation_exceeded');
}
