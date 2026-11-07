import type { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/withSession";
import prisma from "@/utils/database";
import { requireSiteRole } from "@/utils/siteRoles";
import { getWorkspaceLocks } from "@/utils/siteSettings";

/** Lists every workspace on this instance with its owner and member count. */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed" });
  const caller = await requireSiteRole(req, res, "staff");
  if (!caller) return;

  const workspaces = await prisma.workspace.findMany({
    orderBy: { groupName: "asc" },
    select: {
      groupId: true,
      groupName: true,
      groupLogo: true,
      ownerId: true,
      lastSynced: true,
      _count: { select: { members: true } },
    },
  });

  const ownerIds = workspaces.map((w) => w.ownerId).filter((id): id is bigint => id !== null);
  const owners = ownerIds.length
    ? await prisma.user.findMany({ where: { userid: { in: ownerIds } }, select: { userid: true, username: true } })
    : [];
  const ownerNames = new Map(owners.map((o) => [o.userid.toString(), o.username]));

  const locks = await getWorkspaceLocks(true);

  return res.status(200).json({
    success: true,
    workspaces: workspaces.map((w) => ({
      lock: locks[w.groupId.toString()] ?? null,
      groupId: w.groupId.toString(),
      groupName: w.groupName,
      groupLogo: w.groupLogo,
      ownerId: w.ownerId?.toString() ?? null,
      ownerName: w.ownerId ? ownerNames.get(w.ownerId.toString()) ?? null : null,
      lastSynced: w.lastSynced,
      members: w._count.members,
    })),
  });
}

export default withSessionRoute(handler);
