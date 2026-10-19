"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CoinView, ProfileSummary } from "@/lib/launch/registry";
import type { TokenTotals } from "@/app/api/tokens/route";
import { FEE_TIERS, FEE_TIER_NAMES } from "@/lib/launch/model";
import CoinCard, { ago, fmtSol, fmtUsd } from "./CoinCard";
import { CoinLogo, ProfilePic, profileName } from "./Pics";
import SiteNav from "./SiteNav";
import { useMe } from "./useMe";

type View = "coins" | "profiles";

export default function Tokens() {
  const wallet = useMe();
  const [coins, setCoins] = useState<CoinView[] | null>(null);
  const [total, setTotal] = useState(0);
  const [sums, setSums] = useState<TokenTotals | null>(null);
  const [page, setPage] = useState(0);
  const [more, setMore] = useState(false);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<View>("coins");
  // Back links from a pump profile land on the profiles tab.
  useEffect(() => {
    if (new URL(window.location.href).searchParams.get("tab") === "profiles") setTab("profiles");
  }, []);
  const [profiles, setProfiles] = useState<ProfileSummary[] | null>(null);

  useEffect(() => {
    let active = true;
    let loading = false;
    const load = async () => {
      if (loading || document.hidden) return;
      loading = true;
      try {
        const pages = await Promise.all(Array.from({ length: page + 1 }, async (_, i) => {
          const r = await fetch(`/api/tokens?page=${i}`, { cache: "no-store" });
          if (!r.ok) throw Error("Token refresh failed");
          return r.json() as Promise<{ coins: CoinView[]; total: number; totals: TokenTotals }>;
        }));
        if (!active) return;
        setCoins(pages.flatMap(p => p.coins));
        setTotal(pages[0].total);
        setSums(pages[0].totals);
        setMore(pages.at(-1)!.coins.length === 30);
      } catch { /* Keep the last successful totals during transient failures. */ }
      finally { loading = false; }
    };
    void load();
    // Keep deeper pagination below the shared API request budget.
    const id = setInterval(load, Math.max(5_000, (page + 1) * 2_000));
    return () => { active = false; clearInterval(id); };
  }, [page]);

  useEffect(() => {
    if (tab !== "profiles") return;
    let active = true;
    let loading = false;
    const load = async () => {
      if (loading || document.hidden) return;
      loading = true;
      try {
        const r = await fetch("/api/tokens?view=profiles", { cache: "no-store" });
        if (!r.ok) return;
        const j = await r.json() as { profiles: ProfileSummary[] };
        if (active) setProfiles(j.profiles);
      } finally { loading = false; }
    };
    void load().catch(() => {});
    const id = setInterval(() => { void load().catch(() => {}); }, 5_000);
    return () => { active = false; clearInterval(id); };
  }, [tab]);

  const people = useMemo(() => {
    const term = q.trim().toLowerCase().replace(/^@/, "");
    return (profiles ?? []).filter((p) => !term || (p.profile.username ?? "").toLowerCase().includes(term) || p.profile.wallet === q.trim());
  }, [profiles, q]);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase().replace(/^\$/, "");
    const list = (coins ?? []).filter(
      (c) => !term || c.name.toLowerCase().includes(term) || c.ticker.toLowerCase().includes(term) || (c.recipient.username ?? "").toLowerCase().includes(term) || c.mint === q.trim(),
    );
    return list;
  }, [coins, q]);
  const fees = sums?.feesSol ?? 0;

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
              <span className="label">pump profiles</span>
              <span className="pixel big">{sums?.profiles ?? 0}</span>
              <span className="dim">{fmtSol(sums?.earnedSol ?? 0)} SOL earned</span>
            </div>
            <div className="panel tile">
              <span className="label">creator fees</span>
              <span className="pixel big green">{fmtSol(fees)} SOL</span>
              <span className="dim">all coins, lifetime</span>
            </div>
            <div className="panel tile">
              <span className="label">24h volume</span>
              <span className="pixel big">{fmtUsd(sums?.volUsd ?? 0)}</span>
              <span className="dim">all coins combined</span>
            </div>
            <div className="panel tile">
              <span className="label">market cap</span>
              <span className="pixel big">{fmtUsd(sums?.mcapUsd ?? 0)}</span>
              <span className="dim">all coins combined</span>
            </div>
          </div>
          <div className="token-tools">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={tab === "coins" ? "search name, ticker or pump user" : "search pump username or wallet"}
              aria-label="search"
            />
            <div className="tabs">
              {(["coins", "profiles"] as View[]).map((v) => (
                <button key={v} className={`tab${tab === v ? " on" : ""}`} onClick={() => setTab(v)}>
                  {v === "coins" ? "coins" : "pump profiles"}
                </button>
              ))}
            </div>
            <Link className="btn" href="/launch">
              launch a coin
            </Link>
          </div>
          {tab === "profiles" ? (
            profiles == null ? (
              <p className="pixel blink tiny-pixel">loading pump profiles</p>
            ) : people.length ? (
              <div className="profile-grid swap" key={"p" + q}>
                {people.map((p, i) => (
                  <ProfileCard key={p.profile.wallet} p={p} i={i} />
                ))}
              </div>
            ) : (
              <div className="panel empty-coins">
                <p className="pixel green">{profiles.length ? "nobody matches" : "no pump profiles yet"}</p>
                <p className="dim">{profiles.length ? "Try another username." : "Every pump user a coin is launched for shows up here."}</p>
              </div>
            )
          ) : (
            <>
          {coins == null ? (
            <p className="pixel blink tiny-pixel">loading coins</p>
          ) : shown.length ? (
            <div className="coin-grid swap" key={q}>
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
          {more && !q && tab === "coins" && (
            <button className="btn ghost more" onClick={() => setPage((p) => p + 1)}>
              load more
            </button>
          )}
            </>
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

/** One pump user: picture, name, and their totals across every coin launched for them. */
function ProfileCard({ p, i }: { p: ProfileSummary; i: number }) {
  const name = profileName(p.profile);
  return (
    <Link className="panel profile-card" href={`/u/${p.profile.wallet}`} style={{ ["--i" as string]: i }}>
      <span className="profile-top">
        <ProfilePic profile={p.profile} size={48} />
        <span className="profile-name">
          <span className="pixel">{name}</span>
          <span className="dim">
            {p.profile.followers != null ? `${p.profile.followers.toLocaleString()} followers on pump` : "pump.fun profile"}
          </span>
        </span>
      </span>
      <span className="profile-stats">
        <span>
          <span className="label">coins</span>
          <span className="pixel">{p.coins}</span>
        </span>
        <span>
          <span className="label">fees</span>
          <span className="pixel green">{fmtSol(p.feesSol)} SOL</span>
        </span>
        <span>
          <span className="label">earned</span>
          <span className="pixel">{fmtSol(p.earnedSol)} SOL</span>
        </span>
        <span>
          <span className="label">market cap</span>
          <span className="pixel">{fmtUsd(p.mcapUsd)}</span>
        </span>
        <span>
          <span className="label">24h volume</span>
          <span className="pixel">{fmtUsd(p.volUsd ?? 0)}</span>
        </span>
        <span>
          <span className="label">last launch</span>
          <span className="pixel">{ago(p.latest)}</span>
        </span>
      </span>
      <span className="profile-coins">
        <span className="profile-logos" aria-hidden>
          {(p.recent ?? [p.top]).map((c) => (
            <CoinLogo key={c.mint} mint={c.mint} ticker={c.ticker} size={26} className="mini-logo" />
          ))}
        </span>
        <span className="dim">
          top <span className="green">${p.top.ticker}</span> {p.top.mcapUsd != null ? `at ${fmtUsd(p.top.mcapUsd)}` : ""}
        </span>
      </span>
    </Link>
  );
}
