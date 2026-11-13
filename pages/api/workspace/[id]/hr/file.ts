import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import prisma from "@/utils/database";
import { getMemberContext, listItems } from "@/utils/teamStore";
import { isHR } from "@/utils/teamRules";

/** A member’s staff file: everything HR-related about them in one place. HR only. */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  const groupId = parseInt(String(req.query.id));
  const ctx = await getMemberContext(req.session.userid!, groupId);
  if (!isHR(ctx)) return res.status(403).json({ success: false, error: "Only HR can view staff files" });
  const userId = String(req.query.userId || "");
  if (!/^\d{1,15}$/.test(userId)) return res.status(400).json({ success: false, error: "Pick a member" });

  const [commendations, watchlist, investigations] = await Promise.all([
    listItems(groupId, "commendations"),
    listItems(groupId, "watchlist"),
    listItems(groupId, "investigations"),
  ]);
  const [user, member, infractions, complaints, pips, resignations, awards, certs, reviews, kudos, notices] = await Promise.all([
    prisma.user.findUnique({ where: { userid: BigInt(userId) }, select: { username: true, picture: true } }),
    prisma.workspaceMember.findUnique({ where: { workspaceGroupId_userId: { workspaceGroupId: BigInt(groupId), userId: BigInt(userId) } }, select: { joinDate: true, isAdmin: true } }),
    listItems(groupId, "infractions"),
    listItems(groupId, "complaints"),
    listItems(groupId, "pips"),
    listItems(groupId, "resignations"),
    listItems(groupId, "awards"),
    listItems(groupId, "certifications"),
    listItems(groupId, "reviews"),
    listItems(groupId, "kudos"),
    prisma.inactivityNotice.count({ where: { workspaceGroupId: BigInt(groupId), userId: BigInt(userId) } }).catch(() => 0),
  ]);
  const roles = await prisma.role.findMany({ where: { workspaceGroupId: BigInt(groupId), members: { some: { userid: BigInt(userId) } } }, select: { name: true } });
  const now = Date.now();
  const mine = infractions.filter((i) => i.userId === userId);
  const activePoints = mine
    .filter((i) => i.status === "active" && (!i.expiresAt || new Date(i.expiresAt).getTime() > now))
    .reduce((s, i) => s + (i.points || 0), 0);
  const certNames = new Map(certs.map((c) => [c.id, c.name]));

  return res.status(200).json({
    success: true,
    member: { userId, username: user?.username || userId, picture: user?.picture || null, joinDate: member?.joinDate || null, isAdmin: !!member?.isAdmin, roles: roles.map((r) => r.name) },
    activePoints,
    infractions: mine,
    complaintsAbout: complaints.filter((c) => c.aboutUserId === userId).map(({ id, subject, status, createdAt }) => ({ id, subject, status, createdAt })),
    pips: pips.filter((p) => p.userId === userId),
    resignations: resignations.filter((r) => r.createdBy === userId),
    certifications: awards.filter((a) => a.userId === userId).map((a) => ({ ...a, certName: certNames.get(a.certId) || "Removed certification" })),
    reviews: reviews.filter((r) => r.userId === userId),
    kudosReceived: kudos.filter((k) => k.toUserId === userId).length,
    commendations: commendations.filter((c) => c.userId === userId),
    watchlist: watchlist.filter((w) => w.userId === userId),
    investigations: investigations.filter((i) => (i.subjects || []).some((s: any) => s.userId === userId)).map(({ id, title, status, createdAt }) => ({ id, title, status, createdAt })),
    notices,
  });
}

export default withPermissionCheck(handler);
