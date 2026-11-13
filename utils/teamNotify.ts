import prisma from "@/utils/database";
import { encryptSecret, decryptSecret } from "@/utils/secrets";
import type { Collection, TeamItem } from "@/utils/teamStore";

/**
 * Notifications and Discord posts for the Team tabs.
 * Notifications appear in each member's bell. Discord posts go to a webhook a
 * workspace manager sets in Team settings (stored encrypted).
 */

const SETTINGS_KEY = "team:settings";
// Team tabs that can be hidden (Announcements and Settings always stay)
export const HIDEABLE_TABS = ["chat", "events", "swaps", "tasks", "polls", "trainings", "onboarding", "reviews", "ideas", "kudos", "spotlight", "links"];

export type TeamSettings = {
  discordWebhook: string | null; // encrypted
  postAnnouncements: boolean;
  postEvents: boolean;
  postKudos: boolean;
  notifyAnnouncements: boolean;
  notifyEvents: boolean;
  notifyPolls: boolean;
  hiddenTabs: string[];
  // Upcoming shift (session) announcements
  shifts: {
    enabled: boolean;
    via: "bot" | "webhook";
    guildId: string | null;
    channelId: string | null;
    pingRoleId: string | null;
    leadMinutes: number;
  };
};

const DEFAULTS: TeamSettings = {
  discordWebhook: null,
  postAnnouncements: true,
  postEvents: true,
  postKudos: false,
  notifyAnnouncements: true,
  notifyEvents: true,
  notifyPolls: true,
  hiddenTabs: [],
  shifts: { enabled: false, via: "bot", guildId: null, channelId: null, pingRoleId: null, leadMinutes: 30 },
};

export async function getTeamSettings(groupId: number | bigint): Promise<TeamSettings> {
  const row = await prisma.config.findFirst({ where: { workspaceGroupId: BigInt(groupId), key: SETTINGS_KEY }, select: { value: true } });
  const stored = (row?.value as any) || {};
  return { ...DEFAULTS, ...stored, shifts: { ...DEFAULTS.shifts, ...(stored.shifts || {}) } };
}

/** Posts a message to a Discord channel as the Crewbase bot. */
export async function postAsBot(channelId: string, payload: Record<string, unknown>): Promise<boolean> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return false;
  try {
    const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Posts a message to the workspace’s saved Discord webhook. */
export async function postToWebhook(groupId: number | bigint, payload: Record<string, unknown>): Promise<boolean> {
  const settings = await getTeamSettings(groupId);
  const url = decryptSecret(settings.discordWebhook);
  if (!url || !isDiscordWebhook(url)) return false;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "Crewbase", ...payload }),
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function saveTeamSettings(groupId: number | bigint, next: TeamSettings): Promise<void> {
  const row = await prisma.config.findFirst({ where: { workspaceGroupId: BigInt(groupId), key: SETTINGS_KEY }, select: { id: true } });
  if (row) await prisma.config.update({ where: { id: row.id }, data: { value: next as any } });
  else await prisma.config.create({ data: { workspaceGroupId: BigInt(groupId), key: SETTINGS_KEY, value: next as any } });
}

/** Only real Discord webhook addresses are accepted, so the server can't be pointed at other sites. */
export function isDiscordWebhook(url: string): boolean {
  return /^https:\/\/(?:ptb\.|canary\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w-]+$/.test(url);
}
export const encryptWebhook = (url: string) => encryptSecret(url);

export async function notifyUsers(groupId: number | bigint, userIds: string[], title: string, body: string, href: string) {
  const unique = Array.from(new Set(userIds.filter((id) => /^\d{1,15}$/.test(id))));
  if (!unique.length) return;
  await prisma.notification.createMany({
    data: unique.slice(0, 3000).map((id) => ({
      userId: BigInt(id),
      workspaceGroupId: BigInt(groupId),
      type: "custom",
      title: title.slice(0, 120),
      body: body.slice(0, 300),
      href,
    })),
  });
}

