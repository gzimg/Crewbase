import prisma from "@/utils/database";

/**
 * Collects the personal data Crewbase holds about one user, for privacy
 * requests (a user downloading their data, or a site admin answering a request).
 * Passwords are never included.
 */
export async function buildUserExport(userId: string) {
  const id = BigInt(userId);
  const safe = async <T>(fn: () => Promise<T>): Promise<T | { error: string }> => {
    try {
      return await fn();
    } catch {
      return { error: "Could not export this section" };
    }
  };

  const db: any = prisma;
  const data = {
    exportedAt: new Date().toISOString(),
    notice:
      "This file contains the personal information Crewbase holds about your account. Records about you that workspace staff created (like warnings) are included so you can see them.",
    account: await safe(() =>
      prisma.user.findUnique({
        where: { userid: id },
        select: {
          userid: true,
          username: true,
          displayName: true,
          picture: true,
          birthdayDay: true,
          birthdayMonth: true,
          isOwner: true,
          banned: true,
          bannedAt: true,
          banReason: true,
        },
      })
    ),
    workspaceProfiles: await safe(() =>
      db.workspaceMember.findMany({
        where: { userId: id },
        select: {
          workspaceGroupId: true,
          joinDate: true,
          birthdayDay: true,
          birthdayMonth: true,
          discordId: true,
          timezone: true,
          email: true,
          introMessage: true,
          trackName: true,
          artistName: true,
          workspace: { select: { groupName: true } },
        },
      })
    ),
    activitySessions: await safe(() => db.activitySession.findMany({ where: { userId: id }, take: 5000, orderBy: { startTime: "desc" } })),
    activityHistory: await safe(() => db.activityHistory.findMany({ where: { userId: id }, take: 2000 })),
    userbookEntries: await safe(() => db.userBook.findMany({ where: { userId: id }, take: 2000 })),
    inactivityNotices: await safe(() => db.inactivityNotice.findMany({ where: { userId: id }, take: 2000 })),
    policyAcknowledgments: await safe(() => db.policyAcknowledgment.findMany({ where: { userId: id }, take: 2000 })),
    wallPosts: await safe(() => db.wallPost.findMany({ where: { authorId: id }, take: 2000 })),
    applicationSubmissions: await safe(() => db.applicationSubmission.findMany({ where: { userId: id }, take: 500 })),
    sessionsJoined: await safe(() => db.sessionUser.findMany({ where: { userid: id }, take: 5000 })),
    teamContent: await safe(async () => (await import("@/utils/teamStore")).exportUserTeamData(userId)),
  };

  return JSON.stringify(data, (_key, value) => (typeof value === "bigint" ? value.toString() : value), 2);
}
