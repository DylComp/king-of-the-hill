"use client";
import Link from "next/link";
import { useEffect } from "react";
import { GITHUB_URL, X_URL } from "@/lib/site";
import { shortAddr } from "@/lib/game";
import GitHubMark from "./GitHubMark";
import XMark from "./XMark";
import HoverText from "./HoverText";
import Logo from "./Logo";
import { walletLinks } from "./wallet";
import type { useMe } from "./useMe";

const LINKS = [
  ["/", "squads"],
  ["/#back", "back a squad"],
  ["/#rewards", "rewards"],
  ["/#docs", "how it works"],
] as const;

/** A section with its own name and mark, like King of the Hill. */
export type Brand = { name: string; href: string; logo: string };

/** Shared tracker navigation. */
export default function SiteNav({ wallet, active, brand }: { wallet: ReturnType<typeof useMe>; active?: string; brand?: Brand }) {
  const { me, connect, signOut, mobilePick, setMobilePick, note, setNote } = wallet;
  useEffect(() => {
    if (!note) return;
    const id = setTimeout(() => setNote(null), 2400);
    return () => clearTimeout(id);
  }, [note, setNote]);
  return (
    <>
      <header className="nav">
        {brand ? (
          <Link className="brand" href={brand.href}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="logo-svg pixelated" src={brand.logo} alt="" aria-hidden width={40} height={40} decoding="async" />
            <HoverText text={brand.name} className="pixel brand-word" />
          </Link>
        ) : (
          <Link className="brand" href="/">
            <Logo size={40} />
            <HoverText text="king of the hill" className="pixel brand-word" />

          </Link>
        )}
        <nav className="nav-links">
          {LINKS.map(([href, label]) => (
            <Link key={href} href={href} className={active === href ? "on" : undefined} aria-current={active === href ? "page" : undefined}>
              <HoverText text={label} />
            </Link>
          ))}
        </nav>
        <a className="gh" href={GITHUB_URL} target="_blank" rel="noopener" title="source code on GitHub" aria-label="GitHub">
          <GitHubMark />
        </a>
        <a className="gh" href={X_URL} target="_blank" rel="noopener" title="King of the Hill on X" aria-label="King of the Hill on X">
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
            <p className="dim">Phone browsers can&apos;t talk to wallets. Open King of the Hill inside your wallet app instead:</p>
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
