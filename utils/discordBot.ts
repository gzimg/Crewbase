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

// Send Messages + Embed Links + Use Application Commands
const INVITE_PERMISSIONS = String((1n << 11n) | (1n << 14n) | (1n << 31n));
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
  { name: "stats", description: "This workspace’s week at a glance", dm_permission: false },
  { name: "kudos", description: "Give a teammate kudos", dm_permission: false,
    options: [
      { type: 6, name: "member", description: "Who it’s for", required: true },
      { type: 3, name: "message", description: "What did they do?", required: true, min_length: 3, max_length: 400 },
    ] },
  { name: "tasks", description: "Your open Team tasks", dm_permission: false },
  { name: "announcement", description: "The latest workspace announcement", dm_permission: false },
  { name: "standing", description: "Your HR standing (only you can see the reply)", dm_permission: false },
  { name: "help", description: "What the Crewbase bot can do" },
];

export async function registerCommands(): Promise<{ ok: boolean; count?: number; error?: string }> {
  if (!botConfigured()) return { ok: false, error: "Set the three DISCORD_BOT_ variables first" };
  const res = await fetch(`https://discord.com/api/v10/applications/${BOT.appId}/commands`, {
    method: "PUT",
    headers: { Authorization: `Bot ${BOT.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(COMMANDS),
  });
  if (!res.ok) return { ok: false, error: `Discord said ${res.status}: ${(await res.text()).slice(0, 300)}` };
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
