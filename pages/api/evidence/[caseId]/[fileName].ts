import { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/withSession";
import prisma from "@/utils/database";
import { getEvidenceFilePath, getEvidenceSignedUrl, useBlobStorage } from "@/utils/evidenceManager";
import fs from "fs";
import { fileTypeFromBuffer } from "file-type";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!req.session.userid) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { caseId, fileName } = req.query;

  try {
    const fileUrl = `/api/evidence/${caseId}/${fileName}`;
    const evidence = await prisma.moderationEvidence.findFirst({
      where: {
        caseId: caseId as string,
        fileUrl: fileUrl,
      },
      include: {
        case: {
          select: {
            workspaceGroupId: true,
          },
        },
      },
    });

    if (!evidence) {
      return res.status(404).json({ error: "Evidence not found" });
    }

    const workspaceMember = await prisma.workspaceMember.findFirst({
      where: {
        workspaceGroupId: evidence.case.workspaceGroupId,
        userId: req.session.userid,
      },
      include: {
        user: {
          include: {
            roles: {
              where: {
                workspaceGroupId: evidence.case.workspaceGroupId,
              },
              include: {
                roleMembers: true,
              },
            },
          },
        },
      },
    });

    if (!workspaceMember) {
      return res.status(403).json({ error: "Access denied" });
    }

    const isAdmin = workspaceMember.isAdmin || false;
    const userRoles = workspaceMember.user.roles || [];
    const hasPermission = userRoles.some((role: any) =>
      role.permissions?.includes("view_moderation")
    );

    if (!isAdmin && !hasPermission) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    if (useBlobStorage()) {
      // Send the viewer to a short-lived private link instead of streaming the
      // file through the function (Vercel caps function responses at 4.5 MB).
      const signedUrl = await getEvidenceSignedUrl(caseId as string, fileName as string);
      if (!signedUrl) {
        return res.status(404).json({ error: "File not found in storage" });
      }
      res.setHeader("Cache-Control", "private, no-store");
      return res.redirect(302, signedUrl);
    }

    const filePath = getEvidenceFilePath(caseId as string, fileName as string);
    if (!filePath) {
      return res.status(404).json({ error: "File not found on disk" });
    }
    const fileBuffer = fs.readFileSync(filePath);
    const fileType = await fileTypeFromBuffer(fileBuffer);
    const mimeType = fileType?.mime || evidence.fileType || "application/octet-stream";

    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Length", fileBuffer.length);
    res.setHeader("Content-Disposition", `inline; filename="${fileName}"`);
    res.setHeader("Cache-Control", "private, max-age=3600");

    return res.send(fileBuffer);
  } catch (error) {
    console.error("Error serving evidence file:", error);
    return res.status(500).json({ error: "Failed to serve file" });
  }
}

export default withSessionRoute(handler);
export const config = {
  api: {
    responseLimit: "10mb",
  },
};
