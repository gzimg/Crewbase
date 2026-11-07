import type { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/withSession";
import { requireSiteRole, logSiteAction } from "@/utils/siteRoles";
import { buildUserExport } from "@/utils/userExport";

/** Downloads a user's data, to answer privacy requests. Admins only. */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed" });
  const caller = await requireSiteRole(req, res, "admin");
  if (!caller) return;

  const userId = String(req.query.userid ?? "");
  if (!/^\d{1,15}$/.test(userId)) return res.status(400).json({ success: false, error: "Invalid user ID" });

  const json = await buildUserExport(userId);
  await logSiteAction({ actorId: caller.userId, action: "export_user_data", targetId: userId });
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="crewbase-user-${userId}.json"`);
  res.setHeader("Cache-Control", "private, no-store");
  return res.status(200).send(json);
}

export default withSessionRoute(handler);
