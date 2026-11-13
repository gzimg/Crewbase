import type { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/withSession";
import { badgesFor } from "@/utils/badges";
import prisma from "@/utils/database";

/**
 * GET ?ids=1,2,3[&workspace=groupId]: Crewbase badges for those users, and which of
 * them owns the given workspace (shown with a gold name).
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!req.session.userid) return res.status(401).json({ success: false });
  const ids = String(req.query.ids || "").split(",").filter((x) => /^\d{1,15}$/.test(x)).slice(0, 200);
  const [badges, ws] = await Promise.all([
    badgesFor(ids),
    req.query.workspace && /^\d+$/.test(String(req.query.workspace))
      ? prisma.workspace.findUnique({ where: { groupId: BigInt(String(req.query.workspace)) }, select: { ownerId: true } })
      : null,
  ]);
  res.setHeader("Cache-Control", "private, max-age=60");
  return res.status(200).json({ success: true, badges, ownerId: ws?.ownerId ? ws.ownerId.toString() : null });
}

export default withSessionRoute(handler);
