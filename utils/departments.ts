import crypto from "crypto";
import prisma from "@/utils/database";

/**
 * Departments: named groups of permissions with people in them. Someone gets every
 * permission from every department they’re in, on top of their role. People join a
 * department by hand, or automatically through the Crewbase roles you pick
 * (which follow your Roblox group ranks). Workspace admins always have everything.
 */
export type Department = {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  permissions: string[];
  autoRoleIds: string[];
  memberIds: string[];
};

const KEY = "departments";
const cache = new Map<string, { at: number; list: Department[] }>();

export async function getDepartments(groupId: number | bigint): Promise<Department[]> {
  const k = String(groupId);
  const hit = cache.get(k);
  if (hit && Date.now() - hit.at < 15_000) return hit.list;
  const row = await prisma.config.findFirst({ where: { workspaceGroupId: BigInt(groupId), key: KEY }, select: { value: true } });
  const list = (((row?.value as any)?.list as Department[]) || []).filter(Boolean);
  cache.set(k, { at: Date.now(), list });
  return list;
}

export async function saveDepartments(groupId: number | bigint, list: Department[]) {
  const row = await prisma.config.findFirst({ where: { workspaceGroupId: BigInt(groupId), key: KEY }, select: { id: true } });
  const value = { list: list.slice(0, 50) } as any;
  if (row) await prisma.config.update({ where: { id: row.id }, data: { value } });
  else await prisma.config.create({ data: { workspaceGroupId: BigInt(groupId), key: KEY, value } });
  cache.delete(String(groupId));
}

export const newDepartmentId = () => crypto.randomBytes(6).toString("hex");

/** Is this person in the department (by hand, or through one of their roles)? */
export function inDepartment(d: Department, userId: string, roleIds: string[]) {
  return d.memberIds.includes(userId) || d.autoRoleIds.some((r) => roleIds.includes(r));
}

/** Every permission someone gets from departments. */
export async function departmentPermissions(groupId: number | bigint, userId: string | number | bigint, roleIds: string[]): Promise<string[]> {
  const list = await getDepartments(groupId).catch(() => [] as Department[]);
  if (!list.length) return [];
  const uid = String(userId);
  const perms = new Set<string>();
  for (const d of list) if (inDepartment(d, uid, roleIds)) d.permissions.forEach((p) => perms.add(p));
  return Array.from(perms);
}
