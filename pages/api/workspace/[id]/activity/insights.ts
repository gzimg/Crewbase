import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import prisma from "@/utils/database";
import { getMemberContext } from "@/utils/teamStore";

/**
 * Activity insights for managers: each member’s time in game for the last 4 weeks,
 * their trend, and who has gone quiet without an inactivity notice.
 * ?format=csv downloads the same table.
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed" });
  const groupId = parseInt(String(req.query.id));
  const gid = BigInt(groupId);
  const ctx = await getMemberContext(req.session.userid!, groupId);
  if (!ctx.isManager && !ctx.perms?.includes("view_members")) return res.status(403).json({ success: false, error: "You don’t have access to activity insights" });

  const WEEK = 7 * 86_400_000;
  const now = Date.now();
  const since = new Date(now - 4 * WEEK);
  const [members, sessions, notices] = await Promise.all([
    prisma.workspaceMember.findMany({ where: { workspaceGroupId: gid }, select: { userId: true, user: { select: { username: true, picture: true } } }, take: 3000 }),
    prisma.activitySession.findMany({
      where: { workspaceGroupId: gid, startTime: { gte: since }, archived: { not: true } },
      select: { userId: true, startTime: true, endTime: true, idleTime: true, active: true },
      take: 200_000,
    }),
    prisma.inactivityNotice.findMany({
      where: { workspaceGroupId: gid, approved: true, revoked: { not: true }, OR: [{ endTime: null }, { endTime: { gte: new Date(now) } }], startTime: { lte: new Date(now) } },
      select: { userId: true },
    }),
  ]);

  const weeks = new Map<string, number[]>();
  const last = new Map<string, number>();
  for (const s of sessions) {
    const id = s.userId.toString();
    const end = s.endTime ? s.endTime.getTime() : s.active ? now : s.startTime.getTime();
    const minutes = Math.max(0, (end - s.startTime.getTime()) / 60000 - Number(s.idleTime || 0) / 60);
    const bucket = Math.min(3, Math.floor((now - s.startTime.getTime()) / WEEK)); // 0 = this week
    const arr = weeks.get(id) || [0, 0, 0, 0];
    arr[bucket] += minutes;
    weeks.set(id, arr);
    last.set(id, Math.max(last.get(id) || 0, end));
  }
  const onNotice = new Set(notices.map((n) => n.userId.toString()));

  const rows = members.map((m) => {
    const id = m.userId.toString();
    const w = (weeks.get(id) || [0, 0, 0, 0]).map((x) => Math.round(x));
    const prevAvg = (w[1] + w[2] + w[3]) / 3;
    const trend = prevAvg === 0 ? (w[0] > 0 ? 100 : 0) : Math.round(((w[0] - prevAvg) / prevAvg) * 100);
    const lastSeen = last.get(id) || null;
    const quiet = !lastSeen || now - lastSeen > 14 * 86_400_000;
    return { userId: id, username: m.user?.username || id, picture: m.user?.picture || null, weeks: w, total: w.reduce((a, b) => a + b, 0), trend, lastSeen: lastSeen ? new Date(lastSeen).toISOString() : null, onNotice: onNotice.has(id), quiet };
  });
  rows.sort((a, b) => b.total - a.total);

  if (req.query.format === "csv") {
    const cell = (v: unknown) => { let t = String(v ?? ""); if (/^[=+\-@\t\r]/.test(t)) t = "'" + t; return `"${t.replace(/"/g, '""')}"`; };
    const lines = [["Member", "Roblox ID", "This week (min)", "Last week (min)", "2 weeks ago (min)", "3 weeks ago (min)", "Trend %", "Last seen", "On notice"].map(cell).join(",")];
    for (const r of rows) lines.push([r.username, r.userId, ...r.weeks, r.trend, r.lastSeen || "Never", r.onNotice ? "Yes" : "No"].map(cell).join(","));
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="crewbase-activity-insights.csv"');
    return res.status(200).send(lines.join("\n"));
  }

  const totals = [0, 1, 2, 3].map((i) => rows.reduce((s, r) => s + r.weeks[i], 0));
  return res.status(200).json({
    success: true,
    totals,
    activeThisWeek: rows.filter((r) => r.weeks[0] > 0).length,
    members: rows.length,
    quietWithoutNotice: rows.filter((r) => r.quiet && !r.onNotice).map((r) => ({ userId: r.userId, username: r.username, lastSeen: r.lastSeen })),
    // Burnout watch: well above their own normal, or very long weeks back to back
    mightBeOverdoingIt: rows
      .filter((r) => {
        const prevAvg = (r.weeks[1] + r.weeks[2] + r.weeks[3]) / 3;
        const spike = r.weeks[0] >= 20 * 60 && prevAvg > 0 && r.weeks[0] >= prevAvg * 2;
        const sustained = r.weeks[0] >= 25 * 60 && r.weeks[1] >= 25 * 60;
        return spike || sustained;
      })
      .map((r) => ({ userId: r.userId, username: r.username, thisWeek: r.weeks[0], lastWeek: r.weeks[1] })),
    rows,
  });
}

export default withPermissionCheck(handler);
