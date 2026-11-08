import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { COLLECTIONS, Collection, getItem, saveItem, deleteItem, getMemberContext } from "@/utils/teamStore";
import { RULES, finalize } from "@/utils/teamRules";

/**
 * PATCH: edit an item. DELETE: remove it.
 * POST { action, ... }: a quick action such as RSVP, vote, acknowledge or cheer.
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  const collection = String(req.query.collection) as Collection;
  if (!COLLECTIONS.includes(collection)) return res.status(404).json({ success: false, error: "Not found" });
  const groupId = parseInt(String(req.query.id));
  const found = await getItem(groupId, collection, String(req.query.itemId));
  if (!found) return res.status(404).json({ success: false, error: "Not found" });
  const ctx = await getMemberContext(req.session.userid!, groupId);
  const rule = RULES[collection];
  if (!rule.view(found.item, ctx)) return res.status(404).json({ success: false, error: "Not found" });

  if (req.method === "DELETE") {
    if (!rule.canDelete(found.item, ctx)) return res.status(403).json({ success: false, error: "You don’t have permission to do this" });
    await deleteItem(found.rowId);
    return res.status(200).json({ success: true });
  }

  if (req.method === "PATCH") {
    if (!rule.canEdit(found.item, ctx)) return res.status(403).json({ success: false, error: "You don’t have permission to do this" });
    const result = rule.validate({ ...found.item, ...(req.body || {}) }, ctx, found.item);
    if ("error" in result) return res.status(400).json({ success: false, error: result.error });
    const saved = await saveItem(found.rowId, { ...found.item, ...result.data });
    return res.status(200).json({ success: true, item: finalize(collection, rule.view(saved, ctx) || saved) });
  }

  if (req.method === "POST") {
    const action = rule.actions?.[String(req.body?.action)];
    if (!action) return res.status(400).json({ success: false, error: "Unknown action" });
    const next = action(found.item, req.body, ctx);
    if ("error" in next && typeof next.error === "string" && !("id" in next)) return res.status(400).json({ success: false, error: next.error });
    const saved = await saveItem(found.rowId, next as any);
    return res.status(200).json({ success: true, item: finalize(collection, rule.view(saved, ctx) || saved) });
  }

  return res.status(405).json({ success: false, error: "Method not allowed" });
}

export default withPermissionCheck(handler);
