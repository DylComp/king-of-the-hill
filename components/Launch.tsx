"use client";
// The launchpad: pick a pump.fun user, design the coin, launch it in one wallet approval.
// 80% of its creator fees go to that user and 20% to the Pump Tower treasury for $PTWR
// buybacks, locked on chain in the same transaction that creates the coin.
import { type ChangeEvent, type FormEvent, useEffect, useMemo, useState } from "react";
import { SPLIT, MAX_IMAGE_BYTES, cleanDraft, emptyDraft, initialBuyLamports, type Draft } from "@/lib/launch/model";
import type { Profile } from "@/lib/launch/registry";
import { shortAddr } from "@/lib/game";
import { SITE_HOST } from "@/lib/site";
import SiteNav from "./SiteNav";
import { useMe } from "./useMe";
import { fromB64, post, provider, rejected, toB64 } from "./wallet";

type Status = { open: boolean; reason: string | null; treasury: string | null };
type Prepared = { tx: string; mint: string; recipient: Profile };

// Programs a launch may call. Anything else in the transaction means it was tampered with.
const ALLOWED_PROGRAMS = new Set([
  "ComputeBudget111111111111111111111111111111",
  "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P",
  "pfeeUxB6jkeY1Hxd7CsFCAjcbHA9rWtchMGdZ6VojVZ",
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
  "11111111111111111111111111111111",
]);

const STEPS = ["saving the image", "building the launch", "approve in your wallet", "sending to Solana", "locking the fee split"] as const;

/** Squares and shrinks the picture in the browser so uploads stay small. GIFs stay animated. */
async function toImage(file: File): Promise<string> {
  const read = (f: Blob) =>
    new Promise<string>((ok, no) => {
      const r = new FileReader();
      r.onload = () => ok(r.result as string);
      r.onerror = () => no(new Error("could not read that file"));
      r.readAsDataURL(f);
    });
  if (file.type === "image/gif") {
    if (file.size > MAX_IMAGE_BYTES) throw new Error("GIFs must be 400 KB or smaller.");
    return read(file);
  }
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) throw new Error("Use a PNG, JPG, GIF or WebP image.");
  const bmp = await createImageBitmap(file);
  const side = Math.min(bmp.width, bmp.height);
  const size = Math.min(512, side);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  canvas.getContext("2d")!.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, size, size);
  for (const q of [0.92, 0.8, 0.6]) {
    const url = canvas.toDataURL("image/webp", q);
    const out = url.startsWith("data:image/webp") ? url : canvas.toDataURL("image/png");
    if ((out.length * 3) / 4 <= MAX_IMAGE_BYTES) return out;
  }
  throw new Error("That image is too detailed, try a simpler one.");
}

function ProfileCard({ p, big = false }: { p: Profile; big?: boolean }) {
  return (
    <div className={`pump-profile${big ? " big" : ""}`}>
      {p.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.image} alt="" width={big ? 56 : 40} height={big ? 56 : 40} referrerPolicy="no-referrer" />
      ) : (
        <span className="pump-avatar" aria-hidden>
          {(p.username ?? p.wallet).slice(0, 2)}
        </span>
      )}
      <span className="pump-who">
        <span className="pixel">{p.username ? `@${p.username}` : shortAddr(p.wallet)}</span>
        <span className="dim mono">{shortAddr(p.wallet)}</span>
        {p.followers != null && <span className="dim">{p.followers.toLocaleString()} followers on pump</span>}
      </span>
    </div>
  );
}

