import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { checkCronRequest } from "@/utils/cronAuth";

/**
 * Closes activity sessions that have been open for too long.
 *
 * On a normal server, Firefli closes every open session when the server
 * restarts (see instrumentation.ts). Serverless hosts like Vercel start new
 * instances all the time, so that startup step is skipped there and this
 * scheduled job cleans up sessions left open by crashed game servers instead.
 *
 * STALE_SESSION_HOURS sets how long a session may stay open (default 6).
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkCronRequest(req, res)) return;

  const hours = Number(process.env.STALE_SESSION_HOURS ?? "6");
  const maxHours = Number.isFinite(hours) && hours > 0 ? hours : 6;
  const cutoff = new Date(Date.now() - maxHours * 60 * 60 * 1000);

  try {
    const result = await prisma.activitySession.updateMany({
      where: {
        active: true,
        archived: { not: true },
        startTime: { lt: cutoff },
      },
      data: {
        active: false,
        endTime: new Date(),
      },
    });

    console.log(`[CRON] Closed ${result.count} stale activity session(s) older than ${maxHours}h`);
    return res.status(200).json({ success: true, closed: result.count });
  } catch (error) {
    console.error("[CRON] Failed to close stale sessions:", error);
    return res.status(500).json({ success: false, error: "Failed to close stale sessions" });
  }
}
