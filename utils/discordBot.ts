import crypto from "crypto";
import prisma from "@/utils/database";

/**
 * The Crewbase Discord bot. It uses Discord's "interactions over HTTP", so it
 * runs on Vercel like the rest of the site: Discord sends each slash command to
 * /api/discord/interactions and we answer straight away. No always-on server needed.
 *
 * Environment variables (from discord.com/developers/applications):
 *   DISCORD_BOT_APPLICATION_ID, DISCORD_BOT_PUBLIC_KEY, DISCORD_BOT_TOKEN
 */

export const BOT = {
  appId: process.env.DISCORD_BOT_APPLICATION_ID || "",
  publicKey: process.env.DISCORD_BOT_PUBLIC_KEY || "",
  token: process.env.DISCORD_BOT_TOKEN || "",
};
export const botConfigured = () => !!(BOT.appId && BOT.publicKey && BOT.token);

// Send Messages, Embed Links, Use Application Commands, plus Manage Roles and
// Manage Nicknames for verification and role syncing
const INVITE_PERMISSIONS = String((1n << 11n) | (1n << 14n) | (1n << 31n) | (1n << 28n) | (1n << 27n));
export const inviteUrl = () =>
  BOT.appId
    ? `https://discord.com/oauth2/authorize?client_id=${BOT.appId}&scope=bot%20applications.commands&permissions=${INVITE_PERMISSIONS}`
    : null;

/* ---------- Request signature check (required by Discord) ---------- */

let cachedKey: crypto.KeyObject | null = null;
export function verifyDiscordRequest(rawBody: string, signature: string | undefined, timestamp: string | undefined): boolean {
  if (!signature || !timestamp || !BOT.publicKey) return false;
  try {
    if (!cachedKey) {
      const x = Buffer.from(BOT.publicKey, "hex").toString("base64url");
      cachedKey = crypto.createPublicKey({ key: { kty: "OKP", crv: "Ed25519", x }, format: "jwk" });
    }
    return crypto.verify(null, Buffer.from(timestamp + rawBody), cachedKey, Buffer.from(signature, "hex"));
  } catch {
    return false;
  }
}

/* ---------- Slash commands ---------- */

