import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { listItems } from "@/utils/teamStore";
import { staffingEnabled } from "@/utils/staffing";

/** Public: a workspace’s open positions that it chose to make public. */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();
  const groupId = Number(req.query.groupId);
  if (!Number.isInteger(groupId) || groupId <= 0) return res.status(404).json({ success: false });
  const ws = await prisma.workspace.findUnique({ where: { groupId: BigInt(groupId) }, select: { groupName: true, groupLogo: true } });
  if (!ws || !(await staffingEnabled(groupId))) return res.status(404).json({ success: false, error: "No careers page here" });
  const positions = (await listItems(groupId, "positions"))
    .filter((p) => p.public && p.status === "open")
    .map(({ id, title, department, openings, description, requirements, applyLink, createdAt }) => ({ id, title, department, openings, description, requirements, applyLink, createdAt }));
  res.setHeader("Cache-Control", "public, max-age=120");
  return res.status(200).json({ success: true, group: { id: String(groupId), name: ws.groupName, logo: ws.groupLogo }, positions });
}