export async function notifyAllMembers(groupId: number | bigint, exceptUserId: string | null, title: string, body: string, href: string) {
  const members = await prisma.workspaceMember.findMany({ where: { workspaceGroupId: BigInt(groupId) }, select: { userId: true }, take: 3000 });
  await notifyUsers(groupId, members.map((m) => m.userId.toString()).filter((id) => id !== exceptUserId), title, body, href);
}

/** Notifies everyone who handles HR: workspace admins and roles with an HR permission. */
export async function notifyHR(groupId: number | bigint, exceptUserId: string | null, title: string, body: string, href: string) {
  const gid = BigInt(groupId);
  const [admins, roles] = await Promise.all([
    prisma.workspaceMember.findMany({ where: { workspaceGroupId: gid, isAdmin: true }, select: { userId: true } }),
    prisma.role.findMany({
      where: { workspaceGroupId: gid, permissions: { hasSome: ["admin", "hr.view", "hr.cases", "hr.resignations", "hr.infractions", "hr.plans"] } },
      select: { members: { select: { userid: true } } },
    }),
  ]);
  const ids = [...admins.map((a) => a.userId.toString()), ...roles.flatMap((r) => r.members.map((m) => m.userid.toString()))];
  await notifyUsers(groupId, ids.filter((id) => id !== exceptUserId), title, body, href);
}

async function postToDiscord(groupId: number | bigint, embed: { title: string; description?: string; color?: number; fields?: { name: string; value: string; inline?: boolean }[]; url?: string }) {
  const settings = await getTeamSettings(groupId);
  const url = decryptSecret(settings.discordWebhook);
  if (!url || !isDiscordWebhook(url)) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "Crewbase", allowed_mentions: { parse: [] }, embeds: [{ ...embed, timestamp: new Date().toISOString(), footer: { text: "Crewbase" } }] }),
      signal: AbortSignal.timeout(5000),
    });
  } catch (error) {
    console.error("[team] Discord post failed");
  }
}

