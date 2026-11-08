import type { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/withSession";
import { requireSiteRole, logSiteAction } from "@/utils/siteRoles";
import { getChangelog, saveChangelog, newId, ChangelogEntry } from "@/utils/siteSettings";

/**
 * GET (public): the "What's new" list.
 * POST { title, body, tag } (admins): publish an update.
 * DELETE ?id (admins): remove one.
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const entries = await getChangelog();
    res.setHeader("Cache-Control", "public, max-age=60");
    return res.status(200).json({ success: true, entries: entries.map(({ by, ...rest }) => rest) });
  }
  if (req.method !== "POST" && req.method !== "DELETE") return res.status(405).json({ success: false, error: "Method not allowed" });

  const caller = await requireSiteRole(req, res, "admin");
  if (!caller) return;
  const entries = await getChangelog();

  if (req.method === "POST") {
    const title = typeof req.body?.title === "string" ? req.body.title.trim().slice(0, 120) : "";
    const body = typeof req.body?.body === "string" ? req.body.body.trim().slice(0, 3000) : "";
    const tag: ChangelogEntry["tag"] = ["new", "improved", "fixed"].includes(req.body?.tag) ? req.body.tag : "new";
    if (!title) return res.status(400).json({ success: false, error: "Add a title" });
    const entry: ChangelogEntry = { id: newId(), title, body, tag, at: new Date().toISOString(), by: caller.userId };
    await saveChangelog([entry, ...entries]);
    await logSiteAction({ actorId: caller.userId, action: "publish_changelog", detail: title });
    return res.status(200).json({ success: true });
  }

  const id = String(req.query.id ?? "");
  if (!entries.some((e) => e.id === id)) return res.status(404).json({ success: false, error: "Update not found" });
  await saveChangelog(entries.filter((e) => e.id !== id));
  await logSiteAction({ actorId: caller.userId, action: "delete_changelog" });
  return res.status(200).json({ success: true });
}

export default withSessionRoute(handler);
