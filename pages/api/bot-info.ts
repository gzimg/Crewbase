import type { NextApiRequest, NextApiResponse } from "next";
import { botConfigured, inviteUrl, COMMANDS } from "@/utils/discordBot";

/** Public info for the /bot page: whether the bot is available and its invite link. */
export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "public, max-age=300");
  return res.status(200).json({
    available: botConfigured(),
    inviteUrl: inviteUrl(),
    commands: COMMANDS.map((c) => ({ name: c.name, description: c.description })),
  });
}
