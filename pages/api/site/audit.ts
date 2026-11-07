import type { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/withSession";
import prisma from "@/utils/database";
import { requireSiteRole, getSiteAudit } from "@/utils/siteRoles";

/** The most recent site staff and admin actions. Admins only. */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed" });
  const caller = await requireSiteRole(req, res, "admin");
  if (!caller) return;

  const asCsv = req.query.format === "csv";
  const entries = (await getSiteAudit()).slice(0, asCsv ? 300 : 100);
  const ids = Array.from(new Set(entries.flatMap((e) => [e.actorId, e.targetId]).filter(Boolean) as string[]));
  const users = ids.length
    ? await prisma.user.findMany({ where: { userid: { in: ids.map((id) => BigInt(id)) } }, select: { userid: true, username: true } })
    : [];
  const names = new Map(users.map((u) => [u.userid.toString(), u.username]));

  if (asCsv) {
    // Quote every cell, and stop spreadsheet apps treating text as formulas
    const cell = (v: unknown) => {
      let text = String(v ?? "");
      if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
      return `"${text.replace(/"/g, '""')}"`;
    };
    const rows = [["Time", "Actor", "Action", "Target", "Detail"].map(cell).join(",")];
    for (const e of entries) {
      rows.push([e.at, names.get(e.actorId) ?? e.actorId, e.action, e.targetId ? names.get(e.targetId) ?? e.targetId : "", e.detail ?? ""].map(cell).join(","));
    }
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="crewbase-site-audit.csv"');
    return res.status(200).send(rows.join("\n"));
  }

  return res.status(200).json({
    success: true,
    entries: entries.map((e) => ({
      ...e,
      actorName: names.get(e.actorId) ?? null,
      targetName: e.targetId ? names.get(e.targetId) ?? null : null,
    })),
  });
}

export default withSessionRoute(handler);
