import prisma from "@/utils/database";
import { deleteCaseEvidence } from "@/utils/evidenceManager";
import { getSiteRoleLists, setSiteRole } from "@/utils/siteRoles";
import { getReports, saveReports, getStaffNotes, saveStaffNotes } from "@/utils/siteSettings";
import { getPlanRequests, savePlanRequests } from "@/utils/plans";
import { scrubUserFromTeam } from "@/utils/teamStore";

/**
 * Deletes a user's Crewbase account and personal data, for account deletion requests.
 *
 * - Personal data about them is deleted: login details, workspace profiles, roles,
 *   activity, notices, policy sign-offs, userbook entries about them, applications,
 *   votes, comments, wall posts, notifications and staff notes.
 * - Things they made that belong to a workspace (docs, sessions, records they wrote
 *   about others) are kept but credited to "Deleted user", so workspaces don't lose them.
 * - Moderation records about them (cases, evidence, in-game bans) are deleted, unless
 *   `keepSafetyRecords` is true. Then those are kept, linked only to their Roblox ID, to
 *   keep bans working and for safety reasons, as the Privacy Policy allows.
 *
 * Workspace owners and the instance owner can't be deleted until ownership is moved.
 */

export const DELETED_USER_ID = BigInt(0);

export type DeletionOptions = { keepSafetyRecords: boolean };
export type DeletionResult = { deletedRecords: number; reassignedRecords: number; userRowDeleted: boolean; caseFilesDeleted: number };

export async function checkCanDelete(userId: string): Promise<string | null> {
  const id = BigInt(userId);
  if (id === DELETED_USER_ID) return "That’s the placeholder account";
  const user = await prisma.user.findUnique({ where: { userid: id }, select: { isOwner: true } });
  if (!user) return "User not found";
  if (user.isOwner) return "The instance owner’s account can’t be deleted";
  const owned = await prisma.workspace.findMany({ where: { ownerId: id }, select: { groupName: true, groupId: true } });
  if (owned.length) {
    return `They own ${owned.map((w) => w.groupName || w.groupId.toString()).join(", ")}. Transfer workspace ownership first.`;
  }
  return null;
}

