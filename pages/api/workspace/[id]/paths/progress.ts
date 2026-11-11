import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import prisma from "@/utils/database";
import { getMemberContext } from "@/utils/teamStore";
import { progressFor } from "@/utils/promotion";

/**
 * GET: your progress on your promotion paths.
 * GET ?userId=…: someone else’s (managers and HR).
 * GET ?ready=1: everyone who meets every requirement for their next role (managers and HR).
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  const groupId = parseInt(String(req.query.id));
  const ctx = await getMemberContext(req.session.userid!, groupId);
  const canSeeOthers = ctx.isManager || !!ctx.perms?.some((p) => p === "hr.view" || p === "view_members");

  if (req.query.ready) {
    if (!canSeeOthers) return res.status(403).json({ success: false, error: "Only managers can see this" });
    const members = await prisma.workspaceMember.findMany({ where: { workspaceGroupId: BigInt(groupId) }, select: { userId: true, user: { select: { username: true, picture: true } } }, take: 500 });
    const results = [];
    for (const m of members) {
      const p = await progressFor(groupId, m.userId.toString());
      for (const path of p.paths) if (path.ready) results.push({ userId: m.userId.toString(), username: m.user?.username, picture: m.user?.picture, fromRole: path.fromRole, toRole: path.toRole });
    }
    return res.status(200).json({ success: true, ready: results });
  }

  const target = typeof req.query.userId === "string" ? req.query.userId : ctx.id;
  if (target !== ctx.id && !canSeeOthers) return res.status(403).json({ success: false, error: "You can only see your own progress" });
  return res.status(200).json({ success: true, ...(await progressFor(groupId, target)) });
}

export default withPermissionCheck(handler);
