"use client";

// The sections that never change while you play. Memoised so the once-a-second clock
// that drives cash and tiers doesn't re-render hundreds of hover-text spans with it.
import { type CSSProperties, memo, useState } from "react";
import { DOCS, DOCS_INTRO } from "@/lib/howto";
import { HOUSE_MINT, HOUSE_SYMBOL, ITEMS, TIERS, fmtCash, shortAddr, type ItemKind } from "@/lib/game";
import HoverText from "./HoverText";
import ItemIcon from "./ItemIcon";
import Reveal from "./Reveal";
import TierLadder from "./TierLadder";

export const KIND_LABEL: Record<ItemKind, string> = { furniture: "furniture", pet: "pets", outfit: "outfits" };
export const KINDS: ItemKind[] = ["furniture", "pet", "outfit"];

export const LadderSection = memo(function LadderSection() {
  return (
    <Reveal id="ladder" className="sec">
      <div className="sec-head">
        <span className="kicker">04 / the ladder</span>
        <HoverText as="h2" text="hold longer, live higher" className="pixel display sm" />
      </div>
      <div className="how-grid">
        <div className="lore">
          <HoverText
            as="p"
            by="word"
            text="Every token in your wallet is a floor. The clock starts the moment the bag lands, and it starts over if you sell it all. Day zero is bare concrete and a flickering bulb. A day gets you a studio, three an apartment, a week a loft, two weeks a suite."
          />
          <HoverText as="p" by="word" text="Thirty days and you move into the penthouse at the very top, because the longest hold always lives highest." />
          <HoverText
            as="p"
            by="word"
            text="Citizens move in as a floor gets nicer and pay rent every hour. Fancier floors pay more. Your cash is worked out from your hold time on chain, so nobody can fake it and nobody can buy their way up. You have to sit in it."
          />
        </div>
        <TierLadder />
      </div>
    </Reveal>
  );
});

export const CatalogSection = memo(function CatalogSection() {
  return (
    <Reveal id="catalog" className="sec">
      <div className="sec-head">
        <span className="kicker">05 / the catalog</span>
        <HoverText as="h2" text="the good stuff waits for diamond hands" className="pixel display sm" />
        <HoverText
          as="p"
          by="word"
          className="lede"
          text="Furniture, pets and outfits unlock per floor by how long that floor has been held. Buy once, place it anywhere it qualifies."
        />
      </div>
      {KINDS.map((k) => (
        <div key={k} className="cat-group">
          <div className="cat-label">{KIND_LABEL[k]}</div>
          <div className="cat-grid">
            {ITEMS.filter((i) => i.kind === k).map((i, n) => (
              <div key={i.id} className={`cat-card t${i.minTier}`} style={{ "--i": n } as CSSProperties}>
                <ItemIcon id={i.id} kind={i.kind} size={56} />
                <span className="cat-name">{i.name}</span>
                <span className="cat-meta">
                  <span className="green">${fmtCash(i.price)}</span>
                  <span className="dim">{TIERS[i.minTier].name}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </Reveal>
  );
});

export const DocsSection = memo(function DocsSection() {
  return (
    <Reveal id="docs" className="sec">
      <div className="sec-head">
        <span className="kicker">06 / docs</span>
        <HoverText as="h2" text="every feature, explained" className="pixel display sm" />
      </div>
      <p className="docs-intro">{DOCS_INTRO}</p>
      <div className="docs">
        {DOCS.map((d, n) => (
          <section key={d.id} className="panel doc" style={{ "--i": n } as CSSProperties}>
            <h3 className="pixel green tiny-pixel">{d.title}</h3>
            <p className="dim doc-sum">{d.summary}</p>
            <dl>
              {d.items.map(([k, v]) => (
                <div key={k} className="doc-row">
                  <dt>{k}</dt>
                  <dd className="dim">{v}</dd>
                </div>
              ))}
            </dl>
            {d.id === "coin" && <HouseCoin />}
          </section>
        ))}
      </div>
    </Reveal>
  );
});

/** The $PTWR contract address with copy, and where to buy it, inside the docs. */
function HouseCoin() {
  const [copied, setCopied] = useState(false);
  return (
    <div className="ca-row doc-ca">
      {HOUSE_MINT ? (
        <button
          className="ca"
          onClick={() => {
            navigator.clipboard?.writeText(HOUSE_MINT!).then(() => setCopied(true));
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          <span className="label">ca</span>
          <span className="ca-short">{shortAddr(HOUSE_MINT)}</span>
          <span className="pixel green tiny-pixel">{copied ? "copied" : "copy"}</span>
        </button>
      ) : (
        <div className="ca">
          <span className="label">ca</span>
          <span className="dim">drops on launch day, right here</span>
        </div>
      )}
      {HOUSE_MINT ? (
        <a className="btn small" href={`https://pump.fun/coin/${HOUSE_MINT}`} target="_blank" rel="noreferrer">
          buy ${HOUSE_SYMBOL}
        </a>
      ) : (
        <span className="btn small ghost soon">launching soon</span>
      )}
    </div>
  );
}
