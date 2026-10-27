export type DocSection = { id: string; title: string; summary: string; items: [string, string][] };
export const DOCS_INTRO = "King of the Hill follows all 100 squads in pump.fun’s Squad Invitational using public wallet activity.";
export const DOCS: DocSection[] = [{ id: "tracking", title: "Follow the competition", summary: "Compare squad trading results and see who earns each hourly crown.", items: [
  ["Standings", "The board shows SOL banked from tracked trades during this hour and the previous hour. It is a trading activity measure, not a wallet balance."],
  ["Coverage", "The scanner reads member wallets every five minutes. Tracking begins with each wallet’s first scan; earlier trades are not backfilled. Failed reads are retried, so standings can lag."],
  ["Hourly crowns", "The eligible squad with the best positive result earns the hourly crown. If no eligible squad has a positive result, no crown is awarded. Incomplete scan coverage is marked."],
  ["Competition", "The cup ends November 9, 2026 at 14:00 UTC. Final results may take time to settle as wallet scans complete."],
  ["Read-only", "Browsing the tracker is free and requires no wallet connection. The tracker reads public activity and does not move funds."]
]}];
