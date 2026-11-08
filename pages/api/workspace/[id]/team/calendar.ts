import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import prisma from "@/utils/database";
import { listItems } from "@/utils/teamStore";

/** Downloads the workspace's Team events as a calendar file (.ics) for Google, Apple or Outlook calendars. */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed" });
  const groupId = parseInt(String(req.query.id));
  const [events, ws] = await Promise.all([
    listItems(groupId, "events"),
    prisma.workspace.findUnique({ where: { groupId: BigInt(groupId) }, select: { groupName: true } }),
  ]);
  const only = typeof req.query.event === "string" ? req.query.event : null;
  const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const esc = (s: string) => String(s || "").replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, (m) => `\\${m}`);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Crewbase//Team events//EN",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${esc(`${ws?.groupName || "Workspace"} events`)}`,
  ];
  for (const e of events) {
    if (only && e.id !== only) continue;
    const end = e.end && e.end !== e.start ? e.end : new Date(new Date(e.start).getTime() + 60 * 60_000).toISOString();
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.id}@crewbase`,
      `DTSTAMP:${stamp(e.updatedAt || e.createdAt)}`,
      `DTSTART:${stamp(e.start)}`,
      `DTEND:${stamp(end)}`,
      `SUMMARY:${esc(e.title)}`,
      ...(e.description ? [`DESCRIPTION:${esc(e.description)}`] : []),
      ...(e.location ? [`LOCATION:${esc(e.location)}`] : []),
      "END:VEVENT"
    );
  }
  lines.push("END:VCALENDAR");
  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${only ? "event" : "events"}.ics"`);
  res.setHeader("Cache-Control", "private, no-store");
  return res.status(200).send(lines.join("\r\n"));
}

export default withPermissionCheck(handler);
