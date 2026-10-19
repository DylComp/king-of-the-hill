"use client";
// The $PTWR contract address with a copy button, wherever the site mentions the coin. The buy
// link only appears once the coin actually trades (DexScreener lists it), so nobody is sent to
// a pump.fun page that doesn't exist yet.
import { useEffect, useState } from "react";
import { HOUSE_MINT, HOUSE_SYMBOL, shortAddr } from "@/lib/game";

let live: Promise<boolean> | null = null;
/** Whether $PTWR trades yet, checked once per visit. */
export function useHouseLive() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!HOUSE_MINT) return;
    live ??= fetch(`https://api.dexscreener.com/tokens/v1/solana/${HOUSE_MINT}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((pairs: unknown[]) => Array.isArray(pairs) && pairs.length > 0)
      .catch(() => false);
    let alive = true;
    void live.then((v) => alive && setOn(v));
    return () => {
      alive = false;
    };
  }, []);
  return on;
}

function useCopy() {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    if (!HOUSE_MINT) return;
    void navigator.clipboard?.writeText(HOUSE_MINT).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return { copied, copy };
}

/** The full contract row: label, address, copy, and a buy link once it trades. */
export default function CopyCA({ buy = true, className = "" }: { buy?: boolean; className?: string }) {
  const { copied, copy } = useCopy();
  const trading = useHouseLive();
  if (!HOUSE_MINT)
    return (
      <div className={`ca-row ${className}`}>
        <div className="ca">
          <span className="label">ca</span>
          <span className="dim">drops on launch day, right here</span>
        </div>
      </div>
    );
  return (
    <div className={`ca-row ${className}`}>
      <button type="button" className="ca" onClick={copy} title={`copy the $${HOUSE_SYMBOL} contract address`}>
        <span className="label">${HOUSE_SYMBOL} ca</span>
        <span className="ca-full mono">{HOUSE_MINT}</span>
        <span className="ca-short mono">{shortAddr(HOUSE_MINT)}</span>
        <span className="pixel green tiny-pixel">{copied ? "copied" : "copy"}</span>
      </button>
      {buy &&
        (trading ? (
          <a className="btn small" href={`https://pump.fun/coin/${HOUSE_MINT}`} target="_blank" rel="noreferrer">
            buy ${HOUSE_SYMBOL}
          </a>
        ) : (
          <span className="btn small ghost soon">launching soon</span>
        ))}
    </div>
  );
}

/** A small "CA" button for the nav that copies the contract. */
export function NavCA() {
  const { copied, copy } = useCopy();
  if (!HOUSE_MINT) return null;
  return (
    <button type="button" className="gh nav-ca pixel" onClick={copy} title={`copy the $${HOUSE_SYMBOL} contract address`} aria-label={`copy the $${HOUSE_SYMBOL} contract address`}>
      {copied ? "ok" : "ca"}
    </button>
  );
}
