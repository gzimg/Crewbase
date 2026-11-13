import prisma from "@/utils/database";

/**
 * Site-wide settings and records for running a Crewbase instance, stored in
 * the instanceConfig table as JSON (no database migration needed).
 */

export type SiteSettings = {
  maintenance: { enabled: boolean; message: string };
  registrations: { open: boolean };
  announcement: { enabled: boolean; text: string; tone: "info" | "warning" | "success"; updatedAt: string | null };
  // Who can create workspaces for their Roblox groups
  workspaces: { open: boolean; perUserLimit: number; minRank: number };
};

export type WorkspaceLock = { by: string; at: string; reason: string };

export type SiteReport = {
  id: string;
  category: "user" | "workspace" | "bug" | "content" | "deletion" | "other";
  status: "open" | "resolved" | "dismissed";
  reporterId: string;
  targetUsername?: string;
  workspaceId?: string;
  details: string;
  createdAt: string;
  handledBy?: string;
  handledAt?: string;
  resolution?: string;
};

export type StaffNote = { id: string; by: string; at: string; text: string };

const DEFAULT_SETTINGS: SiteSettings = {
  maintenance: { enabled: false, message: "Crewbase is down for maintenance. We’ll be back soon." },
  registrations: { open: true },
  announcement: { enabled: false, text: "", tone: "info", updatedAt: null },
  workspaces: { open: true, perUserLimit: 3, minRank: 25 },
};

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const row = await prisma.instanceConfig.findUnique({ where: { key } });
  return (row?.value as unknown as T) ?? fallback;
}

async function writeJson(key: string, value: unknown): Promise<void> {
  await prisma.instanceConfig.upsert({
    where: { key },
    update: { value: value as any },
    create: { key, value: value as any },
  });
}

/* ---------- Settings (cached briefly, since some are checked on every request) ---------- */

let settingsCache: { value: SiteSettings; at: number } | null = null;
const SETTINGS_TTL = 15_000;

export async function getSiteSettings(fresh = false): Promise<SiteSettings> {
  if (!fresh && settingsCache && Date.now() - settingsCache.at < SETTINGS_TTL) return settingsCache.value;
  const stored = await readJson<Partial<SiteSettings>>("site_settings", {});
  const value: SiteSettings = {
    maintenance: { ...DEFAULT_SETTINGS.maintenance, ...(stored.maintenance || {}) },
    registrations: { ...DEFAULT_SETTINGS.registrations, ...(stored.registrations || {}) },
    announcement: { ...DEFAULT_SETTINGS.announcement, ...(stored.announcement || {}) },
    workspaces: { ...DEFAULT_SETTINGS.workspaces, ...(stored.workspaces || {}) },
  };
  settingsCache = { value, at: Date.now() };
  return value;
}

export async function saveSiteSettings(next: SiteSettings): Promise<void> {
  await writeJson("site_settings", next);
  settingsCache = { value: next, at: Date.now() };
}

/* ---------- Workspace locks ---------- */

let locksCache: { value: Record<string, WorkspaceLock>; at: number } | null = null;

export async function getWorkspaceLocks(fresh = false): Promise<Record<string, WorkspaceLock>> {
  if (!fresh && locksCache && Date.now() - locksCache.at < SETTINGS_TTL) return locksCache.value;
  const value = await readJson<Record<string, WorkspaceLock>>("site_workspace_locks", {});
  locksCache = { value, at: Date.now() };
  return value;
}

export async function setWorkspaceLock(groupId: string, lock: WorkspaceLock | null): Promise<void> {
  const locks = { ...(await getWorkspaceLocks(true)) };
  if (lock) locks[groupId] = lock;
  else delete locks[groupId];
  await writeJson("site_workspace_locks", locks);
  locksCache = { value: locks, at: Date.now() };
}

export async function getWorkspaceLock(groupId: number | bigint | string): Promise<WorkspaceLock | null> {
  const locks = await getWorkspaceLocks();
  return locks[String(groupId)] ?? null;
}

/* ---------- Suspension check (cached briefly) ---------- */

const bannedCache = new Map<string, { banned: boolean; at: number }>();

export async function isUserSuspended(userId: number | bigint | string): Promise<boolean> {
  const id = String(userId);
  const hit = bannedCache.get(id);
  if (hit && Date.now() - hit.at < SETTINGS_TTL) return hit.banned;
  const user = await prisma.user.findUnique({ where: { userid: BigInt(id) }, select: { banned: true } });
  const banned = !!user?.banned;
  bannedCache.set(id, { banned, at: Date.now() });
  if (bannedCache.size > 5000) bannedCache.clear();
  return banned;
}

