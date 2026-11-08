import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { checkCronRequest } from "@/utils/cronAuth";
import { getPlanConfig, getAllWorkspacePlans, setWorkspacePlan, PLAN_ORDER } from "@/utils/plans";

/**
 * Daily plan upkeep:
 * - Plans past their end date go back to the default plan.
 * - Workspaces that meet the automatic-upgrade rules move up (never down).
 * Workspace age is measured from when this job first saw the workspace.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkCronRequest(req, res)) return;

  try {
    const config = await getPlanConfig(true);
    const plans = await getAllWorkspacePlans();
    const seenRow = await prisma.instanceConfig.findUnique({ where: { key: "site_workspace_first_seen" } });
    const firstSeen: Record<string, string> = (seenRow?.value as any) || {};
    const workspaces = await prisma.workspace.findMany({ select: { groupId: true, _count: { select: { members: true } } } });
    const now = Date.now();
    let expired = 0;
    let upgraded = 0;

    for (const ws of workspaces) {
      const id = ws.groupId.toString();
      if (!firstSeen[id]) firstSeen[id] = new Date().toISOString();
      const record = plans[id];

      if (record?.expiresAt && new Date(record.expiresAt).getTime() < now) {
        await setWorkspacePlan(id, null);
        delete plans[id];
        expired++;
      }

      if (!config.auto.enabled) continue;
      const current = plans[id]?.plan ?? config.defaultPlan;
      if (PLAN_ORDER.indexOf(config.auto.toPlan) <= PLAN_ORDER.indexOf(current)) continue;
      const ageDays = (now - new Date(firstSeen[id]).getTime()) / 86_400_000;
      if (ws._count.members >= config.auto.minMembers && ageDays >= config.auto.minAgeDays) {
        await setWorkspacePlan(id, { plan: config.auto.toPlan, source: "auto", since: new Date().toISOString() });
        upgraded++;
      }
    }

    await prisma.instanceConfig.upsert({
      where: { key: "site_workspace_first_seen" },
      update: { value: firstSeen as any },
      create: { key: "site_workspace_first_seen", value: firstSeen as any },
    });
    return res.status(200).json({ success: true, expired, upgraded });
  } catch (error) {
    console.error("[CRON] Plan upkeep failed:", error);
    return res.status(500).json({ success: false, error: "Plan upkeep failed" });
  }
}
