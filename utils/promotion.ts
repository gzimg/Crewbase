import prisma from "@/utils/database";
import { listItems } from "@/utils/teamStore";

/**
 * Promotion paths: clear, published requirements for moving up a rank, and each
 * person’s live progress towards them. The goal is promotions that are fair and
 * visible, instead of decided behind closed doors.
 */

export type Requirement = { key: string; label: string; met: boolean; current: string; target: string; progress: number };

export async function progressFor(groupId: number, userId: string) {
  const gid = BigInt(groupId);
  const uid = BigInt(userId);
  const since = new Date(Date.now() - 28 * 86_400_000);
  const [member, roles, sessions, paths, certs, awards, infractions, kudos, reviews] = await Promise.all([
    prisma.workspaceMember.findUnique({ where: { workspaceGroupId_userId: { workspaceGroupId: gid, userId: uid } }, select: { joinDate: true } }),
    prisma.role.findMany({ where: { workspaceGroupId: gid, members: { some: { userid: uid } } }, select: { name: true } }),
    prisma.activitySession.findMany({
      where: { workspaceGroupId: gid, userId: uid, startTime: { gte: since }, archived: { not: true } },
      select: { startTime: true, endTime: true, idleTime: true, active: true },
    }),
    listItems(groupId, "paths"),
    listItems(groupId, "certifications"),
    listItems(groupId, "awards"),
    listItems(groupId, "infractions"),
    listItems(groupId, "kudos"),
    listItems(groupId, "reviews"),
  ]);
  const now = Date.now();
  const minutes = sessions.reduce((sum, s) => {
    const end = s.endTime ? s.endTime.getTime() : s.active ? now : s.startTime.getTime();
    return sum + Math.max(0, (end - s.startTime.getTime()) / 60000 - Number(s.idleTime || 0) / 60);
  }, 0);
  const hoursPerWeek = Math.round((minutes / 60 / 4) * 10) / 10;
  const daysOnTeam = member?.joinDate ? Math.floor((now - new Date(member.joinDate).getTime()) / 86_400_000) : 0;
  const myCerts = new Set(awards.filter((a) => a.userId === userId && (!a.expiresAt || new Date(a.expiresAt).getTime() > now)).map((a) => a.certId));
  const activeInfractions = infractions.filter((i) => i.userId === userId && i.status === "active" && (!i.expiresAt || new Date(i.expiresAt).getTime() > now)).length;
  const kudosCount = kudos.filter((k) => k.toUserId === userId).length;
  const myReviews = reviews.filter((r) => r.userId === userId);
  const reviewAvgs = myReviews.map((r) => {
    const v = Object.values(r.ratings || {}) as number[];
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
  }).filter((x) => x > 0);
  const reviewAverage = reviewAvgs.length ? Math.round((reviewAvgs.reduce((a, b) => a + b, 0) / reviewAvgs.length) * 10) / 10 : 0;
  const certName = new Map(certs.map((c) => [c.id, c.name]));

  const roleNames = roles.map((r) => r.name);
  const lower = roleNames.map((r) => r.toLowerCase());
  const myPaths = paths.filter((p) => lower.includes(String(p.fromRole).toLowerCase()));

  const pct = (cur: number, target: number) => (target <= 0 ? 1 : Math.max(0, Math.min(1, cur / target)));
  const evaluated = myPaths.map((p) => {
    const c = p.criteria || {};
    const reqs: Requirement[] = [];
    if (c.minHoursPerWeek > 0) reqs.push({ key: "hours", label: "Time in game", met: hoursPerWeek >= c.minHoursPerWeek, current: `${hoursPerWeek}h a week`, target: `${c.minHoursPerWeek}h a week (4-week average)`, progress: pct(hoursPerWeek, c.minHoursPerWeek) });
    if (c.minDaysOnTeam > 0) reqs.push({ key: "days", label: "Time on the team", met: daysOnTeam >= c.minDaysOnTeam, current: `${daysOnTeam} days`, target: `${c.minDaysOnTeam} days`, progress: pct(daysOnTeam, c.minDaysOnTeam) });
    for (const id of c.certIds || []) reqs.push({ key: `cert-${id}`, label: `Certified: ${certName.get(id) || "a removed certification"}`, met: myCerts.has(id), current: myCerts.has(id) ? "Certified" : "Not yet", target: "Certified", progress: myCerts.has(id) ? 1 : 0 });
    if (c.noActiveInfractions) reqs.push({ key: "clean", label: "No active infractions", met: activeInfractions === 0, current: activeInfractions === 0 ? "None" : `${activeInfractions} active`, target: "None", progress: activeInfractions === 0 ? 1 : 0 });
    if (c.minKudos > 0) reqs.push({ key: "kudos", label: "Kudos from teammates", met: kudosCount >= c.minKudos, current: String(kudosCount), target: String(c.minKudos), progress: pct(kudosCount, c.minKudos) });
    if (c.minReviewAverage > 0) reqs.push({ key: "review", label: "Average review rating", met: reviewAverage >= c.minReviewAverage, current: reviewAverage ? `${reviewAverage} ★` : "No reviews yet", target: `${c.minReviewAverage} ★`, progress: pct(reviewAverage, c.minReviewAverage) });
    const met = reqs.filter((r) => r.met).length;
    return { pathId: p.id, fromRole: p.fromRole, toRole: p.toRole, note: p.note, requirements: reqs, ready: reqs.length > 0 && met === reqs.length, progress: reqs.length ? Math.round((reqs.reduce((s, r) => s + r.progress, 0) / reqs.length) * 100) : 0 };
  });
  return { roles: roleNames, stats: { hoursPerWeek, daysOnTeam, kudos: kudosCount, reviewAverage, activeInfractions }, paths: evaluated };
}
