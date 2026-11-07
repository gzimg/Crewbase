import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withSessionRoute } from "@/lib/withSession";

type Data = {
  success: boolean;
  error?: string;
  announcement?: any;
  canEdit?: boolean;
};

async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const workspaceId = parseInt(req.query.id as string);
  const userId = req.session.userid;

  if (!userId || !workspaceId) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  try {
    const currentUser = await prisma.user.findFirst({
      where: {
        userid: BigInt(userId),
      },
      include: {
        roles: {
          where: {
            workspaceGroupId: workspaceId,
          },
        },
        workspaceMemberships: {
          where: {
            workspaceGroupId: workspaceId,
          },
        },
      },
    });

    if (!currentUser) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const membership = currentUser.workspaceMemberships[0];
    const isAdmin = membership?.isAdmin || false;
    const userRole = currentUser.roles[0];
    const canEdit =
      isAdmin ||
      (userRole?.permissions?.includes("edit_sticky_post") ?? false);

    const announcement = await prisma.stickyAnnouncement.findUnique({
      where: {
        workspaceGroupId: workspaceId,
      },
    });

    const defaultAnnouncement = {
      title: "Crewbase",
      subtitle: "Welcome to your Crewbase workspace!",
      sections: [
        {
          title: "👋 Getting started",
          content:
            "We're excited to have you here! Your workspace is ready to use and fully customisable to fit your team's needs.",
        },
        {
          title: "❓ Need help?",
          content:
            "Click the Help icon in your sidebar for documentation, helpful links, guides, and more resources to get the most out of Crewbase.",
        },
        {
          title: "✏️ Customise this message",
          content:
            "This announcement can be edited by workspace administrators. Click the pencil icon above to personalise this welcome message for your team!",
        },
      ],
      editorUsername: null,
      editorPicture: null,
      isDefault: true,
    };

    return res.status(200).json({
      success: true,
      announcement: announcement
        ? {
            ...announcement,
            editorId: announcement.editorId ? announcement.editorId.toString() : null,
            sections:
              typeof announcement.sections === "string"
                ? JSON.parse(announcement.sections)
                : announcement.sections,
            isDefault: false,
          }
        : defaultAnnouncement,
      canEdit,
    });
  } catch (error) {
    console.error("Error fetching announcement:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch announcement",
    });
  }
}

export default withSessionRoute(handler);
