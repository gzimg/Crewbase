import type { NextApiRequest, NextApiResponse } from "next";
import { buildPassport } from "@/utils/passport";

/** Public Staff Passport data for a share link. */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();
  const data = await buildPassport(String(req.query.token || "")).catch(() => null);
  if (!data) return res.status(404).json({ success: false, error: "This passport doesn’t exist or was turned off" });
  res.setHeader("Cache-Control", "private, max-age=60");
  res.setHeader("X-Robots-Tag", "noindex");
  return res.status(200).json({ success: true, passport: data });
}