export default function Launch() {
  const wallet = useMe();
  const { me, connect } = wallet;
  const [status, setStatus] = useState<Status | null>(null);
  const [query, setQuery] = useState("");
  const [finding, setFinding] = useState(false);
  const [recipient, setRecipient] = useState<Profile | null>(null);
  const [findError, setFindError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [image, setImage] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [step, setStep] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/launch/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus({ open: false, reason: "Couldn't reach the launchpad, refresh to try again.", treasury: null }));
    const to = new URL(window.location.href).searchParams.get("to");
    if (to) {
      setQuery(to);
      void find(to);
    }
  }, []);

  const problem = useMemo(() => {
    try {
      cleanDraft(draft);
      return image ? null : "Add a picture.";
    } catch (e) {
      return (e as Error).message;
    }
  }, [draft, image]);
  const buySol = useMemo(() => {
    try {
      return Number(initialBuyLamports(draft.initialBuy)) / 1e9;
    } catch {
      return null;
    }
  }, [draft.initialBuy]);

  async function find(q = query) {
    if (!q.trim()) return;
    setFinding(true);
    setFindError(null);
    try {
      const res = await fetch(`/api/pump/profile?q=${encodeURIComponent(q.trim())}`);
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "not found");
      setRecipient(j.profile);
    } catch (e) {
      setRecipient(null);
      setFindError((e as Error).message);
    } finally {
      setFinding(false);
    }
  }

  async function pick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageError(null);
    try {
      setImage(await toImage(file));
    } catch (err) {
      setImage(null);
      setImageError((err as Error).message);
    }
  }

  const set = (k: keyof Draft) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft((d) => ({ ...d, [k]: e.target.value }));

  async function launch(e: FormEvent) {
    e.preventDefault();
    if (step != null || !recipient || problem || !image || !status?.open) return;
    setError(null);
    let addr = me;
    if (!addr) addr = await connect();
    if (!addr) return;
    const p = provider();
    if (!p?.signTransaction) return setError("This wallet can't sign transactions. Try Phantom, Solflare or Backpack.");
    const { Keypair, VersionedTransaction } = await import("@solana/web3.js");
    // The mint key is made here and never leaves this tab. It signs once, then it's gone.
    const mint = Keypair.generate();
    const mintAddr = mint.publicKey.toBase58();
    try {
      setStep(0);
      await post("/api/launch/asset", { mint: mintAddr, image });
      setStep(1);
      const prepared = await post<Prepared>("/api/launch/prepare", { mint: mintAddr, draft, recipient: recipient.wallet });
      const tx = VersionedTransaction.deserialize(fromB64(prepared.tx));
      const keys = tx.message.staticAccountKeys;
      const programs = tx.message.compiledInstructions.map((ix) => keys[ix.programIdIndex].toBase58());
      if (!keys[0].equals(new (await import("@solana/web3.js")).PublicKey(addr)) || !keys.some((k) => k.equals(mint.publicKey)) || programs.some((id) => !ALLOWED_PROGRAMS.has(id)))
        throw new Error("The launch didn't match what was asked for, so it wasn't signed.");
      setStep(2);
      const signed = await p.signTransaction(tx);
      signed.sign([mint]);
      setStep(3);
      await post("/api/launch/send", { mint: mintAddr, tx: toB64(signed.serialize()) });
      setStep(4);
      for (let i = 0; i < 40; i++) {
        await new Promise((r) => setTimeout(r, 2500));
        const res = await fetch("/api/launch/confirm", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mint: mintAddr }) });
        const j = await res.json().catch(() => ({}));
        if (res.ok && j.coin) {
          window.location.href = `/t/${mintAddr}?new=1`;
          return;
        }
        if (res.status !== 202) throw new Error(j.error ?? "Couldn't confirm the launch.");
      }
      throw new Error(`Still waiting on Solana. Your coin will show up at ${SITE_HOST}/t/${mintAddr} once it lands.`);
    } catch (err) {
      setError(rejected(err) ? "You cancelled in the wallet. Nothing was spent." : (err as Error).message);
      setStep(null);
    }
  }

  const closed = status && !status.open;
  const tickerShown = draft.ticker.trim().replace(/^\$/, "").toUpperCase() || "TICKER";

  return (
    <>
      <SiteNav wallet={wallet} active="/launch" />
      <main className="page launch-page">
        <section className="sec launchpad">
          <div className="sec-head">
            <span className="kicker">launchpad</span>
            <h1 className="pixel display sm">launch a coin for any pump user</h1>
            <p className="lede">
              Pick anyone on pump.fun. Their coin goes live on pump.fun, {SPLIT.recipientBps / 100}% of its creator fees go straight to their wallet forever, and{" "}
              {SPLIT.treasuryBps / 100}% buys back $PTWR. The coin also moves into their tower as a floor that climbs with every fee milestone.
            </p>
          </div>

          <ol className="launch-how">
            {[
              ["pick a pump user", "Search a username, paste their pump.fun link or a wallet. Their picture and wallet show before you launch."],
              ["name the coin", "Name, ticker, picture, X and Telegram, plus an optional dev buy."],
              ["approve once", `Coin, the locked ${SPLIT.recipientBps / 100}/${SPLIT.treasuryBps / 100} fee split and your dev buy go out in one transaction, so nobody buys before you.`],
              ["fees flow forever", `${SPLIT.recipientBps / 100}% of creator fees to them, ${SPLIT.treasuryBps / 100}% to $PTWR buybacks. Their tower floor climbs with every milestone.`],
            ].map(([title, body], i) => (
              <li key={title} className="panel" style={{ ["--i" as string]: i }}>
                <span className="pixel green tiny-pixel">
                  {String(i + 1).padStart(2, "0")} {title}
                </span>
                <span className="dim">{body}</span>
              </li>
            ))}
          </ol>

          {closed && <div className="panel launch-closed pixel">{status.reason}</div>}

          <form className="launch-grid" onSubmit={launch}>
            <div className="launch-form">
              <fieldset className="panel step-box">
                <legend className="pixel tiny-pixel green">01 who gets the fees</legend>
                <div className="find-row">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void find();
                      }
                    }}
                    placeholder="pump username, profile link or wallet"
                    aria-label="pump.fun user"
                    maxLength={120}
                  />
                  <button type="button" className="btn small" onClick={() => void find()} disabled={finding}>
                    {finding ? "finding" : "find"}
                  </button>
                </div>
                {me && (
                  <button type="button" className="link" onClick={() => (setQuery(me), void find(me))}>
                    launch for my own wallet
                  </button>
                )}
                {findError && <p className="red">{findError}</p>}
                {recipient && (
                  <div className="found swap" key={recipient.wallet}>
                    <ProfileCard p={recipient} big />
                    <span className="dim">Creator fees from this coin pay this wallet. It never has to sign anything.</span>
                  </div>
                )}
              </fieldset>

              <fieldset className="panel step-box">
                <legend className="pixel tiny-pixel green">02 the coin</legend>
                <div className="two">
                  <label>
                    <span className="label">name</span>
                    <input value={draft.name} onChange={set("name")} maxLength={32} placeholder="Tower Cat" required />
                  </label>
                  <label>
                    <span className="label">ticker</span>
                    <input value={draft.ticker} onChange={set("ticker")} maxLength={11} placeholder="TCAT" required />
                  </label>
                </div>
                <label>
                  <span className="label">description</span>
                  <textarea value={draft.description} onChange={set("description")} maxLength={1000} rows={3} placeholder="what is this coin about" />
                </label>
                <label className="image-pick">
                  <span className="label">picture</span>
                  <input type="file" accept="image/png,image/jpeg,image/gif,image/webp" onChange={pick} />
                  <span className="dim">PNG, JPG, WebP or GIF. Squared and shrunk to 512px for you.</span>
                </label>
                {imageError && <p className="red">{imageError}</p>}
              </fieldset>

              <fieldset className="panel step-box">
                <legend className="pixel tiny-pixel green">03 links and dev buy</legend>
                <div className="two">
                  <label>
                    <span className="label">x link</span>
                    <input value={draft.twitter} onChange={set("twitter")} placeholder="https://x.com/..." inputMode="url" />
                  </label>
                  <label>
                    <span className="label">telegram link</span>
                    <input value={draft.telegram} onChange={set("telegram")} placeholder="https://t.me/..." inputMode="url" />
                  </label>
                </div>
                <label>
                  <span className="label">website</span>
                  <input value={`${SITE_HOST}/t/<this coin>`} disabled />
                  <span className="dim">Locked: every coin&apos;s website is its own page here, so traders can always find its tower.</span>
                </label>
                <label>
                  <span className="label">dev buy in SOL (optional)</span>
                  <input value={draft.initialBuy} onChange={set("initialBuy")} placeholder="0" inputMode="decimal" />
                  <span className="dim">Bought in the same transaction as the launch, so nobody can buy before you.</span>
                </label>
              </fieldset>
            </div>

            <aside className="launch-side">
              <div className="panel coin-preview">
                <span className="label">preview</span>
                <div className="preview-card">
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={image} alt="" width={96} height={96} />
                  ) : (
                    <span className="preview-blank pixel">?</span>
                  )}
                  <div>
                    <p className="pixel">{draft.name.trim() || "coin name"}</p>
                    <p className="green pixel tiny-pixel">${tickerShown}</p>
                    <p className="dim clamp">{draft.description.trim() || "description"}</p>
                  </div>
                </div>
              </div>

              <div className="panel split-box">
                <span className="label">creator fees, locked on chain</span>
                <div className="split-bar" aria-hidden>
                  <span style={{ flex: SPLIT.recipientBps }}>{SPLIT.recipientBps / 100}%</span>
                  <span style={{ flex: SPLIT.treasuryBps }}>{SPLIT.treasuryBps / 100}%</span>
                </div>
                <div className="split-legend">
                  <span>
                    <i className="dot g" /> {recipient ? (recipient.username ? `@${recipient.username}` : shortAddr(recipient.wallet)) : "the pump user"}
                  </span>
                  <span>
                    <i className="dot w" /> treasury, buys back $PTWR
                  </span>
                </div>
                <span className="dim">The split is set and its admin removed in the launch itself. Nobody, us included, can change it later.</span>
              </div>

              <div className="panel">
                <span className="label">you pay</span>
                <p className="pixel">{buySol == null ? "check the dev buy" : `about ${(0.025 + buySol).toFixed(3)} SOL`}</p>
                <span className="dim">Roughly 0.025 SOL of pump.fun and network costs{buySol ? `, plus your ${buySol} SOL dev buy` : ""}. Your wallet shows the exact amount.</span>
              </div>

              <button className="btn launch-go" type="submit" disabled={step != null || !recipient || !!problem || !status?.open}>
                {step != null ? STEPS[step] : !recipient ? "pick who gets the fees" : problem ? problem : me ? "launch on pump.fun" : "connect and launch"}
              </button>
              {step != null && (
                <ol className="launch-steps">
                  {STEPS.map((s, i) => (
                    <li key={s} className={i < step ? "done" : i === step ? "now" : ""}>
                      {s}
                    </li>
                  ))}
                </ol>
              )}
              {error && <p className="red">{error}</p>}

              <details className="panel kept">
                <summary className="pixel tiny-pixel">what&apos;s kept from pump.fun</summary>
                <p className="dim">
                  Kept: the bonding curve, graduation to PumpSwap, the dev buy, name, ticker, picture, description, X and Telegram links, and creator fees. Turned off:
                  custom websites (always this site), and mayhem mode, cashback and holder rewards mode, because each of those would take the creator fees away from the
                  80/20 split.
                </p>
              </details>
            </aside>
          </form>
        </section>
      </main>
    </>
  );
}
