import type { NextApiRequest, NextApiResponse } from "next";

let cachedPartners: number[] | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 10 * 60 * 1000;

async function fetchPartners(): Promise<number[]> {
  const now = Date.now();
  if (cachedPartners && now - cacheTimestamp < CACHE_DURATION) {
    return cachedPartners;
  }

  // Verified badges come from Crewbase's own list, not Firefli's partner list.
  // Set PARTNER_GROUP_IDS to a comma-separated list of Roblox group IDs to show the badge.
  cachedPartners = (process.env.PARTNER_GROUP_IDS || "")
    .split(",")
    .map((id) => Number(id.trim()))
    .filter((id) => Number.isInteger(id) && id > 0);
  cacheTimestamp = now;
  return cachedPartners;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const groupIds = await fetchPartners();
  res.setHeader(
    "Cache-Control",
    "public, s-maxage=300, stale-while-revalidate=600",
  );
  return res.status(200).json({ groupIds });
}

export { fetchPartners };
