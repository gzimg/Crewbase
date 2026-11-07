import type { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/withSession";
import prisma from "@/utils/database";
import { requireSiteRole, getSiteRoleLists, setSiteRole, logSiteAction } from "@/utils/siteRoles";

/**
 * GET  lists site admins and site staff.
 * POST { username, role: "admin" | "staff" | "none" } changes someone's site role.
 * Admins only. The person must have logged in to Crewbase at least once.
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }
  const caller = await requireSiteRole(req, res, "admin");
  if (!caller) return;

  if (req.method === "GET") {
    const { admins, staff } = await getSiteRoleLists();
    const owners = await prisma.user.findMany({ where: { isOwner: true }, select: { userid: true } });
    const ownerIds = owners.map((o) => o.userid.toString());
    const allIds = Array.from(new Set([...ownerIds, ...admins, ...staff]));
    const users = allIds.length
      ? await prisma.user.findMany({
          where: { userid: { in: allIds.map((id) => BigInt(id)) } },
          select: { userid: true, username: true, picture: true },
        })
      : [];
    const byId = new Map(users.map((u) => [u.userid.toString(), u]));
    const describe = (id: string) => ({
      userId: id,
      username: byId.get(id)?.username ?? null,
      picture: byId.get(id)?.picture ?? null,
      isOwner: ownerIds.includes(id),
    });
    return res.status(200).json({
      success: true,
      admins: Array.from(new Set([...ownerIds, ...admins])).map(describe),
      staff: staff.filter((id) => !ownerIds.includes(id) && !admins.includes(id)).map(describe),
    });
  }

  const username = typeof req.body?.username === "string" ? req.body.username.trim() : "";
  const role = req.body?.role;
  if (!username) return res.status(400).json({ success: false, error: "Enter a username" });
  if (role !== "admin" && role !== "staff" && role !== "none") {
    return res.status(400).json({ success: false, error: "Invalid role" });
  }

  const target = await prisma.user.findFirst({
    where: { username: { equals: username, mode: "insensitive" }, registered: true },
    select: { userid: true, username: true, isOwner: true, banned: true },
  });
  if (!target) {
    return res.status(404).json({ success: false, error: "No Crewbase account with that username. They need to log in once first." });
  }
  const targetId = target.userid.toString();
  if (target.isOwner) return res.status(400).json({ success: false, error: "The instance owner is always a site admin" });
  if (targetId === caller.userId) return res.status(400).json({ success: false, error: "You can't change your own site role" });
  if (target.banned && role !== "none") {
    return res.status(400).json({ success: false, error: "Lift this user's suspension first" });
  }

  await setSiteRole(targetId, role);
  await logSiteAction({ actorId: caller.userId, action: `set_site_role_${role}`, targetId, detail: target.username ?? undefined });
  return res.status(200).json({ success: true });
}

export default withSessionRoute(handler);
