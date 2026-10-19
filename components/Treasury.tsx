"use client";
import { useCallback, useEffect, useState } from "react";
import type { TreasuryState } from "@/lib/launch/treasury";
import { HOUSE_SYMBOL, shortAddr } from "@/lib/game";
import { ago, fmtSol } from "./CoinCard";
import SiteNav from "./SiteNav";
import { useMe } from "./useMe";
import { fromB64, post, provider, rejected, sigText } from "./wallet";

const sol = (n: number) => (n > 0 ? fmtSol(n) : "0");
const fmtTokens = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : n.toFixed(0));

export default function Treasury() {
  const wallet = useMe();
  const [s, setS] = useState<TreasuryState | null>(null);
  const [busy, setBusy] = useState<"payout" | "burn" | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [amount, setAmount] = useState("");

  const load = useCallback(() => {
    fetch("/api/treasury")
      .then((r) => r.json())
      .then((j: TreasuryState) => j && "burns" in j && setS(j))
      .catch(() => {});
  }, []);
  useEffect(load, [load]);

  const isTreasury = !!s?.treasury && wallet.me === s.treasury;

  async function sendAll(txs: string[]) {
    const p = provider();
    if (!p?.signAndSendTransaction) throw Error("This wallet can't send transactions. Try Phantom, Solflare or Backpack.");
    const { VersionedTransaction } = await import("@solana/web3.js");
    const sigs: string[] = [];
    for (const tx of txs) {
      const { signature } = await p.signAndSendTransaction(VersionedTransaction.deserialize(fromB64(tx)));
      sigs.push(sigText(signature));
    }
    return sigs;
  }

  async function payOutAll() {
    if (busy) return;
    setNote(null);
    if (!(wallet.me ?? (await wallet.connect()))) return;
    setBusy("payout");
    try {
      const r = await post<{ txs: string[]; coins: number; sol: number }>("/api/treasury/payout");
      await sendAll(r.txs);
      setNote(`Paid out ${r.coins} coin${r.coins === 1 ? "" : "s"}, about ${fmtSol(r.sol)} SOL. It shows up in a few seconds.`);
      setTimeout(load, 8000);
    } catch (e) {
      setNote(rejected(e) ? "Cancelled." : (e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function buyAndBurn() {
    if (busy || !s) return;
    setNote(null);
    const sol = amount ? Number(amount) : s.spendableSol;
    if (!(sol > 0)) return setNote("Enter how much SOL to spend.");
    setBusy("burn");
    try {
      const r = await post<{ tx: string; sol: number; burnTokens: number; priceImpactPct: number | null }>("/api/treasury/buyback", { sol });
      const [sig] = await sendAll([r.tx]);
      setNote(`Buying ${fmtSol(r.sol)} SOL of $${HOUSE_SYMBOL} and burning at least ${fmtTokens(r.burnTokens)}. Confirming…`);
      for (let i = 0; i < 12; i++) {
        await new Promise((ok) => setTimeout(ok, 5000));
        const done = await post("/api/treasury/burns", { signature: sig }).then(() => true, () => false);
        if (done) {
          setNote(`Burned. ${fmtTokens(r.burnTokens)}+ $${HOUSE_SYMBOL} is gone for good.`);
          setAmount("");
          return load();
        }
      }
      setNote("Sent, but it hasn't confirmed yet. Refresh in a minute.");
    } catch (e) {
      setNote(rejected(e) ? "Cancelled." : (e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <SiteNav wallet={wallet} active="/treasury" />
      <main className="page treasury-page">
        <section className="sec">
          <div className="sec-head">
            <span className="kicker">treasury</span>
            <h1 className="pixel display sm">buy back and burn ${HOUSE_SYMBOL}</h1>
            <p className="lede">
              20% of creator fees from every coin launched here lands in the treasury. It buys ${HOUSE_SYMBOL} and burns it in the same transaction, so the supply only goes down.
            </p>
          </div>

          {!s ? (
            <p className="pixel blink tiny-pixel">loading treasury</p>
          ) : (
            <>
              <div className="token-stats">
                <div className="panel tile">
                  <span className="label">treasury</span>
                  <span className="pixel big green">{sol(s.balanceSol)} SOL</span>
                </div>
                <div className="panel tile">
                  <span className="label">${HOUSE_SYMBOL} burned</span>
                  <span className="pixel big">{fmtTokens(s.burnedTokens)}</span>
                  <span className="dim">{s.burnedPct.toFixed(2)}% of supply</span>
                </div>
                <div className="panel tile">
                  <span className="label">fees waiting</span>
                  <span className="pixel big">{sol(s.waitingSol)} SOL</span>
                  <span className="dim">
                    in {s.waitingCoins} coin{s.waitingCoins === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="panel tile">
                  <span className="label">buybacks</span>
                  <span className="pixel big">{s.burns.length}</span>
                  <span className="dim">{s.burns[0] ? `last ${ago(s.burns[0].at)}` : "none yet"}</span>
                </div>
              </div>

              <div className="treasury-actions">
                <div className="panel treasury-step">
                  <span className="pixel green tiny-pixel">1 · pay out</span>
                  <p className="dim">
                    Sends every coin&apos;s waiting fees out at once: 80% to each pump user, 20% here. Anyone can press it and only pays the network fee.
                  </p>
                  <button className="btn" onClick={() => void payOutAll()} disabled={!!busy || s.waitingCoins === 0}>
                    {busy === "payout" ? "paying out…" : s.waitingCoins ? `pay out ${s.waitingCoins} coin${s.waitingCoins === 1 ? "" : "s"}` : "nothing waiting"}
                  </button>
                </div>
                <div className="panel treasury-step">
                  <span className="pixel green tiny-pixel">2 · buy and burn</span>
                  {!s.houseMint ? (
                    <p className="dim">Starts once ${HOUSE_SYMBOL} is launched.</p>
                  ) : !s.treasury ? (
                    <p className="dim">Starts once the treasury wallet is set.</p>
                  ) : isTreasury ? (
                    <>
                      <p className="dim">
                        Swaps treasury SOL for ${HOUSE_SYMBOL} through Jupiter and burns it, in one approval. {fmtSol(s.spendableSol)} SOL is spendable; a small reserve stays for fees.
                      </p>
                      <div className="burn-row">
                        <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} placeholder={`${fmtSol(s.spendableSol)} (all)`} aria-label="SOL to spend" />
                        <button className="btn" onClick={() => void buyAndBurn()} disabled={!!busy || s.spendableSol <= 0}>
                          {busy === "burn" ? "burning…" : "buy and burn"}
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className="dim">
                      Only the treasury wallet ({shortAddr(s.treasury)}) can spend treasury SOL. Every buyback it makes shows up below.
                    </p>
                  )}
                </div>
              </div>
              {note && <p className="panel treasury-note">{note}</p>}

              <div className="panel burn-log">
                <span className="label">recent buybacks</span>
                {s.burns.length ? (
                  <ol>
                    {s.burns.map((b) => (
                      <li key={b.signature} className="stamp">
                        <span className="pixel green">🔥 {fmtTokens(b.tokens)}</span>
                        <span className="dim">for {fmtSol(b.sol)} SOL</span>
                        <span className="dim">{ago(b.at)}</span>
                        <a href={`https://solscan.io/tx/${b.signature}`} target="_blank" rel="noopener">
                          view
                        </a>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="dim">No buybacks yet.</p>
                )}
              </div>
              {s.treasury && (
                <p className="dim treasury-addr">
                  treasury wallet:{" "}
                  <a className="mono" href={`https://solscan.io/account/${s.treasury}`} target="_blank" rel="noopener">
                    {s.treasury}
                  </a>
                </p>
              )}
            </>
          )}
        </section>
      </main>
    </>
  );
}
