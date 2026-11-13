import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { staffingEnabled, setStaffingEnabled } from "@/utils/staffing";
import { logAudit } from "@/utils/logs";

/** GET whether Staffing is on; PATCH { enabled } to turn it on or off. */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  const groupId = parseInt(String(req.query.id));
  if (req.method === "GET") return res.status(200).json({ success: true, enabled: await staffingEnabled(groupId) });
  if (req.method !== "PATCH") return res.status(405).json({ success: false, error: "Method not allowed" });
  if (typeof req.body?.enabled !== "boolean") return res.status(400).json({ success: false, error: "No enabled provided" });
  await setStaffingEnabled(groupId, req.body.enabled);
  try {
    await logAudit(groupId, Number(req.session.userid), "settings.general.staffing.update", "staffing", { before: { enabled: !req.body.enabled }, after: { enabled: req.body.enabled } } as any);
  } catch {}
  return res.status(200).json({ success: true });
}

export default withPermissionCheck(handler, "manage_features");
