"use client";
import { useEffect, useMemo, useState } from "react";
import type { CoinView } from "@/lib/launch/registry";
import { FEE_TIERS, FEE_TIER_NAMES } from "@/lib/launch/model";
import CoinCard, { fmtSol } from "./CoinCard";
import SiteNav from "./SiteNav";
import { useMe } from "./useMe";

type Sort = "new" | "fees";

export default function Tokens() {
  const wallet = useMe();
  const [coins, setCoins] = useState<CoinView[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [more, setMore] = useState(false);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("new");

  useEffect(() => {
    fetch(`/api/tokens?page=${page}`)
      .then((r) => r.json())
      .then((j: { coins?: CoinView[]; total?: number }) => {
        setCoins((prev) => [...(page ? prev ?? [] : []), ...(j.coins ?? [])]);
        setTotal(j.total ?? 0);
        setMore((j.coins?.length ?? 0) === 30);
      })
      .catch(() => setCoins((prev) => prev ?? []));
  }, [page]);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase().replace(/^\$/, "");
    const list = (coins ?? []).filter(
      (c) => !term || c.name.toLowerCase().includes(term) || c.ticker.toLowerCase().includes(term) || (c.recipient.username ?? "").toLowerCase().includes(term) || c.mint === q.trim(),
    );
    return sort === "fees" ? [...list].sort((a, b) => b.feesSol - a.feesSol) : list;
  }, [coins, q, sort]);
  const fees = (coins ?? []).reduce((n, c) => n + c.feesSol, 0);

  return (
    <>
      <SiteNav wallet={wallet} active="/tokens" />
      <main className="page tokens-page">
        <section className="sec tokens">
          <div className="sec-head">
            <span className="kicker">tokens</span>
            <h1 className="pixel display sm">every coin launched here</h1>
            <p className="lede">Each one pays its pump user 80% of creator fees and buys back $PTWR with the rest. Fees level up the coin&apos;s floor in their tower.</p>
          </div>
          <div className="token-stats">
            <div className="panel tile">
              <span className="label">coins</span>
              <span className="pixel big">{total}</span>
            </div>
            <div className="panel tile">
              <span className="label">creator fees</span>
              <span className="pixel big green">{fmtSol(fees)} SOL</span>
            </div>
            <div className="panel tile">
              <span className="label">to pump users</span>
              <span className="pixel big">{fmtSol(fees * 0.8)} SOL</span>
            </div>
            <div className="panel tile">
              <span className="label">to $PTWR buybacks</span>
              <span className="pixel big">{fmtSol(fees * 0.2)} SOL</span>
            </div>
          </div>
          <div className="token-tools">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="search name, ticker or pump user" aria-label="search coins" />
            <div className="tabs">
              {(["new", "fees"] as Sort[]).map((s) => (
                <button key={s} className={`tab${sort === s ? " on" : ""}`} onClick={() => setSort(s)}>
                  {s === "new" ? "newest" : "most fees"}
                </button>
              ))}
            </div>
            <a className="btn" href="/launch">
              launch a coin
            </a>
          </div>
          {coins == null ? (
            <p className="pixel blink tiny-pixel">loading coins</p>
          ) : shown.length ? (
            <div className="coin-grid swap" key={sort + q}>
              {shown.map((c, i) => (
                <CoinCard key={c.mint} c={c} i={i} />
              ))}
            </div>
          ) : (
            <div className="panel empty-coins">
              <p className="pixel green">{coins.length ? "nothing matches" : "no coins yet"}</p>
              <p className="dim">{coins.length ? "Try another name or ticker." : "Be the first: launch one for your favorite pump user."}</p>
            </div>
          )}
          {more && !q && (
            <button className="btn ghost more" onClick={() => setPage((p) => p + 1)}>
              load more
            </button>
          )}
          <div className="panel tier-key">
            <span className="label">floor milestones, by lifetime creator fees</span>
            <ol>
              {FEE_TIER_NAMES.map((n, i) => (
                <li key={n}>
                  <span className={`chip tier-${i}`}>{n}</span> <span className="dim">{FEE_TIERS[i]} SOL</span>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>
    </>
  );
}
