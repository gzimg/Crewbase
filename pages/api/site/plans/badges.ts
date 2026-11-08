import type { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/withSession";
import prisma from "@/utils/database";
import { requireSiteRole, logSiteAction } from "@/utils/siteRoles";
import { getWorkspaceBadges, setWorkspaceBadges, isValidHexColor } from "@/utils/plans";
import { newId } from "@/utils/siteSettings";

/**
 * Custom workspace badges, separate from plans.
 * POST { groupId, label, color, description? } adds one. DELETE ?groupId&badgeId removes one. Site staff.
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST" && req.method !== "DELETE") return res.status(405).json({ success: false, error: "Method not allowed" });
  const caller = await requireSiteRole(req, res, "staff");
  if (!caller) return;

  const groupId = String((req.method === "POST" ? req.body?.groupId : req.query.groupId) ?? "");
  if (!/^\d{1,15}$/.test(groupId)) return res.status(400).json({ success: false, error: "Invalid workspace" });
  const ws = await prisma.workspace.findUnique({ where: { groupId: BigInt(groupId) }, select: { groupName: true } });
  if (!ws) return res.status(404).json({ success: false, error: "Workspace not found" });
  const badges = await getWorkspaceBadges(groupId);

  if (req.method === "POST") {
    const label = typeof req.body?.label === "string" ? req.body.label.trim().slice(0, 24) : "";
    const description = typeof req.body?.description === "string" ? req.body.description.trim().slice(0, 140) : "";
    const color = isValidHexColor(req.body?.color) ? req.body.color : "#F28C28";
    if (!label) return res.status(400).json({ success: false, error: "Give the badge a name" });
    if (badges.length >= 10) return res.status(400).json({ success: false, error: "A workspace can have up to 10 badges" });
    await setWorkspaceBadges(groupId, [...badges, { id: newId(), label, color, description, by: caller.userId, at: new Date().toISOString() }]);
    await logSiteAction({ actorId: caller.userId, action: "add_workspace_badge", detail: `${ws.groupName || groupId}: ${label}` });
    return res.status(200).json({ success: true });
  }

  const badgeId = String(req.query.badgeId ?? "");
  const badge = badges.find((b) => b.id === badgeId);
  if (!badge) return res.status(404).json({ success: false, error: "Badge not found" });
  await setWorkspaceBadges(groupId, badges.filter((b) => b.id !== badgeId));
  await logSiteAction({ actorId: caller.userId, action: "remove_workspace_badge", detail: `${ws.groupName || groupId}: ${badge.label}` });
  return res.status(200).json({ success: true });
}

export default withSessionRoute(handler);
