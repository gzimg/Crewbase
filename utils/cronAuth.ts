import type { NextApiRequest, NextApiResponse } from "next";
import { timingSafeEqual } from "crypto";

/**
 * Shared auth check for /api/cron/* routes.
 *
 * Accepts both ways a scheduler can call these routes:
 * - Vercel Cron: GET with `Authorization: Bearer <CRON_SECRET>`
 * - External schedulers (original Firefli setup): POST with
 *   `x-cron-secret: <CRON_SECRET>` or a raw `Authorization: <CRON_SECRET>`
 *
 * Returns true when the request may continue. When it returns false, a
 * response has already been sent.
 */
export function checkCronRequest(req: NextApiRequest, res: NextApiResponse): boolean {
  if (req.method !== "GET" && req.method !== "POST") {
    res.status(405).json({ success: false, error: "Method not allowed" });
    return false;
  }

  const expected = process.env.CRON_SECRET;
  if (!expected) {
    res.status(500).json({ success: false, error: "CRON_SECRET not configured" });
    return false;
  }

  const raw = req.headers["x-cron-secret"] || req.headers.authorization;
  let provided = Array.isArray(raw) ? raw[0] : raw || "";
  if (provided.startsWith("Bearer ")) provided = provided.slice("Bearer ".length);

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return false;
  }

  return true;
}
