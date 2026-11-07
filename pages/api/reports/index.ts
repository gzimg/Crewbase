import type { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/withSession";
import { validateOrigin } from "@/utils/csrf";
import { getReports, saveReports, newId, SiteReport } from "@/utils/siteSettings";

const CATEGORIES: SiteReport["category"][] = ["user", "workspace", "content", "bug", "deletion", "other"];

/**
 * Lets any logged-in user send a report to Crewbase site staff: a user or
 * workspace breaking the rules, a bug, or a request to delete their account.
 * GET returns the caller's own recent reports and their status.
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = req.session.userid ? String(req.session.userid) : null;
  if (!userId) return res.status(401).json({ success: false, error: "Not logged in" });

  if (req.method === "GET") {
    const mine = (await getReports())
      .filter((r) => r.reporterId === userId)
      .slice(0, 20)
      .map(({ id, category, status, details, createdAt, resolution }) => ({ id, category, status, details, createdAt, resolution }));
    return res.status(200).json({ success: true, reports: mine });
  }

  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });
  if (!validateOrigin(req)) return res.status(403).json({ success: false, error: "Invalid request origin" });

  const body = req.body || {};
  const category = CATEGORIES.includes(body.category) ? (body.category as SiteReport["category"]) : null;
  const details = typeof body.details === "string" ? body.details.trim().slice(0, 2000) : "";
  const targetUsername = typeof body.targetUsername === "string" ? body.targetUsername.trim().slice(0, 50) : "";
  const workspaceId = typeof body.workspaceId === "string" && /^\d{1,15}$/.test(body.workspaceId.trim()) ? body.workspaceId.trim() : "";

  if (!category) return res.status(400).json({ success: false, error: "Pick what this is about" });
  if (category !== "deletion" && details.length < 10) {
    return res.status(400).json({ success: false, error: "Please describe what happened (at least 10 characters)" });
  }

  const reports = await getReports();
  const recent = reports.filter((r) => r.reporterId === userId && Date.now() - new Date(r.createdAt).getTime() < 60 * 60_000);
  if (recent.length >= 5) return res.status(429).json({ success: false, error: "You’ve sent a lot of reports. Please try again in an hour." });
  if (category === "deletion" && reports.some((r) => r.reporterId === userId && r.category === "deletion" && r.status === "open")) {
    return res.status(400).json({ success: false, error: "You already have an open deletion request" });
  }

  const report: SiteReport = {
    id: newId(),
    category,
    status: "open",
    reporterId: userId,
    details: category === "deletion" && !details ? "Please delete my Crewbase account and data." : details,
    createdAt: new Date().toISOString(),
    ...(targetUsername && { targetUsername }),
    ...(workspaceId && { workspaceId }),
  };
  await saveReports([report, ...reports]);
  return res.status(200).json({ success: true, id: report.id });
}

export default withSessionRoute(handler);
