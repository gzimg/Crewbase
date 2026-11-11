import type { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/withSession";
import { requireSiteRole, logSiteAction } from "@/utils/siteRoles";
import { getSiteSettings, saveSiteSettings, SiteSettings } from "@/utils/siteSettings";

/** GET the site settings; POST to change maintenance mode, sign-ups or the announcement. Admins only. */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET" && req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });
  const caller = await requireSiteRole(req, res, "admin");
  if (!caller) return;

  const current = await getSiteSettings(true);
  if (req.method === "GET") return res.status(200).json({ success: true, settings: current });

  const body = req.body || {};
  const next: SiteSettings = JSON.parse(JSON.stringify(current));
  const changes: string[] = [];

  if (body.maintenance) {
    if (typeof body.maintenance.enabled === "boolean" && body.maintenance.enabled !== current.maintenance.enabled) {
      next.maintenance.enabled = body.maintenance.enabled;
      changes.push(`maintenance ${body.maintenance.enabled ? "on" : "off"}`);
    }
    if (typeof body.maintenance.message === "string") next.maintenance.message = body.maintenance.message.trim().slice(0, 300);
  }
  if (body.registrations && typeof body.registrations.open === "boolean" && body.registrations.open !== current.registrations.open) {
    next.registrations.open = body.registrations.open;
    changes.push(`sign-ups ${body.registrations.open ? "opened" : "closed"}`);
  }
  if (body.workspaces) {
    const w = body.workspaces;
    if (typeof w.open === "boolean") next.workspaces.open = w.open;
    if (Number.isFinite(Number(w.perUserLimit))) next.workspaces.perUserLimit = Math.min(50, Math.max(1, Math.round(Number(w.perUserLimit))));
    if (Number.isFinite(Number(w.minRank))) next.workspaces.minRank = Math.min(255, Math.max(1, Math.round(Number(w.minRank))));
    if (JSON.stringify(next.workspaces) !== JSON.stringify(current.workspaces)) changes.push(`workspace creation: ${next.workspaces.open ? "open" : "paused"}, limit ${next.workspaces.perUserLimit}, min rank ${next.workspaces.minRank}`);
  }
  if (body.announcement) {
    const a = body.announcement;
    if (typeof a.text === "string") next.announcement.text = a.text.trim().slice(0, 280);
    if (["info", "warning", "success"].includes(a.tone)) next.announcement.tone = a.tone;
    if (typeof a.enabled === "boolean") next.announcement.enabled = a.enabled && !!next.announcement.text;
    if (JSON.stringify(next.announcement) !== JSON.stringify(current.announcement)) {
      next.announcement.updatedAt = new Date().toISOString();
      changes.push(next.announcement.enabled ? "announcement updated" : "announcement hidden");
    }
  }

  await saveSiteSettings(next);
  if (changes.length) await logSiteAction({ actorId: caller.userId, action: "update_site_settings", detail: changes.join(", ") });
  return res.status(200).json({ success: true, settings: next });
}

export default withSessionRoute(handler);
