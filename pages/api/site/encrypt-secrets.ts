import type { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/withSession";
import prisma from "@/utils/database";
import { requireSiteRole, logSiteAction } from "@/utils/siteRoles";
import { encryptSecret, isEncryptedSecret } from "@/utils/secrets";

/** Encrypts any API keys and tokens that were saved before encryption was added. Admins only. */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });
  const caller = await requireSiteRole(req, res, "admin");
  if (!caller) return;
  if (!process.env.ENCRYPTION_KEY) return res.status(400).json({ success: false, error: "Set ENCRYPTION_KEY first" });

  const rows = await prisma.workspaceExternalServices.findMany({ select: { id: true, robloxApiKey: true, rankingToken: true } });
  let encrypted = 0;
  for (const r of rows) {
    const data: { robloxApiKey?: string; rankingToken?: string } = {};
    if (r.robloxApiKey && !isEncryptedSecret(r.robloxApiKey)) data.robloxApiKey = encryptSecret(r.robloxApiKey);
    if (r.rankingToken && !isEncryptedSecret(r.rankingToken)) data.rankingToken = encryptSecret(r.rankingToken);
    const count = Object.keys(data).length;
    if (count) {
      await prisma.workspaceExternalServices.update({ where: { id: r.id }, data });
      encrypted += count;
    }
  }

  await logSiteAction({ actorId: caller.userId, action: "encrypt_secrets", detail: `${encrypted} secret(s) encrypted` });
  return res.status(200).json({ success: true, encrypted });
}

export default withSessionRoute(handler);
