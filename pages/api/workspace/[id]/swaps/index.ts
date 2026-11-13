import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import prisma from "@/utils/database";
import { createItem, listItems, getMemberContext } from "@/utils/teamStore";

/**
 * Shift swaps.
 * GET: your upcoming shifts, and open swaps you could take.
 * POST { sessionId, roleID, slot, note }: offer one of your shifts to the team.
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  const groupId = parseInt(String(req.query.id));
  const ctx = await getMemberContext(req.session.userid!, groupId);
  const me = BigInt(ctx.id);
  const now = new Date();

  if (req.method === "GET") {
    const [mine, swaps] = await Promise.all([
      prisma.sessionUser.findMany({
        where: { userid: me, session: { date: { gte: now }, ended: null, sessionType: { workspaceGroupId: BigInt(groupId) } } },
        select: { sessionid: true, roleID: true, slot: true, session: { select: { name: true, date: true, sessionType: { select: { name: true } } } } },
        take: 50,
      }),
      listItems(groupId, "swaps", { take: 200 }),
    ]);
    const live = swaps.filter((s) => new Date(s.date).getTime() > now.getTime());
    return res.status(200).json({
      success: true,
      me: ctx.id,
      myShifts: mine
        .sort((a, b) => a.session.date.getTime() - b.session.date.getTime())
        .map((m) => ({
          sessionId: m.sessionid,
          roleID: m.roleID,
          slot: m.slot,
          name: m.session.name || m.session.sessionType?.name || "Shift",
          date: m.session.date,
          offered: live.some((s) => s.sessionId === m.sessionid && s.status === "open" && s.createdBy === ctx.id),
        })),
      swaps: live,
    });
  }

  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });
  const { sessionId, roleID, slot } = req.body || {};
  const note = typeof req.body?.note === "string" ? req.body.note.trim().slice(0, 300) : "";
  const signup = await prisma.sessionUser.findFirst({
    where: { userid: me, sessionid: String(sessionId), roleID: String(roleID), slot: Number(slot), session: { date: { gte: now }, sessionType: { workspaceGroupId: BigInt(groupId) } } },
    select: { session: { select: { name: true, date: true, sessionType: { select: { name: true } } } } },
  });
  if (!signup) return res.status(400).json({ success: false, error: "You’re not signed up for that shift, or it already started" });
  const existing = (await listItems(groupId, "swaps", { take: 200 })).find((s) => s.sessionId === String(sessionId) && s.createdBy === ctx.id && s.status === "open");
  if (existing) return res.status(400).json({ success: false, error: "You’ve already offered this shift" });

  const item = await createItem(
    groupId,
    "swaps",
    {
      sessionId: String(sessionId),
      roleID: String(roleID),
      slot: Number(slot),
      name: signup.session.name || signup.session.sessionType?.name || "Shift",
      date: signup.session.date.toISOString(),
      note,
      status: "open",
    },
    { id: ctx.id, name: ctx.name }
  );
  return res.status(200).json({ success: true, item });
}

export default withPermissionCheck(handler);
