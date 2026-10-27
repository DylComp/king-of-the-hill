"use client";
import Link from "next/link";
import SiteNav from "./SiteNav";
import KingParticipation from "./KingParticipation";
import {useMe} from "./useMe";
import {useKing,solSigned,KING_BRAND,type BoardSquad} from "./King";
export default function KingSquad({name}:{name:string}) {
 const wallet=useMe();const {data,error}=useKing<{squad:BoardSquad;crowns:{hour:string;gainSol:number}[]}>(`/api/king/squad?name=${encodeURIComponent(name)}`,30_000);
 return <><SiteNav wallet={wallet} brand={KING_BRAND}/><main><section className="sec"><Link href="/">← all squads</Link><h1 className="pixel display sm">{data?.squad.name??name}</h1>{error&&<p role="status">{error}</p>}<p className="lede">Back this squad with KING. When it wins an eligible reward hour, 40% goes to the squad and 40% to its eligible KING supporters; 20% buys and burns KING.</p>{data&&<><p>This hour: {solSigned(data.squad.bankedHour)} SOL</p><p>Last hour: {solSigned(data.squad.bankedLast)} SOL</p><p>{data.squad.members} members · tracked trades only</p><h2 className="pixel">crowns</h2>{data.crowns.length?data.crowns.map(c=><p key={c.hour}>{c.hour}: {solSigned(c.gainSol)} SOL</p>):<p>No crowns recorded by the all-squad tracker yet.</p>}</>}</section>{data&&<KingParticipation wallet={wallet} squads={[data.squad]}/>}</main></>;
}
