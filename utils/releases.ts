/**
 * Crewbase release notes that ship with the code. Each update adds an entry here,
 * so the What’s new page, the in-app changelog and the “new” dot update by
 * themselves when the update is deployed. Site admins can still post extra updates
 * from Site admin → What’s new.
 */
export type Release = { id: string; at: string; tag: "new" | "improved" | "fixed"; title: string; body: string };

export const RELEASES: Release[] = [
  {
    id: "2026-11-14-import-roles",
    at: "2026-11-14T21:00:00.000Z",
    tag: "new",
    title: "Import your Roblox group’s roles",
    body: "In role settings, Import group roles creates a Crewbase role for every rank in your Roblox group, linked and ready, then puts everyone in the right one. New roles start with no permissions, so you choose what each can do.",
  },
  {
    id: "2026-11-14-sync-group",
    at: "2026-11-14T20:00:00.000Z",
    tag: "fixed",
    title: "Sync Group works again",
    body: "The Sync Group button in role settings now finishes syncing with your Roblox group before telling you it’s done, then refreshes the page so you can see the changes.",
  },
  {
    id: "2026-11-14-api-keys",
    at: "2026-11-14T18:00:00.000Z",
    tag: "improved",
    title: "API keys now start with crewbase_",
    body: "New Public API keys start with “crewbase_”. Keys you already have (starting with “firefli_”) keep working exactly as before, so nothing needs changing.",
  },
  {
    id: "2026-11-14-hr",
    at: "2026-11-14T12:00:00.000Z",
    tag: "new",
    title: "A bigger HR section",
    body: "HR now has an automatic HR log of every action, investigations with timelines and evidence, commendations for great work, a private watchlist with review dates, six months of HR reports, and rehire eligibility when someone resigns. Staff files show all of it in one place.",
  },
  {
    id: "2026-11-13-moderation-hr",
    at: "2026-11-13T18:00:00.000Z",
    tag: "improved",
    title: "Moderation moved into HR",
    body: "Moderation cases now live in the HR section, next to infractions and appeals, so everything about staff and player conduct is in one place. Nothing about moderation itself has changed.",
  },
  {
    id: "2026-11-13-departments",
    at: "2026-11-13T12:00:00.000Z",
    tag: "new",
    title: "Departments and Crewbase badges",
    body: "Departments give groups of people extra permissions on top of their role. People can join automatically through their role (which follows your Roblox group ranks) or be added by hand. Names now also show Crewbase badges, like Crewbase staff, Early supporter or Bug hunter, and a workspace owner’s name shows in gold.",
  },
  {
    id: "2026-11-12-staffing",
    at: "2026-11-12T12:00:00.000Z",
    tag: "new",
    title: "Staffing",
    body: "A new Staffing section: post open positions (with an optional public careers page), move candidates through a hiring pipeline with interviews and scorecards, set headcount targets for each role, see shift coverage for the week, track turnover, and collect your team’s availability. It’s on by default, and you can turn it off in Settings → Feature Flags.",
  },
  {
    id: "2026-11-11-swaps",
    at: "2026-11-11T20:00:00.000Z",
    tag: "new",
    title: "Shift swaps and work anniversaries",
    body: "Can’t make a shift you signed up for? Offer it under Team → Shift swaps, and a teammate can take it in one click. Crewbase now also celebrates work anniversaries, so nobody’s first year on the team goes unnoticed.",
  },
  {
    id: "2026-11-11-lowerranks",
    at: "2026-11-11T17:00:00.000Z",
    tag: "new",
    title: "Roblox rank binds in one command",
    body: "/bind roblox matches every Roblox group rank to the Discord role with the same name. Binds are numbered and easy to change with /bind edit and /bind remove, and /bind lowerranks lets higher ranks keep the roles of the ranks below them.",
  },
  {
    id: "2026-11-11-verify",
    at: "2026-11-11T15:00:00.000Z",
    tag: "improved",
    title: "Faster, clearer verification",
    body: "/verify, /update and the Verify button now answer instantly and finish in the background, and tell you exactly why a role couldn’t be given.",
  },
  {
    id: "2026-11-11-besttimes",
    at: "2026-11-11T12:00:00.000Z",
    tag: "new",
    title: "Best times to host and burnout watch",
    body: "See when your staff are actually in game, hour by hour, with the three best times to host. Activity Insights now also gently flags staff who might be overdoing it.",
  },
  {
    id: "2026-11-11-paths",
    at: "2026-11-11T09:00:00.000Z",
    tag: "new",
    title: "Promotion paths and Staff Passport",
    body: "Publish exactly what each promotion takes and let staff track their progress. Staff can also share a verified record of their experience with other groups, if they choose to.",
  },
  {
    id: "2026-11-10-discord-login",
    at: "2026-11-10T20:00:00.000Z",
    tag: "new",
    title: "Continue with Discord",
    body: "Log in with Discord once it’s linked to your Crewbase account, and link it from your account page in one click.",
  },
  {
    id: "2026-11-10-plans",
    at: "2026-11-10T16:00:00.000Z",
    tag: "improved",
    title: "Clearer plan requests",
    body: "Each plan now shows what a workspace needs to request it, requests include more detail, you’re notified when a decision is made, and each workspace has a plan history.",
  },
  {
    id: "2026-11-10-shifts",
    at: "2026-11-10T12:00:00.000Z",
    tag: "new",
    title: "Shift announcements in Discord",
    body: "Crewbase can post upcoming shifts to a Discord channel before they start, with the host and how many have signed up. Set it up with /shifts setup.",
  },
  {
    id: "2026-11-10-hr",
    at: "2026-11-10T08:00:00.000Z",
    tag: "new",
    title: "Human resources",
    body: "A full HR section: infractions with points and expiry, appeals, private complaints, improvement plans, resignations with exit surveys, and staff files.",
  },
];
