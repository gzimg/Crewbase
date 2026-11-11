import crypto from "crypto";
import prisma from "@/utils/database";
import { BOT, getWorkspaceForGuild } from "@/utils/discordBot";
import { decryptApiKey } from "@/utils/bloxlink";
import { getSiteRole } from "@/utils/siteRoles";
import { getWorkspacePlan } from "@/utils/plans";
import { listItems } from "@/utils/teamStore";

/**
 * Verification and role syncing for the Crewbase bot, similar to what Bloxlink offers.
 *
 * - People verify once: /verify gives them a link to crewbase.dev, where they log in.
 *   That links their Discord account to their Crewbase (Roblox) account everywhere.
 * - If someone hasn’t verified with Crewbase, but the workspace has Bloxlink set up,
 *   the bot asks Bloxlink who they are instead.
 * - Each server sets "binds": rules that give Discord roles. Someone can match many
 *   binds at once, so they get every role they qualify for.
 */

export type BindKind =
  | "verified" | "unverified" | "member" | "crewbase_role" | "rank"
  | "workspace_owner" | "workspace_admin" | "plan" | "site_staff" | "site_admin" | "staff_of_month";

export type Bind = { id: string; kind: BindKind; roleId: string; value?: string; max?: number };
export type GuildConfig = {
  binds: Bind[];
  nickname: string | null;
  unverifiedRoleId?: string | null;
  // People at or above this Roblox rank keep (or also get) the roles for lower ranks
  lowerRanks?: { fromRank: number; mode: "keep" | "stack" } | null;
};

export const BIND_LABELS: Record<BindKind, string> = {
  verified: "Everyone who has verified",
  unverified: "Everyone who hasn’t verified",
  member: "Members of the linked workspace",
  crewbase_role: "A Crewbase workspace role",
  rank: "A Roblox group rank (or range)",
  workspace_owner: "Owns a Crewbase workspace",
  workspace_admin: "Is an admin of a Crewbase workspace",
  plan: "Owns a workspace on a plan (starter, plus or pro)",
  site_staff: "Crewbase site staff",
  site_admin: "Crewbase site admin",
  staff_of_month: "This month’s Staff of the Month",
};

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const row = await prisma.instanceConfig.findUnique({ where: { key } });
  return ((row?.value as unknown) as T) ?? fallback;
}
async function writeJson(key: string, value: unknown) {
  await prisma.instanceConfig.upsert({ where: { key }, update: { value: value as any }, create: { key, value: value as any } });
}

/* ---------- Discord ↔ Crewbase links ---------- */

export async function getLinkedUser(discordId: string): Promise<string | null> {
  const links = await readJson<Record<string, string>>("discord_user_links", {});
  return links[discordId] ?? null;
}
export async function getDiscordForUser(userId: string): Promise<string | null> {
  const links = await readJson<Record<string, string>>("discord_user_links", {});
  return Object.entries(links).find(([, u]) => u === userId)?.[0] ?? null;
}
export async function setLink(discordId: string, userId: string | null) {
  const links = await readJson<Record<string, string>>("discord_user_links", {});
  for (const [d, u] of Object.entries(links)) if (u === userId || d === discordId) delete links[d];
  if (userId) links[discordId] = userId;
  await writeJson("discord_user_links", links);
  // Fill in the Discord ID on their workspace profiles too, so older features find them
  if (userId) {
    await prisma.workspaceMember.updateMany({ where: { userId: BigInt(userId) }, data: { discordId } }).catch(() => {});
  } else {
    await prisma.workspaceMember.updateMany({ where: { discordId }, data: { discordId: null } }).catch(() => {});
  }
}

type VerifyCode = { discordId: string; guildId: string | null; expires: number };
export async function createVerifyCode(discordId: string, guildId: string | null): Promise<string> {
  const codes = await readJson<Record<string, VerifyCode>>("discord_verify_codes", {});
  const now = Date.now();
  for (const [c, v] of Object.entries(codes)) if (v.expires < now || v.discordId === discordId) delete codes[c];
  const code = crypto.randomBytes(18).toString("base64url");
  codes[code] = { discordId, guildId, expires: now + 15 * 60_000 };
  await writeJson("discord_verify_codes", codes);
  return code;
}
export async function useVerifyCode(code: string): Promise<VerifyCode | null> {
  const codes = await readJson<Record<string, VerifyCode>>("discord_verify_codes", {});
  const entry = codes[code];
  if (!entry || entry.expires < Date.now()) return null;
  delete codes[code];
  await writeJson("discord_verify_codes", codes);
  return entry;
}

