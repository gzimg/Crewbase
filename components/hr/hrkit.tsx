import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import axios from "axios";

/** Shared pieces for the Human resources section. */

export const HR_TABS = [
  { slug: "", label: "Overview" },
  { slug: "infractions", label: "Infractions" },
  { slug: "appeals", label: "Appeals" },
  { slug: "complaints", label: "Complaints" },
  { slug: "paths", label: "Promotion paths" },
  { slug: "plans", label: "Improvement plans" },
  { slug: "resignations", label: "Resignations" },
  { slug: "files", label: "Staff files", hrOnly: true },
];

export type HrMe = { id: string; isHR: boolean; can: { view: boolean; infractions: boolean; cases: boolean; plans: boolean; resignations: boolean } };

const hrMeCache = new Map<string, HrMe>();

export function useHrMe() {
  const router = useRouter();
  const id = router.query.id as string;
  const [me, setMe] = useState<HrMe | null>(() => (id && hrMeCache.get(id)) || null);
  useEffect(() => {
    if (!id) return;
    if (hrMeCache.has(id)) setMe(hrMeCache.get(id)!);
    axios
      .get(`/api/workspace/${id}/hr/me`)
      .then((r) => {
        hrMeCache.set(id, r.data);
        setMe(r.data);
      })
      .catch(() => {});
  }, [id]);
  return me;
}

export const LEVELS: Record<string, { label: string; points: number; days: number | null; tone: string }> = {
  verbal: { label: "Verbal warning", points: 1, days: 30, tone: "bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200" },
  written: { label: "Written warning", points: 2, days: 60, tone: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200" },
  final: { label: "Final warning", points: 4, days: 90, tone: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200" },
  suspension: { label: "Suspension", points: 5, days: 120, tone: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200" },
  demotion: { label: "Demotion", points: 6, days: 180, tone: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200" },
  termination: { label: "Termination", points: 10, days: null, tone: "bg-red-600 text-white" },
};

/** Suggested next step from someone’s active infraction points. */
export function escalation(points: number): { label: string; tone: string } {
  if (points >= 10) return { label: "Termination review", tone: "text-red-600 dark:text-red-400" };
  if (points >= 6) return { label: "Consider suspension or demotion", tone: "text-red-600 dark:text-red-400" };
  if (points >= 3) return { label: "Next step: final warning", tone: "text-orange-600 dark:text-orange-400" };
  if (points >= 1) return { label: "Monitor", tone: "text-amber-600 dark:text-amber-400" };
  return { label: "Good standing", tone: "text-emerald-600 dark:text-emerald-400" };
}

export const isActiveInfraction = (i: any) => i.status === "active" && (!i.expiresAt || new Date(i.expiresAt).getTime() > Date.now());

export function HrShell({ title, description, action, children }: { title: string; description: string; action?: React.ReactNode; children: React.ReactNode }) {
  const router = useRouter();
  const me = useHrMe();
  const id = router.query.id as string;
  const current = router.pathname.endsWith("/hr") ? "" : router.pathname.split("/").pop();
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <Head>
        <title>{`${title} - HR`}</title>
      </Head>
      {/* Phones get tabs; bigger screens use the HR side menu */}
      <nav className="-mx-1 mb-6 flex gap-1 overflow-x-auto pb-1 md:hidden" aria-label="HR sections">
        {HR_TABS.filter((t) => !t.hrOnly || me?.isHR).map((t) => (
          <Link
            key={t.slug}
            href={`/workspace/${id}/hr${t.slug ? `/${t.slug}` : ""}`}
            aria-current={current === t.slug ? "page" : undefined}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium ${current === t.slug ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "text-zinc-600 dark:text-zinc-300"}`}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">{title}</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const tones: Record<string, string> = {
    active: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
    revoked: "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300",
    expired: "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300",
    new: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200",
    investigating: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
    resolved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
    closed: "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300",
    pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
    decided: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
    passed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
    extended: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
    unsuccessful: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
    received: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200",
    processed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
    withdrawn: "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300",
  };
  return <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium capitalize ${tones[status] || tones.closed}`}>{status}</span>;
}