const MANAGE_SERVER = String(1n << 5n);
export const COMMANDS = [
  { name: "link", description: "Connect this server to your Crewbase workspace", default_member_permissions: MANAGE_SERVER, dm_permission: false,
    options: [{ type: 3, name: "code", description: "The code from Team → Settings in your workspace", required: true, min_length: 6, max_length: 12 }] },
  { name: "unlink", description: "Disconnect this server from its Crewbase workspace", default_member_permissions: MANAGE_SERVER, dm_permission: false },
  { name: "activity", description: "Time in game over the last 7 days", dm_permission: false,
    options: [{ type: 6, name: "member", description: "Whose activity to show (defaults to you)", required: false }] },
  { name: "leaderboard", description: "Most active staff over the last 7 days", dm_permission: false },
  { name: "sessions", description: "Upcoming sessions", dm_permission: false },
  { name: "events", description: "Upcoming Team events", dm_permission: false },
  { name: "profile", description: "Someone’s Crewbase profile", dm_permission: false,
    options: [{ type: 6, name: "member", description: "Whose profile to show (defaults to you)", required: false }] },
  { name: "workspace", description: "Which Crewbase workspace this server is connected to", dm_permission: false },
  { name: "online", description: "Who’s in game right now", dm_permission: false },
  { name: "besttimes", description: "When your staff are usually online, for planning sessions", dm_permission: false },
  { name: "stats", description: "This workspace’s week at a glance", dm_permission: false },
  { name: "kudos", description: "Give a teammate kudos", dm_permission: false,
    options: [
      { type: 6, name: "member", description: "Who it’s for", required: true },
      { type: 3, name: "message", description: "What did they do?", required: true, min_length: 3, max_length: 400 },
    ] },
  { name: "tasks", description: "Your open Team tasks", dm_permission: false },
  { name: "announcement", description: "The latest workspace announcement", dm_permission: false },
  { name: "standing", description: "Your HR standing (only you can see the reply)", dm_permission: false },
  // Verification and roles (like Bloxlink)
  { name: "verify", description: "Link your Discord to your Roblox account and get your roles", dm_permission: false },
  { name: "update", description: "Refresh roles and nickname", dm_permission: false,
    options: [{ type: 6, name: "member", description: "Someone else to update (needs Manage Roles)", required: false }] },
  { name: "unverify", description: "Unlink your Discord from your Roblox account" },
  { name: "whois", description: "Someone’s Roblox account", dm_permission: false,
    options: [{ type: 6, name: "member", description: "Who to look up (defaults to you)", required: false }] },
  { name: "roblox", description: "Look up a Roblox user by username",
    options: [{ type: 3, name: "username", description: "Roblox username", required: true, max_length: 20 }] },
  { name: "bind", description: "Give Discord roles automatically", default_member_permissions: MANAGE_SERVER, dm_permission: false,
    options: [
      { type: 1, name: "add", description: "Add a role bind",
        options: [
          { type: 3, name: "type", description: "Who gets the role", required: true, choices: [
            { name: "Everyone verified", value: "verified" },
            { name: "Everyone not verified", value: "unverified" },
            { name: "Members of the linked workspace", value: "member" },
            { name: "A Crewbase role (put its name in value)", value: "crewbase_role" },
            { name: "A Roblox group rank (rank number in value, optional max)", value: "rank" },
            { name: "Owns a Crewbase workspace", value: "workspace_owner" },
            { name: "Admin of a Crewbase workspace", value: "workspace_admin" },
            { name: "Owns a workspace on a plan (starter, plus or pro in value)", value: "plan" },
            { name: "Crewbase site staff", value: "site_staff" },
            { name: "Crewbase site admin", value: "site_admin" },
            { name: "Staff of the Month", value: "staff_of_month" },
          ] },
          { type: 8, name: "role", description: "The Discord role to give", required: true },
          { type: 3, name: "value", description: "Crewbase role name, rank number, or plan name", required: false, max_length: 60 },
          { type: 4, name: "max", description: "Highest rank number, for a rank range", required: false, min_value: 0, max_value: 255 },
        ] },
      { type: 1, name: "remove", description: "Remove binds by role or by number from /bind list",
        options: [
          { type: 8, name: "role", description: "Remove every bind for this role", required: false },
          { type: 4, name: "number", description: "Remove one bind by its number in /bind list", required: false, min_value: 1, max_value: 100 },
        ] },
      { type: 1, name: "edit", description: "Change one bind (by its number in /bind list)",
        options: [
          { type: 4, name: "number", description: "The bind’s number in /bind list", required: true, min_value: 1, max_value: 100 },
          { type: 8, name: "role", description: "New Discord role", required: false },
          { type: 3, name: "value", description: "New value (Crewbase role name, rank number or plan)", required: false, max_length: 60 },
          { type: 4, name: "max", description: "New highest rank, for a rank range", required: false, min_value: 0, max_value: 255 },
        ] },
      { type: 1, name: "list", description: "Show this server’s role binds" },
      { type: 1, name: "roblox", description: "Match your Roblox group’s ranks to Discord roles with the same names",
        options: [{ type: 5, name: "create_missing", description: "Also create Discord roles for ranks that don’t have one", required: false }] },
      { type: 1, name: "lowerranks", description: "Let higher ranks keep the roles of the ranks below them",
        options: [
          { type: 4, name: "from_rank", description: "Roblox rank this starts at (0 turns it off)", required: true, min_value: 0, max_value: 255 },
          { type: 3, name: "mode", description: "Keep lower-rank roles they already have, or also give them", required: false, choices: [
            { name: "Keep the lower-rank roles they already have", value: "keep" },
            { name: "Also give every rank role from that rank up", value: "stack" },
          ] },
        ] },
      { type: 1, name: "clear", description: "Remove every bind in this server",
        options: [{ type: 5, name: "confirm", description: "Set to True to confirm", required: true }] },
    ] },
  { name: "nickname", description: "Set everyone’s nickname format when they update", default_member_permissions: MANAGE_SERVER, dm_permission: false,
    options: [{ type: 3, name: "format", description: "e.g. {roblox} or {display} (@{roblox}). Type off to stop.", required: true, max_length: 60 }] },
  { name: "verifypanel", description: "Post a Verify button in this channel", default_member_permissions: MANAGE_SERVER, dm_permission: false },
  { name: "shifts", description: "Announce upcoming shifts in a channel", default_member_permissions: MANAGE_SERVER, dm_permission: false,
    options: [
      { type: 1, name: "setup", description: "Choose where and when to announce shifts",
        options: [
          { type: 7, name: "channel", description: "Channel to post in", required: true, channel_types: [0, 5] },
          { type: 8, name: "ping", description: "Role to ping (optional)", required: false },
          { type: 4, name: "minutes", description: "How many minutes before a shift starts (default 30)", required: false, min_value: 5, max_value: 1440 },
        ] },
      { type: 1, name: "off", description: "Stop announcing shifts" },
      { type: 1, name: "status", description: "Show the current shift announcement settings" },
    ] },
  { name: "help", description: "What the Crewbase bot can do" },
];

