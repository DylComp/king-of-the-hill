"use client";
// /activity: live $PTWR buyback and burn totals, where every creator fee went, and the buy &
// burn wallet's latest transactions, each linked on Solscan. Refreshes every five seconds.
import { useEffect, useState } from "react";
import type { Burns } from "@/lib/burns";
import type { FeesRouted } from "@/lib/launch/routed";
import type { TreasuryTx } from "@/lib/treasury";
import { HOUSE_SYMBOL, TREASURY_WALLET, shortAddr } from "@/lib/game";
import { ago, fmtSol } from "./CoinCard";
import FeeTracker from "./FeeTracker";
import SiteNav from "./SiteNav";
import { useMe } from "./useMe";

const fmtTokens = (n: number) =>
  n <= 0 ? "0" : n >= 1e9 ? `${(n / 1e9).toFixed(2)}B` : n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : n.toFixed(0);
const signedSol = (n: number) => `${n > 0 ? "+" : "-"}${Math.abs(n) < 0.0001 ? Math.abs(n).toFixed(6) : fmtSol(Math.abs(n))} SOL`;
const tx = (sig: string) => `https://solscan.io/tx/${sig}`;
const account = (a: string) => `https://solscan.io/account/${a}`;

function useLive<T>(url: string, every = 5_000) {
  const [v, setV] = useState<T | null>(null);
  useEffect(() => {
    const load = () =>
      fetch(url)
        .then((r) => (r.ok ? r.json() : null))
        .then((j: T | null) => j && setV(j))
        .catch(() => {});
    void load();
    const id = setInterval(() => document.visibilityState === "visible" && void load(), every);
    return () => clearInterval(id);
  }, [url, every]);
  return v;
}

export default function Activity() {
  const wallet = useMe();
  const fees = useLive<FeesRouted>("/api/fees");
  const burns = useLive<Burns>("/api/burns");
  const feed = useLive<{ wallet: string | null; txs: TreasuryTx[] }>("/api/activity");
  const treasury = feed?.wallet ?? TREASURY_WALLET;
  const collected = (fees?.creatorSol ?? 0) + (fees?.houseFeesSol ?? 0);

  return (
    <>
      <SiteNav wallet={wallet} active="/activity" />
      <main className="page activity-page">
        <section className="sec">
          <div className="sec-head">
            <span className="kicker">activity</span>
            <h1 className="pixel display sm">buybacks and burns, live</h1>
            <p className="lede">
              Every creator fee, every ${HOUSE_SYMBOL} bought back and burned, and every transaction from the buy &amp; burn wallet. Nothing to trust: each one links to
              Solscan.
            </p>
          </div>

          <div className="token-stats act-stats">
            <div className="panel tile">
              <span className="label">total fees collected</span>
              <span className="pixel big green">{fmtSol(collected)} SOL</span>
              <span className="dim">launched coins plus ${HOUSE_SYMBOL}&apos;s own creator fees</span>
            </div>
            <div className="panel tile">
              <span className="label">${HOUSE_SYMBOL} burned</span>
              <span className="pixel big fire">{fmtTokens(burns?.tokens ?? 0)}</span>
              <span className="dim">{(burns?.pctSupply ?? 0).toFixed(3)}% of the 1B supply, gone</span>
            </div>
            <div className="panel tile">
              <span className="label">SOL spent on buybacks</span>
              <span className="pixel big gold">{fmtSol(burns?.sol ?? fees?.buybackSpentSol ?? 0)} SOL</span>
              <span className="dim">{burns?.recent.length ? `${burns.recent.length} recent buybacks` : "starts when buybacks switch on"}</span>
            </div>
            <div className="panel tile">
              <span className="label">to pump profiles</span>
              <span className="pixel big">{fmtSol(fees?.toUsersSol ?? 0)} SOL</span>
              <span className="dim">their 80% of launch creator fees</span>
            </div>
          </div>

          <FeeTracker />

          <div className="act-cols">
            <div className="panel act-feed">
              <div className="act-head">
                <span className="pixel green tiny-pixel">buy &amp; burn wallet</span>
                {treasury && (
                  <a className="ft-tx mono" href={account(treasury)} target="_blank" rel="noopener">
                    {shortAddr(treasury)} on Solscan ↗
                  </a>
                )}
              </div>
              {feed == null ? (
                <p className="pixel blink tiny-pixel">loading transactions</p>
              ) : feed.txs.length ? (
                <ol className="act-list">
                  {feed.txs.map((t) => (
                    <li key={t.signature} className={t.ok ? "" : "failed"}>
                      <span className={`chip act-${t.kind.replace(/[^a-z]+/g, "-")}`}>{t.ok ? t.kind : "failed"}</span>
                      <span className="act-amt">
                        {t.burned ? `${fmtTokens(t.burned)} $${HOUSE_SYMBOL} burned` : t.sol != null ? signedSol(t.sol) : ""}
                      </span>
                      <span className="dim act-when">{t.at ? ago(t.at) : ""}</span>
                      <a className="ft-tx mono" href={tx(t.signature)} target="_blank" rel="noopener">
                        {t.signature.slice(0, 6)}…{t.signature.slice(-4)} ↗
                      </a>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="dim">No transactions from this wallet yet.</p>
              )}
            </div>

            <div className="panel act-feed">
              <div className="act-head">
                <span className="pixel green tiny-pixel">recent buybacks</span>
                <span className="dim">bought and burned in one transaction</span>
              </div>
              {burns == null ? (
                <p className="pixel blink tiny-pixel">loading buybacks</p>
              ) : burns.recent.length ? (
                <ol className="act-list">
                  {burns.recent.map((b) => (
                    <li key={b.signature}>
                      <span className="chip act-buy-burn">burn</span>
                      <span className="act-amt">
                        {fmtSol(b.sol)} SOL → {fmtTokens(b.tokens)} ${HOUSE_SYMBOL}
                      </span>
                      <span className="dim act-when">{ago(b.at)}</span>
                      <a className="ft-tx mono" href={tx(b.signature)} target="_blank" rel="noopener">
                        {b.signature.slice(0, 6)}…{b.signature.slice(-4)} ↗
                      </a>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="dim">The first buyback lands once ${HOUSE_SYMBOL} is live and the worker switches on.</p>
              )}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
