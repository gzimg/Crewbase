import type { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/withSession";
import prisma from "@/utils/database";
import { requireSiteRole, getSiteRole } from "@/utils/siteRoles";
import { getStaffNotes, getReports } from "@/utils/siteSettings";

/** Full details about one user for site staff: memberships, notes and related reports. */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed" });
  const caller = await requireSiteRole(req, res, "staff");
  if (!caller) return;

  const userId = String(req.query.userid ?? "");
  if (!/^\d{1,15}$/.test(userId)) return res.status(400).json({ success: false, error: "Invalid user ID" });

  const user = await prisma.user.findUnique({
    where: { userid: BigInt(userId) },
    select: { userid: true, username: true, displayName: true, picture: true, isOwner: true, banned: true, bannedAt: true, bannedBy: true, banReason: true, registered: true },
  });
  if (!user) return res.status(404).json({ success: false, error: "User not found" });

  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: BigInt(userId) },
    select: { workspaceGroupId: true, joinDate: true, isAdmin: true, workspace: { select: { groupName: true, groupLogo: true } } },
  });
  const roleRows = await prisma.role.findMany({
    where: { members: { some: { userid: BigInt(userId) } } },
    select: { name: true, workspaceGroupId: true },
  }).catch(() => [] as { name: string; workspaceGroupId: bigint }[]);

  const [notes, reports, siteRole] = await Promise.all([getStaffNotes(userId), getReports(), getSiteRole(userId)]);
  const lowerName = (user.username || "").toLowerCase();
  const related = reports
    .filter((r) => r.reporterId === userId || (lowerName && r.targetUsername?.toLowerCase() === lowerName))
    .slice(0, 25);

  const noteAuthors = Array.from(new Set(notes.map((n) => n.by)));
  const authors = noteAuthors.length
    ? await prisma.user.findMany({ where: { userid: { in: noteAuthors.map((a) => BigInt(a)) } }, select: { userid: true, username: true } })
    : [];
  const authorNames = new Map(authors.map((a) => [a.userid.toString(), a.username]));

  return res.status(200).json({
    success: true,
    user: {
      userId,
      username: user.username,
      displayName: user.displayName,
      picture: user.picture,
      isOwner: !!user.isOwner,
      registered: !!user.registered,
      siteRole: user.isOwner ? "admin" : siteRole,
      banned: user.banned,
      bannedAt: user.bannedAt,
      banReason: user.banReason,
    },
    memberships: memberships.map((m) => ({
      groupId: m.workspaceGroupId.toString(),
      groupName: m.workspace?.groupName ?? null,
      groupLogo: m.workspace?.groupLogo ?? null,
      joinDate: m.joinDate,
      isAdmin: !!m.isAdmin,
      roles: roleRows.filter((r) => r.workspaceGroupId === m.workspaceGroupId).map((r) => r.name),
    })),
    notes: notes.map((n) => ({ ...n, byName: authorNames.get(n.by) ?? null })),
    reports: related,
    canExport: caller.role === "admin",
  });
}

export default withSessionRoute(handler);
