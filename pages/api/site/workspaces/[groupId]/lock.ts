import type { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/withSession";
import prisma from "@/utils/database";
import { requireSiteRole, logSiteAction } from "@/utils/siteRoles";
import { setWorkspaceLock } from "@/utils/siteSettings";

/**
 * POST { reason } locks a workspace so its members can't use it (site staff and admins still can).
 * DELETE unlocks it. Admins only.
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST" && req.method !== "DELETE") return res.status(405).json({ success: false, error: "Method not allowed" });
  const caller = await requireSiteRole(req, res, "admin");
  if (!caller) return;

  const groupId = String(req.query.groupId ?? "");
  if (!/^\d{1,15}$/.test(groupId)) return res.status(400).json({ success: false, error: "Invalid workspace" });
  const ws = await prisma.workspace.findUnique({ where: { groupId: BigInt(groupId) }, select: { groupName: true } });
  if (!ws) return res.status(404).json({ success: false, error: "Workspace not found" });

  if (req.method === "POST") {
    const reason = typeof req.body?.reason === "string" ? req.body.reason.trim().slice(0, 300) : "";
    if (!reason) return res.status(400).json({ success: false, error: "Please give a reason" });
    await setWorkspaceLock(groupId, { by: caller.userId, at: new Date().toISOString(), reason });
    await logSiteAction({ actorId: caller.userId, action: "lock_workspace", detail: `${ws.groupName || groupId}: ${reason}` });
  } else {
    await setWorkspaceLock(groupId, null);
    await logSiteAction({ actorId: caller.userId, action: "unlock_workspace", detail: ws.groupName || groupId });
  }
  return res.status(200).json({ success: true });
}

export default withSessionRoute(handler);
