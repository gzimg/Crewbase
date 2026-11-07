import type { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/withSession";
import prisma from "@/utils/database";
import { requireSiteRole, getSiteAudit } from "@/utils/siteRoles";

/** The most recent site staff and admin actions. Admins only. */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed" });
  const caller = await requireSiteRole(req, res, "admin");
  if (!caller) return;

  const entries = (await getSiteAudit()).slice(0, 100);
  const ids = Array.from(new Set(entries.flatMap((e) => [e.actorId, e.targetId]).filter(Boolean) as string[]));
  const users = ids.length
    ? await prisma.user.findMany({ where: { userid: { in: ids.map((id) => BigInt(id)) } }, select: { userid: true, username: true } })
    : [];
  const names = new Map(users.map((u) => [u.userid.toString(), u.username]));

  return res.status(200).json({
    success: true,
    entries: entries.map((e) => ({
      ...e,
      actorName: names.get(e.actorId) ?? null,
      targetName: e.targetId ? names.get(e.targetId) ?? null : null,
    })),
  });
}

export default withSessionRoute(handler);
