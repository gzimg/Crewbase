import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { getMemberContext } from "@/utils/teamStore";
import { hasHR, isHR } from "@/utils/teamRules";

/** What the current member can do in HR. */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  const ctx = await getMemberContext(req.session.userid!, parseInt(String(req.query.id)));
  return res.status(200).json({
    success: true,
    id: ctx.id,
    isHR: isHR(ctx),
    can: {
      view: hasHR(ctx, "hr.view"),
      infractions: hasHR(ctx, "hr.infractions"),
      cases: hasHR(ctx, "hr.cases"),
      plans: hasHR(ctx, "hr.plans"),
      resignations: hasHR(ctx, "hr.resignations"),
    },
  });
}

export default withPermissionCheck(handler);
