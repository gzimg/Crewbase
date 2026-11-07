import type { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/withSession";
import { requireSiteRole, logSiteAction } from "@/utils/siteRoles";
import { getReports, saveReports } from "@/utils/siteSettings";

/** POST { status: "open" | "resolved" | "dismissed", resolution } updates a report. Site staff. */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });
  const caller = await requireSiteRole(req, res, "staff");
  if (!caller) return;

  const status = req.body?.status;
  if (!["open", "resolved", "dismissed"].includes(status)) return res.status(400).json({ success: false, error: "Invalid status" });
  const resolution = typeof req.body?.resolution === "string" ? req.body.resolution.trim().slice(0, 1000) : "";

  const reports = await getReports();
  const report = reports.find((r) => r.id === String(req.query.reportId));
  if (!report) return res.status(404).json({ success: false, error: "Report not found" });

  report.status = status;
  if (status === "open") {
    delete report.handledBy;
    delete report.handledAt;
    delete report.resolution;
  } else {
    report.handledBy = caller.userId;
    report.handledAt = new Date().toISOString();
    if (resolution) report.resolution = resolution;
  }
  await saveReports(reports);
  await logSiteAction({ actorId: caller.userId, action: `report_${status}`, targetId: report.reporterId, detail: `${report.category} report` });
  return res.status(200).json({ success: true });
}

export default withSessionRoute(handler);
