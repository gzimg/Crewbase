import prisma from "@/utils/database";
import { getSiteRoleLists } from "@/utils/siteRoles";

/**
 * Crewbase profile badges: small icons next to someone’s name across Crewbase.
 * Some are automatic (site staff, a linked Discord, a Staff Passport); others are
 * given by Crewbase site staff (like Early Supporter or Bug Hunter).
 */
export const BADGES = {
  founder: { label: "Crewbase founder", auto: true },
  site_admin: { label: "Crewbase site admin", auto: true },
  site_staff: { label: "Crewbase staff", auto: true },
  partner: { label: "Crewbase partner", auto: false },
  early_supporter: { label: "Early supporter", auto: false },
  beta_tester: { label: "Beta tester", auto: false },
  bug_hunter: { label: "Bug hunter", auto: false },
  contributor: { label: "Contributor", auto: false },
  content_creator: { label: "Content creator", auto: false },
  verified_discord: { label: "Linked Discord", auto: true },
  passport: { label: "Has a Staff Passport", auto: true },
} as const;
export type BadgeId = keyof typeof BADGES;
export const MANUAL_BADGES = (Object.keys(BADGES) as BadgeId[]).filter((b) => !BADGES[b].auto);

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const row = await prisma.instanceConfig.findUnique({ where: { key } });
  return ((row?.value as unknown) as T) ?? fallback;
}

export async function getManualBadges(): Promise<Record<string, BadgeId[]>> {
  return readJson<Record<string, BadgeId[]>>("user_badges", {});
}
export async function setManualBadges(userId: string, badges: BadgeId[]) {
  const all = await getManualBadges();
  const clean = badges.filter((b) => MANUAL_BADGES.includes(b));
  if (clean.length) all[userId] = clean;
  else delete all[userId];
  await prisma.instanceConfig.upsert({ where: { key: "user_badges" }, update: { value: all as any }, create: { key: "user_badges", value: all as any } });
}

let cache: { at: number; value: (ids: string[]) => Record<string, BadgeId[]> } | null = null;

/** Badges for many users at once. Cached for a minute. */
export async function badgesFor(userIds: string[]): Promise<Record<string, BadgeId[]>> {
  if (!cache || Date.now() - cache.at > 60_000) {
    const [manual, lists, owners, discord, passports] = await Promise.all([
      getManualBadges(),
      getSiteRoleLists(),
      prisma.user.findMany({ where: { isOwner: true }, select: { userid: true } }),
      readJson<Record<string, string>>("discord_user_links", {}),
      readJson<Record<string, { userId: string }>>("passports", {}),
    ]);
    const ownerIds = new Set(owners.map((o) => o.userid.toString()));
    const discordIds = new Set(Object.values(discord));
    const passportIds = new Set(Object.values(passports).map((p: any) => String(p.userId)));
    cache = {
      at: Date.now(),
      value: (ids) =>
        Object.fromEntries(
          ids.map((id) => {
            const b: BadgeId[] = [];
            if (ownerIds.has(id)) b.push("founder");
            if (lists.admins.includes(id)) b.push("site_admin");
            else if (lists.staff.includes(id)) b.push("site_staff");
            b.push(...(manual[id] || []));
            if (discordIds.has(id)) b.push("verified_discord");
            if (passportIds.has(id)) b.push("passport");
            return [id, b];
          })
        ),
    };
  }
  return cache.value(userIds);
}