export async function deleteUserAccount(userId: string, options: DeletionOptions): Promise<DeletionResult> {
  const blocker = await checkCanDelete(userId);
  if (blocker) throw new Error(blocker);

  const id = BigInt(userId);
  const ZERO = DELETED_USER_ID;
  let deleted = 0;
  let reassigned = 0;
  const count = (r: { count: number }) => r.count;

  // Cases about them, so their evidence files can be removed from storage afterwards
  const casesAbout = options.keepSafetyRecords
    ? []
    : await prisma.moderationCase.findMany({ where: { targetUserId: id }, select: { id: true } });

  await prisma.$transaction(
    async (tx) => {
      // Placeholder that kept workspace content is credited to
      await tx.user.upsert({
        where: { userid: ZERO },
        update: {},
        create: { userid: ZERO, username: "Deleted user", registered: false },
      });

      /* ----- Personal data: delete ----- */
      deleted += count(await tx.userInfo.deleteMany({ where: { userid: id } }));
      reassigned += count(await tx.workspaceMember.updateMany({ where: { lineManagerId: id }, data: { lineManagerId: null } }));
      deleted += count(await tx.roleMember.deleteMany({ where: { userId: id } }));
      const roles = await tx.role.findMany({ where: { members: { some: { userid: id } } }, select: { id: true } });
      for (const r of roles) await tx.role.update({ where: { id: r.id }, data: { members: { disconnect: { userid: id } } } });
      const allies = await tx.ally.findMany({ where: { reps: { some: { userid: id } } }, select: { id: true } });
      for (const a of allies) await tx.ally.update({ where: { id: a.id }, data: { reps: { disconnect: { userid: id } } } });
      deleted += count(await tx.workspaceMember.deleteMany({ where: { userId: id } }));
      deleted += count(await tx.departmentMember.deleteMany({ where: { userId: id } }));
      deleted += count(await tx.rank.deleteMany({ where: { userId: id } }));
      deleted += count(await tx.notification.deleteMany({ where: { userId: id } }));

      deleted += count(await tx.activitySession.deleteMany({ where: { userId: id } }));
      deleted += count(await tx.activityHistory.deleteMany({ where: { userId: id } }));
      deleted += count(await tx.activityAdjustment.deleteMany({ where: { userId: id } }));
      reassigned += count(await tx.activityAdjustment.updateMany({ where: { actorId: id }, data: { actorId: ZERO } }));
      reassigned += count(await tx.activityReset.updateMany({ where: { resetById: id }, data: { resetById: null } }));
      deleted += count(await tx.userQuotaCompletion.deleteMany({ where: { userId: id } }));
      reassigned += count(await tx.userQuotaCompletion.updateMany({ where: { completedBy: id }, data: { completedBy: null } }));

      deleted += count(await tx.inactivityNotice.deleteMany({ where: { userId: id } }));
      reassigned += count(await tx.inactivityNotice.updateMany({ where: { reviewedByUserId: id }, data: { reviewedByUserId: null } }));
      reassigned += count(await tx.inactivityNotice.updateMany({ where: { revokedByUserId: id }, data: { revokedByUserId: null } }));
      deleted += count(await tx.policyAcknowledgment.deleteMany({ where: { userId: id } }));

      deleted += count(await tx.userBook.deleteMany({ where: { userId: id } }));
      reassigned += count(await tx.userBook.updateMany({ where: { adminId: id }, data: { adminId: ZERO } }));
      reassigned += count(await tx.userBook.updateMany({ where: { redactedBy: id }, data: { redactedBy: null } }));

      const posts = await tx.wallPost.findMany({ where: { authorId: id }, select: { id: true } });
      if (posts.length) deleted += count(await tx.wallPostReaction.deleteMany({ where: { wallPostId: { in: posts.map((p) => p.id) } } }));
      deleted += count(await tx.wallPostReaction.deleteMany({ where: { userId: id } }));
      deleted += count(await tx.wallPost.deleteMany({ where: { authorId: id } }));

      deleted += count(await tx.sessionUser.deleteMany({ where: { userid: id } }));
      reassigned += count(await tx.session.updateMany({ where: { ownerId: id }, data: { ownerId: null } }));
      reassigned += count(await tx.sessionNote.updateMany({ where: { authorId: id }, data: { authorId: ZERO } }));
      reassigned += count(await tx.sessionLog.updateMany({ where: { actorId: id }, data: { actorId: ZERO } }));
      reassigned += count(await tx.sessionLog.updateMany({ where: { targetId: id }, data: { targetId: null } }));

      const recsAbout = await tx.recommendation.findMany({ where: { targetUserId: id }, select: { id: true } });
      const recIds = recsAbout.map((r) => r.id);
      if (recIds.length) {
        deleted += count(await tx.recommendationVote.deleteMany({ where: { recommendationId: { in: recIds } } }));
        deleted += count(await tx.recommendationComment.deleteMany({ where: { recommendationId: { in: recIds } } }));
        deleted += count(await tx.recommendation.deleteMany({ where: { id: { in: recIds } } }));
      }
      deleted += count(await tx.recommendationVote.deleteMany({ where: { userId: id } }));
      deleted += count(await tx.recommendationComment.deleteMany({ where: { authorId: id } }));
      reassigned += count(await tx.recommendation.updateMany({ where: { createdById: id }, data: { createdById: ZERO, createdByName: "Deleted user" } }));
      reassigned += count(await tx.recommendation.updateMany({ where: { editedById: id }, data: { editedById: null, editedByName: null } }));
      reassigned += count(await tx.recommendation.updateMany({ where: { statusChangedById: id }, data: { statusChangedById: null, statusChangedByName: null } }));

      deleted += count(await tx.applicationSubmission.deleteMany({ where: { userId: id } }));
      reassigned += count(await tx.applicationSubmission.updateMany({ where: { reviewedById: id }, data: { reviewedById: null } }));
      reassigned += count(await tx.applicationForm.updateMany({ where: { createdById: id }, data: { createdById: ZERO } }));

      reassigned += count(await tx.auditLog.updateMany({ where: { userId: id }, data: { userId: null } }));

      /* ----- Workspace content they made: keep, credited to "Deleted user" ----- */
      reassigned += count(await tx.document.updateMany({ where: { ownerId: id }, data: { ownerId: ZERO } }));
      reassigned += count(await tx.documentContainer.updateMany({ where: { ownerId: id }, data: { ownerId: ZERO } }));
      reassigned += count(await tx.apiKey.updateMany({ where: { createdById: id }, data: { createdById: ZERO } }));
      reassigned += count(await tx.allyVisit.updateMany({ where: { hostId: id }, data: { hostId: ZERO } }));
      reassigned += count(await tx.savedView.updateMany({ where: { createdBy: id }, data: { createdBy: null } }));
      reassigned += count(await tx.policyShareableLink.updateMany({ where: { createdById: id }, data: { createdById: ZERO } }));

      /* ----- Moderation ----- */
      reassigned += count(await tx.moderationCase.updateMany({ where: { createdBy: id }, data: { createdBy: ZERO } }));
      reassigned += count(await tx.moderationCase.updateMany({ where: { resolvedBy: id }, data: { resolvedBy: null } }));
      reassigned += count(await tx.moderationCase.updateMany({ where: { reportedBy: id }, data: { reportedBy: null } }));
      reassigned += count(await tx.moderationCase.updateMany({ where: { revokedBy: id }, data: { revokedBy: null } }));
      reassigned += count(await tx.moderationEvidence.updateMany({ where: { uploadedBy: id }, data: { uploadedBy: ZERO } }));
      reassigned += count(await tx.moderationLog.updateMany({ where: { actionBy: id }, data: { actionBy: ZERO } }));
      reassigned += count(await tx.playerBan.updateMany({ where: { bannedById: id }, data: { bannedById: ZERO } }));
      reassigned += count(await tx.playerBan.updateMany({ where: { unbannedById: id }, data: { unbannedById: null } }));
      reassigned += count(await tx.playerReport.updateMany({ where: { reporterUserId: id }, data: { reporterUserId: ZERO } }));
      reassigned += count(await tx.playerReport.updateMany({ where: { reviewedById: id }, data: { reviewedById: null } }));
      reassigned += count(await tx.remoteCommand.updateMany({ where: { issuedById: id }, data: { issuedById: ZERO } }));
      reassigned += count(await tx.adminMessageLog.updateMany({ where: { sentById: id }, data: { sentById: ZERO } }));

      if (!options.keepSafetyRecords) {
        if (casesAbout.length) {
          const caseIds = casesAbout.map((c) => c.id);
          deleted += count(await tx.moderationLog.deleteMany({ where: { caseId: { in: caseIds } } }));
          deleted += count(await tx.moderationEvidence.deleteMany({ where: { caseId: { in: caseIds } } }));
          deleted += count(await tx.moderationCase.deleteMany({ where: { id: { in: caseIds } } }));
        }
        deleted += count(await tx.moderationLog.deleteMany({ where: { targetUser: id } }));
        deleted += count(await tx.playerBan.deleteMany({ where: { userId: id } }));
        reassigned += count(await tx.playerReport.updateMany({ where: { reportedUserId: id }, data: { reportedUserId: null } }));
        reassigned += count(await tx.remoteCommand.updateMany({ where: { targetUserId: id }, data: { targetUserId: null } }));
        reassigned += count(await tx.adminMessageLog.updateMany({ where: { targetUserId: id }, data: { targetUserId: null } }));
      }
    },
    { timeout: 120_000, maxWait: 10_000 }
  );

  // Evidence files for deleted cases (outside the transaction: storage isn't part of the database)
  let caseFilesDeleted = 0;
  for (const c of casesAbout) {
    if (await deleteCaseEvidence(c.id)) caseFilesDeleted++;
  }

  // The account itself: remove it, or keep only the Roblox ID if safety records were kept
  let userRowDeleted = false;
  const scrub = {
    username: "Deleted user",
    displayName: null,
    picture: null,
    birthdayDay: null,
    birthdayMonth: null,
    registered: false,
    isOwner: false,
    banned: false,
    bannedAt: null,
    bannedBy: null,
    banReason: null,
  };
  if (options.keepSafetyRecords) {
    await prisma.user.update({ where: { userid: id }, data: scrub });
  } else {
    try {
      await prisma.user.delete({ where: { userid: id } });
      userRowDeleted = true;
    } catch {
      // Something still points at this ID: keep only the bare ID, with nothing else about them
      await prisma.user.update({ where: { userid: id }, data: scrub });
    }
  }

  // Staff Passport
  await (await import("@/utils/passport")).deletePassport(userId).catch(() => {});

  // Discord account link used by the Crewbase bot
  {
    const { getDiscordForUser, setLink } = await import("@/utils/discordSync");
    const discordId = await getDiscordForUser(userId);
    if (discordId) await setLink(discordId, null);
  }

  // Team tabs: chat messages, kudos, feedback and records about them are removed; other content is anonymised
  deleted += await scrubUserFromTeam(userId);

  // Crewbase site records
  const sid = userId;
  const lists = await getSiteRoleLists();
  if (lists.admins.includes(sid) || lists.staff.includes(sid)) await setSiteRole(sid, "none");
  if ((await getStaffNotes(sid)).length) await saveStaffNotes(sid, []);
  const reports = await getReports();
  let reportsChanged = false;
  for (const r of reports) {
    if (r.reporterId === sid) {
      if (r.category === "deletion" && r.status === "open") {
        r.status = "resolved";
        r.handledAt = new Date().toISOString();
        r.resolution = "Account and personal data deleted.";
      }
      r.reporterId = "0";
      r.details = r.category === "deletion" ? "Account deletion request (completed)." : "[Removed: the person who sent this report deleted their account]";
      reportsChanged = true;
    }
  }
  if (reportsChanged) await saveReports(reports);
  const planRequests = await getPlanRequests();
  if (planRequests.some((r) => r.requestedBy === sid)) {
    await savePlanRequests(planRequests.map((r) => (r.requestedBy === sid ? { ...r, requestedBy: "0" } : r)));
  }

  return { deletedRecords: deleted, reassignedRecords: reassigned, userRowDeleted, caseFilesDeleted };
}
