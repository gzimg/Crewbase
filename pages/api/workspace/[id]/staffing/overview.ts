import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import prisma from "@/utils/database";
import { getMemberContext, listItems } from "@/utils/teamStore";
import { hasStaffing, isStaffing } from "@/utils/teamRules";
import { staffingEnabled } from "@/utils/staffing";

/**
 * Staffing at a glance: headcount against targets, open positions, the hiring
 * pipeline, upcoming interviews, shift coverage for the next 7 days, turnover and
 * availability. Also says what the current member can do in Staffing.
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  const groupId = parseInt(String(req.query.id));
  const gid = BigInt(groupId);
  const [enabled, ctx] = await Promise.all([staffingEnabled(groupId), getMemberContext(req.session.userid!, groupId)]);
  const can = { view: isStaffing(ctx), manage: hasStaffing(ctx, "staffing.manage"), recruit: hasStaffing(ctx, "staffing.recruit") };
  if (!enabled) return res.status(200).json({ success: true, enabled: false, can });
  if (!can.view) return res.status(200).json({ success: true, enabled: true, can, me: ctx.id });

  const now = Date.now();
  const week = new Date(now + 7 * 86_400_000);
  const ninety = new Date(now - 90 * 86_400_000);
  const [roles, positions, candidates, headcount, availability, resignations, joins, members, sessions] = await Promise.all([
    prisma.role.findMany({ where: { workspaceGroupId: gid }, select: { name: true, _count: { select: { members: true } } } }),
    listItems(groupId, "positions"),
    listItems(groupId, "candidates"),
    listItems(groupId, "headcount"),
    listItems(groupId, "availability"),
    listItems(groupId, "resignations"),
    prisma.workspaceMember.count({ where: { workspaceGroupId: gid, joinDate: { gte: ninety } } }),
    prisma.workspaceMember.count({ where: { workspaceGroupId: gid } }),
    prisma.session.findMany({
      where: { sessionType: { workspaceGroupId: gid }, date: { gte: new Date(now), lte: week }, ended: null },
      select: { id: true, name: true, date: true, sessionType: { select: { name: true, slots: true } }, _count: { select: { users: true } } },
      orderBy: { date: "asc" },
      take: 50,
    }),
  ]);

  const counts = new Map(roles.map((r) => [r.name.toLowerCase(), r._count.members]));
  const headcountRows = headcount.map((h) => {
    const current = counts.get(String(h.roleName).toLowerCase()) ?? 0;
    return { id: h.id, roleName: h.roleName, target: h.target, minimum: h.minimum, current, gap: Number(h.target) - Number(current), belowMinimum: h.minimum > 0 && current < h.minimum };
  });
  const pipeline = Object.fromEntries(["applied", "screening", "interview", "offer", "hired", "rejected"].map((s) => [s, candidates.filter((c) => c.stage === s).length]));
  const upcomingInterviews = candidates
    .filter((c) => c.interview?.status === "scheduled" && new Date(c.interview.at).getTime() > now - 3_600_000)
    .sort((a, b) => a.interview.at.localeCompare(b.interview.at))
    .slice(0, 8)
    .map((c) => ({ id: c.id, username: c.username, positionTitle: c.positionTitle, at: c.interview.at, interviewers: c.interview.interviewers }));
  const coverage = sessions.map((s) => {
    const slots = (s.sessionType?.slots || []).reduce((sum: number, slot: any) => sum + (Number(slot?.slots) || 0), 0);
    return { id: s.id, name: s.name || s.sessionType?.name || "Session", date: s.date, signedUp: s._count.users, slots, short: slots > 0 && s._count.users < slots };
  });
  const recentResignations = resignations.filter((r) => new Date(r.createdAt).getTime() > ninety.getTime() && r.status !== "withdrawn");

  return res.status(200).json({
    success: true,
    enabled: true,
    can,
    me: ctx.id,
    members,
    headcount: headcountRows,
    positions: { open: positions.filter((p) => p.status === "open").length, openings: positions.filter((p) => p.status === "open").reduce((s, p) => s + (p.openings || 0), 0) },
    pipeline,
    upcomingInterviews,
    coverage,
    turnover: { joined90: joins, left90: recentResignations.length, rate: members ? Math.round((recentResignations.length / members) * 1000) / 10 : 0 },
    availability: { submitted: availability.length, members },
  });
}

export default withPermissionCheck(handler);
