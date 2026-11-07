import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { checkCronRequest } from "@/utils/cronAuth";

type Resp = {
  success: boolean;
  updatedStarted?: number;
  updatedEnded?: number;
  error?: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<Resp>) {
  if (!checkCronRequest(req, res)) return;

  try {
    const now = new Date();
    const lookahead = new Date(now.getTime() + 30 * 60 * 1000);
    const candidates = await prisma.session.findMany({
      where: {
        ended: null,
        date: {
          lte: lookahead,
        },
      },
      include: {
        sessionType: true,
      },
    });

    let updatedStarted = 0;
    let updatedEnded = 0;

    for (const s of candidates) {
      const duration = s.duration;
      const endTime = new Date(new Date(s.date).getTime() + duration * 60 * 1000);

      if (endTime <= now) {
        await prisma.session.update({ where: { id: s.id }, data: { ended: endTime } });
        updatedEnded++;
      } else {
        if (!s.startedAt && s.date <= now) {
          await prisma.session.update({ where: { id: s.id }, data: { startedAt: s.date } });
          updatedStarted++;
        }
      }
    }

    return res.status(200).json({ success: true, updatedStarted, updatedEnded });
  } catch (e: any) {
    console.error("Cron update-sessions error:", e);
    return res.status(500).json({ success: false, error: String(e?.message || e) });
  }
}
