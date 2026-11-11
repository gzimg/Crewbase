import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { availability } from "@/utils/availability";

/** When staff are usually in game, by hour of the week (UTC). Any member can see it. */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();
  const data = await availability(parseInt(String(req.query.id)));
  res.setHeader("Cache-Control", "private, max-age=300");
  return res.status(200).json({ success: true, ...data });
}

export default withPermissionCheck(handler);
