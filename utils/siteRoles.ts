import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { validateOrigin } from "@/utils/csrf";

/**
 * Site-wide roles for running the whole Crewbase instance (separate from
 * workspace roles inside each group):
 * - "admin": full control, including managing who is site staff or admin.
 *   The instance owner (the person who completed setup) is always an admin.
 * - "staff": can look up users and workspaces and suspend regular users.
 *
 * Lists are kept in the instanceConfig table, so no database migration is needed.
 */
export type SiteRole = "admin" | "staff" | null;

const ADMINS_KEY = "site_admins";
const STAFF_KEY = "site_staff";
const AUDIT_KEY = "site_audit";
const AUDIT_LIMIT = 300;

async function readIdList(key: string): Promise<string[]> {
  const row = await prisma.instanceConfig.findUnique({ where: { key } });
  const value = row?.value as unknown;
  return Array.isArray(value) ? value.map((v) => String(v)) : [];
}

async function writeIdList(key: string, ids: string[]): Promise<void> {
  const unique = Array.from(new Set(ids));
  await prisma.instanceConfig.upsert({
    where: { key },
    update: { value: unique },
    create: { key, value: unique },
  });
}

export async function getSiteRoleLists(): Promise<{ admins: string[]; staff: string[] }> {
  const [admins, staff] = await Promise.all([readIdList(ADMINS_KEY), readIdList(STAFF_KEY)]);
  return { admins, staff };
}

export async function getSiteRole(userId: number | bigint | string | undefined | null): Promise<SiteRole> {
  if (userId === undefined || userId === null) return null;
  const id = String(userId);
  const user = await prisma.user.findUnique({
    where: { userid: BigInt(id) },
    select: { isOwner: true, banned: true },
  });
  if (!user || user.banned) return null;
  if (user.isOwner) return "admin";
  const { admins, staff } = await getSiteRoleLists();
  if (admins.includes(id)) return "admin";
  if (staff.includes(id)) return "staff";
  return null;
}

/** Sets someone's site role. "none" removes them from both lists. */
export async function setSiteRole(userId: string, role: "admin" | "staff" | "none"): Promise<void> {
  const { admins, staff } = await getSiteRoleLists();
  const nextAdmins = admins.filter((id) => id !== userId);
  const nextStaff = staff.filter((id) => id !== userId);
  if (role === "admin") nextAdmins.push(userId);
  if (role === "staff") nextStaff.push(userId);
  await Promise.all([writeIdList(ADMINS_KEY, nextAdmins), writeIdList(STAFF_KEY, nextStaff)]);
}

export type SiteAuditEntry = {
  at: string;
  actorId: string;
  action: string;
  targetId?: string;
  detail?: string;
};

export async function logSiteAction(entry: Omit<SiteAuditEntry, "at">): Promise<void> {
  try {
    const row = await prisma.instanceConfig.findUnique({ where: { key: AUDIT_KEY } });
    const existing = Array.isArray(row?.value) ? (row!.value as unknown as SiteAuditEntry[]) : [];
    const next = [{ ...entry, at: new Date().toISOString() }, ...existing].slice(0, AUDIT_LIMIT);
    await prisma.instanceConfig.upsert({
      where: { key: AUDIT_KEY },
      update: { value: next as any },
      create: { key: AUDIT_KEY, value: next as any },
    });
  } catch (error) {
    console.error("[site] Failed to write audit entry:", error);
  }
}

export async function getSiteAudit(): Promise<SiteAuditEntry[]> {
  const row = await prisma.instanceConfig.findUnique({ where: { key: AUDIT_KEY } });
  return Array.isArray(row?.value) ? (row!.value as unknown as SiteAuditEntry[]) : [];
}

/**
 * Checks the request comes from a logged-in user with at least `minRole`.
 * For anything other than GET, it also checks the request came from this site.
 * Returns the caller's role, or null after sending an error response.
 */
export async function requireSiteRole(
  req: NextApiRequest,
  res: NextApiResponse,
  minRole: "staff" | "admin"
): Promise<{ role: "admin" | "staff"; userId: string } | null> {
  if (req.method !== "GET" && !validateOrigin(req)) {
    res.status(403).json({ success: false, error: "Invalid request origin" });
    return null;
  }
  const userId = req.session?.userid;
  if (!userId) {
    res.status(401).json({ success: false, error: "Not logged in" });
    return null;
  }
  const role = await getSiteRole(userId);
  if (!role || (minRole === "admin" && role !== "admin")) {
    res.status(403).json({ success: false, error: "You don't have access to this" });
    return null;
  }
  return { role, userId: String(userId) };
}
