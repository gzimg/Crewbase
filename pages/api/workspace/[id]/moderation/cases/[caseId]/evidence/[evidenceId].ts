import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { deleteEvidenceFile } from "@/utils/evidenceManager";
import { withSessionRoute } from "@/lib/withSession";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id: workspaceId, caseId, evidenceId } = req.query;
  const groupId = BigInt(workspaceId as string);
  if (!req.session.userid) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized",
    });
  }

  if (req.method === "DELETE") {
    try {
      const evidence = await prisma.moderationEvidence.findFirst({
        where: {
          id: evidenceId as string,
          caseId: caseId as string,
        },
        include: {
          case: {
            select: {
              workspaceGroupId: true,
              targetUserId: true,
              targetUsername: true,
              createdBy: true,
            },
          },
        },
      });

      if (!evidence) {
        return res.status(404).json({
          success: false,
          error: "Evidence not found",
        });
      }

      if (evidence.case.workspaceGroupId !== groupId) {
        return res.status(403).json({
          success: false,
          error: "Access denied",
        });
      }

      const userId = BigInt(req.session.userid!);
      const isUploader = evidence.uploadedBy === userId;
      const isCaseCreator = evidence.case.createdBy === userId;
      const user = await prisma.user.findFirst({
        where: {
          userid: userId,
        },
        include: {
          roles: {
            where: {
              workspaceGroupId: groupId,
            },
          },
          workspaceMemberships: {
            where: {
              workspaceGroupId: groupId,
            },
          },
        },
      });
      
      const membership = user?.workspaceMemberships[0];
      const userRole = user?.roles[0];
      const isAdmin = membership?.isAdmin || false;
      const hasEditPermission = userRole?.permissions?.includes("edit_moderation_cases") || isAdmin;

      if (!isUploader && !isCaseCreator && !hasEditPermission) {
        return res.status(403).json({
          success: false,
          error: "You do not have permission to delete this evidence",
        });
      }

      await prisma.moderationEvidence.delete({
        where: {
          id: evidenceId as string,
        },
      });

      if (evidence.fileType !== "external_link") {
        await deleteEvidenceFile(evidence.fileUrl);
      }

      await prisma.moderationLog.create({
        data: {
          workspaceGroupId: groupId,
          actionBy: userId,
          action: "evidence_deleted",
          targetUser: evidence.case.targetUserId,
          targetUsername: evidence.case.targetUsername,
          caseId: caseId as string,
          details: {
            evidenceId: evidence.id,
            fileName: evidence.fileName,
          },
        },
      });

      return res.status(200).json({
        success: true,
        message: "Evidence deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting evidence:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to delete evidence",
      });
    }
  }

  return res.status(405).json({
    success: false,
    error: "Method not allowed",
  });
}

export default withSessionRoute(handler);
