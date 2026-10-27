import {json} from '@/lib/api';
import {officialStandings} from '@/lib/pump-data/server';
import {PERIODS,SORTS,type Period,type Sort} from '@/lib/pump-data/model';
export const maxDuration=20;
export async function GET(req:Request){const p=new URL(req.url).searchParams;const period=p.get('period')??'daily',sort=p.get('sort')??'combined';if(!PERIODS.includes(period as Period)||!SORTS.includes(sort as Sort))return json({error:'Invalid standings filter'},400);return json(await officialStandings(period as Period,sort as Sort));}
