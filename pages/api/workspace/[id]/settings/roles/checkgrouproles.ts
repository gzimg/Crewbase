// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import { fetchworkspace, getConfig, setConfig } from "@/utils/configEngine";
import prisma, { user } from "@/utils/database";
import { withSessionRoute } from "@/lib/withSession";
import {
  withPermissionCheck,
  checkGroupRoles,
} from "@/utils/permissionsManager";
import {
  getUsername,
  getThumbnail,
  getDisplayName,
} from "@/utils/userinfoEngine";
import { parse } from "path";
type Data = {
  success: boolean;
  error?: string;
};

export default withPermissionCheck(handler, "admin");

export async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== "POST")
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });

  try {
    const workspaceId = parseInt(req.query.id as string);

    if (isNaN(workspaceId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid workspace ID",
      });
    }

    // Run the sync to the end before answering. On Vercel, work started after the
    // response is sent gets frozen, which is why this button used to do nothing.
    const { getWorkspaceRobloxApiKey } = await import("@/utils/openCloud");
    const key = await getWorkspaceRobloxApiKey(workspaceId).catch(() => null);
    if (!key) {
      return res.status(400).json({ success: false, error: "Add a Roblox Open Cloud API key in Settings first, so Crewbase can read your group." });
    }
    const started = Date.now();
    await checkGroupRoles(workspaceId);
    console.log(`[Refresh] Manual sync for ${workspaceId} took ${Math.round((Date.now() - started) / 1000)}s`);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error in checkgrouproles handler:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to start role sync",
    });
  }
}
