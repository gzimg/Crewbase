import type { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/withSession";
import prisma from "@/utils/database";
import { requireSiteRole } from "@/utils/siteRoles";
import { getCronRuns } from "@/utils/siteSettings";
import { isEncryptedSecret } from "@/utils/secrets";

const CRON_JOBS = [
  { name: "update-sessions", every: "5 minutes", maxGapMinutes: 30 },
  { name: "close-stale-sessions", every: "30 minutes", maxGapMinutes: 120 },
  { name: "reset-activity", every: "hour", maxGapMinutes: 180 },
  { name: "update-roles", every: "hour", maxGapMinutes: 180 },
  { name: "update-users", every: "day", maxGapMinutes: 60 * 30 },
  { name: "birthdays", every: "day", maxGapMinutes: 60 * 30 },
  { name: "plans", every: "day", maxGapMinutes: 60 * 30 },
  { name: "team-reminders", every: "hour", maxGapMinutes: 180 },
  { name: "shift-announcements", every: "5 minutes", maxGapMinutes: 30 },
];

/** Checks that the instance is set up correctly. Admins only. */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed" });
  const caller = await requireSiteRole(req, res, "admin");
  if (!caller) return;

  const started = Date.now();
  let dbOk = true;
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbOk = false;
  }
  const dbLatencyMs = Date.now() - started;

  const env = (name: string) => !!process.env[name] && process.env[name]!.length > 0;
  const checks = [
    { name: "Database connection", ok: dbOk, detail: dbOk ? `Responded in ${dbLatencyMs} ms` : "Can't reach the database" },
    { name: "SESSION_SECRET", ok: env("SESSION_SECRET") && process.env.SESSION_SECRET!.length >= 32, detail: "Signs login cookies. Needs at least 32 characters." },
    { name: "ENCRYPTION_KEY", ok: env("ENCRYPTION_KEY"), detail: "Encrypts stored API keys and tokens." },
    { name: "CRON_SECRET", ok: env("CRON_SECRET"), detail: "Protects the scheduled jobs." },
    { name: "NEXTAUTH_URL", ok: env("NEXTAUTH_URL"), detail: process.env.NEXTAUTH_URL || "Your site address" },
    { name: "BLOB_READ_WRITE_TOKEN", ok: env("BLOB_READ_WRITE_TOKEN"), detail: "Stores moderation evidence files on Vercel." },
    { name: "NEXT_PUBLIC_CONTACT_EMAIL", ok: env("NEXT_PUBLIC_CONTACT_EMAIL"), detail: "Shown on the Terms and Privacy pages." },
    { name: "NEXT_PUBLIC_SOURCE_URL", ok: env("NEXT_PUBLIC_SOURCE_URL"), detail: "Link to your source code (GPL-3.0)." },
  ];

  let plainSecrets = 0;
  if (dbOk) {
    const rows = await prisma.workspaceExternalServices.findMany({ select: { robloxApiKey: true, rankingToken: true } });
    for (const r of rows) {
      if (r.robloxApiKey && !isEncryptedSecret(r.robloxApiKey)) plainSecrets++;
      if (r.rankingToken && !isEncryptedSecret(r.rankingToken)) plainSecrets++;
    }
  }

  const runs = await getCronRuns().catch(() => ({} as Record<string, string>));
  const now = Date.now();
  const cron = CRON_JOBS.map((job) => {
    const last = runs[job.name] || null;
    const ok = !!last && now - new Date(last).getTime() < job.maxGapMinutes * 60_000;
    return { ...job, lastRun: last, ok };
  });

  return res.status(200).json({ success: true, checks, plainSecrets, cron });
}

export default withSessionRoute(handler);
