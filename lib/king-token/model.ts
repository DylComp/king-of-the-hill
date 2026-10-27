// Single KING only. These rules are independent of the retired squad-token ledger.
export const SPLIT = { squad: 4000, supporters: 4000, burn: 2000 } as const;
export const HOUR = 3_600_000;
export const END = Date.parse('2026-11-09T14:00:00Z');
export const TREASURY = 'kiNGXkmkJSMPQoFEdUZs68nANK16C1AjyQD2jVPY46C';
export const DEV = 'KiNgDiSzoX9Z69LoRZh73QkBhJNLqxDbJKgQ2bHmon7';
export const RESERVE = 50_000_000n;
export type Backing = { groupId: string; selectedAt: number; eligibleAt: number };
export type Buckets = { squad: string; supporters: string; burn: string };
export type Payee = { wallet: string; lamports: string; kind: 'squad' | 'supporter' };
export const ZERO: Buckets = {squad:'0',supporters:'0',burn:'0'};
export function amount(raw: string) {
 if (!/^(0|[1-9][0-9]*)$/.test(raw)) throw Error('invalid_amount');
 return BigInt(raw);
}
export function splitFees(fees: string): Buckets {
 const n=amount(fees), squad=n*4000n/10000n, supporters=n*4000n/10000n;
 return {squad:String(squad),supporters:String(supporters),burn:String(n-squad-supporters)};
}
export function addBuckets(a: Buckets,b: Buckets): Buckets {
 return {squad:String(amount(a.squad)+amount(b.squad)),supporters:String(amount(a.supporters)+amount(b.supporters)),burn:String(amount(a.burn)+amount(b.burn))};
}
export function selectBacking(previous: Backing|null,groupId:string,now:number):Backing {
 if(previous?.groupId===groupId)return previous;
 if(previous && now<previous.eligibleAt)throw Error('switch_cooldown');
 return {groupId,selectedAt:now,eligibleAt:previous?now+HOUR:now};
}
export function allocate(buckets:Buckets,members:string[],holders:Record<string,string>) {
 const payouts:Payee[]=[];
 const recipients=[...new Set(members)].sort();
 const each=recipients.length?amount(buckets.squad)/BigInt(recipients.length):0n;
 for(const wallet of recipients)if(each>0n)payouts.push({wallet,lamports:String(each),kind:'squad'});
 const entries=Object.entries(holders).filter(([,v])=>amount(v)>0n).sort(([a],[b])=>a.localeCompare(b));
 const total=entries.reduce((n,[,v])=>n+amount(v),0n);let distributed=0n;
 for(const [wallet,tokens] of entries){const n=amount(buckets.supporters)*amount(tokens)/total;if(n>0n){payouts.push({wallet,lamports:String(n),kind:'supporter'});distributed+=n;}}
 return {payouts,carry:{squad:String(amount(buckets.squad)-each*BigInt(recipients.length)),supporters:String(amount(buckets.supporters)-distributed),burn:'0'} satisfies Buckets,burnLamports:buckets.burn};
}
export function validateAllocation(buckets:Buckets,payouts:Payee[],burn:string) {
 const sums={squad:0n,supporter:0n};const seen=new Set<string>();
 for(const p of payouts){const id=p.kind+':'+p.wallet;if(seen.has(id)||!(p.kind in sums)||amount(p.lamports)===0n)throw Error('invalid_payout');seen.add(id);sums[p.kind]+=amount(p.lamports);}
 if(sums.squad>amount(buckets.squad)||sums.supporter>amount(buckets.supporters)||amount(burn)>amount(buckets.burn))throw Error('allocation_exceeded');
}
