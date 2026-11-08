import type { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/withSession";
import { requireSiteRole } from "@/utils/siteRoles";
import { getSavedReplies, saveSavedReplies, newId } from "@/utils/siteSettings";

/** Reusable replies for resolving reports. Site staff can list, add and remove them. */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!["GET", "POST", "DELETE"].includes(req.method || "")) return res.status(405).json({ success: false, error: "Method not allowed" });
  const caller = await requireSiteRole(req, res, "staff");
  if (!caller) return;
  const replies = await getSavedReplies();

  if (req.method === "GET") return res.status(200).json({ success: true, replies });

  if (req.method === "POST") {
    const title = typeof req.body?.title === "string" ? req.body.title.trim().slice(0, 60) : "";
    const text = typeof req.body?.text === "string" ? req.body.text.trim().slice(0, 1000) : "";
    if (!title || !text) return res.status(400).json({ success: false, error: "Add a title and the reply text" });
    await saveSavedReplies([...replies, { id: newId(), title, text, by: caller.userId }]);
    return res.status(200).json({ success: true });
  }

  const id = String(req.query.id ?? "");
  const reply = replies.find((r) => r.id === id);
  if (!reply) return res.status(404).json({ success: false, error: "Reply not found" });
  if (reply.by !== caller.userId && caller.role !== "admin") return res.status(403).json({ success: false, error: "Only its author or an admin can delete it" });
  await saveSavedReplies(replies.filter((r) => r.id !== id));
  return res.status(200).json({ success: true });
}

export default withSessionRoute(handler);
