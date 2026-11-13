import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withPermissionCheck, checkGroupRoles } from "@/utils/permissionsManager";
import { getGroupRoles } from "@/utils/roblox";
import { getWorkspaceRobloxApiKey } from "@/utils/openCloud";

/**
 * Creates a Crewbase role for every role in the Roblox group that isn’t linked to
 * one yet, linked to that group role, then syncs who has which role.
 * New roles start with no permissions, so nobody gets access by surprise.
 * Body: { minRank?: number } to skip low ranks (e.g. regular members).
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });
  const groupId = parseInt(String(req.query.id));
  const minRank = Math.max(1, Math.min(255, Number(req.body?.minRank) || 1));

  const groupRoles = (await getGroupRoles(groupId)).filter((r) => r.rank >= minRank).sort((a, b) => a.rank - b.rank);
  if (!groupRoles.length) return res.status(400).json({ success: false, error: "Couldn’t read your Roblox group’s roles. Try again in a minute." });

  const existing = await prisma.role.findMany({ where: { workspaceGroupId: BigInt(groupId) }, select: { name: true, groupRoles: true } });
  const linked = new Set(existing.flatMap((r) => r.groupRoles));
  const names = new Set(existing.map((r) => r.name.toLowerCase()));

  const created: string[] = [];
  for (const gr of groupRoles) {
    if (linked.has(gr.id)) continue;
    // If a Crewbase role already has this name, give the new one the rank so names stay unique
    const name = names.has(gr.name.toLowerCase()) ? `${gr.name} (${gr.rank})` : gr.name;
    await prisma.role.create({ data: { workspaceGroupId: BigInt(groupId), name, permissions: [], groupRoles: [gr.id] } });
    names.add(name.toLowerCase());
    created.push(name);
  }

  // Put people into their roles straight away when the workspace can read the group
  let synced = false;
  if (created.length && (await getWorkspaceRobloxApiKey(groupId).catch(() => null))) {
    await checkGroupRoles(groupId).catch((e) => console.error("[roles import] sync failed", e));
    synced = true;
  }
  return res.status(200).json({ success: true, created, skipped: groupRoles.length - created.length, synced });
}

export default withPermissionCheck(handler, "admin");
