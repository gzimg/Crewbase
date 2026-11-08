import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { getSiteSettings, getCronRuns } from "@/utils/siteSettings";

/** Public, high-level status for the /status page. No secrets or settings are exposed. */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed" });

  let database = true;
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    database = false;
  }

  let maintenance = false;
  let jobs = true;
  try {
    const site = await getSiteSettings();
    maintenance = site.maintenance.enabled;
    const runs = await getCronRuns();
    const last = runs["update-sessions"];
    // Sessions sync every 5 minutes; flag it if nothing has run for 30 minutes
    jobs = !!last && Date.now() - new Date(last).getTime() < 30 * 60_000;
  } catch {
    // leave defaults
  }

  res.setHeader("Cache-Control", "public, max-age=30");
  return res.status(200).json({
    success: true,
    checkedAt: new Date().toISOString(),
    components: [
      { name: "Website", status: "operational" },
      { name: "Database", status: database ? "operational" : "outage" },
      { name: "Scheduled jobs (sessions, activity, roles)", status: jobs ? "operational" : "degraded" },
      { name: "Workspaces", status: maintenance ? "maintenance" : database ? "operational" : "outage" },
    ],
  });
}
