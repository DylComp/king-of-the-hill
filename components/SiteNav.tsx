"use client";
import Link from "next/link";
import { useEffect } from "react";
import { GITHUB_URL, X_URL } from "@/lib/site";
import { shortAddr } from "@/lib/game";
import GitHubMark from "./GitHubMark";
import XMark from "./XMark";
import { NavCA } from "./CopyCA";
import HoverText from "./HoverText";
import Logo from "./Logo";
import PumpMeter from "./PumpMeter";
import { walletLinks } from "./wallet";
import type { useMe } from "./useMe";

const LINKS = [
  ["/#tower", "tower"],
  ["/#city", "city"],
  ["/#skyline", "skyline"],
  ["/king", "king"],
  ["/launch", "launch"],
  ["/tokens", "tokens"],
  ["/activity", "activity"],
  ["/#docs", "docs"],
] as const;

/** The game's nav for the launchpad pages, with the same wallet button. */
export default function SiteNav({ wallet, active }: { wallet: ReturnType<typeof useMe>; active?: string }) {
  const { me, connect, signOut, mobilePick, setMobilePick, note, setNote } = wallet;
  useEffect(() => {
    if (!note) return;
    const id = setTimeout(() => setNote(null), 2400);
    return () => clearTimeout(id);
  }, [note, setNote]);
  return (
    <>
      <header className="nav">
        <Link className="brand" href="/">
          <Logo size={40} />
          <HoverText text="pump tower" className="pixel brand-word" />
          <PumpMeter />
        </Link>
        <nav className="nav-links">
          {LINKS.map(([href, label]) => (
            <Link key={href} href={href} className={active === href ? "on" : undefined} aria-current={active === href ? "page" : undefined}>
              <HoverText text={label} />
            </Link>
          ))}
        </nav>
        <NavCA />
        <a className="gh" href={GITHUB_URL} target="_blank" rel="noopener" title="source code on GitHub" aria-label="GitHub">
          <GitHubMark />
        </a>
        <a className="gh" href={X_URL} target="_blank" rel="noopener" title="Pump Tower on X" aria-label="Pump Tower on X">
          <XMark />
        </a>
        {me ? (
          <button className="btn ghost" onClick={signOut} title="sign out">
            {shortAddr(me)}
          </button>
        ) : (
          <button className="btn" onClick={() => void connect()}>
            connect
          </button>
        )}
      </header>
      {mobilePick && (
        <div className="shop-modal" role="dialog" aria-label="open in a wallet" onClick={(e) => e.target === e.currentTarget && setMobilePick(false)}>
          <div className="panel wallet-pick">
            <p className="pixel green">connect on your phone</p>
            <p className="dim">Phone browsers can&apos;t talk to wallets. Open Pump Tower inside your wallet app instead:</p>
            {walletLinks().map((l) => (
              <a key={l.name} className="btn" href={l.href}>
                open in {l.name}
              </a>
            ))}
            <button className="btn ghost" onClick={() => setMobilePick(false)}>
              not now
            </button>
          </div>
        </div>
      )}
      {note && <div className="toast pixel">{note}</div>}
    </>
  );
}
