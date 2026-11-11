import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { waitUntil } from "@vercel/functions";
import { BOT } from "@/utils/discordBot";
import {
  verifyDiscordRequest, getWorkspaceForGuild, linkGuild, unlinkGuild, useLinkCode, memberForDiscordUser, minutesInGame,
} from "@/utils/discordBot";
import { listItems, createItem } from "@/utils/teamStore";
import {
  syncMember, getGuildConfig, saveGuildConfig, createVerifyCode, getLinkedUser, setLink, resolveRobloxId, robloxProfile,
  robloxIdFromUsername, factsFor, BIND_LABELS, BindKind, OFFICIAL_GUILD_ID, OFFICIAL_ONLY_BINDS, SyncResult, autoLinkRanks,
} from "@/utils/discordSync";

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

function hasPermission(body: any, bit: bigint): boolean {
  try {
    const perms = BigInt(body.member?.permissions || "0");
    return (perms & (1n << 3n)) !== 0n || (perms & bit) !== 0n; // Administrator always counts
  } catch {
    return false;
  }
}

function profileEmbed(p: { id: string; name: string; displayName: string; created: string; avatar: string | null; isBanned?: boolean }) {
  return embed({
    title: p.displayName && p.displayName !== p.name ? `${p.displayName} (@${p.name})` : p.name,
    url: `https://www.roblox.com/users/${p.id}/profile`,
    thumbnail: p.avatar ? { url: p.avatar } : undefined,
    fields: [
      { name: "Roblox ID", value: p.id, inline: true },
      { name: "Joined Roblox", value: `<t:${Math.floor(new Date(p.created).getTime() / 1000)}:D>`, inline: true },
      ...(p.isBanned ? [{ name: "Status", value: "Banned on Roblox", inline: true }] : []),
    ],
  });
}

function describeSync(r: SyncResult, self: boolean) {
  if (!r.verified) return self ? "You haven’t verified yet. Run **/verify** first." : "That person hasn’t verified yet.";
  const who = self ? "You’re" : `${r.username} is`;
  if (r.problem === "no_binds") {
    return `✅ ${who} verified as **${r.username}**.\nThis server hasn’t set up any automatic roles yet, so there were none to give. Server managers: add some with **/bind add** (for example, type “Everyone verified” and your Member role).`;
  }
  if (r.problem === "no_access" || r.problem === "member_lookup") {
    return `✅ ${who} verified as **${r.username}**, but I couldn’t update roles here. Make sure the **Crewbase** bot is still in this server with the **Manage Roles** permission.`;
  }
  const parts = [`✅ ${who} verified as **${r.username}**.`];
  if (r.added.length) parts.push(`Added: ${r.added.map((x) => `<@&${x}>`).join(" ")}`);
  if (r.removed.length) parts.push(`Removed: ${r.removed.map((x) => `<@&${x}>`).join(" ")}`);
  if (!r.added.length && !r.removed.length) parts.push("Your roles are already up to date.");
  if (r.nickname) parts.push(`Nickname: **${r.nickname}**`);
  if (r.failed) parts.push(`⚠️ ${r.failed} change(s) failed. In Server Settings → Roles, the bot’s own **Crewbase** role must be **above** the roles it gives, and it needs **Manage Roles** and **Manage Nicknames**.`);
  return parts.join("\n");
}

/**
 * Answers straight away with “thinking…”, then finishes the work in the background
 * and edits the reply. Discord only waits 3 seconds for an answer, and role syncing
 * can take longer than that.
 */
function deferred(res: NextApiResponse, token: string, work: () => Promise<Record<string, unknown>>) {
  res.status(200).json({ type: 5, data: { flags: EPHEMERAL } });
  waitUntil(
    work()
      .catch((error) => {
        console.error("[discord bot] Deferred command failed:", error);
        return { content: "Something went wrong. Please try again in a moment." };
      })
      .then((data) =>
        fetch(`https://discord.com/api/v10/webhooks/${BOT.appId}/${token}/messages/@original`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ allowed_mentions: { parse: [] }, ...data }),
        })
      )
      .catch(() => {})
  );
}

