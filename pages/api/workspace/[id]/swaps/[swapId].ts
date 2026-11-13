import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import prisma from "@/utils/database";
import { getItem, saveItem, getMemberContext } from "@/utils/teamStore";
import { notifyUsers } from "@/utils/teamNotify";

/** POST { action: "take" | "cancel" }: take an open shift swap, or cancel your own offer. */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });
  const groupId = parseInt(String(req.query.id));
  const ctx = await getMemberContext(req.session.userid!, groupId);
  const found = await getItem(groupId, "swaps", String(req.query.swapId));
  if (!found) return res.status(404).json({ success: false, error: "Swap not found" });
  const swap = found.item;
  if (swap.status !== "open") return res.status(400).json({ success: false, error: "This swap isn’t open any more" });

  if (req.body?.action === "cancel") {
    if (swap.createdBy !== ctx.id && !ctx.isManager) return res.status(403).json({ success: false, error: "Only the person who offered it can cancel" });
    await saveItem(found.rowId, { ...swap, status: "cancelled" });
    return res.status(200).json({ success: true });
  }

  if (req.body?.action !== "take") return res.status(400).json({ success: false, error: "Unknown action" });
  if (!swap.createdBy) return res.status(400).json({ success: false, error: "This swap is missing who offered it" });
  if (swap.createdBy === ctx.id) return res.status(400).json({ success: false, error: "That’s your own shift" });
  const offeredBy: string = swap.createdBy;
  if (new Date(swap.date).getTime() < Date.now()) return res.status(400).json({ success: false, error: "That shift already started" });
  const already = await prisma.sessionUser.findFirst({ where: { sessionid: swap.sessionId, userid: BigInt(ctx.id) } });
  if (already) return res.status(400).json({ success: false, error: "You’re already signed up for that shift" });

  // Move the slot from the person who offered it to you
  const moved = await prisma.sessionUser.updateMany({
    where: { sessionid: swap.sessionId, userid: BigInt(offeredBy), roleID: swap.roleID, slot: Number(swap.slot) },
    data: { userid: BigInt(ctx.id) },
  });
  if (moved.count === 0) {
    await saveItem(found.rowId, { ...swap, status: "cancelled" });
    return res.status(400).json({ success: false, error: "That person isn’t on the shift any more, so the swap was closed" });
  }
  await saveItem(found.rowId, { ...swap, status: "taken", takenBy: ctx.id, takenByName: ctx.name, takenAt: new Date().toISOString() });
  await notifyUsers(groupId, [offeredBy], "🔁 Your shift was taken", `${ctx.name || "A teammate"} is covering “${swap.name}”. You’re off the hook!`, `/workspace/${groupId}/team/swaps`).catch(() => {});
  return res.status(200).json({ success: true });
}

export default withPermissionCheck(handler);
