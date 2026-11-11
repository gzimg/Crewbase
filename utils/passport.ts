import crypto from "crypto";
import prisma from "@/utils/database";
import { listItems } from "@/utils/teamStore";

/**
 * Staff Passport: a verified, shareable record of someone’s staff experience across
 * Crewbase workspaces, to show another group when they apply. It’s off by default,
 * the member picks which workspaces it includes, and they can turn it off any time.
 */
type Passport = { userId: string; groupIds: string[]; createdAt: string };

async function readAll(): Promise<Record<string, Passport>> {
  const row = await prisma.instanceConfig.findUnique({ where: { key: "passports" } });
  return ((row?.value as unknown) as Record<string, Passport>) || {};
}
async function writeAll(all: Record<string, Passport>) {
  await prisma.instanceConfig.upsert({ where: { key: "passports" }, update: { value: all as any }, create: { key: "passports", value: all as any } });
}

export async function getMyPassport(userId: string) {
  const all = await readAll();
  const entry = Object.entries(all).find(([, p]) => p.userId === userId);
  return entry ? { token: entry[0], ...entry[1] } : null;
}

export async function savePassport(userId: string, groupIds: string[], regenerate = false) {
  const all = await readAll();
  const existing = Object.entries(all).find(([, p]) => p.userId === userId);
  let token = existing?.[0];
  if (existing && regenerate) delete all[existing[0]];
  if (!token || regenerate) token = crypto.randomBytes(12).toString("base64url");
  all[token] = { userId, groupIds: groupIds.slice(0, 20), createdAt: existing?.[1].createdAt || new Date().toISOString() };
  await writeAll(all);
  return token;
}

export async function deletePassport(userId: string) {
  const all = await readAll();
  for (const [t, p] of Object.entries(all)) if (p.userId === userId) delete all[t];
  await writeAll(all);
}

/** The public record behind a passport link. Only positive, verified facts: no discipline or HR records. */
export async function buildPassport(token: string) {
  if (!/^[\w-]{10,40}$/.test(token)) return null;
  const all = await readAll();
  const p = all[token];
  if (!p) return null;
  const uid = BigInt(p.userId);
  const user = await prisma.user.findUnique({ where: { userid: uid }, select: { username: true, displayName: true, picture: true, banned: true, registered: true } });
  if (!user || user.banned || !user.registered) return null;

  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: uid, workspaceGroupId: { in: p.groupIds.map((g) => BigInt(g)) } },
    select: { workspaceGroupId: true, joinDate: true, workspace: { select: { groupName: true, groupLogo: true } } },
  });

  const now = Date.now();
  const workspaces = [];
  for (const m of memberships) {
    const gid = Number(m.workspaceGroupId);
    const [roles, certs, awards, kudos, nominations, sessions] = await Promise.all([
      prisma.role.findMany({ where: { workspaceGroupId: m.workspaceGroupId, members: { some: { userid: uid } } }, select: { name: true } }),
      listItems(gid, "certifications"),
      listItems(gid, "awards"),
      listItems(gid, "kudos"),
      listItems(gid, "nominations", { take: 500 }),
      prisma.activitySession.findMany({
        where: { workspaceGroupId: m.workspaceGroupId, userId: uid, startTime: { gte: new Date(now - 90 * 86_400_000) }, archived: { not: true } },
        select: { startTime: true, endTime: true, idleTime: true },
      }),
    ]);
    const certName = new Map(certs.map((c) => [c.id, c.name]));
    const hours = Math.round(sessions.reduce((s, x) => s + Math.max(0, ((x.endTime?.getTime() || x.startTime.getTime()) - x.startTime.getTime()) / 60000 - Number(x.idleTime || 0) / 60), 0) / 60);
    workspaces.push({
      groupId: m.workspaceGroupId.toString(),
      groupName: m.workspace?.groupName || "A Roblox group",
      groupLogo: m.workspace?.groupLogo || null,
      since: m.joinDate,
      roles: roles.map((r) => r.name),
      certifications: awards
        .filter((a) => a.userId === p.userId && (!a.expiresAt || new Date(a.expiresAt).getTime() > now))
        .map((a) => ({ name: certName.get(a.certId) || "Certification", since: a.awardedAt })),
      kudosReceived: kudos.filter((k) => k.toUserId === p.userId).length,
      staffOfTheMonth: nominations.filter((n) => n.winner && n.nomineeId === p.userId).map((n) => n.month),
      hoursLast90Days: hours,
    });
  }
  return {
    username: user.username,
    displayName: user.displayName,
    picture: user.picture,
    robloxId: p.userId,
    createdAt: p.createdAt,
    workspaces,
    generatedAt: new Date().toISOString(),
  };
}
