import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";

/**
 * Public, anonymous totals for the homepage (number of workspaces, staff and hours
 * tracked). Only totals are shared: nothing here identifies a person or a group.
 */
let cache: { at: number; data: any } | null = null;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();
  if (cache && Date.now() - cache.at < 10 * 60_000) {
    res.setHeader("Cache-Control", "public, max-age=600");
    return res.status(200).json(cache.data);
  }
  try {
    const since = new Date(Date.now() - 30 * 86_400_000);
    const [workspaces, members, sessions] = await Promise.all([
      prisma.workspace.count(),
      prisma.workspaceMember.count(),
      prisma.activitySession.findMany({
        where: { startTime: { gte: since }, endTime: { not: null }, archived: { not: true } },
        select: { startTime: true, endTime: true },
        take: 200_000,
      }),
    ]);
    const hours = Math.round(sessions.reduce((sum, s) => sum + (s.endTime!.getTime() - s.startTime.getTime()) / 3_600_000, 0));
    cache = { at: Date.now(), data: { workspaces, members, hoursLast30Days: hours } };
    res.setHeader("Cache-Control", "public, max-age=600");
    return res.status(200).json(cache.data);
  } catch {
    return res.status(200).json({ workspaces: 0, members: 0, hoursLast30Days: 0 });
  }
}
