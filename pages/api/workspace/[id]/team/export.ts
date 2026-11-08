import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { listItems, getMemberContext } from "@/utils/teamStore";

/** CSV downloads for managers: ?type=certifications | rsvps | kudos | polls */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed" });
  const groupId = parseInt(String(req.query.id));
  const ctx = await getMemberContext(req.session.userid!, groupId);
  if (!ctx.isManager) return res.status(403).json({ success: false, error: "Only workspace managers can export" });

  const cell = (v: unknown) => {
    let t = String(v ?? "");
    if (/^[=+\-@\t\r]/.test(t)) t = "'" + t;
    return `"${t.replace(/"/g, '""')}"`;
  };
  const type = String(req.query.type);
  let rows: unknown[][] = [];

  if (type === "certifications") {
    const [certs, awards] = await Promise.all([listItems(groupId, "certifications"), listItems(groupId, "awards")]);
    const names = new Map(certs.map((c) => [c.id, c.name]));
    rows = [["Member", "Roblox ID", "Certification", "Awarded", "Expires", "Note", "Awarded by"]];
    for (const a of awards) rows.push([a.username, a.userId, names.get(a.certId) || "Removed", a.awardedAt?.slice(0, 10), a.expiresAt?.slice(0, 10) || "Never", a.note, a.createdByName]);
  } else if (type === "rsvps") {
    const events = await listItems(groupId, "events");
    rows = [["Event", "Start (UTC)", "Member", "Roblox ID", "Answer"]];
    for (const e of events) for (const [uid, r] of Object.entries<any>(e.rsvps || {})) rows.push([e.title, e.start, r.name, uid, r.answer]);
  } else if (type === "kudos") {
    const kudos = await listItems(groupId, "kudos");
    rows = [["Date", "From", "To", "Message", "Cheers"]];
    for (const k of kudos) rows.push([k.createdAt.slice(0, 10), k.createdByName, k.toUsername, k.message, (k.cheers || []).length]);
  } else if (type === "polls") {
    const polls = await listItems(groupId, "polls");
    rows = [["Poll", "Option", "Votes"]];
    for (const p of polls) {
      const tally: Record<number, number> = {};
      for (const v of Object.values<any>(p.votes || {})) tally[v.option] = (tally[v.option] || 0) + 1;
      p.options.forEach((o: string, i: number) => rows.push([p.question, o, tally[i] || 0]));
    }
  } else {
    return res.status(400).json({ success: false, error: "Unknown export" });
  }

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="crewbase-${type}.csv"`);
  return res.status(200).send(rows.map((r) => r.map(cell).join(",")).join("\n"));
}

export default withPermissionCheck(handler);
