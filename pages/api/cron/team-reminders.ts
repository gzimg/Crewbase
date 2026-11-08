import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { checkCronRequest } from "@/utils/cronAuth";
import { notifyUsers } from "@/utils/teamNotify";

/**
 * Hourly Team reminders:
 * - Members who said Going or Maybe get a reminder about an hour before an event.
 * - Members get a heads-up 7 days before a certification expires.
 * Each reminder is sent once (the item remembers it).
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkCronRequest(req, res)) return;
  const now = Date.now();
  let sent = 0;

  try {
    const events = await prisma.config.findMany({ where: { key: { startsWith: "team:events:" } }, select: { id: true, value: true, workspaceGroupId: true } });
    for (const row of events) {
      const e = row.value as any;
      const start = new Date(e.start).getTime();
      if (e.remindedAt || start < now || start - now > 75 * 60_000) continue;
      const who = Object.entries<any>(e.rsvps || {}).filter(([, r]) => r.answer === "going" || r.answer === "maybe").map(([id]) => id);
      await notifyUsers(row.workspaceGroupId, who, `⏰ Starting soon: ${e.title}`, e.location ? `At ${e.location}` : "Your event starts within the hour.", `/workspace/${row.workspaceGroupId}/team/events`);
      await prisma.config.update({ where: { id: row.id }, data: { value: { ...e, remindedAt: new Date().toISOString() } } });
      sent += who.length;
    }

    const awards = await prisma.config.findMany({ where: { key: { startsWith: "team:awards:" } }, select: { id: true, value: true, workspaceGroupId: true } });
    for (const row of awards) {
      const a = row.value as any;
      if (!a.expiresAt || a.expiryWarnedAt) continue;
      const left = new Date(a.expiresAt).getTime() - now;
      if (left < 0 || left > 7 * 86_400_000) continue;
      await notifyUsers(row.workspaceGroupId, [a.userId], "🎓 A certification expires soon", `It expires on ${new Date(a.expiresAt).toDateString()}. Ask your trainers about renewing it.`, `/workspace/${row.workspaceGroupId}/team/trainings`);
      await prisma.config.update({ where: { id: row.id }, data: { value: { ...a, expiryWarnedAt: new Date().toISOString() } } });
      sent++;
    }
    return res.status(200).json({ success: true, sent });
  } catch (error) {
    console.error("[CRON] Team reminders failed:", error);
    return res.status(500).json({ success: false, error: "Team reminders failed" });
  }
}
