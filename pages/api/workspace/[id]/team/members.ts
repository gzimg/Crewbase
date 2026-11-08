import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import prisma from "@/utils/database";

/** A light list of workspace members, for pickers in the Team tabs. */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed" });
  const groupId = BigInt(parseInt(String(req.query.id)));
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceGroupId: groupId },
    select: { userId: true, user: { select: { username: true, picture: true } } },
    take: 3000,
  });
  res.setHeader("Cache-Control", "private, max-age=60");
  return res.status(200).json({
    success: true,
    members: members
      .map((m) => ({ userId: m.userId.toString(), username: m.user?.username || m.userId.toString(), picture: m.user?.picture || null }))
      .sort((a, b) => a.username.localeCompare(b.username)),
  });
}

export default withPermissionCheck(handler);
