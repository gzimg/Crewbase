import type { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/withSession";
import prisma from "@/utils/database";
import { requireSiteRole, logSiteAction, getSiteRole } from "@/utils/siteRoles";
import { forgetSuspension } from "@/utils/siteSettings";
import { checkCanDelete, deleteUserAccount } from "@/utils/accountDeletion";

/**
 * GET: whether this account can be deleted (and why not).
 * POST { confirmUsername, keepSafetyRecords }: permanently deletes the account and personal data.
 * Site admins only. This can't be undone, so admins should export the user's data first if they need it.
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET" && req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });
  const caller = await requireSiteRole(req, res, "admin");
  if (!caller) return;

  const userId = String(req.query.userid ?? "");
  if (!/^\d{1,15}$/.test(userId)) return res.status(400).json({ success: false, error: "Invalid user ID" });
  if (userId === caller.userId) return res.status(400).json({ success: false, error: "You can’t delete your own account here" });

  const user = await prisma.user.findUnique({ where: { userid: BigInt(userId) }, select: { username: true } });
  if (!user) return res.status(404).json({ success: false, error: "User not found" });

  const blocker = (await checkCanDelete(userId)) || ((await getSiteRole(userId)) === "admin" ? "Remove their site admin role first" : null);
  if (req.method === "GET") return res.status(200).json({ success: true, canDelete: !blocker, reason: blocker, username: user.username });
  if (blocker) return res.status(400).json({ success: false, error: blocker });

  const confirm = typeof req.body?.confirmUsername === "string" ? req.body.confirmUsername.trim().toLowerCase() : "";
  if (!user.username || confirm !== user.username.toLowerCase()) {
    return res.status(400).json({ success: false, error: "Type the username exactly to confirm" });
  }
  const keepSafetyRecords = req.body?.keepSafetyRecords === true;

  try {
    const result = await deleteUserAccount(userId, { keepSafetyRecords });
    forgetSuspension(userId);
    await logSiteAction({
      actorId: caller.userId,
      action: "delete_user_account",
      targetId: userId,
      detail: `${result.deletedRecords} records deleted, ${result.reassignedRecords} credited to Deleted user${keepSafetyRecords ? ", safety records kept" : ""}`,
    });
    return res.status(200).json({ success: true, result });
  } catch (error: any) {
    console.error("[site] Account deletion failed:", error);
    return res.status(500).json({ success: false, error: error?.message?.slice(0, 200) || "Deletion failed. Nothing was changed." });
  }
}

export default withSessionRoute(handler);