/** /verify and the Verify button: sync if already linked, otherwise send a one-time link. */
function verifyFlow(res: NextApiResponse, token: string, discordId: string, guildId: string | undefined) {
  return deferred(res, token, async () => {
    if (guildId && (await getLinkedUser(discordId))) {
      return { content: describeSync(await syncMember(guildId, discordId), true) };
    }
    const code = await createVerifyCode(discordId, guildId || null);
    return {
      embeds: [embed({ title: "Verify your account", description: "Click below and log in to Crewbase with your Roblox account. This link is just for you and works for 15 minutes." })],
      components: [{ type: 1, components: [{ type: 2, style: 5, label: "Verify on Crewbase", url: `${site()}/discord/verify?code=${code}` }] }],
    };
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const raw = await readRaw(req).catch(() => "");
  const ok = verifyDiscordRequest(raw, req.headers["x-signature-ed25519"] as string, req.headers["x-signature-timestamp"] as string);
  if (!ok) return res.status(401).send("Invalid request signature");

  const body = JSON.parse(raw);
  if (body.type === 1) return res.status(200).json({ type: 1 }); // Discord's health check
  // Buttons: the Verify button posted by /verifypanel
  if (body.type === 3 && body.data?.custom_id === "cb_verify") {
    const who = body.member?.user?.id || body.user?.id;
    return verifyFlow(res, body.token, who, body.guild_id);
  }
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
            "**/activity** time in game over the last 7 days\n**/leaderboard** most active staff\n**/online** who’s in game now\n**/besttimes** when staff are usually online\n**/stats** the week at a glance\n**/sessions** upcoming sessions\n**/events** upcoming Team events\n**/tasks** your open tasks\n**/announcement** the latest announcement\n**/kudos** thank a teammate\n**/standing** your HR standing (private)\n**/profile** someone’s Crewbase profile\n**/workspace** which workspace this server uses\n\n**Verification:** **/verify** link your Roblox account and get roles, **/update** refresh roles, **/whois** someone’s Roblox account, **/roblox** look up a username, **/unverify** unlink.\nServer managers: **/bind** auto-roles, **/nickname** nickname format, **/verifypanel** a Verify button, **/shifts** shift announcements.\n\nServer managers: **/link** connects this server to a workspace, **/unlink** disconnects it.\n\nFor your own stats to show, add your Discord ID to your Crewbase workspace profile.",
          url: `${site()}/bot`,
        })],
      });
    }
    // Commands that work without a linked workspace
    if (name === "roblox") {
      const id = await robloxIdFromUsername(String(option("username") || ""));
      const p = id ? await robloxProfile(id) : null;
      if (!p) return privateReply(res, "I couldn’t find that Roblox user.");
      return reply(res, { embeds: [profileEmbed(p)] });
    }
    if (name === "unverify") {
      if (!(await getLinkedUser(caller))) return privateReply(res, "Your Discord isn’t linked to a Crewbase account.");
      await setLink(caller, null);
      return privateReply(res, "Unlinked. Your Discord is no longer connected to your Roblox account on Crewbase.");
    }
    if (!guildId) return privateReply(res, "Use Crewbase commands inside a server.");

    if (name === "verify") return verifyFlow(res, body.token, caller, guildId);

    if (name === "update") {
      const target = String(option("member") || caller);
      if (target !== caller && !hasPermission(body, 1n << 28n)) return privateReply(res, "You need the Manage Roles permission to update other people.");
      return deferred(res, body.token, async () => ({ content: describeSync(await syncMember(guildId, target), target === caller) }));
    }

    if (name === "whois") {
      const target = String(option("member") || caller);
      const who = await resolveRobloxId(target, guildId);
      if (!who) return privateReply(res, target === caller ? "You haven’t verified yet. Run /verify." : "That person hasn’t verified yet.");
      const p = await robloxProfile(who.userId);
      if (!p) return privateReply(res, "Roblox didn’t respond. Try again in a moment.");
      const linkedGroup = await getWorkspaceForGuild(guildId);
      const facts = linkedGroup ? await factsFor(who.userId, linkedGroup) : null;
      const e = profileEmbed(p);
      if (facts?.roleList.length) e.fields.push({ name: "Crewbase roles", value: facts.roleList.join(", ").slice(0, 1000), inline: false });
      e.fields.push({ name: "Verified with", value: who.source === "crewbase" ? "Crewbase" : "Bloxlink", inline: true });
      return reply(res, { embeds: [e] });
    }

    if (name === "bind") {
      const sub = body.data?.options?.[0];
      const sopt = (n: string) => sub?.options?.find((o: any) => o.name === n)?.value;
      const config = await getGuildConfig(guildId);
      const describeBind = (b: any, i: number) =>
        `**${i + 1}.** <@&${b.roleId}> ← ${b.kind === "rank" ? `Roblox rank ${b.value}${b.max !== undefined && Number(b.max) !== Number(b.value) ? `–${b.max}` : ""}` : `${BIND_LABELS[b.kind as BindKind]}${b.value ? `: **${b.value}**` : ""}`}`;

      if (sub?.name === "roblox") {
        const createMissing = sopt("create_missing") === true;
        return deferred(res, body.token, async () => {
          const r = await autoLinkRanks(guildId, { createMissing });
          if ("error" in r) return { content: r.error };
          const lines = [`✅ Linked **${r.matched.length}** Roblox rank${r.matched.length === 1 ? "" : "s"} to Discord roles.`];
          if (r.created.length) lines.push(`Created ${r.created.length} new Discord role(s): ${r.created.join(", ")}`);
          if (r.skipped.length) lines.push(`Already linked: ${r.skipped.length}`);
          if (r.missing.length) lines.push(`No matching Discord role for: ${r.missing.join(", ")}. Make roles with those names, or run this again with create_missing.`);
          lines.push("Members get their rank role next time they /verify or /update. Make sure the **Crewbase** bot role is above these roles.");
          return { content: lines.join("\n").slice(0, 1900) };
        });
      }
      if (sub?.name === "lowerranks") {
        const fromRank = Number(sopt("from_rank"));
        const mode = sopt("mode") === "stack" ? "stack" : "keep";
        config.lowerRanks = fromRank > 0 ? { fromRank, mode } : null;
        await saveGuildConfig(guildId, config);
        if (!config.lowerRanks) return privateReply(res, "Turned off. People will only have the role for their current rank.");
        return privateReply(res, mode === "stack"
          ? `Done. People at rank **${fromRank}** or higher now also get every rank role from rank ${fromRank} up to theirs. Run /update to apply it.`
          : `Done. People at rank **${fromRank}** or higher now keep any lower-rank roles they already have. Run /update to apply it.`);
      }
      if (sub?.name === "clear") {
        if (sopt("confirm") !== true) return privateReply(res, "Nothing was removed. Set confirm to True to remove every bind.");
        const n = config.binds.length;
        config.binds = [];
        await saveGuildConfig(guildId, config);
        return privateReply(res, `Removed all ${n} bind(s). Roles people already have stay until they /update.`);
      }
      if (sub?.name === "edit") {
        const i = Number(sopt("number")) - 1;
        const b = config.binds[i];
        if (!b) return privateReply(res, "There’s no bind with that number. Check **/bind list**.");
        if (sopt("role") !== undefined) b.roleId = String(sopt("role"));
        if (sopt("value") !== undefined) b.value = String(sopt("value")).trim();
        if (sopt("max") !== undefined) b.max = Number(sopt("max"));
        if (b.kind === "rank" && !/^\d+$/.test(String(b.value || ""))) return privateReply(res, "For a rank bind, the value must be a rank number.");
        await saveGuildConfig(guildId, config);
        return privateReply(res, `Updated: ${describeBind(b, i)}`);
      }

      if (sub?.name === "list") {
        if (!config.binds.length) return privateReply(res, "No role binds yet. Add one with **/bind add**, or match your Roblox group’s ranks with **/bind roblox**.");
        return reply(res, {
          flags: EPHEMERAL,
          embeds: [embed({
            title: "Role binds",
            description: config.binds.map(describeBind).join("\n").slice(0, 3900),
            footer: { text: `Change one with /bind edit number:…  ·  Remove one with /bind remove number:…${config.lowerRanks ? `  ·  Lower ranks: ${config.lowerRanks.mode} from rank ${config.lowerRanks.fromRank}` : ""}` },
          })],
        });
      }
      if (sub?.name === "remove") {
        if (sopt("number") !== undefined) {
          const i = Number(sopt("number")) - 1;
          const b = config.binds[i];
          if (!b) return privateReply(res, "There’s no bind with that number. Check **/bind list**.");
          config.binds.splice(i, 1);
          await saveGuildConfig(guildId, config);
          return privateReply(res, `Removed: ${describeBind(b, i)}`);
        }
        if (sopt("role") === undefined) return privateReply(res, "Pick a role, or give a number from **/bind list**.");
        const roleId = String(sopt("role"));
        const before = config.binds.length;
        config.binds = config.binds.filter((b) => b.roleId !== roleId);
        await saveGuildConfig(guildId, config);
        return privateReply(res, before === config.binds.length ? "That role had no binds." : `Removed ${before - config.binds.length} bind(s) for <@&${roleId}>.`);
      }
      if (sub?.name === "add") {
        const kind = String(sopt("type")) as BindKind;
        const roleId = String(sopt("role"));
        const value = sopt("value") !== undefined ? String(sopt("value")).trim() : undefined;
        const max = sopt("max") !== undefined ? Number(sopt("max")) : undefined;
        if (!BIND_LABELS[kind]) return privateReply(res, "Unknown bind type.");
        if (OFFICIAL_ONLY_BINDS.includes(kind) && guildId !== OFFICIAL_GUILD_ID) {
          return privateReply(res, "That bind type is only for the official Crewbase server. In your server, try Everyone verified, workspace members, a Crewbase role or a group rank.");
        }
        if (["crewbase_role", "rank", "plan"].includes(kind) && !value) return privateReply(res, "This bind type needs a **value**: a Crewbase role name, a rank number, or a plan (starter, plus or pro).");
        if (kind === "rank" && !/^\d+$/.test(value || "")) return privateReply(res, "For a rank bind, the value must be a rank number like 100.");
        if (kind === "plan" && !["starter", "plus", "pro"].includes((value || "").toLowerCase())) return privateReply(res, "Plan must be starter, plus or pro.");
        if (config.binds.length >= 100) return privateReply(res, "This server has the maximum of 100 binds.");
        config.binds.push({ id: Math.random().toString(36).slice(2, 10), kind, roleId, value, max });
        await saveGuildConfig(guildId, config);
        return privateReply(res, `Done. <@&${roleId}> now goes to: ${BIND_LABELS[kind]}${value ? ` (${value}${max !== undefined ? `–${max}` : ""})` : ""}. People get it next time they /verify or /update.\nMake sure the **Crewbase** bot role is **above** this role in Server Settings → Roles.`);
      }
      return privateReply(res, "Use /bind add, /bind edit, /bind remove, /bind list, /bind roblox or /bind clear.");
    }

    if (name === "nickname") {
      const format = String(option("format") || "").trim();
      const config = await getGuildConfig(guildId);
      config.nickname = format.toLowerCase() === "off" ? null : format;
      await saveGuildConfig(guildId, config);
      return privateReply(res, config.nickname ? `Nicknames will look like **${config.nickname}** when people verify or update. Use {roblox}, {display} and {rank}.` : "Nickname changes are off.");
    }

    if (name === "shifts") {
      const groupForShifts = await getWorkspaceForGuild(guildId);
      if (!groupForShifts) return privateReply(res, "Link this server to a workspace first with **/link**.");
      const { getTeamSettings, saveTeamSettings } = await import("@/utils/teamNotify");
      const settings = await getTeamSettings(parseInt(groupForShifts));
      const sub = body.data?.options?.[0];
      const sopt = (n: string) => sub?.options?.find((o: any) => o.name === n)?.value;
      if (sub?.name === "off") {
        await saveTeamSettings(parseInt(groupForShifts), { ...settings, shifts: { ...settings.shifts, enabled: false } });
        return privateReply(res, "Shift announcements are off.");
      }
      if (sub?.name === "status") {
        const s = settings.shifts;
        return privateReply(res, s.enabled
          ? `Shift announcements are **on**: ${s.via === "bot" ? `posting in <#${s.channelId}>` : "posting to your workspace’s webhook"}, **${s.leadMinutes} minutes** before each shift${s.pingRoleId ? `, pinging <@&${s.pingRoleId}>` : ""}.`
          : "Shift announcements are **off**. Turn them on with **/shifts setup**.");
      }
      const channelId = String(sopt("channel"));
      const pingRoleId = sopt("ping") ? String(sopt("ping")) : null;
      const leadMinutes = sopt("minutes") ? Number(sopt("minutes")) : settings.shifts.leadMinutes || 30;
      await saveTeamSettings(parseInt(groupForShifts), { ...settings, shifts: { enabled: true, via: "bot", guildId, channelId, pingRoleId, leadMinutes } });
      return privateReply(res, `Done! I’ll post upcoming shifts in <#${channelId}> **${leadMinutes} minutes** before they start${pingRoleId ? ` and ping <@&${pingRoleId}>` : ""}.\nMake sure I can see that channel and have **Send Messages** and **Embed Links** there.`);
    }

    if (name === "verifypanel") {
      return reply(res, {
        embeds: [embed({ title: "Verify with Crewbase", description: "Click the button to link your Discord to your Roblox account. You’ll get the roles you qualify for, and it only takes a moment." })],
        components: [{ type: 1, components: [{ type: 2, style: 1, label: "Verify", custom_id: "cb_verify", emoji: { name: "✅" } }] }],
      });
    }

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

    if (name === "besttimes") {
      const { availability, nextOccurrence } = await import("@/utils/availability");
      const a = await availability(parseInt(groupId));
      if (!a.top.length) return privateReply(res, "Not enough activity yet. Once your game sends activity, I can suggest times.");
      return reply(res, {
        embeds: [embed({
          title: "🕒 Best times to host",
          description:
            a.top.map((t, i) => `${["🥇", "🥈", "🥉"][i]} <t:${Math.floor(nextOccurrence(t.how) / 1000)}:F> (weekly) · about **${t.v}** staff usually online`).join("\n") +
            "\n\nTimes show in your own time zone. Based on the last 4 weeks of activity.",
          url: `${site()}/workspace/${groupId}/activity/times`,
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
