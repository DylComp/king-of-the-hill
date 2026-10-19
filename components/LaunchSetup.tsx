"use client";
// One-time launchpad setup for the dev wallet: signs the lookup table transactions the
// server built. Nobody else can load them, and nothing here touches a private key.
import { useState } from "react";
import SiteNav from "./SiteNav";
import { useMe } from "./useMe";
import { fromB64, post, provider, rejected } from "./wallet";

export default function LaunchSetup() {
  const wallet = useMe();
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const say = (s: string) => setLog((l) => [...l, s]);

  async function run() {
    if (busy) return;
    setBusy(true);
    setLog([]);
    try {
      const me = wallet.me ?? (await wallet.connect());
      if (!me) return;
      const res = await fetch("/api/launch/setup");
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      if (j.existing) say(`A table is already saved (${j.existing}). Continuing makes a new one.`);
      say(`Creating lookup table ${j.table} with ${j.addresses} addresses in ${j.txs.length} transaction(s).`);
      const p = provider();
      if (!p?.signAndSendTransaction) throw new Error("This wallet can't send transactions.");
      const { VersionedTransaction } = await import("@solana/web3.js");
      for (let i = 0; i < j.txs.length; i++) {
        await p.signAndSendTransaction(VersionedTransaction.deserialize(fromB64(j.txs[i])));
        say(`Sent ${i + 1} of ${j.txs.length}.`);
        await new Promise((r) => setTimeout(r, 4000));
      }
      for (let i = 0; i < 15; i++) {
        try {
          const r = await post<{ table: string; addresses: number }>("/api/launch/setup");
          say(`Saved. The launchpad uses table ${r.table} (${r.addresses} addresses). Launching is open.`);
          return;
        } catch {
          await new Promise((r) => setTimeout(r, 3000));
        }
      }
      throw new Error("The table didn't show up on chain. Run setup again.");
    } catch (e) {
      say(rejected(e) ? "Cancelled in the wallet." : (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <SiteNav wallet={wallet} active="/launch" />
      <main className="page">
        <section className="sec">
          <div className="sec-head">
            <span className="kicker">launchpad setup</span>
            <h1 className="pixel display sm">one time, dev wallet only</h1>
            <p className="lede">
              Creates the address lookup table that lets a full launch fit in one transaction. Costs a little SOL for rent, paid by the dev wallet, which also owns the table.
            </p>
          </div>
          <button className="btn" onClick={run} disabled={busy}>
            {busy ? "working" : "set up the launchpad"}
          </button>
          <ol className="launch-steps">
            {log.map((l, i) => (
              <li key={i} className="done">
                {l}
              </li>
            ))}
          </ol>
        </section>
      </main>
    </>
  );
}
