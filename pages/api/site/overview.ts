import type { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/withSession";
import prisma from "@/utils/database";
import { requireSiteRole } from "@/utils/siteRoles";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed" });
  const caller = await requireSiteRole(req, res, "staff");
  if (!caller) return;

  const [users, workspaces, suspended, activeSessions] = await Promise.all([
    prisma.user.count({ where: { registered: true } }),
    prisma.workspace.count(),
    prisma.user.count({ where: { banned: true } }),
    prisma.activitySession.count({ where: { active: true, archived: { not: true } } }),
  ]);

  return res.status(200).json({ success: true, role: caller.role, stats: { users, workspaces, suspended, activeSessions } });
}

export default withSessionRoute(handler);
