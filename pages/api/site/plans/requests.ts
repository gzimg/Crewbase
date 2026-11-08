import type { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/withSession";
import { requireSiteRole, logSiteAction } from "@/utils/siteRoles";
import { getPlanRequests, savePlanRequests, setWorkspacePlan } from "@/utils/plans";

/** POST { id, decision: "approve" | "decline", response?, expiresAt? } — site staff review a plan request. */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });
  const caller = await requireSiteRole(req, res, "staff");
  if (!caller) return;

  const requests = await getPlanRequests();
  const request = requests.find((r) => r.id === String(req.body?.id ?? ""));
  if (!request) return res.status(404).json({ success: false, error: "Request not found" });
  if (request.status !== "pending") return res.status(400).json({ success: false, error: "This request was already handled" });

  const decision = req.body?.decision;
  if (decision !== "approve" && decision !== "decline") return res.status(400).json({ success: false, error: "Invalid decision" });
  const response = typeof req.body?.response === "string" ? req.body.response.trim().slice(0, 1000) : "";
  if (decision === "decline" && !response) return res.status(400).json({ success: false, error: "Tell them why it was declined" });

  let expiresAt: string | null = null;
  if (decision === "approve" && req.body?.expiresAt) {
    const d = new Date(req.body.expiresAt);
    if (isNaN(d.getTime()) || d.getTime() < Date.now()) return res.status(400).json({ success: false, error: "The end date must be in the future" });
    expiresAt = d.toISOString();
  }

  request.status = decision === "approve" ? "approved" : "declined";
  request.handledBy = caller.userId;
  request.handledAt = new Date().toISOString();
  if (response) request.response = response;
  await savePlanRequests(requests);

  if (decision === "approve") {
    await setWorkspacePlan(request.groupId, {
      plan: request.plan,
      source: "request",
      since: new Date().toISOString(),
      by: caller.userId,
      expiresAt,
    });
  }
  await logSiteAction({ actorId: caller.userId, action: `plan_request_${request.status}`, detail: `${request.groupId} → ${request.plan}` });
  return res.status(200).json({ success: true });
}

export default withSessionRoute(handler);
