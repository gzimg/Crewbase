import type { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/withSession";
import { requireSiteRole, logSiteAction } from "@/utils/siteRoles";
import { botConfigured, inviteUrl, registerCommands, getGuildLinks, COMMANDS, diagnoseBot } from "@/utils/discordBot";

/** GET: bot setup status. POST: register (or refresh) the slash commands with Discord. Admins only. */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET" && req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });
  const caller = await requireSiteRole(req, res, "admin");
  if (!caller) return;

  if (req.method === "GET") {
    const links = await getGuildLinks().catch(() => ({}));
    const diagnostics = await diagnoseBot().catch(() => ({ checks: [], registered: 0 }));
    return res.status(200).json({
      checks: diagnostics.checks,
      registered: diagnostics.registered,
      success: true,
      configured: botConfigured(),
      inviteUrl: inviteUrl(),
      interactionsUrl: `${(process.env.NEXTAUTH_URL || "https://crewbase.dev").replace(/\/+$/, "")}/api/discord/interactions`,
      servers: Object.keys(links).length,
      commands: COMMANDS.map((c) => c.name),
    });
  }
  const result = await registerCommands();
  if (!result.ok) return res.status(400).json({ success: false, error: result.error });
  await logSiteAction({ actorId: caller.userId, action: "register_bot_commands", detail: `${result.count} commands` });
  return res.status(200).json({ success: true, count: result.count });
}

export default withSessionRoute(handler);
