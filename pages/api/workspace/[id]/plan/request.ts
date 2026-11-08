import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { getPlanDefinition, getPlanConfig, getPlanRequests, savePlanRequests, getWorkspaceUsage, PLAN_ORDER, PlanId } from "@/utils/plans";
import { newId } from "@/utils/siteSettings";

/**
 * POST { plan, reason } asks Crewbase staff for a higher plan.
 * DELETE cancels this workspace's pending request. Workspace admins only.
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  const groupId = String(req.query.id);
  const userId = String(req.session.userid);
  const requests = await getPlanRequests();
  const pending = requests.find((r) => r.groupId === groupId && r.status === "pending");

  if (req.method === "DELETE") {
    if (!pending) return res.status(404).json({ success: false, error: "No pending request" });
    pending.status = "cancelled";
    pending.handledAt = new Date().toISOString();
    await savePlanRequests(requests);
    return res.status(200).json({ success: true });
  }
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });

  const config = await getPlanConfig();
  if (!config.requests.open) return res.status(403).json({ success: false, error: "Plan requests are closed right now" });
  if (pending) return res.status(400).json({ success: false, error: "This workspace already has a request waiting for review" });

  const plan = req.body?.plan as PlanId;
  if (!PLAN_ORDER.includes(plan)) return res.status(400).json({ success: false, error: "Pick a plan" });
  const { id: current } = await getPlanDefinition(groupId);
  if (PLAN_ORDER.indexOf(plan) <= PLAN_ORDER.indexOf(current)) {
    return res.status(400).json({ success: false, error: "Pick a plan above your current one" });
  }
  const reason = typeof req.body?.reason === "string" ? req.body.reason.trim().slice(0, 1500) : "";
  if (reason.length < 20) return res.status(400).json({ success: false, error: "Tell us a bit more about your group (at least 20 characters)" });

  const recentDeclined = requests.find(
    (r) => r.groupId === groupId && r.status === "declined" && r.handledAt && Date.now() - new Date(r.handledAt).getTime() < 7 * 86_400_000
  );
  if (recentDeclined) return res.status(429).json({ success: false, error: "A request was declined recently. You can ask again 7 days after it was declined." });

  const usage = await getWorkspaceUsage(groupId);
  await savePlanRequests([
    { id: newId(), groupId, plan, status: "pending", requestedBy: userId, reason, memberCount: usage.members, createdAt: new Date().toISOString() },
    ...requests,
  ]);
  return res.status(200).json({ success: true });
}

export default withPermissionCheck(handler, "admin");
