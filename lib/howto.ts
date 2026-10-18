// The "how it works" guide. Kept as data next to the rules it explains so every
// game change updates it in the same commit. Numbers come from the rules where
// they can, so the guide can't drift from the game.
import { CASH_PER_SOL, HOUSE_BOOST, HOUSE_SYMBOL, MAX_FURNITURE, TIERS, WALLET_BONUS, citizensFor, floorRate, streakReward } from "./game";

export type Step = { n: string; title: string; body: string };

const tierLine = TIERS.map((t) => `${t.name} ${t.minDays === 0 ? "on day zero" : `at ${t.minDays}d`}`).join(", ");

export const HOW_IT_WORKS: Step[] = [
  {
    n: "01",
    title: "your bags are floors",
    body: `Connect a wallet or paste any address. Every listed coin worth $0.50 or more becomes a floor, the longest hold on top. Signing in also gives you a free home floor, so nobody starts with nothing.`,
  },
  {
    n: "02",
    title: "hold to climb",
    body: `A floor's clock starts when the bag lands and resets if you sell it all. Floors move up the tiers as they age: ${tierLine}. You can't buy your way up, only sit in it.`,
  },
  {
    n: "03",
    title: "every floor is a room",
    body: `Each tier has three themed rooms, from a noodle stall to the whale lounge, and the coin decides which one you get. The room wears the coin's colours, hangs its logo, runs its price on a ticker and piles up cash or gold with the bag size. Windows rain when the coin is down 12% on the day and set off fireworks when it is up 12%.`,
  },
  {
    n: "04",
    title: "the token card",
    body: `Next to every floor sits its card: logo, bag value, 24h move, time held, rent, the room's name and a bar to the next tier. Its level grows with bag size times hold time, so a big bag and a long hold both count.`,
  },
  {
    n: "05",
    title: "citizens pay rent",
    body: `Each tier adds a citizen, from ${citizensFor(0)} on bare walls to ${citizensFor(5)} in the penthouse, and they talk about their floor's coin. Rent runs from $${floorRate(0, false)}/hr on bare walls to $${floorRate(5, false)}/hr in a penthouse. Cash is worked out from on-chain hold time, so it can't be faked. New towers start with $${WALLET_BONUS}.`,
  },
  {
    n: "06",
    title: "spend it",
    body: `Furniture, pets and outfits unlock by the tier of the floor you put them on. Up to ${MAX_FURNITURE} pieces of furniture, one pet and one outfit per floor, and you see all of it inside the room.`,
  },
  {
    n: "07",
    title: "check in daily",
    body: `Signed-in towers collect a daily rent bonus that grows with the streak, $${streakReward(1)} on day one up to $${streakReward(7)} a day from day seven. Each check-in also banks a full day of your tower's rent as season points.`,
  },
  {
    n: "08",
    title: "seasons and achievements",
    body: `Seasons run a week and reset on the leaderboard; the all-time board ranks by rent per hour. Ten achievements track the milestones, from moving in to a 7 day streak.`,
  },
  {
    n: "09",
    title: `$${HOUSE_SYMBOL} floors`,
    body: `Holding $${HOUSE_SYMBOL} adds its own Pump HQ floor with a neon frame that earns ${HOUSE_BOOST}x rent. It launches on pump.fun with holder rewards on: holders with $20 or more get SOL paid straight to their wallet several times an hour, and every SOL paid also lands in your tower as $${CASH_PER_SOL.toLocaleString("en-US")} of game cash.`,
  },
  {
    n: "10",
    title: "the city",
    body: `Every ranked tower stands in the city, tallest rent in the middle and the top three lit up on their roofs. Hover a building to see whose it is and tap it to walk inside.`,
  },
  {
    n: "11",
    title: "read only",
    body: `Pump Tower only reads wallets. Signing in is a free message signature, never a transaction, and it can't move your tokens.`,
  },
];
