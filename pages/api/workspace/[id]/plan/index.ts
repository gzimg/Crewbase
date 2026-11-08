import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { getPlanDefinition, getPlanConfig, getWorkspaceUsage, getWorkspaceBadges, getPlanRequests, PLAN_ORDER } from "@/utils/plans";

/** The workspace's plan, usage, badges and recent plan requests. Any member can view it. */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed" });
  const groupId = String(req.query.id);

  // Lightweight version for the topbar badge
  if (req.query.lite) {
    const { id, def } = await getPlanDefinition(groupId);
    return res.status(200).json({ success: true, plan: { id, name: def.name, color: def.color } });
  }

  const [{ id, def, record }, config, usage, badges, requests] = await Promise.all([
    getPlanDefinition(groupId),
    getPlanConfig(),
    getWorkspaceUsage(groupId),
    getWorkspaceBadges(groupId),
    getPlanRequests(),
  ]);

  return res.status(200).json({
    success: true,
    plan: { id, ...def, source: record.source, since: record.since, expiresAt: record.expiresAt ?? null },
    plans: PLAN_ORDER.map((p) => ({ id: p, ...config.plans[p] })),
    usage,
    badges: badges.map(({ by, ...b }) => b),
    requestsOpen: config.requests.open,
    requests: requests
      .filter((r) => r.groupId === groupId)
      .slice(0, 10)
      .map(({ id: rid, plan, status, reason, createdAt, response, handledAt }) => ({ id: rid, plan, status, reason, createdAt, response, handledAt })),
  });
}

export default withPermissionCheck(handler);
