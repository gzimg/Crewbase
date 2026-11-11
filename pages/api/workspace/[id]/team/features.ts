import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { getTeamSettings } from "@/utils/teamNotify";

/** Which Team tabs this workspace has hidden. Any member can read it. */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  const settings = await getTeamSettings(parseInt(String(req.query.id)));
  res.setHeader("Cache-Control", "private, max-age=60");
  return res.status(200).json({ success: true, hiddenTabs: settings.hiddenTabs || [] });
}

export default withPermissionCheck(handler);
