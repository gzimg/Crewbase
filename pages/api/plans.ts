import type { NextApiRequest, NextApiResponse } from "next";
import { getPlanConfig, PLAN_ORDER, FEATURE_LABELS } from "@/utils/plans";

/** Public plan comparison for the /plans page. */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed" });
  const config = await getPlanConfig();
  res.setHeader("Cache-Control", "public, max-age=60");
  return res.status(200).json({
    success: true,
    defaultPlan: config.defaultPlan,
    auto: config.auto,
    requestsOpen: config.requests.open,
    features: FEATURE_LABELS,
    plans: PLAN_ORDER.map((id) => ({ id, ...config.plans[id] })),
  });
}
