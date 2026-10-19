// Daily quests and referrals: small cash rewards for coming back, exploring and bringing
// friends. Rules only (shared by the page and the server); storage lives in lib/missions.ts.

export type QuestId = "collect" | "visit" | "decorate" | "coin" | "share";
export type Quest = { id: QuestId; label: string; target: number; reward: number };

export const QUESTS: Quest[] = [
  { id: "collect", label: "collect your daily rent bonus", target: 1, reward: 50 },
  { id: "visit", label: "visit 3 other towers", target: 3, reward: 75 },
  { id: "decorate", label: "buy or move in an item", target: 1, reward: 75 },
  { id: "coin", label: "open a coin on the tokens page", target: 1, reward: 50 },
  { id: "share", label: "share your tower on x", target: 1, reward: 50 },
];
/** Extra cash for finishing every quest in a day. */
export const ALL_QUESTS_BONUS = 150;

/** Referral rewards, paid once the new wallet has a real floor (a coin worth $0.50 or more). */
export const REFERRER_REWARD = 500;
export const REFERRED_REWARD = 250;

export const questById = (id: string) => QUESTS.find((q) => q.id === id);
export const questDayTotal = () => QUESTS.reduce((n, q) => n + q.reward, 0) + ALL_QUESTS_BONUS;

export type QuestState = { day: number; progress: Partial<Record<QuestId, number>>; allDone: boolean };
export type Referrals = { count: number; cash: number };
