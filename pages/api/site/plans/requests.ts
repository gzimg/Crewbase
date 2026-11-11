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
  // Let the person who asked (and the workspace’s admins) know
  try {
    const prisma = (await import("@/utils/database")).default;
    const { notifyUsers } = await import("@/utils/teamNotify");
    const config = await (await import("@/utils/plans")).getPlanConfig();
    const admins = await prisma.workspaceMember.findMany({ where: { workspaceGroupId: BigInt(request.groupId), isAdmin: true }, select: { userId: true } });
    const planName = config.plans[request.plan].name;
    await notifyUsers(
      BigInt(request.groupId),
      [request.requestedBy, ...admins.map((a) => a.userId.toString())],
      decision === "approve" ? `🎉 Your workspace is now on ${planName}` : `Your ${planName} request wasn’t approved`,
      response || (decision === "approve" ? "Thanks for using Crewbase! Your new limits and features are ready." : "You can ask again in 7 days."),
      `/workspace/${request.groupId}/plan`
    );
  } catch (error) {
    console.error("[plans] Couldn’t send decision notification", error);
  }

  await logSiteAction({ actorId: caller.userId, action: `plan_request_${request.status}`, detail: `${request.groupId} → ${request.plan}` });
  return res.status(200).json({ success: true });
}

export default withSessionRoute(handler);
