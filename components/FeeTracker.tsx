"use client";
// The fees-routed tracker on /tokens: every creator fee from coins launched here, split
// 80/20 between pump users and the treasury. Totals refresh every five seconds.
import { useEffect, useState } from "react";
import type { FeesRouted } from "@/lib/launch/routed";
import { SPLIT } from "@/lib/launch/model";
import { ago, fmtSol } from "./CoinCard";


export default function FeeTracker() {
  const [f, setF] = useState<FeesRouted | null>(null);
  useEffect(() => {
    let active = true;
    let loading = false;
    const load = async () => {
      if (loading || document.hidden) return;
      loading = true;
      try {
        const r = await fetch("/api/fees", { cache: "no-store" });
        if (r.ok) {
          const j = await r.json() as FeesRouted;
          if (active) setF(j);
        }
      } catch { /* Preserve the last successful totals. */ }
      finally { loading = false; }
    };
    void load();
    const id = setInterval(load, 5_000);
    return () => { active = false; clearInterval(id); };
  }, []);

  const live = !!f;
  const steps: { label: string; value: string; note: string; tone?: string }[] = [
    { label: "creator fees", value: `${fmtSol(f?.creatorSol ?? 0)} SOL`, note: `from ${f?.coins ?? 0} coin${f?.coins === 1 ? "" : "s"} launched here` },
    { label: `${SPLIT.recipientBps / 100}% to pump profiles`, value: `${fmtSol(f?.toUsersSol ?? 0)} SOL`, note: "straight to their wallets", tone: "green" },
    { label: `${SPLIT.treasuryBps / 100}% to treasury`, value: `${fmtSol(f?.toTreasurySol ?? 0)} SOL`, note: "retained in the treasury" },
  ];

  return (
    <section className="panel fee-tracker" id="fees" aria-label="fees routed">
      <header className="ft-head">
        <span className="pixel green tiny-pixel">
          <span className={`ft-dot${live ? " on" : ""}`} aria-hidden /> fees routed
        </span>
        <span className="dim">{f?.updatedAt ? `worker updated ${ago(f.updatedAt)}` : f ? "live totals, refreshed every 5 seconds" : "loading"}</span>
      </header>
      <ol className="ft-flow">
        {steps.map((s, i) => (
          <li key={s.label} className={`ft-step${s.tone ? ` ${s.tone}` : ""}`} style={{ ["--i" as string]: i }}>
            <span className="label">{s.label}</span>
            <span className="pixel ft-value">{f ? s.value : "…"}</span>
            <span className="dim ft-note">{s.note}</span>
          </li>
        ))}
      </ol>
      <div className="ft-split" aria-hidden>
        <span style={{ flex: SPLIT.recipientBps }}>{SPLIT.recipientBps / 100}% pump profiles</span>
        <span style={{ flex: SPLIT.treasuryBps }}>{SPLIT.treasuryBps / 100}%</span>
      </div>

    </section>
  );
}
