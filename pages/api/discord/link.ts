import type { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/withSession";
import { validateOrigin } from "@/utils/csrf";
import { useVerifyCode, setLink, syncMember, getDiscordForUser } from "@/utils/discordSync";

/**
 * Discord account linking for the logged-in user.
 * GET: which Discord account is linked. POST { code }: finish /verify. DELETE: unlink.
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = req.session.userid ? String(req.session.userid) : null;
  if (!userId) return res.status(401).json({ success: false, error: "Log in first" });

  if (req.method === "GET") return res.status(200).json({ success: true, discordId: await getDiscordForUser(userId) });
  if (!validateOrigin(req)) return res.status(403).json({ success: false, error: "Invalid request origin" });

  if (req.method === "DELETE") {
    const discordId = await getDiscordForUser(userId);
    if (discordId) await setLink(discordId, null);
    return res.status(200).json({ success: true });
  }
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });

  const code = typeof req.body?.code === "string" ? req.body.code : "";
  const entry = await useVerifyCode(code);
  if (!entry) return res.status(400).json({ success: false, error: "This link has expired or was already used. Run /verify again in Discord." });

  await setLink(entry.discordId, userId);
  let sync = null;
  if (entry.guildId) sync = await syncMember(entry.guildId, entry.discordId).catch(() => null);
  return res.status(200).json({ success: true, added: sync?.added.length || 0, nickname: sync?.nickname || null });
}

export default withSessionRoute(handler);
