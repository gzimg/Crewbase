import type { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/withSession";
import { requireSiteRole, logSiteAction } from "@/utils/siteRoles";
import { getStaffNotes, saveStaffNotes, newId } from "@/utils/siteSettings";

/**
 * Private notes about a user, visible only to site staff and admins.
 * POST { text } adds a note. DELETE ?noteId removes one (its author or an admin).
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST" && req.method !== "DELETE") return res.status(405).json({ success: false, error: "Method not allowed" });
  const caller = await requireSiteRole(req, res, "staff");
  if (!caller) return;

  const userId = String(req.query.userid ?? "");
  if (!/^\d{1,15}$/.test(userId)) return res.status(400).json({ success: false, error: "Invalid user ID" });
  const notes = await getStaffNotes(userId);

  if (req.method === "POST") {
    const text = typeof req.body?.text === "string" ? req.body.text.trim().slice(0, 1000) : "";
    if (!text) return res.status(400).json({ success: false, error: "Write a note first" });
    if (notes.length >= 200) return res.status(400).json({ success: false, error: "This user has too many notes" });
    await saveStaffNotes(userId, [{ id: newId(), by: caller.userId, at: new Date().toISOString(), text }, ...notes]);
    await logSiteAction({ actorId: caller.userId, action: "add_staff_note", targetId: userId });
    return res.status(200).json({ success: true });
  }

  const noteId = String(req.query.noteId ?? "");
  const note = notes.find((n) => n.id === noteId);
  if (!note) return res.status(404).json({ success: false, error: "Note not found" });
  if (note.by !== caller.userId && caller.role !== "admin") {
    return res.status(403).json({ success: false, error: "Only the note's author or an admin can delete it" });
  }
  await saveStaffNotes(userId, notes.filter((n) => n.id !== noteId));
  await logSiteAction({ actorId: caller.userId, action: "delete_staff_note", targetId: userId });
  return res.status(200).json({ success: true });
}

export default withSessionRoute(handler);
