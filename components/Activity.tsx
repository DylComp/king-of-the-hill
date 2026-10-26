"use client";
import { useEffect, useState } from "react";
import type { Reign } from "@/lib/king/model";
import { TREASURY_WALLET } from "@/lib/game";
import SiteNav from "./SiteNav";
import { useMe } from "./useMe";
const sol = (lamports: string) => (Number(lamports) / 1e9).toFixed(6);
export default function Activity() {
  const wallet = useMe();
  const [hours, setHours] = useState<Reign[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const r = await fetch("/api/king/payouts?count=48", { cache: "no-store" });
        if (!r.ok) throw Error("unavailable");
        const data = await r.json();
        if (active) { setHours(data.reigns); setError(false); }
      } catch { if (active) setError(true); }
    };
    void load();
    const timer = setInterval(() => { if (!document.hidden) void load(); }, 30_000);
    return () => { active = false; clearInterval(timer); };
  }, []);
  return <>
    <SiteNav wallet={wallet} active="/activity" />
    <main className="wrap">
      <section className="sec">
        <div className="sec-head">
          <span className="kicker">king of the hill / activity</span>
          <h1 className="pixel display sm">crowns and payouts</h1>
          <p className="lede">Hourly results, SOL paid to winning-squad holders, and funds rolled into the next pot.</p>
          <p className="dim">80% of each winning hour’s pot is allocated to holders. The other 20%, plus unpaid dust, stays in SOL and rolls over. No token buybacks or burns.</p>
          <a className="btn ghost" href={`https://solscan.io/account/${TREASURY_WALLET}`} target="_blank" rel="noreferrer">view treasury ↗</a>
        </div>
        {error && <p role="status">Results are temporarily unavailable. Retrying automatically.</p>}
        {!hours && !error && <p className="pixel tiny-pixel">loading results</p>}
        {hours?.length === 0 && <p className="dim">The first completed hour will appear here.</p>}
        {hours?.map(r => <article className="panel" key={r.hour} style={{ marginBottom: 16, padding: 20 }}>
          <h2 className="pixel tiny-pixel">{r.king?.squad ?? "No winning squad"}</h2>
          <p className="dim">{r.hour.replace("T", " ").replace("Z", ":00 UTC")} · {r.status === "paid" && !r.payouts.length ? "rolled over" : r.status}</p>
          <p>{sol(r.holdersLamports)} SOL to holders · {sol(r.rolloverLamports)} SOL rollover · {r.payouts.length} recipients</p>
          {r.paidSignatures?.map((sig, i) => <p key={sig}><a href={`https://solscan.io/tx/${sig}`} target="_blank" rel="noreferrer">payout receipt {i + 1} ↗</a></p>)}
        </article>)}
      </section>
    </main>
  </>;
}
