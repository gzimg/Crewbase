import type { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/withSession";
import prisma from "@/utils/database";
import { requireSiteRole, getSiteRoleLists } from "@/utils/siteRoles";

const PAGE_SIZE = 25;

/** Search registered users by username or Roblox user ID. */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed" });
  const caller = await requireSiteRole(req, res, "staff");
  if (!caller) return;

  const q = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 50) : "";
  const page = Math.max(0, parseInt(String(req.query.page ?? "0"), 10) || 0);
  const filter = req.query.filter === "suspended" ? "suspended" : "all";

  const where: any = { registered: true };
  if (filter === "suspended") where.banned = true;
  if (q) {
    where.OR = [{ username: { contains: q, mode: "insensitive" } }];
    if (/^\d{1,15}$/.test(q)) where.OR.push({ userid: BigInt(q) });
  }

  const [total, users, lists] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { username: "asc" },
      skip: page * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        userid: true,
        username: true,
        picture: true,
        isOwner: true,
        banned: true,
        bannedAt: true,
        banReason: true,
        _count: { select: { workspaceMemberships: true } },
      },
    }),
    getSiteRoleLists(),
  ]);

  return res.status(200).json({
    success: true,
    total,
    pageSize: PAGE_SIZE,
    users: users.map((u) => {
      const id = u.userid.toString();
      const siteRole = u.isOwner || lists.admins.includes(id) ? "admin" : lists.staff.includes(id) ? "staff" : null;
      return {
        userId: id,
        username: u.username,
        picture: u.picture,
        isOwner: !!u.isOwner,
        siteRole,
        banned: u.banned,
        bannedAt: u.bannedAt,
        banReason: u.banReason,
        workspaces: u._count.workspaceMemberships,
      };
    }),
  });
}

export default withSessionRoute(handler);
