import type { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/withSession";
import prisma from "@/utils/database";
import { requireSiteRole, logSiteAction } from "@/utils/siteRoles";
import {
  getAllWorkspacePlans, getAllWorkspaceBadges, getPlanRequests, getPlanConfig, setWorkspacePlan, PLAN_ORDER, PlanId,
} from "@/utils/plans";

/**
 * GET: every workspace with its plan and badges, plus plan requests (site staff).
 * POST { groupId, plan, expiresAt?, note? }: assign a plan directly (site staff).
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET" && req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });
  const caller = await requireSiteRole(req, res, "staff");
  if (!caller) return;

  if (req.method === "POST") {
    const groupId = String(req.body?.groupId ?? "");
    const plan = req.body?.plan as PlanId;
    if (!/^\d{1,15}$/.test(groupId) || !PLAN_ORDER.includes(plan)) return res.status(400).json({ success: false, error: "Invalid workspace or plan" });
    const ws = await prisma.workspace.findUnique({ where: { groupId: BigInt(groupId) }, select: { groupName: true } });
    if (!ws) return res.status(404).json({ success: false, error: "Workspace not found" });
    let expiresAt: string | null = null;
    if (req.body?.expiresAt) {
      const d = new Date(req.body.expiresAt);
      if (isNaN(d.getTime()) || d.getTime() < Date.now()) return res.status(400).json({ success: false, error: "The end date must be in the future" });
      expiresAt = d.toISOString();
    }
    const note = typeof req.body?.note === "string" ? req.body.note.trim().slice(0, 300) : undefined;
    await setWorkspacePlan(groupId, { plan, source: "staff", since: new Date().toISOString(), by: caller.userId, expiresAt, note });
    await logSiteAction({ actorId: caller.userId, action: "set_workspace_plan", detail: `${ws.groupName || groupId} → ${plan}${expiresAt ? ` until ${expiresAt.slice(0, 10)}` : ""}` });
    return res.status(200).json({ success: true });
  }

  const [workspaces, plans, badges, requests, config] = await Promise.all([
    prisma.workspace.findMany({ select: { groupId: true, groupName: true, groupLogo: true, _count: { select: { members: true } } }, orderBy: { groupName: "asc" } }),
    getAllWorkspacePlans(),
    getAllWorkspaceBadges(),
    getPlanRequests(),
    getPlanConfig(),
  ]);
  const names = new Map(workspaces.map((w) => [w.groupId.toString(), w.groupName]));
  const requesterIds: string[] = Array.from(new Set(requests.slice(0, 200).map((r) => String(r.requestedBy))));
  const users = requesterIds.length
    ? await prisma.user.findMany({ where: { userid: { in: requesterIds.map((id) => BigInt(id)) } }, select: { userid: true, username: true } })
    : [];
  const userNames = new Map(users.map((u) => [u.userid.toString(), u.username]));

  return res.status(200).json({
    success: true,
    plans: PLAN_ORDER.map((id) => ({ id, name: config.plans[id].name, color: config.plans[id].color })),
    workspaces: workspaces.map((w) => {
      const id = w.groupId.toString();
      const p = plans[id];
      const expired = p?.expiresAt && new Date(p.expiresAt).getTime() < Date.now();
      return {
        groupId: id,
        groupName: w.groupName,
        groupLogo: w.groupLogo,
        members: w._count.members,
        plan: p && !expired ? p.plan : config.defaultPlan,
        source: p && !expired ? p.source : "default",
        expiresAt: p && !expired ? p.expiresAt ?? null : null,
        badges: badges[id] ?? [],
      };
    }),
    requests: requests.slice(0, 200).map((r) => ({ ...r, groupName: names.get(r.groupId) ?? null, requestedByName: userNames.get(r.requestedBy) ?? null })),
  });
}

export default withSessionRoute(handler);
