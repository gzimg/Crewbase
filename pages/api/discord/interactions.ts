import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import {
  verifyDiscordRequest, getWorkspaceForGuild, linkGuild, unlinkGuild, useLinkCode, memberForDiscordUser, minutesInGame,
} from "@/utils/discordBot";
import { listItems, createItem } from "@/utils/teamStore";

// Discord needs the exact raw body to check the signature
export const config = { api: { bodyParser: false } };

const ORANGE = 0xf28c28;
const site = () => (process.env.NEXTAUTH_URL || "https://crewbase.dev").replace(/\/+$/, "");
const EPHEMERAL = 64;

function readRaw(req: NextApiRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 100_000) reject(new Error("Too large"));
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

const reply = (res: NextApiResponse, data: any) => res.status(200).json({ type: 4, data: { allowed_mentions: { parse: [] }, ...data } });
const privateReply = (res: NextApiResponse, content: string) => reply(res, { content, flags: EPHEMERAL });
const embed = (e: any) => ({ color: ORANGE, footer: { text: "Crewbase" }, ...e });
const fmtMinutes = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h ${Math.round(m % 60)}m` : `${Math.round(m)}m`);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const raw = await readRaw(req).catch(() => "");
  const ok = verifyDiscordRequest(raw, req.headers["x-signature-ed25519"] as string, req.headers["x-signature-timestamp"] as string);
  if (!ok) return res.status(401).send("Invalid request signature");

  const body = JSON.parse(raw);
  if (body.type === 1) return res.status(200).json({ type: 1 }); // Discord's health check
  if (body.type !== 2) return res.status(400).end();

  const name: string = body.data?.name;
  const guildId: string | undefined = body.guild_id;
  const caller: string = body.member?.user?.id || body.user?.id;
  const option = (n: string) => body.data?.options?.find((o: any) => o.name === n)?.value;

  try {
    if (name === "help") {
      return reply(res, {
        flags: EPHEMERAL,
        embeds: [embed({
          title: "Crewbase bot",
          description:
            "**/activity** time in game over the last 7 days\n**/leaderboard** most active staff\n**/online** who’s in game now\n**/stats** the week at a glance\n**/sessions** upcoming sessions\n**/events** upcoming Team events\n**/tasks** your open tasks\n**/announcement** the latest announcement\n**/kudos** thank a teammate\n**/standing** your HR standing (private)\n**/profile** someone’s Crewbase profile\n**/workspace** which workspace this server uses\n\nServer managers: **/link** connects this server to a workspace, **/unlink** disconnects it.\n\nFor your own stats to show, add your Discord ID to your Crewbase workspace profile.",
          url: `${site()}/bot`,
        })],
      });
    }
    if (!guildId) return privateReply(res, "Use Crewbase commands inside a server.");

    if (name === "link") {
      const groupId = await useLinkCode(String(option("code") || ""));
      if (!groupId) return privateReply(res, "That code didn’t work. Codes last 15 minutes and work once. Make a new one in your workspace under **Team → Settings**.");
      await linkGuild(guildId, groupId, caller);
      const ws = await prisma.workspace.findUnique({ where: { groupId: BigInt(groupId) }, select: { groupName: true } });
      return reply(res, { embeds: [embed({ title: "✅ Connected", description: `This server is now connected to **${ws?.groupName || "your workspace"}** on Crewbase.` })] });
    }

    const groupId = await getWorkspaceForGuild(guildId);
    if (!groupId) return privateReply(res, "This server isn’t connected to a Crewbase workspace yet. A workspace manager can get a code under **Team → Settings**, then someone with Manage Server runs **/link**.");

    if (name === "unlink") {
      await unlinkGuild(guildId);
      return privateReply(res, "Disconnected. This server is no longer linked to a Crewbase workspace.");
    }

    if (name === "workspace") {
      const ws = await prisma.workspace.findUnique({ where: { groupId: BigInt(groupId) }, select: { groupName: true, groupLogo: true } });
      return reply(res, { embeds: [embed({ title: ws?.groupName || "Crewbase workspace", url: `${site()}/workspace/${groupId}`, thumbnail: ws?.groupLogo ? { url: ws.groupLogo } : undefined, description: "This server is connected to this Crewbase workspace." })] });
    }

    if (name === "activity" || name === "profile") {
      const target = String(option("member") || caller);
      const member = await memberForDiscordUser(groupId, target);
      if (!member) {
        return privateReply(res, target === caller
          ? "I couldn’t find you in this workspace. Add your Discord ID to your Crewbase workspace profile, then try again."
          : "That person hasn’t added their Discord ID to their Crewbase profile yet.");
      }
      if (name === "activity") {
        const totals = await minutesInGame(groupId, [member.userId]);
        const minutes = totals.get(member.userId.toString()) || 0;
        return reply(res, { embeds: [embed({ title: `${member.user?.username}’s activity`, description: `**${fmtMinutes(minutes)}** in game over the last 7 days.`, thumbnail: member.user?.picture ? { url: member.user.picture } : undefined })] });
      }
      const roles = await prisma.role.findMany({ where: { workspaceGroupId: BigInt(groupId), members: { some: { userid: member.userId } } }, select: { name: true } });
      return reply(res, {
        embeds: [embed({
          title: member.user?.username || "Profile",
          url: `${site()}/workspace/${groupId}/profile/${member.userId}`,
          thumbnail: member.user?.picture ? { url: member.user.picture } : undefined,
          fields: [{ name: "Roles", value: roles.map((r) => r.name).join(", ").slice(0, 1000) || "None" }],
        })],
      });
    }

    if (name === "leaderboard") {
      const members = await prisma.workspaceMember.findMany({ where: { workspaceGroupId: BigInt(groupId) }, select: { userId: true, user: { select: { username: true } } }, take: 3000 });
      const totals = await minutesInGame(groupId, members.map((m) => m.userId));
      const top = members
        .map((m) => ({ name: m.user?.username || m.userId.toString(), minutes: totals.get(m.userId.toString()) || 0 }))
        .filter((m) => m.minutes > 0)
        .sort((a, b) => b.minutes - a.minutes)
        .slice(0, 10);
      const medals = ["🥇", "🥈", "🥉"];
      return reply(res, {
        embeds: [embed({
          title: "Most active, last 7 days",
          description: top.length ? top.map((t, i) => `${medals[i] || `**${i + 1}.**`} ${t.name} · ${fmtMinutes(t.minutes)}`).join("\n") : "No activity logged in the last 7 days.",
          url: `${site()}/workspace/${groupId}/leaderboard`,
        })],
      });
    }

    if (name === "sessions") {
      const sessions = await prisma.session.findMany({
        where: { sessionType: { workspaceGroupId: BigInt(groupId) }, date: { gte: new Date() }, ended: null },
        orderBy: { date: "asc" },
        take: 6,
        select: { name: true, date: true, sessionType: { select: { name: true } } },
      });
      return reply(res, {
        embeds: [embed({
          title: "Upcoming sessions",
          description: sessions.length ? sessions.map((s) => `**${s.name || s.sessionType?.name || "Session"}** · <t:${Math.floor(s.date.getTime() / 1000)}:R>`).join("\n") : "No upcoming sessions.",
          url: `${site()}/workspace/${groupId}/sessions`,
        })],
      });
    }

    if (name === "events") {
      const events = (await listItems(parseInt(groupId), "events"))
        .filter((e) => new Date(e.start).getTime() > Date.now())
        .sort((a, b) => a.start.localeCompare(b.start))
        .slice(0, 6);
      return reply(res, {
        embeds: [embed({
          title: "Upcoming events",
          description: events.length ? events.map((e) => `**${e.title}** · <t:${Math.floor(new Date(e.start).getTime() / 1000)}:F>${e.location ? ` · ${e.location}` : ""}`).join("\n") : "No upcoming events.",
          url: `${site()}/workspace/${groupId}/team/events`,
        })],
      });
    }

    if (name === "online") {
      const live = await prisma.activitySession.findMany({
        where: { workspaceGroupId: BigInt(groupId), active: true, archived: { not: true } },
        select: { userId: true, startTime: true },
        take: 50,
      });
      const users = live.length ? await prisma.user.findMany({ where: { userid: { in: live.map((l) => l.userId) } }, select: { userid: true, username: true } }) : [];
      const names = new Map(users.map((u) => [u.userid.toString(), u.username]));
      return reply(res, {
        embeds: [embed({
          title: `🟢 ${live.length} in game now`,
          description: live.length ? live.map((l) => `**${names.get(l.userId.toString()) || l.userId}** · for ${fmtMinutes((Date.now() - l.startTime.getTime()) / 60000)}`).join("\n").slice(0, 3900) : "Nobody’s in game right now.",
        })],
      });
    }

    if (name === "stats") {
      const [members, live] = await Promise.all([
        prisma.workspaceMember.findMany({ where: { workspaceGroupId: BigInt(groupId) }, select: { userId: true }, take: 3000 }),
        prisma.activitySession.count({ where: { workspaceGroupId: BigInt(groupId), active: true, archived: { not: true } } }),
      ]);
      const totals = await minutesInGame(groupId, members.map((m) => m.userId));
      const all = Array.from(totals.values());
      const minutes = all.reduce((a, b) => a + b, 0);
      return reply(res, {
        embeds: [embed({
          title: "This week at a glance",
          fields: [
            { name: "Staff", value: String(members.length), inline: true },
            { name: "Active this week", value: String(all.filter((m) => m > 0).length), inline: true },
            { name: "In game now", value: String(live), inline: true },
            { name: "Time in game (7 days)", value: fmtMinutes(minutes), inline: true },
          ],
        })],
      });
    }

    if (name === "announcement") {
      const list = await listItems(parseInt(groupId), "announcements", { take: 20 });
      const a = list.find((x) => x.pinned) || list[0];
      if (!a) return privateReply(res, "There are no announcements yet.");
      return reply(res, { embeds: [embed({ title: `📣 ${a.title}`, description: String(a.body || "").slice(0, 3500), url: `${site()}/workspace/${groupId}/team/announcements` })] });
    }

    if (name === "tasks" || name === "standing" || name === "kudos") {
      const me = await memberForDiscordUser(groupId, caller);
      if (!me) return privateReply(res, "I couldn’t find you in this workspace. Add your Discord ID to your Crewbase workspace profile, then try again.");
      const myId = me.userId.toString();

      if (name === "tasks") {
        const tasks = (await listItems(parseInt(groupId), "tasks")).filter((t) => t.assigneeId === myId && t.status !== "done").slice(0, 10);
        return reply(res, {
          flags: EPHEMERAL,
          embeds: [embed({
            title: "Your open tasks",
            description: tasks.length ? tasks.map((t) => `**${t.title}**${t.due ? ` · due <t:${Math.floor(new Date(t.due).getTime() / 1000)}:R>` : ""}${t.status === "doing" ? " · in progress" : ""}`).join("\n") : "You have no open tasks. 🎉",
            url: `${site()}/workspace/${groupId}/team/tasks`,
          })],
        });
      }

      if (name === "standing") {
        const now = Date.now();
        const active = (await listItems(parseInt(groupId), "infractions")).filter((i) => i.userId === myId && i.status === "active" && (!i.expiresAt || new Date(i.expiresAt).getTime() > now));
        const points = active.reduce((s, i) => s + (i.points || 0), 0);
        return reply(res, {
          flags: EPHEMERAL,
          embeds: [embed({
            title: "Your HR standing",
            description: active.length
              ? `**${points}** active point${points === 1 ? "" : "s"} from ${active.length} infraction${active.length === 1 ? "" : "s"}.\n${active.map((i) => `• ${i.reason}${i.expiresAt ? ` (expires <t:${Math.floor(new Date(i.expiresAt).getTime() / 1000)}:R>)` : ""}`).join("\n")}`
              : "You’re in good standing, with no active infractions. 👍",
            url: `${site()}/workspace/${groupId}/hr`,
          })],
        });
      }

      // kudos
      const target = String(option("member") || "");
      const message = String(option("message") || "").trim().slice(0, 400);
      if (target === caller) return privateReply(res, "Kudos are for other people. 🙂");
      const them = await memberForDiscordUser(groupId, target);
      if (!them) return privateReply(res, "That person hasn’t added their Discord ID to their Crewbase profile yet.");
      if (message.length < 3) return privateReply(res, "Say a little about why they deserve it.");
      const item = await createItem(parseInt(groupId), "kudos", { toUserId: them.userId.toString(), toUsername: them.user?.username || "", message, emoji: "⭐" }, { id: myId, name: me.user?.username || null });
      const { onTeamItemCreated } = await import("@/utils/teamNotify");
      await onTeamItemCreated(parseInt(groupId), "kudos", item, myId, me.user?.username || null);
      return reply(res, { embeds: [embed({ title: `⭐ Kudos for ${them.user?.username}`, description: `${message}\n\n— ${me.user?.username}` })] });
    }

    return privateReply(res, "I don’t know that command yet.");
  } catch (error) {
    console.error("[discord bot] Command failed:", name, error);
    return privateReply(res, "Something went wrong. Please try again in a moment.");
  }
}
