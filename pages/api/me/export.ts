import type { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/withSession";
import { buildUserExport } from "@/utils/userExport";

const lastExport = new Map<string, number>();

/** Lets a logged-in user download the data Crewbase holds about them. */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed" });
  const userId = req.session.userid;
  if (!userId) return res.status(401).json({ success: false, error: "Not logged in" });

  // One export per minute is plenty, and protects the database
  const key = String(userId);
  const last = lastExport.get(key) || 0;
  if (Date.now() - last < 60_000) {
    return res.status(429).json({ success: false, error: "Please wait a minute before downloading again" });
  }
  lastExport.set(key, Date.now());

  const json = await buildUserExport(key);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="crewbase-data-${key}.json"`);
  res.setHeader("Cache-Control", "private, no-store");
  return res.status(200).send(json);
}

export default withSessionRoute(handler);
