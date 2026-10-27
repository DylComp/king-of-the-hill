export type UsdQuote={numerator:string;denominator:string;publishedAt:number;corroboratedAt:number;source:'coinbase-kraken'};
function decimal(raw:unknown){if(typeof raw!=='string'||!/^\d+(\.\d{1,12})?$/.test(raw))throw Error('usd_price_invalid');const [a,b='']=raw.split('.');const n=BigInt(a+b),d=10n**BigInt(b.length);if(n<=0n)throw Error('usd_price_invalid');return {n,d};}
export function parseUsdQuotes(coinbase:any,kraken:any,now=Date.now()):UsdQuote{
 const time=Date.parse(coinbase?.time),trades=kraken?.result?.SOLUSD;
 if(!Array.isArray(kraken?.error)||kraken.error.length||!Array.isArray(trades)||trades.length!==1)throw Error('usd_price_invalid');
 const corroboratedAt=Number(trades[0][2])*1000;
 for(const t of [time,corroboratedAt])if(!Number.isFinite(t)||now-t>60000||t-now>10000)throw Error('usd_price_stale');
 const a=decimal(coinbase?.price),b=decimal(trades[0][0]),x=a.n*b.d,y=b.n*a.d;
 // Require both public SOL/USD markets to agree within 1%, using exact arithmetic.
 if((x>y?x-y:y-x)*100n>(x<y?x:y))throw Error('usd_prices_disagree');
 return {numerator:String(a.n),denominator:String(a.d),publishedAt:time,corroboratedAt,source:'coinbase-kraken'};
}
export async function solUsdQuote():Promise<UsdQuote>{
 const urls=['https://api.exchange.coinbase.com/products/SOL-USD/ticker','https://api.kraken.com/0/public/Trades?pair=SOLUSD&count=1'];
 const data=await Promise.all(urls.map(async url=>{const r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('usd_price_unavailable');return r.json();}));
 return parseUsdQuotes(data[0],data[1]);
}
