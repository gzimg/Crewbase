import type { NextApiRequest, NextApiResponse } from "next";
import { getSiteSettings } from "@/utils/siteSettings";

/** Public site status: the announcement banner and maintenance message. No login needed. */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed" });
  try {
    const site = await getSiteSettings();
    res.setHeader("Cache-Control", "public, max-age=30");
    return res.status(200).json({
      success: true,
      announcement: site.announcement.enabled && site.announcement.text ? site.announcement : null,
      maintenance: { enabled: site.maintenance.enabled, message: site.maintenance.message },
      registrationsOpen: site.registrations.open,
    });
  } catch {
    return res.status(200).json({ success: true, announcement: null, maintenance: { enabled: false, message: "" }, registrationsOpen: true });
  }
}
