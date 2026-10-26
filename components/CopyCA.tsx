"use client";
// The announced project contract address with a copy button, wherever the site mentions the coin, plus a
// link to buy it on pump.fun.
import { useState } from "react";
import { HOUSE_MINT, HOUSE_SYMBOL, shortAddr } from "@/lib/game";

/** A pixel check mark. */
export const Check = () => (
  <svg width="10" height="8" viewBox="0 0 5 4" shapeRendering="crispEdges" aria-hidden>
    <path fill="currentColor" d="M4 0h1v1H4zM3 1h1v1H3zM0 2h1v1H0zM2 2h1v1H2zM1 3h1v1H1z" />
  </svg>
);

/** Copies text, falling back to a hidden text field where the clipboard API is missing or refused (wallet in-app browsers, older Safari). */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

function useCopy() {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    if (!HOUSE_MINT) return;
    void copyText(HOUSE_MINT).then((ok) => {
      if (!ok) return;
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  };
  return { copied, copy };
}

/** The full contract row: label, address, copy, and a buy link. */
export default function CopyCA({ buy = true, className = "" }: { buy?: boolean; className?: string }) {
  const { copied, copy } = useCopy();
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
        <span className="pixel green tiny-pixel ca-copy">
          {copied ? (
            <>
              <Check /> copied
            </>
          ) : (
            "copy"
          )}
        </span>
      </button>
      {buy && (
        <a className="btn small" href={`https://pump.fun/coin/${HOUSE_MINT}`} target="_blank" rel="noreferrer">
          buy ${HOUSE_SYMBOL}
        </a>
      )}
    </div>
  );
}

/** A small "CA" button for the nav that copies the contract and confirms with a check. */
export function NavCA() {
  const { copied, copy } = useCopy();
  if (!HOUSE_MINT) return null;
  return (
    <button
      type="button"
      className={`gh nav-ca pixel${copied ? " copied" : ""}`}
      onClick={copy}
      title={`copy the $${HOUSE_SYMBOL} contract address`}
      aria-label={copied ? "contract address copied" : `copy the $${HOUSE_SYMBOL} contract address`}
    >
      {copied ? (
        <>
          <Check /> copied
        </>
      ) : (
        "ca"
      )}
    </button>
  );
}

/** Any address with a copy button: shows it short, copies it whole. */
export function CopyText({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={`btn ghost small mono${copied ? " copied" : ""}`}
      onClick={() => void copyText(text).then((ok) => ok && (setCopied(true), setTimeout(() => setCopied(false), 1600)))}
      title="copy"
    >
      {copied ? (
        <>
          <Check /> COPIED
        </>
      ) : (
        shortAddr(text)
      )}
    </button>
  );
}
