import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { getMemberContext } from "@/utils/teamStore";
import { getTeamSettings, saveTeamSettings, isDiscordWebhook, encryptWebhook, HIDEABLE_TABS } from "@/utils/teamNotify";

/** Team settings: notifications and the Discord webhook. Managers only. */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  const groupId = parseInt(String(req.query.id));
  const ctx = await getMemberContext(req.session.userid!, groupId);
  if (!ctx.isManager) return res.status(403).json({ success: false, error: "Only workspace managers can change Team settings" });
  const current = await getTeamSettings(groupId);

  if (req.method === "GET") {
    return res.status(200).json({ success: true, settings: { ...current, discordWebhook: undefined, hasWebhook: !!current.discordWebhook } });
  }
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });

  const b = req.body || {};
  const next = { ...current };
  for (const k of ["postAnnouncements", "postEvents", "postKudos", "notifyAnnouncements", "notifyEvents", "notifyPolls"] as const) {
    if (typeof b[k] === "boolean") next[k] = b[k];
  }
  if (b.shifts && typeof b.shifts === "object") {
    const s = b.shifts;
    next.shifts = {
      ...current.shifts,
      ...(typeof s.enabled === "boolean" ? { enabled: s.enabled } : {}),
      ...(s.via === "bot" || s.via === "webhook" ? { via: s.via } : {}),
      ...(Number.isFinite(Number(s.leadMinutes)) ? { leadMinutes: Math.min(1440, Math.max(5, Math.round(Number(s.leadMinutes)))) } : {}),
    };
  }
  if (Array.isArray(b.hiddenTabs)) next.hiddenTabs = b.hiddenTabs.filter((t: unknown) => typeof t === "string" && HIDEABLE_TABS.includes(t));
  if (b.discordWebhook === null || b.discordWebhook === "") next.discordWebhook = null;
  else if (typeof b.discordWebhook === "string") {
    const url = b.discordWebhook.trim();
    if (!isDiscordWebhook(url)) return res.status(400).json({ success: false, error: "That isn’t a Discord webhook link. In Discord: channel settings → Integrations → Webhooks → Copy Webhook URL." });
    next.discordWebhook = encryptWebhook(url);
  }
  await saveTeamSettings(groupId, next);
  return res.status(200).json({ success: true, settings: { ...next, discordWebhook: undefined, hasWebhook: !!next.discordWebhook } });
}

export default withPermissionCheck(handler);
