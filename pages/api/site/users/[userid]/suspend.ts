import type { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/withSession";
import prisma from "@/utils/database";
import { requireSiteRole, getSiteRole, logSiteAction } from "@/utils/siteRoles";
import { forgetSuspension } from "@/utils/siteSettings";

/**
 * POST   { reason } suspends a user from the whole site.
 * DELETE            lifts a suspension.
 * Staff can suspend regular users. Admins can also suspend staff.
 * Nobody can suspend the instance owner, another admin, or themselves.
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST" && req.method !== "DELETE") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }
  const caller = await requireSiteRole(req, res, "staff");
  if (!caller) return;

  const targetId = String(req.query.userid ?? "");
  if (!/^\d{1,15}$/.test(targetId)) return res.status(400).json({ success: false, error: "Invalid user ID" });
  if (targetId === caller.userId) return res.status(400).json({ success: false, error: "You can't suspend yourself" });

  const target = await prisma.user.findUnique({ where: { userid: BigInt(targetId) }, select: { isOwner: true, username: true } });
  if (!target) return res.status(404).json({ success: false, error: "User not found" });

  const targetRole = target.isOwner ? "admin" : await getSiteRole(targetId);
  if (target.isOwner || targetRole === "admin") {
    return res.status(403).json({ success: false, error: "Site admins can't be suspended" });
  }
  if (targetRole === "staff" && caller.role !== "admin") {
    return res.status(403).json({ success: false, error: "Only site admins can suspend site staff" });
  }

  if (req.method === "POST") {
    const reason = typeof req.body?.reason === "string" ? req.body.reason.trim().slice(0, 500) : "";
    if (!reason) return res.status(400).json({ success: false, error: "Please give a reason" });
    await prisma.user.update({
      where: { userid: BigInt(targetId) },
      data: { banned: true, bannedAt: new Date(), bannedBy: caller.userId, banReason: reason },
    });
    forgetSuspension(targetId);
    await logSiteAction({ actorId: caller.userId, action: "suspend_user", targetId, detail: reason });
    return res.status(200).json({ success: true });
  }

  await prisma.user.update({
    where: { userid: BigInt(targetId) },
    data: { banned: false, bannedAt: null, bannedBy: null, banReason: null },
  });
  forgetSuspension(targetId);
  await logSiteAction({ actorId: caller.userId, action: "unsuspend_user", targetId });
  return res.status(200).json({ success: true });
}

export default withSessionRoute(handler);
