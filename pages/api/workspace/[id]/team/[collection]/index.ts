import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { COLLECTIONS, Collection, listItems, createItem, getMemberContext } from "@/utils/teamStore";
import { RULES, finalize } from "@/utils/teamRules";

const lastPost = new Map<string, number>();

/** GET: the items in a Team collection this member may see. POST: create one. */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  const collection = String(req.query.collection) as Collection;
  if (!COLLECTIONS.includes(collection)) return res.status(404).json({ success: false, error: "Not found" });
  const groupId = parseInt(String(req.query.id));
  const ctx = await getMemberContext(req.session.userid!, groupId);
  const rule = RULES[collection];

  if (req.method === "GET") {
    const since = typeof req.query.since === "string" && !isNaN(Date.parse(req.query.since)) ? new Date(req.query.since) : undefined;
    const take = req.query.take ? Math.max(1, Math.min(500, Number(req.query.take) || 100)) : undefined;
    const items = await listItems(groupId, collection, { since, take });
    const visible = items.map((i) => rule.view(i, ctx)).filter(Boolean).map((i) => finalize(collection, i!));
    return res.status(200).json({ success: true, items: visible, me: { id: ctx.id, isManager: ctx.isManager } });
  }

  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });
  if (!rule.canCreate(ctx)) return res.status(403).json({ success: false, error: "You don’t have permission to do this" });

  // Light flood protection
  const key = `${groupId}:${ctx.id}:${collection}`;
  const last = lastPost.get(key) || 0;
  if (Date.now() - last < (collection === "chat" ? 800 : 2000)) return res.status(429).json({ success: false, error: "Slow down a little" });
  lastPost.set(key, Date.now());
  if (lastPost.size > 10000) lastPost.clear();

  const result = rule.validate(req.body || {}, ctx);
  if ("error" in result) return res.status(400).json({ success: false, error: result.error });
  const author = collection === "feedback" && result.data.anonymous ? null : { id: ctx.id, name: ctx.name };
  const item = await createItem(groupId, collection, result.data, author);
  return res.status(200).json({ success: true, item: finalize(collection, item) });
}

export default withPermissionCheck(handler);
