import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import prisma from "@/utils/database";
import { getMemberContext } from "@/utils/teamStore";
import { getDepartments, saveDepartments, newDepartmentId, inDepartment, Department } from "@/utils/departments";
import { PERMISSION_CATALOG } from "@/components/permissionCatalog";
import { logAudit } from "@/utils/logs";

const ALL_PERMS = new Set(Object.values(PERMISSION_CATALOG).flatMap((c) => Object.values(c)));
const ICONS = ["Briefcase", "Crown", "UsersThree", "ShieldCheck", "Megaphone", "Headset", "Code", "PaintBrush", "Confetti", "Handshake", "ChartLineUp", "BookOpen", "Gavel", "Lifebuoy", "Star", "Lightning", "Heart", "Flag", "Wrench", "GraduationCap", "Binoculars", "ChatsCircle", "Trophy", "Sparkle"];
const COLORS = ["#F28C28", "#3B82F6", "#22C55E", "#A855F7", "#EC4899", "#EAB308", "#14B8A6", "#EF4444"];

function clean(b: any, existing?: Department): Department | { error: string } {
  const name = typeof b.name === "string" ? b.name.trim().slice(0, 50) : existing?.name || "";
  if (!name) return { error: "Name the department" };
  return {
    id: existing?.id || newDepartmentId(),
    name,
    description: typeof b.description === "string" ? b.description.trim().slice(0, 300) : existing?.description || "",
    icon: ICONS.includes(b.icon) ? b.icon : existing?.icon || "Briefcase",
    color: COLORS.includes(b.color) ? b.color : existing?.color || COLORS[0],
    permissions: Array.isArray(b.permissions) ? b.permissions.filter((p: string) => ALL_PERMS.has(p)) : existing?.permissions || [],
    autoRoleIds: Array.isArray(b.autoRoleIds) ? b.autoRoleIds.map(String).slice(0, 100) : existing?.autoRoleIds || [],
    memberIds: Array.isArray(b.memberIds) ? b.memberIds.map(String).filter((x: string) => /^\d{1,15}$/.test(x)).slice(0, 3000) : existing?.memberIds || [],
  };
}

/**
 * Departments for this workspace.
 * GET: every department, the workspace’s roles and members (for the editor).
 * POST: create one. PATCH { id, ... }: change one. DELETE ?id: remove one. Workspace admins only for changes.
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  const groupId = parseInt(String(req.query.id));
  const gid = BigInt(groupId);
  const ctx = await getMemberContext(req.session.userid!, groupId);
  const canManage = ctx.isManager || !!ctx.perms?.includes("manage_departments");
  const list = await getDepartments(groupId);

  if (req.method === "GET") {
    const [roles, members] = await Promise.all([
      prisma.role.findMany({ where: { workspaceGroupId: gid }, select: { id: true, name: true, groupRoles: true }, orderBy: { name: "asc" } }),
      prisma.workspaceMember.findMany({
        where: { workspaceGroupId: gid },
        select: { userId: true, user: { select: { username: true, displayName: true, picture: true, roles: { where: { workspaceGroupId: gid }, select: { id: true } } } } },
        take: 3000,
      }),
    ]);
    const people = members.map((m) => ({
      userId: m.userId.toString(),
      username: m.user?.username || m.userId.toString(),
      displayName: m.user?.displayName || null,
      picture: m.user?.picture || null,
      roleIds: (m.user?.roles || []).map((r) => String(r.id)),
    }));
    return res.status(200).json({
      success: true,
      canManage,
      icons: ICONS,
      colors: COLORS,
      catalog: PERMISSION_CATALOG,
      roles: roles.map((r) => ({ id: String(r.id), name: r.name })),
      people,
      departments: list.map((d) => ({ ...d, memberCount: people.filter((p) => inDepartment(d, p.userId, p.roleIds)).length })),
    });
  }

  if (!canManage) return res.status(403).json({ success: false, error: "Only workspace admins can change departments" });

  if (req.method === "POST") {
    const d = clean(req.body || {});
    if ("error" in d) return res.status(400).json({ success: false, error: d.error });
    await saveDepartments(groupId, [...list, d]);
    await logAudit(groupId, Number(ctx.id), "departments.create", d.name).catch(() => {});
    return res.status(200).json({ success: true, department: d });
  }
  if (req.method === "PATCH") {
    const existing = list.find((x) => x.id === req.body?.id);
    if (!existing) return res.status(404).json({ success: false, error: "Department not found" });
    const d = clean(req.body, existing);
    if ("error" in d) return res.status(400).json({ success: false, error: d.error });
    await saveDepartments(groupId, list.map((x) => (x.id === d.id ? d : x)));
    await logAudit(groupId, Number(ctx.id), "departments.update", d.name).catch(() => {});
    return res.status(200).json({ success: true, department: d });
  }
  if (req.method === "DELETE") {
    const existing = list.find((x) => x.id === req.query.departmentId);
    if (!existing) return res.status(404).json({ success: false, error: "Department not found" });
    await saveDepartments(groupId, list.filter((x) => x.id !== existing.id));
    await logAudit(groupId, Number(ctx.id), "departments.delete", existing.name).catch(() => {});
    return res.status(200).json({ success: true });
  }
  return res.status(405).json({ success: false, error: "Method not allowed" });
}

export default withPermissionCheck(handler);