export function forgetSuspension(userId: string): void {
  bannedCache.delete(userId);
}

/* ---------- Reports ---------- */

const REPORTS_LIMIT = 1000;

export async function getReports(): Promise<SiteReport[]> {
  const list = await readJson<SiteReport[]>("site_reports", []);
  return Array.isArray(list) ? list : [];
}

export async function saveReports(list: SiteReport[]): Promise<void> {
  // Keep every open report, then the most recent closed ones up to the limit
  const open = list.filter((r) => r.status === "open");
  const closed = list.filter((r) => r.status !== "open");
  await writeJson("site_reports", [...open, ...closed].slice(0, Math.max(REPORTS_LIMIT, open.length)));
}

/* ---------- Staff notes on users ---------- */

export async function getStaffNotes(userId: string): Promise<StaffNote[]> {
  const all = await readJson<Record<string, StaffNote[]>>("site_user_notes", {});
  return all[userId] ?? [];
}

export async function saveStaffNotes(userId: string, notes: StaffNote[]): Promise<void> {
  const all = await readJson<Record<string, StaffNote[]>>("site_user_notes", {});
  if (notes.length) all[userId] = notes;
  else delete all[userId];
  await writeJson("site_user_notes", all);
}

/* ---------- Scheduled job tracking ---------- */

export async function recordCronRun(name: string): Promise<void> {
  try {
    const runs = await readJson<Record<string, string>>("site_cron_runs", {});
    runs[name] = new Date().toISOString();
    await writeJson("site_cron_runs", runs);
  } catch {
    // Tracking is best-effort and must never break a scheduled job
  }
}

export async function getCronRuns(): Promise<Record<string, string>> {
  return readJson<Record<string, string>>("site_cron_runs", {});
}

export function newId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/* ---------- Changelog ("What's new") ---------- */

export type ChangelogEntry = {
  id: string;
  title: string;
  body: string;
  tag: "new" | "improved" | "fixed";
  at: string;
  by: string;
};

/** Admin-posted updates plus the release notes that ship with the code, newest first. */
export async function getChangelog(): Promise<(ChangelogEntry & { builtIn?: boolean })[]> {
  const list = await readJson<ChangelogEntry[]>("site_changelog", []);
  const posted = Array.isArray(list) ? list : [];
  const { RELEASES } = await import("@/utils/releases");
  const shipped = RELEASES.map((r) => ({ ...r, by: "crewbase", builtIn: true }));
  return [...posted, ...shipped].sort((a, b) => b.at.localeCompare(a.at));
}

/** Only the updates admins posted themselves (the ones they can edit or delete). */
export async function getPostedChangelog(): Promise<ChangelogEntry[]> {
  const list = await readJson<ChangelogEntry[]>("site_changelog", []);
  return Array.isArray(list) ? list : [];
}

export async function saveChangelog(list: ChangelogEntry[]): Promise<void> {
  await writeJson("site_changelog", list.slice(0, 200));
}

/* ---------- Saved replies for site staff ---------- */

export type SavedReply = { id: string; title: string; text: string; by: string };

export async function getSavedReplies(): Promise<SavedReply[]> {
  const list = await readJson<SavedReply[]>("site_saved_replies", []);
  return Array.isArray(list) ? list : [];
}

export async function saveSavedReplies(list: SavedReply[]): Promise<void> {
  await writeJson("site_saved_replies", list.slice(0, 100));
}

/**
 * Whether someone may create another workspace: the instance owner and Crewbase
 * site staff always can; everyone else can while creation is open and they’re under
 * the per-person limit.
 */
export async function canCreateWorkspace(userId: string | number | bigint): Promise<{ allowed: boolean; reason?: string; minRank: number }> {
  const [site, user, owned] = await Promise.all([
    getSiteSettings(),
    prisma.user.findUnique({ where: { userid: BigInt(userId) }, select: { isOwner: true, banned: true } }),
    prisma.workspace.count({ where: { ownerId: BigInt(userId) } }),
  ]);
  const minRank = site.workspaces.minRank;
  if (!user || user.banned) return { allowed: false, reason: "Your account can’t create workspaces", minRank };
  if (user.isOwner) return { allowed: true, minRank };
  const { getSiteRole } = await import("@/utils/siteRoles");
  if (await getSiteRole(String(userId))) return { allowed: true, minRank };
  if (!site.workspaces.open) return { allowed: false, reason: "Creating new workspaces is paused right now", minRank };
  if (owned >= site.workspaces.perUserLimit) {
    return { allowed: false, reason: `You can own up to ${site.workspaces.perUserLimit} workspace${site.workspaces.perUserLimit === 1 ? "" : "s"}`, minRank };
  }
  return { allowed: true, minRank };
}