/** Who a Discord user is on Roblox: their Crewbase link first, then Bloxlink if the workspace uses it. */
export async function resolveRobloxId(discordId: string, guildId: string): Promise<{ userId: string; source: "crewbase" | "bloxlink" } | null> {
  const linked = await getLinkedUser(discordId);
  if (linked) return { userId: linked, source: "crewbase" };
  const groupId = await getWorkspaceForGuild(guildId);
  if (!groupId) return null;
  const blox = await prisma.bloxlinkIntegration.findUnique({ where: { workspaceGroupId: BigInt(groupId) } }).catch(() => null);
  if (!blox?.isActive || !blox.apiKey) return null;
  try {
    const res = await fetch(`https://api.blox.link/v4/public/guilds/${blox.discordServerId}/discord-to-roblox/${discordId}`, {
      headers: { Authorization: decryptApiKey(blox.apiKey) },
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.robloxID ? { userId: String(data.robloxID), source: "bloxlink" } : null;
  } catch {
    return null;
  }
}

/* ---------- Server settings: binds and nicknames ---------- */

export async function getGuildConfig(guildId: string): Promise<GuildConfig> {
  const all = await readJson<Record<string, GuildConfig>>("discordbot_guilds", {});
  const stored = all[guildId];
  return { binds: stored?.binds || [], nickname: stored?.nickname ?? null, unverifiedRoleId: stored?.unverifiedRoleId ?? null, lowerRanks: stored?.lowerRanks ?? null };
}
export async function saveGuildConfig(guildId: string, config: GuildConfig) {
  const all = await readJson<Record<string, GuildConfig>>("discordbot_guilds", {});
  all[guildId] = { ...config, binds: config.binds.slice(0, 100) };
  await writeJson("discordbot_guilds", all);
}

/* ---------- Discord REST ---------- */

async function discord(method: string, path: string, body?: unknown) {
  const res = await fetch(`https://discord.com/api/v10${path}`, {
    method,
    headers: { Authorization: `Bot ${BOT.token}`, "Content-Type": "application/json", "X-Audit-Log-Reason": "Crewbase role sync" },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(2500),
  });
  if (!res.ok && res.status !== 204) throw new Error(`${res.status}`);
  return res.status === 204 ? null : res.json();
}

/* ---------- Working out someone’s roles ---------- */

async function factsFor(userId: string, groupId: string | null) {
  const uid = BigInt(userId);
  const [user, membership, roles, rank, owned, adminOf, siteRole] = await Promise.all([
    prisma.user.findUnique({ where: { userid: uid }, select: { username: true, displayName: true } }),
    groupId ? prisma.workspaceMember.findUnique({ where: { workspaceGroupId_userId: { workspaceGroupId: BigInt(groupId), userId: uid } }, select: { isAdmin: true } }) : null,
    groupId ? prisma.role.findMany({ where: { workspaceGroupId: BigInt(groupId), members: { some: { userid: uid } } }, select: { id: true, name: true } }) : [],
    // Live rank from Roblox, so group members who aren’t on the staff workspace still get rank roles
    groupId ? import("@/utils/roblox").then((m) => m.getRankInGroup(Number(groupId), Number(userId))).catch(() => null) : null,
    prisma.workspace.findMany({ where: { ownerId: uid }, select: { groupId: true } }),
    prisma.workspaceMember.count({ where: { userId: uid, isAdmin: true } }),
    getSiteRole(userId).catch(() => null),
  ]);
  const plans = new Set<string>();
  for (const w of owned) plans.add((await getWorkspacePlan(w.groupId)).plan);
  let staffOfMonth = false;
  if (groupId) {
    const month = new Date().toISOString().slice(0, 7);
    staffOfMonth = (await listItems(parseInt(groupId), "nominations", { take: 200 })).some((n) => n.winner && n.month === month && n.nomineeId === userId);
  }
  return {
    username: user?.username || null,
    displayName: user?.displayName || null,
    isMember: !!membership,
    roleIds: new Set(roles.map((r) => r.id)),
    roleNames: new Set(roles.map((r) => r.name.toLowerCase())),
    roleList: roles.map((r) => r.name),
    rank: typeof rank === "number" ? rank : null,
    ownsWorkspace: owned.length > 0,
    adminSomewhere: adminOf > 0 || owned.length > 0,
    plans,
    siteRole,
    staffOfMonth,
  };
}

function matches(bind: Bind, f: Awaited<ReturnType<typeof factsFor>> | null): boolean {
  if (bind.kind === "unverified") return !f;
  if (!f) return false;
  switch (bind.kind) {
    case "verified": return true;
    case "member": return f.isMember;
    case "crewbase_role": return !!bind.value && (f.roleIds.has(bind.value) || f.roleNames.has(bind.value.toLowerCase()));
    case "rank": {
      if (f.rank === null) return false;
      const min = Number(bind.value);
      const max = bind.max ?? min;
      return f.rank >= min && f.rank <= max;
    }
    case "workspace_owner": return f.ownsWorkspace;
    case "workspace_admin": return f.adminSomewhere;
    case "plan": return !!bind.value && f.plans.has(bind.value.toLowerCase());
    case "site_staff": return f.siteRole === "staff" || f.siteRole === "admin";
    case "site_admin": return f.siteRole === "admin";
    case "staff_of_month": return f.staffOfMonth;
    default: return false;
  }
}

function renderNickname(template: string, f: Awaited<ReturnType<typeof factsFor>>): string {
  return template
    .replace(/\{roblox\}/gi, f.username || "")
    .replace(/\{display\}/gi, f.displayName || f.username || "")
    .replace(/\{rank\}/gi, f.roleList[0] || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 32);
}

export type SyncResult = {
  verified: boolean; username: string | null; added: string[]; removed: string[]; nickname: string | null; failed: number;
  source?: string; bindCount: number; problem?: string;
};

// Crewbase’s own Discord server. Some bind types only make sense there.
export const OFFICIAL_GUILD_ID = process.env.CREWBASE_GUILD_ID || "1568101450100252682";
export const OFFICIAL_ONLY_BINDS: BindKind[] = ["workspace_owner", "workspace_admin", "plan", "site_staff", "site_admin"];

/** Gives and removes bound roles (and sets the nickname) for one person in one server. */
export async function syncMember(guildId: string, discordId: string): Promise<SyncResult> {
  const [config, who, groupId] = await Promise.all([getGuildConfig(guildId), resolveRobloxId(discordId, guildId), getWorkspaceForGuild(guildId)]);
  const facts = who ? await factsFor(who.userId, groupId) : null;

  const boundRoles = new Set(config.binds.map((b) => b.roleId));
  const wanted = new Set(config.binds.filter((b) => matches(b, facts)).map((b) => b.roleId));

  // Higher ranks can keep (or also get) the roles for the ranks below them
  const keep = new Set<string>();
  const lr = config.lowerRanks;
  if (lr && facts?.rank !== null && facts?.rank !== undefined && facts.rank >= lr.fromRank) {
    const lower = config.binds.filter((b) => b.kind === "rank" && Number(b.max ?? b.value) < facts.rank! && Number(b.value) >= 1);
    for (const b of lower) {
      if (lr.mode === "stack" && Number(b.value) >= lr.fromRank) wanted.add(b.roleId);
      keep.add(b.roleId);
    }
  }

  const base = { verified: !!facts, username: facts?.username || null, source: who?.source, bindCount: config.binds.length };
  if (!config.binds.length && !config.nickname) {
    return { ...base, added: [], removed: [], nickname: null, failed: 0, problem: "no_binds" };
  }

  let current: string[] = [];
  try {
    const member = await discord("GET", `/guilds/${guildId}/members/${discordId}`);
    current = member?.roles || [];
  } catch (e: any) {
    return { ...base, added: [], removed: [], nickname: null, failed: 1, problem: String(e?.message) === "403" ? "no_access" : "member_lookup" };
  }
  const toAdd = Array.from(wanted).filter((r) => !current.includes(r));
  const toRemove = current.filter((r) => boundRoles.has(r) && !wanted.has(r) && !keep.has(r));

  let failed = 0;
  await Promise.all([
    ...toAdd.map((r) => discord("PUT", `/guilds/${guildId}/members/${discordId}/roles/${r}`).catch(() => { failed++; })),
    ...toRemove.map((r) => discord("DELETE", `/guilds/${guildId}/members/${discordId}/roles/${r}`).catch(() => { failed++; })),
  ]);

  let nickname: string | null = null;
  if (facts && config.nickname) {
    nickname = renderNickname(config.nickname, facts);
    if (nickname) await discord("PATCH", `/guilds/${guildId}/members/${discordId}`, { nick: nickname }).catch(() => { nickname = null; });
  }
  return { ...base, added: toAdd, removed: toRemove, nickname, failed };
}

/** Public Roblox profile lookup for /whois and /roblox. */
export async function robloxProfile(userId: string) {
  try {
    const [u, thumb] = await Promise.all([
      fetch(`https://users.roblox.com/v1/users/${userId}`, { signal: AbortSignal.timeout(2000) }).then((r) => (r.ok ? r.json() : null)),
      fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png`, { signal: AbortSignal.timeout(2000) })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ]);
    if (!u) return null;
    return { id: String(u.id), name: u.name, displayName: u.displayName, created: u.created, isBanned: u.isBanned, avatar: thumb?.data?.[0]?.imageUrl || null };
  } catch {
    return null;
  }
}

export async function robloxIdFromUsername(username: string): Promise<string | null> {
  try {
    const res = await fetch("https://users.roblox.com/v1/usernames/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usernames: [username], excludeBannedUsers: false }),
      signal: AbortSignal.timeout(2000),
    });
    const data = await res.json();
    return data?.data?.[0]?.id ? String(data.data[0].id) : null;
  } catch {
    return null;
  }
}

export { factsFor };

/* ---------- Matching Roblox group ranks to Discord roles ---------- */

/**
 * Creates a rank bind for every Roblox group role that has a Discord role with the
 * same name (ignoring capitals). With createMissing, Discord roles are created for
 * group roles that don’t have one yet. Existing binds are left alone.
 */
export async function autoLinkRanks(guildId: string, opts: { createMissing: boolean }) {
  const groupId = await getWorkspaceForGuild(guildId);
  if (!groupId) return { error: "Link this server to a workspace first with /link." } as const;
  const { getGroupRoles } = await import("@/utils/roblox");
  const groupRoles = (await getGroupRoles(Number(groupId))).filter((r) => r.rank > 0).sort((a, b) => a.rank - b.rank);
  if (!groupRoles.length) return { error: "I couldn’t read that Roblox group’s roles. Try again in a minute." } as const;

  let discordRoles: { id: string; name: string; managed: boolean }[] = await discord("GET", `/guilds/${guildId}/roles`);
  const config = await getGuildConfig(guildId);
  const matched: string[] = [];
  const created: string[] = [];
  const skipped: string[] = [];
  const missing: string[] = [];

  for (const gr of groupRoles) {
    let role = discordRoles.find((d) => !d.managed && d.name.trim().toLowerCase() === gr.name.trim().toLowerCase());
    if (!role && opts.createMissing) {
      try {
        role = await discord("POST", `/guilds/${guildId}/roles`, { name: gr.name, permissions: "0", mentionable: false });
        discordRoles = [...discordRoles, role!];
        created.push(gr.name);
      } catch {
        missing.push(gr.name);
        continue;
      }
    }
    if (!role) {
      missing.push(gr.name);
      continue;
    }
    const exists = config.binds.some((b) => b.kind === "rank" && b.roleId === role!.id && Number(b.value) === gr.rank && (b.max ?? gr.rank) === gr.rank);
    if (exists) {
      skipped.push(gr.name);
      continue;
    }
    config.binds.push({ id: crypto.randomBytes(4).toString("hex"), kind: "rank", roleId: role.id, value: String(gr.rank), max: gr.rank });
    matched.push(`${gr.name} (${gr.rank})`);
  }
  await saveGuildConfig(guildId, config);
  return { matched, created, skipped, missing, total: config.binds.length } as const;
}
