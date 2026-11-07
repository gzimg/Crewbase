import type { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/withSession";
import { getSiteRole } from "@/utils/siteRoles";

/** Returns the current user's site role ("admin", "staff" or null). */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed" });
  if (!req.session.userid) return res.status(401).json({ success: false, error: "Not logged in" });
  const role = await getSiteRole(req.session.userid);
  return res.status(200).json({ success: true, role });
}

export default withSessionRoute(handler);
