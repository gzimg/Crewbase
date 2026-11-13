import type { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/withSession";
import { requireSiteRole, logSiteAction } from "@/utils/siteRoles";
import { getManualBadges, setManualBadges, MANUAL_BADGES, BadgeId, BADGES } from "@/utils/badges";

/** GET a user’s given badges; POST { badges } to change them. Site staff and admins. */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  const caller = await requireSiteRole(req, res, "staff");
  if (!caller) return;
  const userId = String(req.query.userid);
  if (!/^\d{1,15}$/.test(userId)) return res.status(400).json({ success: false, error: "Invalid user" });

  if (req.method === "GET") {
    const all = await getManualBadges();
    return res.status(200).json({ success: true, badges: all[userId] || [], available: MANUAL_BADGES.map((id) => ({ id, label: BADGES[id].label })) });
  }
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });
  const badges = (Array.isArray(req.body?.badges) ? req.body.badges : []).filter((b: string) => MANUAL_BADGES.includes(b as BadgeId)) as BadgeId[];
  await setManualBadges(userId, badges);
  await logSiteAction({ actorId: caller.userId, action: "set_badges", targetId: userId, detail: badges.join(", ") || "none" });
  return res.status(200).json({ success: true, badges });
}

export default withSessionRoute(handler);
