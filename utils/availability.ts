import prisma from "@/utils/database";

/**
 * Staff availability: when your staff are actually in game, by hour of the week,
 * from the last four weeks of activity. Used to suggest the best times to host
 * sessions, so you schedule when people can come instead of guessing.
 * Hours are in UTC (0 = Monday 00:00 UTC); pages convert them to local time.
 */
export async function availability(groupId: number | bigint) {
  const WEEK = 7 * 86_400_000;
  const now = Date.now();
  const since = now - 4 * WEEK;
  const sessions = await prisma.activitySession.findMany({
    where: { workspaceGroupId: BigInt(groupId), startTime: { gte: new Date(since) }, archived: { not: true } },
    select: { userId: true, startTime: true, endTime: true, active: true },
    take: 200_000,
  });
  // present[hourOfWeek] = set of "week:user"
  const present: Set<string>[] = Array.from({ length: 168 }, () => new Set());
  for (const s of sessions) {
    const start = s.startTime.getTime();
    const end = Math.min(s.endTime ? s.endTime.getTime() : s.active ? now : start, start + 12 * 3_600_000);
    for (let t = Math.floor(start / 3_600_000) * 3_600_000; t < end; t += 3_600_000) {
      const d = new Date(t);
      const how = ((d.getUTCDay() + 6) % 7) * 24 + d.getUTCHours(); // Monday first
      const week = Math.floor((now - t) / WEEK);
      present[how].add(`${week}:${s.userId}`);
    }
  }
  const hours = present.map((set) => Math.round((set.size / 4) * 10) / 10); // average staff online per week
  const top = hours
    .map((v, how) => ({ how, v }))
    .filter((x) => x.v > 0)
    .sort((a, b) => b.v - a.v)
    .slice(0, 3);
  const staff = new Set(sessions.map((s) => s.userId.toString())).size;
  return { hours, top, staff, sessions: sessions.length };
}

/** The next time (as a timestamp) that a UTC hour-of-week comes round. */
export function nextOccurrence(how: number): number {
  const now = new Date();
  const nowHow = ((now.getUTCDay() + 6) % 7) * 24 + now.getUTCHours();
  let diff = how - nowHow;
  if (diff <= 0) diff += 168;
  const t = new Date(now);
  t.setUTCMinutes(0, 0, 0);
  return t.getTime() + diff * 3_600_000;
}
