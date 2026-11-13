import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { getMemberContext, listItems } from "@/utils/teamStore";
import { isHR } from "@/utils/teamRules";

/** HR reports: trends in discipline, complaints, appeals, recognition and people leaving. HR only. */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  const groupId = parseInt(String(req.query.id));
  const ctx = await getMemberContext(req.session.userid!, groupId);
  if (!isHR(ctx)) return res.status(403).json({ success: false, error: "Only HR can see reports" });

  const [infractions, complaints, appeals, resignations, commendations, investigations, watchlist] = await Promise.all([
    listItems(groupId, "infractions"), listItems(groupId, "complaints"), listItems(groupId, "appeals"), listItems(groupId, "resignations"),
    listItems(groupId, "commendations"), listItems(groupId, "investigations"), listItems(groupId, "watchlist"),
  ]);

  const months: string[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) months.push(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1)).toISOString().slice(0, 7));
  const byMonth = (items: any[]) => months.map((m) => items.filter((x) => String(x.createdAt).slice(0, 7) === m).length);
  const countBy = (items: any[], key: string) => {
    const out: Record<string, number> = {};
    for (const x of items) out[x[key] || "other"] = (out[x[key] || "other"] || 0) + 1;
    return out;
  };
  const topReasons = Object.entries(countBy(infractions, "reason")).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([reason, count]) => ({ reason, count }));
  const resolved = complaints.filter((c) => c.status === "resolved" || c.status === "closed");
  const avgDays = resolved.length
    ? Math.round((resolved.reduce((s, c) => s + (new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime()), 0) / resolved.length / 86_400_000) * 10) / 10
    : null;

  return res.status(200).json({
    success: true,
    months,
    infractions: { perMonth: byMonth(infractions), byLevel: countBy(infractions, "level"), topReasons, total: infractions.length },
    commendations: { perMonth: byMonth(commendations), total: commendations.length },
    complaints: { byCategory: countBy(complaints, "category"), byStatus: countBy(complaints, "status"), avgDaysToResolve: avgDays, total: complaints.length },
    appeals: { byDecision: countBy(appeals.filter((a) => a.status === "decided"), "decision"), pending: appeals.filter((a) => a.status === "pending").length },
    resignations: { perMonth: byMonth(resignations), byReason: countBy(resignations, "reason"), wouldReturn: countBy(resignations, "wouldReturn"), total: resignations.length },
    investigations: { byStatus: countBy(investigations, "status") },
    watchlist: watchlist.length,
  });
}

export default withPermissionCheck(handler);
