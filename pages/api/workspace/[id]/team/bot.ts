import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { getMemberContext } from "@/utils/teamStore";
import { createLinkCode, guildsForWorkspace, unlinkGuild, inviteUrl, botConfigured } from "@/utils/discordBot";

/**
 * Crewbase bot for this workspace (managers only).
 * GET: linked Discord servers and the invite link. POST: make a one-time /link code. DELETE ?guildId: disconnect a server.
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  const groupId = String(req.query.id);
  const ctx = await getMemberContext(req.session.userid!, parseInt(groupId));
  if (!ctx.isManager) return res.status(403).json({ success: false, error: "Only workspace managers can manage the bot" });

  if (req.method === "GET") {
    return res.status(200).json({ success: true, available: botConfigured(), inviteUrl: inviteUrl(), servers: await guildsForWorkspace(groupId) });
  }
  if (req.method === "POST") {
    if (!botConfigured()) return res.status(400).json({ success: false, error: "The Crewbase bot isn’t set up on this site yet" });
    return res.status(200).json({ success: true, code: await createLinkCode(groupId, ctx.id), expiresInMinutes: 15 });
  }
  if (req.method === "DELETE") {
    const guildId = String(req.query.guildId || "");
    const mine = (await guildsForWorkspace(groupId)).some((g) => g.guildId === guildId);
    if (!mine) return res.status(404).json({ success: false, error: "That server isn’t linked to this workspace" });
    await unlinkGuild(guildId);
    return res.status(200).json({ success: true });
  }
  return res.status(405).json({ success: false, error: "Method not allowed" });
}

export default withPermissionCheck(handler);
