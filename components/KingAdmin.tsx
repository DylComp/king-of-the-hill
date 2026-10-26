"use client";
// Launch wallet only: launches squad fan coins, a few per wallet approval. The server builds
// each launch; this tab makes each mint key, checks every transaction, and the wallet signs.
import { useMemo, useState } from "react";
import { POT_BPS, MAX_MEMBERS } from "@/lib/king/model";
import { SquadPic, signed, useKing, type KingData } from "./King";
import SiteNav from "./SiteNav";
import { useMe } from "./useMe";
import { fromB64, post, provider, rejected, toB64 } from "./wallet";

const ALLOWED_PROGRAMS = new Set([
  "ComputeBudget111111111111111111111111111111",
  "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P",
  "pfeeUxB6jkeY1Hxd7CsFCAjcbHA9rWtchMGdZ6VojVZ",
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
  "11111111111111111111111111111111",
]);
const PER_APPROVAL = 5;

type Prepared = { tx: string; mint: string; setup: string[] | null };
type Line = { groupId: string; name: string; state: string; ok?: boolean };

export default function KingAdmin() {
  const wallet = useMe();
  const { me, connect } = wallet;
  const { data } = useKing<KingData>("/api/king", 15_000);
  const [lines, setLines] = useState<Line[]>([]);
  const [busy, setBusy] = useState(false);
  const [count, setCount] = useState(10);
  const todo = useMemo(() => (data?.squads ?? []).filter((s) => !s.coin && !s.struck), [data]);
  const note = (groupId: string, state: string, ok?: boolean) => setLines((l) => l.map((x) => (x.groupId === groupId ? { ...x, state, ok } : x)));

  async function launch(ids: string[]) {
    if (busy || !ids.length) return;
    let addr = me;
    if (!addr) addr = await connect();
    if (!addr) return;
    const p = provider();
    if (!p?.signTransaction) return alertLine("This wallet can't sign transactions.");
    setBusy(true);
    const squads = ids.map((id) => todo.find((s) => s.groupId === id)!).filter(Boolean);
    setLines(squads.map((s) => ({ groupId: s.groupId, name: s.name, state: "waiting" })));
    const { Keypair, PublicKey, VersionedTransaction } = await import("@solana/web3.js");
    const me58 = new PublicKey(addr);
    try {
      for (let i = 0; i < squads.length; i += PER_APPROVAL) {
        const batch: { groupId: string; mint: InstanceType<typeof Keypair>; tx: InstanceType<typeof VersionedTransaction>; setup: InstanceType<typeof VersionedTransaction>[] }[] = [];
        for (const s of squads.slice(i, i + PER_APPROVAL)) {
          const mint = Keypair.generate();
          note(s.groupId, "building");
          try {
            const prep = await post<Prepared>("/api/king/launch/prepare", { groupId: s.groupId, mint: mint.publicKey.toBase58() });
            const tx = VersionedTransaction.deserialize(fromB64(prep.tx));
            const keys = tx.message.staticAccountKeys;
            const programs = tx.message.compiledInstructions.map((ix) => keys[ix.programIdIndex].toBase58());
            if (!keys[0].equals(me58) || !keys.some((k) => k.equals(mint.publicKey)) || programs.some((id) => !ALLOWED_PROGRAMS.has(id))) throw Error("Launch didn't match, not signed.");
            batch.push({ groupId: s.groupId, mint, tx, setup: (prep.setup ?? []).map((x) => VersionedTransaction.deserialize(fromB64(x))) });
            note(s.groupId, "ready to sign");
            // The site's first ever launch also makes the lookup table: sign that one alone.
            if (prep.setup?.length) break;
          } catch (e) {
            note(s.groupId, (e as Error).message, false);
          }
        }
        if (!batch.length) continue;
        const flat = batch.flatMap((b) => [...b.setup, b.tx]);
        const signedAll = p.signAllTransactions && flat.length > 1 ? await p.signAllTransactions(flat) : [await p.signTransaction(flat[0])];
        let at = 0;
        for (const b of batch) {
          const setup = signedAll.slice(at, at + b.setup.length);
          const tx = signedAll[at + b.setup.length];
          at += b.setup.length + 1;
          tx.sign([b.mint]);
          const mint = b.mint.publicKey.toBase58();
          try {
            note(b.groupId, "sending");
            await post("/api/launch/send", { mint, tx: toB64(tx.serialize()), setup: setup.map((s) => toB64(s.serialize())) });
            note(b.groupId, "locking split");
            let done = false;
            for (let t = 0; t < 40 && !done; t++) {
              await new Promise((r) => setTimeout(r, 2500));
              const res = await fetch("/api/king/launch/confirm", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mint }) }).catch(() => null);
              if (!res || res.status === 429 || res.status >= 500) continue;
              const j = await res.json().catch(() => ({}));
              if (res.ok && j.coin) done = true;
              else if (res.status !== 202) throw Error(j.error ?? "couldn't confirm");
            }
            note(b.groupId, done ? `live: ${mint}` : `still landing: ${mint}`, done);
          } catch (e) {
            note(b.groupId, (e as Error).message, false);
          }
        }
      }
    } catch (e) {
      alertLine(rejected(e) ? "Cancelled in the wallet. Nothing was spent." : (e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function alertLine(msg: string) {
    setLines((l) => [...l, { groupId: `msg${l.length}`, name: "", state: msg, ok: false }]);
  }

  return (
    <>
      <SiteNav wallet={wallet} active="/king" />
      <main className="page king-page">
        <section className="sec king">
          <span className="kicker">king of the hill · launch wallet only</span>
          <h1 className="pixel display sm">launch squad coins</h1>
          <p className="lede">
            Each coin: {POT_BPS / 100}% of creator fees to the treasury (King pot), the rest split equally across up to {MAX_MEMBERS} members, owner first. Admin is revoked in the same transaction.
            About 0.02 SOL each. {PER_APPROVAL} coins per wallet approval.
          </p>
          <div className="token-tools">
            <span className="pixel">{todo.length} squads without a coin</span>
            <input type="number" min={1} max={100} value={count} onChange={(e) => setCount(Math.max(1, Math.min(100, Number(e.target.value) || 1)))} aria-label="how many" style={{ maxWidth: 90 }} />
            <button className="btn" disabled={busy || !todo.length} onClick={() => void launch(todo.slice(0, count).map((s) => s.groupId))}>
              {busy ? "launching" : `launch next ${Math.min(count, todo.length)}`}
            </button>
          </div>
          {lines.length > 0 && (
            <div className="panel kq-board">
              {lines.map((l) => (
                <div key={l.groupId} className="kq-row kq-share">
                  <span className="pixel dim">{l.ok === true ? "ok" : l.ok === false ? "x" : "…"}</span>
                  <b>{l.name}</b>
                  <span className={`mono ${l.ok === false ? "red" : l.ok ? "green" : "dim"}`}>{l.state}</span>
                </div>
              ))}
            </div>
          )}
          <div className="panel kq-board">
            {todo.map((s) => (
              <div key={s.groupId} className="kq-row kq-share">
                <span className="pixel dim">{s.rank}</span>
                <span className="kq-name">
                  <SquadPic src={s.image} name={s.name} size={26} />
                  <b>{s.name}</b> <span className="dim">{s.members} members · {signed(s.pnlUsd)}</span>
                </span>
                <button className="btn small" disabled={busy} onClick={() => void launch([s.groupId])}>
                  launch
                </button>
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
