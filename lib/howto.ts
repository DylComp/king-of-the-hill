// The docs shown in the "docs" section: what Pump Tower is, then every
// section of the site and its features, in page order. Kept next to the rules so each change
// updates it in the same commit; numbers are read from the rules, not typed in.
import {
  CASH_PER_SOL,
  HOUSE_BOOST,
  HOUSE_SYMBOL,
  MAX_FURNITURE,
  TIERS,
  WALLET_BONUS,
  citizensFor,
  floorRate,
  streakReward,
} from "./game";

export type DocSection = { id: string; title: string; summary: string; items: [string, string][] };

export const DOCS_INTRO =
  "Pump Tower turns a Solana wallet into a pixel skyscraper. Every coin you hold is a floor. The longer you hold it, the better the floor gets and the more rent it pays in game cash. It only reads wallets and never sends a transaction.";

export const DOCS: DocSection[] = [
  {
    id: "tower",
    title: "Tower",
    summary: "Your wallet as a building.",
    items: [
      ["Floors", "Every listed coin worth $0.50 or more is one floor. Oldest hold sits on top."],
      ["Home floor", "Signing in adds a free floor, so every tower has at least one."],
      ["Rooms", "Each floor is a themed room. Three rooms per tier; the coin picks which."],
      ["Coin details", "Rooms show the coin's logo, colours and live price. More cash or gold appears as the bag grows."],
      ["Mood", "Windows rain when the coin is down 12% on the day and show fireworks when it is up 12%."],
      ["Token card", "Next to each floor: bag value, 24h move, time held, rent, level and time to the next tier."],
      ["Level", "Grows with bag size times hold time."],
      ["Citizens", `${citizensFor(0)} on bare walls up to ${citizensFor(5)} in a penthouse. They talk about the coin.`],
      ["Visit", "Paste any wallet to see its tower. Share on X, copy the link or save a PNG."],
    ],
  },
  {
    id: "cash",
    title: "Cash",
    summary: "The game currency. Not a token, not withdrawable.",
    items: [
      ["Rent", `Each floor earns per hour by tier: $${floorRate(0, false)} on bare walls up to $${floorRate(5, false)} in a penthouse.`],
      ["Source", "Worked out from on-chain hold time, so it can't be faked."],
      ["Start", `New towers start with $${WALLET_BONUS}.`],
      ["Daily bonus", `Sign in and collect once a day. $${streakReward(1)} on day one, rising to $${streakReward(7)} from day seven. Missing a day resets the streak.`],
    ],
  },
  {
    id: "city",
    title: "City",
    summary: "Every tower on one skyline.",
    items: [
      ["Buildings", "Each ranked tower, floors lit by tier. Green is $" + HOUSE_SYMBOL + ", gold is a penthouse."],
      ["Order", "Highest rent in the middle. Top three get a lit antenna."],
      ["Visit", "Hover for the owner and rent, tap to walk in."],
    ],
  },
  {
    id: "skyline",
    title: "Skyline",
    summary: "The leaderboards.",
    items: [
      ["Season", "Weekly. Each daily check-in adds a day of your tower's rent as points."],
      ["All time", "Ranked by rent per hour."],
      ["Achievements", "Ten milestones, from moving in to a 7 day streak."],
    ],
  },
  {
    id: "ladder",
    title: "Ladder",
    summary: "How floors level up.",
    items: [
      ...TIERS.map((t): [string, string] => [t.name, `${t.minDays === 0 ? "Day zero" : `${t.minDays}+ days held`}. $${floorRate(t.id, false)}/hr.`]),
      ["Reset", "Selling the whole bag resets that floor's clock. Partial sells don't."],
    ],
  },
  {
    id: "catalog",
    title: "Catalog",
    summary: "What cash buys.",
    items: [
      ["Furniture", `Up to ${MAX_FURNITURE} pieces per floor, shown inside the room.`],
      ["Pets", "One per floor. Walks around the room."],
      ["Outfits", "One per floor. Every citizen on that floor wears it."],
      ["Unlocks", "Each item needs its floor to reach a tier first."],
      ["Full shop", "Open shop shows every item large, with a floor picker, so you can buy and place without scrolling the tower."],
      ["Saves", "Signed in, purchases are stored on the server and follow you to any device."],
    ],
  },
  {
    id: "coin",
    title: `$${HOUSE_SYMBOL}`,
    summary: "The game's coin, launching on pump.fun.",
    items: [
      ["HQ floor", `Holding $${HOUSE_SYMBOL} adds a Pump HQ floor that earns ${HOUSE_BOOST}x rent.`],
      ["Holder rewards", "pump.fun pays SOL to holders with $20 or more, several times an hour, straight to the wallet."],
      ["In game", `Every SOL received also adds $${CASH_PER_SOL.toLocaleString("en-US")} of game cash. Your SOL stays yours.`],
      ["Contract", "Posted on this site on launch day."],
    ],
  },
  {
    id: "safety",
    title: "Safety",
    summary: "What the site can and can't do.",
    items: [
      ["Read only", "Pump Tower reads balances and history. It never asks for a transaction."],
      ["Sign in", "A free message signature to prove the wallet is yours. It can't move tokens."],
      ["Wallets", "Phantom, Solflare and Backpack. On a phone, connect opens Pump Tower inside the Phantom or Solflare app."],
      ["Fair use", "Each connection gets a set number of requests a minute, so bots can't flood sign-in or the shop. Hit it and you wait a minute."],
    ],
  },
];
