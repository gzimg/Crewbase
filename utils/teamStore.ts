import prisma from "@/utils/database";

/**
 * Storage for the Team tabs (announcements, chat, events, trainings, reviews,
 * feedback, polls and kudos). Each item is its own row in the workspace `config`
 * table, keyed "team:<collection>:<id>", so no database migration is needed and
 * two people saving at once never overwrite each other.
 */

export type TeamItem = {
  id: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  createdByName: string | null;
  [field: string]: any;
};

export const COLLECTIONS = ["announcements", "chat", "events", "certifications", "awards", "reviews", "feedback", "polls", "kudos", "tasks", "ideas", "checklists", "onboarding", "links", "nominations", "infractions", "complaints", "appeals", "pips", "resignations", "paths", "swaps"] as const;
export type Collection = (typeof COLLECTIONS)[number];

const LIMITS: Record<Collection, number> = {
  announcements: 300,
  chat: 1000,
  events: 500,
  certifications: 100,
  awards: 3000,
  reviews: 2000,
  feedback: 1000,
  polls: 200,
  kudos: 1000,
  tasks: 1000,
  ideas: 500,
  checklists: 50,
  onboarding: 1000,
  links: 200,
  nominations: 1000,
  infractions: 5000,
  complaints: 2000,
  appeals: 2000,
  pips: 1000,
  resignations: 2000,
  paths: 100,
  swaps: 1000,
};

const prefix = (c: Collection) => `team:${c}:`;
const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export async function listItems(groupId: number | bigint, collection: Collection, opts: { take?: number; since?: Date } = {}): Promise<TeamItem[]> {
  const rows = await prisma.config.findMany({
    where: {
      workspaceGroupId: BigInt(groupId),
      key: { startsWith: prefix(collection) },
      ...(opts.since ? { createdAt: { gt: opts.since } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(opts.take ?? LIMITS[collection], LIMITS[collection]),
    select: { value: true },
  });
  return rows.map((r) => r.value as unknown as TeamItem);
}

export async function getItem(groupId: number | bigint, collection: Collection, id: string): Promise<{ rowId: number; item: TeamItem } | null> {
  if (!/^[a-z0-9]{6,24}$/.test(id)) return null;
  const row = await prisma.config.findFirst({
    where: { workspaceGroupId: BigInt(groupId), key: `${prefix(collection)}${id}` },
    select: { id: true, value: true },
  });
  return row ? { rowId: row.id, item: row.value as unknown as TeamItem } : null;
}

export async function createItem(
  groupId: number | bigint,
  collection: Collection,
  data: Record<string, any>,
  author: { id: string; name: string | null } | null
): Promise<TeamItem> {
  const now = new Date().toISOString();
  const item: TeamItem = { ...data, id: newId(), createdAt: now, updatedAt: now, createdBy: author?.id ?? null, createdByName: author?.name ?? null };
  await prisma.config.create({ data: { workspaceGroupId: BigInt(groupId), key: `${prefix(collection)}${item.id}`, value: item as any } });

  // Keep each collection to a sensible size by removing the oldest items
  const total = await prisma.config.count({ where: { workspaceGroupId: BigInt(groupId), key: { startsWith: prefix(collection) } } });
  if (total > LIMITS[collection]) {
    const oldest = await prisma.config.findMany({
      where: { workspaceGroupId: BigInt(groupId), key: { startsWith: prefix(collection) } },
      orderBy: { createdAt: "asc" },
      take: total - LIMITS[collection],
      select: { id: true },
    });
    await prisma.config.deleteMany({ where: { id: { in: oldest.map((o) => o.id) } } });
  }
  return item;
}

export async function saveItem(rowId: number, item: TeamItem): Promise<TeamItem> {
  const next = { ...item, updatedAt: new Date().toISOString() };
  await prisma.config.update({ where: { id: rowId }, data: { value: next as any } });
  return next;
}

export async function deleteItem(rowId: number): Promise<void> {
  await prisma.config.delete({ where: { id: rowId } });
}

/** Who the caller is in this workspace: their name, and whether they can manage team content. */
export async function getMemberContext(userId: number | bigint, groupId: number | bigint) {
  const [user, membership] = await Promise.all([
    prisma.user.findUnique({
      where: { userid: BigInt(userId) },
      select: { username: true, picture: true, roles: { where: { workspaceGroupId: BigInt(groupId) }, select: { permissions: true } } },
    }),
    prisma.workspaceMember.findUnique({
      where: { workspaceGroupId_userId: { workspaceGroupId: BigInt(groupId), userId: BigInt(userId) } },
      select: { isAdmin: true },
    }),
  ]);
  const perms = (user?.roles || []).flatMap((r) => r.permissions || []);
  return {
    id: String(userId),
    name: user?.username ?? null,
    picture: user?.picture ?? null,
    isManager: !!membership?.isAdmin || perms.includes("admin"),
    perms,
  };
}

/** Removes or anonymises a user's Team data across every workspace (used for account deletion). */
export async function scrubUserFromTeam(userId: string): Promise<number> {
  const rows = await prisma.config.findMany({ where: { key: { startsWith: "team:" } }, select: { id: true, key: true, value: true } });
  let changed = 0;
  for (const row of rows) {
    const item = row.value as any;
    const collection = row.key.split(":")[1];
    const aboutThem = item.userId === userId || item.toUserId === userId || item.nomineeId === userId || item.aboutUserId === userId;
    const byThem = item.createdBy === userId;
    // Personal content by or about them is deleted
    if (aboutThem || (byThem && ["chat", "kudos", "feedback", "nominations", "complaints", "appeals", "resignations"].includes(collection))) {
      await prisma.config.delete({ where: { id: row.id } });
      changed++;
      continue;
    }
    let dirty = false;
    if (byThem) {
      item.createdBy = null;
      item.createdByName = "Deleted user";
      dirty = true;
    }
    for (const field of ["rsvps", "votes"]) {
      if (item[field] && userId in item[field]) {
        delete item[field][userId];
        dirty = true;
      }
    }
    for (const field of ["readBy", "voters", "cheers"]) {
      if (Array.isArray(item[field]) && item[field].includes(userId)) {
        item[field] = item[field].filter((x: string) => x !== userId);
        dirty = true;
      }
    }
    if (item.assigneeId === userId) {
      item.assigneeId = null;
      item.assigneeName = null;
      dirty = true;
    }
    if (dirty) {
      await prisma.config.update({ where: { id: row.id }, data: { value: item } });
      changed++;
    }
  }
  return changed;
}

/** A user's own Team data, for data exports. */
export async function exportUserTeamData(userId: string) {
  const rows = await prisma.config.findMany({ where: { key: { startsWith: "team:" } }, select: { key: true, value: true, workspaceGroupId: true } });
  return rows
    .filter((r) => {
      const v = r.value as any;
      const collection = r.key.split(":")[1];
      if (collection === "reviews" && v.userId === userId) return v.shared === true;
      return (
        v.createdBy === userId || v.userId === userId || v.toUserId === userId || v.assigneeId === userId || v.nomineeId === userId ||
        (v.rsvps && userId in v.rsvps) || (v.votes && userId in v.votes) || (Array.isArray(v.voters) && v.voters.includes(userId))
      );
    })
    .map((r) => ({ workspace: r.workspaceGroupId.toString(), type: r.key.split(":")[1], item: r.value }));
}
