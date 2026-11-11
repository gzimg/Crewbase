import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { checkCronRequest } from "@/utils/cronAuth";
import { getTeamSettings, postAsBot, postToWebhook } from "@/utils/teamNotify";

/**
 * Every 5 minutes: announces shifts (sessions) that start soon, in each workspace’s
 * chosen Discord channel (as the Crewbase bot) or webhook. Each shift is announced once.
 */
const ORANGE = 0xf28c28;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkCronRequest(req, res)) return;
  const site = (process.env.NEXTAUTH_URL || "https://crewbase.dev").replace(/\/+$/, "");

  try {
    const rows = await prisma.config.findMany({ where: { key: "team:settings" }, select: { workspaceGroupId: true } });
    const announcedRow = await prisma.instanceConfig.findUnique({ where: { key: "shift_announced" } });
    const announced: Record<string, number> = (announcedRow?.value as any) || {};
    const now = Date.now();
    let posted = 0;

    for (const { workspaceGroupId } of rows) {
      const settings = await getTeamSettings(workspaceGroupId);
      const s = settings.shifts;
      if (!s.enabled) continue;
      if (s.via === "bot" && !s.channelId) continue;
      if (s.via === "webhook" && !settings.discordWebhook) continue;

      const sessions = await prisma.session.findMany({
        where: {
          sessionType: { workspaceGroupId },
          date: { gte: new Date(now), lte: new Date(now + s.leadMinutes * 60_000) },
          ended: null,
        },
        select: { id: true, name: true, date: true, duration: true, ownerId: true, sessionType: { select: { name: true, slots: true } } },
        take: 25,
      });

      for (const session of sessions) {
        if (announced[session.id]) continue;
        const [signups, host] = await Promise.all([
          prisma.sessionUser.count({ where: { sessionid: session.id } }),
          session.ownerId ? prisma.user.findUnique({ where: { userid: session.ownerId }, select: { username: true } }) : null,
        ]);
        const totalSlots = (session.sessionType?.slots || []).reduce((sum: number, slot: any) => sum + (Number(slot?.slots) || 0), 0);
        const unix = Math.floor(session.date.getTime() / 1000);
        const payload = {
          content: s.pingRoleId ? `<@&${s.pingRoleId}>` : undefined,
          allowed_mentions: { roles: s.pingRoleId ? [s.pingRoleId] : [], parse: [] },
          embeds: [
            {
              title: `🗓️ ${session.name || session.sessionType?.name || "Shift"} starts <t:${unix}:R>`,
              url: `${site}/workspace/${workspaceGroupId}/sessions`,
              color: ORANGE,
              fields: [
                { name: "Starts", value: `<t:${unix}:F>`, inline: true },
                { name: "Length", value: `${session.duration || 30} min`, inline: true },
                { name: "Host", value: host?.username || "Not set", inline: true },
                { name: "Signed up", value: totalSlots ? `${signups} / ${totalSlots}` : String(signups), inline: true },
              ],
              footer: { text: "Book a slot on Crewbase" },
              timestamp: new Date().toISOString(),
            },
          ],
        };
        const ok = s.via === "bot" ? await postAsBot(s.channelId!, payload) : await postToWebhook(workspaceGroupId, payload);
        if (ok) {
          announced[session.id] = now;
          posted++;
        }
      }
    }

    // Forget announcements older than 2 days
    for (const [id, at] of Object.entries(announced)) if (now - at > 2 * 86_400_000) delete announced[id];
    await prisma.instanceConfig.upsert({ where: { key: "shift_announced" }, update: { value: announced as any }, create: { key: "shift_announced", value: announced as any } });
    return res.status(200).json({ success: true, posted });
  } catch (error) {
    console.error("[CRON] Shift announcements failed:", error);
    return res.status(500).json({ success: false, error: "Shift announcements failed" });
  }
}