export async function registerCommands(): Promise<{ ok: boolean; count?: number; error?: string }> {
  if (!botConfigured()) return { ok: false, error: "Set the three DISCORD_BOT_ variables first" };
  const res = await fetch(`https://discord.com/api/v10/applications/${BOT.appId}/commands`, {
    method: "PUT",
    headers: { Authorization: `Bot ${BOT.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(COMMANDS),
  });
  if (!res.ok) {
    const text = await res.text();
    const hint =
      res.status === 401 ? " The bot token is wrong or was reset." :
      res.status === 403 || res.status === 404 ? " The Application ID doesn’t match the bot token." : "";
    return { ok: false, error: `Discord said ${res.status}.${hint} Details: ${text.slice(0, 600)}` };
  }
  const data = await res.json();
  return { ok: true, count: Array.isArray(data) ? data.length : COMMANDS.length };
}

/* ---------- Server ↔ workspace links ---------- */

type Links = Record<string, { groupId: string; linkedBy: string; at: string }>;
type Codes = Record<string, { groupId: string; expires: number; by: string }>;

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const row = await prisma.instanceConfig.findUnique({ where: { key } });
  return ((row?.value as unknown) as T) ?? fallback;
}
async function writeJson(key: string, value: unknown) {
  await prisma.instanceConfig.upsert({ where: { key }, update: { value: value as any }, create: { key, value: value as any } });
}

export async function getGuildLinks(): Promise<Links> {
  return readJson<Links>("discordbot_links", {});
}
export async function getWorkspaceForGuild(guildId: string): Promise<string | null> {
  return (await getGuildLinks())[guildId]?.groupId ?? null;
}
export async function linkGuild(guildId: string, groupId: string, by: string) {
  const links = await getGuildLinks();
  links[guildId] = { groupId, linkedBy: by, at: new Date().toISOString() };
  await writeJson("discordbot_links", links);
}
export async function unlinkGuild(guildId: string) {
  const links = await getGuildLinks();
  delete links[guildId];
  await writeJson("discordbot_links", links);
}
export async function guildsForWorkspace(groupId: string) {
  const links = await getGuildLinks();
  return Object.entries(links).filter(([, l]) => l.groupId === groupId).map(([guildId, l]) => ({ guildId, ...l }));
}

/** One-time codes, made by a workspace manager, used once with /link within 15 minutes. */
export async function createLinkCode(groupId: string, by: string): Promise<string> {
  const codes = await readJson<Codes>("discordbot_codes", {});
  const now = Date.now();
  for (const [c, v] of Object.entries(codes)) if (v.expires < now || v.groupId === groupId) delete codes[c];
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const code = Array.from(crypto.randomBytes(8), (b) => alphabet[b % alphabet.length]).join("");
  codes[code] = { groupId, expires: now + 15 * 60_000, by };
  await writeJson("discordbot_codes", codes);
  return code;
}
export async function useLinkCode(code: string): Promise<string | null> {
  const codes = await readJson<Codes>("discordbot_codes", {});
  const entry = codes[code.trim().toUpperCase()];
  if (!entry || entry.expires < Date.now()) return null;
  delete codes[code.trim().toUpperCase()];
  await writeJson("discordbot_codes", codes);
  return entry.groupId;
}

/* ---------- Finding the Crewbase member behind a Discord user ---------- */

export async function memberForDiscordUser(groupId: string, discordUserId: string) {
  return prisma.workspaceMember.findFirst({
    where: { workspaceGroupId: BigInt(groupId), discordId: discordUserId },
    select: { userId: true, user: { select: { username: true, picture: true } } },
  });
}

export async function minutesInGame(groupId: string, userIds: bigint[], days = 7) {
  const since = new Date(Date.now() - days * 86_400_000);
  const sessions = await prisma.activitySession.findMany({
    where: { workspaceGroupId: BigInt(groupId), userId: { in: userIds }, startTime: { gte: since }, archived: { not: true } },
    select: { userId: true, startTime: true, endTime: true, idleTime: true, active: true },
  });
  const totals = new Map<string, number>();
  for (const s of sessions) {
    const end = s.endTime ? s.endTime.getTime() : s.active ? Date.now() : s.startTime.getTime();
    const minutes = Math.max(0, (end - s.startTime.getTime()) / 60000 - Number(s.idleTime || 0) / 60);
    totals.set(s.userId.toString(), (totals.get(s.userId.toString()) || 0) + minutes);
  }
  return totals;
}

/** Checks the bot’s setup with Discord, so the admin page can say exactly what’s wrong. */
export async function diagnoseBot() {
  const checks: { name: string; ok: boolean; detail: string }[] = [];
  const env = { appId: !!BOT.appId, publicKey: !!BOT.publicKey, token: !!BOT.token };
  checks.push({ name: "Environment variables", ok: env.appId && env.publicKey && env.token, detail: env.appId && env.publicKey && env.token ? "All three are set" : `Missing: ${[!env.appId && "DISCORD_BOT_APPLICATION_ID", !env.publicKey && "DISCORD_BOT_PUBLIC_KEY", !env.token && "DISCORD_BOT_TOKEN"].filter(Boolean).join(", ")}` });
  if (!env.token) return { checks, registered: 0 };

  const expectedUrl = `${(process.env.NEXTAUTH_URL || "https://crewbase.dev").replace(/\/+$/, "")}/api/discord/interactions`;
  let registered = 0;
  try {
    const res = await fetch("https://discord.com/api/v10/applications/@me", { headers: { Authorization: `Bot ${BOT.token}` }, signal: AbortSignal.timeout(4000) });
    if (res.status === 401) {
      checks.push({ name: "Bot token", ok: false, detail: "Discord rejected the token. Reset it in the Developer Portal (Bot → Reset Token), update DISCORD_BOT_TOKEN in Vercel, and redeploy." });
      return { checks, registered };
    }
    const app = await res.json();
    checks.push({ name: "Bot token", ok: true, detail: `Works for the app “${app.name}”` });
    checks.push({
      name: "Application ID matches the token",
      ok: String(app.id) === BOT.appId,
      detail: String(app.id) === BOT.appId ? `App ID ${app.id}` : `The token belongs to app ${app.id}, but DISCORD_BOT_APPLICATION_ID is ${BOT.appId}. Use the ID from the same app.`,
    });
    checks.push({
      name: "Public key matches",
      ok: !app.verify_key || app.verify_key === BOT.publicKey,
      detail: app.verify_key === BOT.publicKey ? "Matches" : "DISCORD_BOT_PUBLIC_KEY doesn’t match this app’s Public Key. Copy it again from General Information.",
    });
    const url = app.interactions_endpoint_url || "";
    checks.push({
      name: "Interactions Endpoint URL",
      ok: url === expectedUrl,
      detail: url ? (url === expectedUrl ? url : `Set to ${url}, but it should be ${expectedUrl}`) : `Not set. In the Developer Portal → General Information, set it to ${expectedUrl}`,
    });
    const cmds = await fetch(`https://discord.com/api/v10/applications/${app.id}/commands`, { headers: { Authorization: `Bot ${BOT.token}` }, signal: AbortSignal.timeout(4000) });
    if (cmds.ok) registered = (await cmds.json()).length;
    checks.push({ name: "Slash commands registered", ok: registered >= COMMANDS.length, detail: `${registered} of ${COMMANDS.length} registered with Discord` });
  } catch {
    checks.push({ name: "Reaching Discord", ok: false, detail: "Couldn’t reach Discord. Try again in a minute." });
  }
  return { checks, registered };
}
