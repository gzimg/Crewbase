import type { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/withSession";
import prisma from "@/utils/database";
import { requireSiteRole } from "@/utils/siteRoles";
import { getReports } from "@/utils/siteSettings";

/** The report queue for site staff. ?status=open|resolved|dismissed|all */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed" });
  const caller = await requireSiteRole(req, res, "staff");
  if (!caller) return;

  const status = ["open", "resolved", "dismissed", "all"].includes(String(req.query.status)) ? String(req.query.status) : "open";
  const all = await getReports();
  const list = (status === "all" ? all : all.filter((r) => r.status === status)).slice(0, 200);
  const counts = {
    open: all.filter((r) => r.status === "open").length,
    resolved: all.filter((r) => r.status === "resolved").length,
    dismissed: all.filter((r) => r.status === "dismissed").length,
  };

  const ids = Array.from(new Set(list.flatMap((r) => [r.reporterId, r.handledBy]).filter(Boolean) as string[]));
  const users = ids.length
    ? await prisma.user.findMany({ where: { userid: { in: ids.map((id) => BigInt(id)) } }, select: { userid: true, username: true } })
    : [];
  const names = new Map(users.map((u) => [u.userid.toString(), u.username]));
  const wsIds = Array.from(new Set(list.map((r) => r.workspaceId).filter(Boolean) as string[]));
  const workspaces = wsIds.length
    ? await prisma.workspace.findMany({ where: { groupId: { in: wsIds.map((id) => BigInt(id)) } }, select: { groupId: true, groupName: true } })
    : [];
  const wsNames = new Map(workspaces.map((w) => [w.groupId.toString(), w.groupName]));

  return res.status(200).json({
    success: true,
    counts,
    reports: list.map((r) => ({
      ...r,
      reporterName: names.get(r.reporterId) ?? null,
      handledByName: r.handledBy ? names.get(r.handledBy) ?? null : null,
      workspaceName: r.workspaceId ? wsNames.get(r.workspaceId) ?? null : null,
    })),
  });
}

export default withSessionRoute(handler);
