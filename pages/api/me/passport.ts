import type { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/withSession";
import { validateOrigin } from "@/utils/csrf";
import prisma from "@/utils/database";
import { getMyPassport, savePassport, deletePassport } from "@/utils/passport";

/** Your Staff Passport: GET status, POST { groupIds, regenerate } to turn on or update, DELETE to turn off. */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = req.session.userid ? String(req.session.userid) : null;
  if (!userId) return res.status(401).json({ success: false, error: "Not logged in" });

  if (req.method === "GET") {
    const [passport, memberships] = await Promise.all([
      getMyPassport(userId),
      prisma.workspaceMember.findMany({ where: { userId: BigInt(userId) }, select: { workspaceGroupId: true, workspace: { select: { groupName: true } } } }),
    ]);
    return res.status(200).json({
      success: true,
      passport: passport ? { token: passport.token, groupIds: passport.groupIds } : null,
      workspaces: memberships.map((m) => ({ groupId: m.workspaceGroupId.toString(), groupName: m.workspace?.groupName || m.workspaceGroupId.toString() })),
    });
  }
  if (!validateOrigin(req)) return res.status(403).json({ success: false, error: "Invalid request origin" });

  if (req.method === "DELETE") {
    await deletePassport(userId);
    return res.status(200).json({ success: true });
  }
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });

  const mine = new Set(
    (await prisma.workspaceMember.findMany({ where: { userId: BigInt(userId) }, select: { workspaceGroupId: true } })).map((m) => m.workspaceGroupId.toString())
  );
  const groupIds = (Array.isArray(req.body?.groupIds) ? req.body.groupIds : []).map(String).filter((g: string) => mine.has(g));
  if (!groupIds.length) return res.status(400).json({ success: false, error: "Pick at least one workspace to include" });
  const token = await savePassport(userId, groupIds, req.body?.regenerate === true);
  return res.status(200).json({ success: true, token });
}

export default withSessionRoute(handler);
