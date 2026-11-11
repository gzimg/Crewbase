import type { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/withSession";
import { requireSiteRole, logSiteAction } from "@/utils/siteRoles";
import { getPlanConfig, savePlanConfig, PLAN_ORDER, PlanConfig, PlanFeature, FEATURE_LABELS, isValidHexColor } from "@/utils/plans";

const clampInt = (v: unknown, min: number, max: number, fallback: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

/** GET/POST the plan settings: names, colours, limits, features, automatic upgrades and requests. Admins only. */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET" && req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });
  const caller = await requireSiteRole(req, res, "admin");
  if (!caller) return;

  const current = await getPlanConfig(true);
  if (req.method === "GET") return res.status(200).json({ success: true, config: current, featureLabels: FEATURE_LABELS });

  const body = req.body || {};
  const next: PlanConfig = JSON.parse(JSON.stringify(current));
  if (PLAN_ORDER.includes(body.defaultPlan)) next.defaultPlan = body.defaultPlan;
  for (const id of PLAN_ORDER) {
    const p = body.plans?.[id];
    if (!p) continue;
    const t = next.plans[id];
    if (typeof p.name === "string" && p.name.trim()) t.name = p.name.trim().slice(0, 20);
    if (typeof p.tagline === "string") t.tagline = p.tagline.trim().slice(0, 120);
    if (isValidHexColor(p.color)) t.color = p.color;
    if (p.limits) {
      t.limits.members = clampInt(p.limits.members, 1, 100000, t.limits.members);
      t.limits.evidenceFiles = clampInt(p.limits.evidenceFiles, 0, 1000000, t.limits.evidenceFiles);
      t.limits.evidenceFileMb = clampInt(p.limits.evidenceFileMb, 1, 25, t.limits.evidenceFileMb);
      t.limits.apiKeys = clampInt(p.limits.apiKeys, 0, 50, t.limits.apiKeys);
    }
    if (Array.isArray(p.features)) {
      t.features = p.features.filter((f: string): f is PlanFeature => f in FEATURE_LABELS);
    }
  }
  if (body.auto) {
    if (typeof body.auto.enabled === "boolean") next.auto.enabled = body.auto.enabled;
    if (PLAN_ORDER.includes(body.auto.toPlan)) next.auto.toPlan = body.auto.toPlan;
    next.auto.minMembers = clampInt(body.auto.minMembers, 1, 100000, next.auto.minMembers);
    next.auto.minAgeDays = clampInt(body.auto.minAgeDays, 0, 3650, next.auto.minAgeDays);
  }
  if (body.requests && typeof body.requests.open === "boolean") next.requests.open = body.requests.open;
  if (body.requirements) {
    for (const id of PLAN_ORDER) {
      const r = body.requirements[id];
      if (!r) continue;
      next.requirements[id] = {
        minGroupMembers: clampInt(r.minGroupMembers, 0, 10_000_000, next.requirements[id].minGroupMembers),
        minWorkspaceDays: clampInt(r.minWorkspaceDays, 0, 3650, next.requirements[id].minWorkspaceDays),
      };
    }
  }

  await savePlanConfig(next);
  await logSiteAction({ actorId: caller.userId, action: "update_plan_settings" });
  return res.status(200).json({ success: true, config: next });
}

export default withSessionRoute(handler);