const hexToInt = (hex?: string) => (hex && /^#[0-9a-fA-F]{6}$/.test(hex) ? parseInt(hex.slice(1), 16) : 0xf28c28);
const appUrl = (path: string) => `${(process.env.NEXTAUTH_URL || "").replace(/\/+$/, "")}${path}`;

/** Runs after a Team item is created. Never throws: notifications must not block saving. */
export async function onTeamItemCreated(groupId: number, collection: Collection, item: TeamItem, authorId: string, authorName: string | null) {
  try {
    const settings = await getTeamSettings(groupId);
    const base = `/workspace/${groupId}/team`;
    const tasks: Promise<any>[] = [];

    if (collection === "announcements") {
      if (settings.notifyAnnouncements) tasks.push(notifyAllMembers(groupId, authorId, `📣 ${item.title}`, item.body || "New announcement", `${base}/announcements`));
      if (settings.postAnnouncements) tasks.push(postToDiscord(groupId, { title: `📣 ${item.title}`, description: (item.body || "").slice(0, 3500), url: appUrl(`${base}/announcements`) }));
    }
    if (collection === "events") {
      const when = new Date(item.start).toUTCString().replace(" GMT", " UTC");
      if (settings.notifyEvents) tasks.push(notifyAllMembers(groupId, authorId, `📅 New event: ${item.title}`, `${when}${item.location ? ` · ${item.location}` : ""}`, `${base}/events`));
      if (settings.postEvents)
        tasks.push(
          postToDiscord(groupId, {
            title: `📅 ${item.title}`,
            description: (item.description || "").slice(0, 3000),
            color: hexToInt(item.color),
            url: appUrl(`${base}/events`),
            fields: [
              { name: "When", value: `<t:${Math.floor(new Date(item.start).getTime() / 1000)}:F>`, inline: true },
              ...(item.location ? [{ name: "Where", value: String(item.location).slice(0, 200), inline: true }] : []),
            ],
          })
        );
    }
    if (collection === "polls" && settings.notifyPolls) {
      tasks.push(notifyAllMembers(groupId, authorId, "🗳️ New poll", item.question, `${base}/polls`));
    }
    if (collection === "kudos") {
      tasks.push(notifyUsers(groupId, [item.toUserId], `${item.emoji} Kudos from ${authorName || "a teammate"}`, item.message, `${base}/kudos`));
      if (settings.postKudos) tasks.push(postToDiscord(groupId, { title: `${item.emoji} Kudos for ${item.toUsername}`, description: `${item.message}\n\n— ${authorName || "a teammate"}` }));
    }
    if (collection === "awards") {
      tasks.push(notifyUsers(groupId, [item.userId], "🎓 You’ve been certified", item.note || "A new certification was added to your profile.", `${base}/trainings`));
    }
    if (collection === "reviews" && item.shared) {
      tasks.push(notifyUsers(groupId, [item.userId], "📝 You have a new review", `Your ${item.period} review is ready to read.`, `${base}/reviews`));
    }
    if (collection === "tasks" && item.assigneeId && item.assigneeId !== authorId) {
      tasks.push(notifyUsers(groupId, [item.assigneeId], `✅ New task: ${item.title}`, `${authorName || "Someone"} assigned you a task${item.due ? `, due ${new Date(item.due).toDateString()}` : ""}.`, `${base}/tasks`));
    }
    if (collection === "onboarding") {
      tasks.push(notifyUsers(groupId, [item.userId], `👋 Your ${item.name} checklist`, `You have ${item.steps.length} step${item.steps.length === 1 ? "" : "s"} to complete.`, `${base}/onboarding`));
    }
    if (collection === "nominations") {
      tasks.push(notifyUsers(groupId, [item.nomineeId], "🌟 You’ve been nominated!", `Someone nominated you for Staff of the Month: “${item.reason}”`, `${base}/spotlight`));
    }
    // Human resources
    const hr = `/workspace/${groupId}/hr`;
    if (collection === "infractions") {
      tasks.push(notifyUsers(groupId, [item.userId], "⚠️ You’ve received an infraction", `${item.reason}. You can read it and appeal from HR.`, `${hr}/infractions`));
    }
    if (collection === "pips") {
      tasks.push(notifyUsers(groupId, [item.userId], "📈 You’ve been placed on an improvement plan", "Read your goals and the support available in HR.", `${hr}/plans`));
    }
    if (collection === "complaints" || collection === "appeals" || collection === "resignations") {
      const what = collection === "complaints" ? "complaint" : collection === "appeals" ? "infraction appeal" : "resignation";
      tasks.push(notifyHR(groupId, authorId, `📥 New ${what}`, `A new ${what} needs reviewing.`, `${hr}/${collection === "complaints" ? "complaints" : collection}`));
    }
    if (collection === "chat") {
      // @mentions notify the people mentioned
      const names = Array.from(new Set((String(item.text).match(/@([A-Za-z0-9_]{3,20})/g) || []).map((m) => m.slice(1).toLowerCase())));
      if (names.length) {
        const users = await prisma.user.findMany({
          where: {
            OR: names.slice(0, 10).map((n) => ({ username: { equals: n, mode: "insensitive" as const } })),
            workspaceMemberships: { some: { workspaceGroupId: BigInt(groupId) } },
          },
          select: { userid: true },
        });
        tasks.push(notifyUsers(groupId, users.map((u) => u.userid.toString()).filter((id) => id !== authorId), `💬 ${authorName || "Someone"} mentioned you`, String(item.text), `${base}/chat`));
      }
    }
    await Promise.allSettled(tasks);
  } catch (error) {
    console.error("[team] Follow-up after create failed:", error);
  }
}

/** Runs after an item changes, for the few changes people should hear about. */
export async function onTeamItemChanged(groupId: number, collection: Collection, before: TeamItem, after: TeamItem) {
  try {
    const base = `/workspace/${groupId}/team`;
    if (collection === "reviews" && !before.shared && after.shared) {
      await notifyUsers(groupId, [after.userId], "📝 You have a new review", `Your ${after.period} review is ready to read.`, `${base}/reviews`);
    }
    if (collection === "tasks" && after.assigneeId && after.assigneeId !== before.assigneeId && after.assigneeId !== after.createdBy) {
      await notifyUsers(groupId, [after.assigneeId], `✅ Task assigned: ${after.title}`, "You’ve been assigned a task.", `${base}/tasks`);
    }
    if (collection === "tasks" && after.status === "done" && before.status !== "done" && after.createdBy && after.createdBy !== after.assigneeId) {
      await notifyUsers(groupId, [after.createdBy], `🎉 Task done: ${after.title}`, `${after.assigneeName || "Someone"} finished it.`, `${base}/tasks`);
    }
    if (collection === "ideas" && after.status !== before.status && after.createdBy) {
      await notifyUsers(groupId, [after.createdBy], `💡 Your idea is now ${after.status}`, after.response || after.title, `${base}/ideas`);
    }
    if (collection === "nominations" && after.winner && !before.winner) {
      await notifyAllMembers(groupId, null, `🏆 Staff of the Month: ${after.nomineeName}`, after.reason, `${base}/spotlight`);
    }
    const hr = `/workspace/${groupId}/hr`;
    if (collection === "infractions" && after.status === "revoked" && before.status !== "revoked") {
      await notifyUsers(groupId, [after.userId], "✅ An infraction was removed", after.revokedReason || "One of your infractions was revoked.", `${hr}/infractions`);
    }
    if (collection === "complaints" && after.status !== before.status && after.createdBy) {
      await notifyUsers(groupId, [after.createdBy], `📋 Your complaint is now ${after.status}`, after.outcome || after.subject, `${hr}/complaints`);
    }
    if (collection === "appeals" && after.status === "decided" && before.status !== "decided") {
      if (after.createdBy) await notifyUsers(groupId, [after.createdBy], `⚖️ Your appeal was ${after.decision}`, after.response || "HR has reviewed your appeal.", `${hr}/appeals`);
      // Overturned appeals remove the infraction; reduced appeals halve its points
      const { getItem, saveItem } = await import("@/utils/teamStore");
      const inf = await getItem(groupId, "infractions", String(after.infractionId));
      if (inf && after.decision === "overturned") {
        await saveItem(inf.rowId, { ...inf.item, status: "revoked", revokedReason: "Overturned on appeal", revokedBy: after.decidedBy, revokedAt: new Date().toISOString() });
      } else if (inf && after.decision === "reduced") {
        await saveItem(inf.rowId, { ...inf.item, points: Math.floor((inf.item.points || 0) / 2), reducedOnAppeal: true });
      }
    }
    if (collection === "pips" && (after.checkins || []).length > (before.checkins || []).length) {
      await notifyUsers(groupId, [after.userId], "📈 New check-in on your improvement plan", after.checkins[after.checkins.length - 1].text, `${hr}/plans`);
    }
    if (collection === "pips" && after.status !== before.status && after.status !== "active") {
      await notifyUsers(groupId, [after.userId], `📈 Your improvement plan: ${after.status}`, "HR has updated your improvement plan.", `${hr}/plans`);
    }
    if (collection === "resignations" && after.status === "processed" && before.status !== "processed" && after.createdBy) {
      await notifyUsers(groupId, [after.createdBy], "👋 Your resignation has been processed", after.hrMessage || "Thank you for your time on the team.", `${hr}/resignations`);
    }
    if (collection === "feedback" && after.reply && after.reply !== before.reply && after.createdBy) {
      await notifyUsers(groupId, [after.createdBy], "💬 Leadership replied to your feedback", after.reply, `${base}/reviews`);
    }
  } catch (error) {
    console.error("[team] Follow-up after change failed:", error);
  }
}
