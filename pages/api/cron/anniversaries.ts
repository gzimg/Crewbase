import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { checkCronRequest } from "@/utils/cronAuth";
import { notifyUsers, getTeamSettings, postToWebhook } from "@/utils/teamNotify";

/**
 * Daily: celebrates work anniversaries (a year or more since someone joined a
 * workspace). The person and the workspace’s admins get a notification, and if the
 * workspace posts kudos to Discord, it’s shared there too.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkCronRequest(req, res)) return;
  const today = new Date();
  const month = today.getUTCMonth();
  const day = today.getUTCDate();
  let sent = 0;

  try {
    const members = await prisma.workspaceMember.findMany({
      where: { joinDate: { not: null, lte: new Date(today.getTime() - 360 * 86_400_000) } },
      select: { userId: true, workspaceGroupId: true, joinDate: true, user: { select: { username: true } } },
      take: 50_000,
    });
    const todays = members.filter((m) => m.joinDate && m.joinDate.getUTCMonth() === month && m.joinDate.getUTCDate() === day);
    const byWorkspace = new Map<string, typeof todays>();
    for (const m of todays) {
      const key = m.workspaceGroupId.toString();
      byWorkspace.set(key, [...(byWorkspace.get(key) || []), m]);
    }

    for (const [groupId, list] of byWorkspace) {
      const admins = (await prisma.workspaceMember.findMany({ where: { workspaceGroupId: BigInt(groupId), isAdmin: true }, select: { userId: true } })).map((a) => a.userId.toString());
      const settings = await getTeamSettings(BigInt(groupId)).catch(() => null);
      for (const m of list) {
        const years = today.getUTCFullYear() - m.joinDate!.getUTCFullYear();
        if (years < 1) continue;
        const label = `${years} year${years === 1 ? "" : "s"}`;
        await notifyUsers(BigInt(groupId), [m.userId.toString()], `🎉 Happy ${label} on the team!`, "Thank you for everything you do. Here’s to the next one!", `/workspace/${groupId}`);
        await notifyUsers(BigInt(groupId), admins.filter((a) => a !== m.userId.toString()), `🎉 ${m.user?.username}’s ${label} anniversary`, "A kudos or a thank-you today would mean a lot.", `/workspace/${groupId}/team/kudos`);
        if (settings?.postKudos) {
          await postToWebhook(BigInt(groupId), { embeds: [{ title: `🎉 Happy ${label}, ${m.user?.username}!`, description: `Today marks ${label} on the team. Thank you!`, color: 0xf28c28 }] });
        }
        sent++;
      }
    }
    return res.status(200).json({ success: true, celebrated: sent });
  } catch (error) {
    console.error("[CRON] Anniversaries failed:", error);
    return res.status(500).json({ success: false, error: "Anniversaries failed" });
  }
}
