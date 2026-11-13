import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import axios from "axios";
import { Empty } from "@/components/team/teamkit";

/** Shared pieces for the Staffing section. */

export const STAFFING_TABS = [
  { slug: "", label: "Overview" },
  { slug: "positions", label: "Open positions" },
  { slug: "candidates", label: "Candidates", staffOnly: true },
  { slug: "headcount", label: "Headcount", staffOnly: true },
  { slug: "availability", label: "Availability" },
];

export const STAGE_LABELS: Record<string, string> = {
  applied: "Applied", screening: "Screening", interview: "Interview", offer: "Offer", hired: "Hired", rejected: "Rejected",
};

const overviewCache = new Map<string, any>();

/** Loads the Staffing overview (also tells us what this member can do). */
export function useStaffing() {
  const router = useRouter();
  const id = router.query.id as string;
  const [data, setData] = useState<any>(() => (id && overviewCache.get(id)) || null);
  const load = () => {
    if (!id) return;
    axios.get(`/api/workspace/${id}/staffing/overview`).then((r) => { overviewCache.set(id, r.data); setData(r.data); }).catch(() => {});
  };
  useEffect(load, [id]);
  return { id, data, reload: load };
}

export function StaffingShell({ title, description, action, children }: { title: string; description: string; action?: React.ReactNode; children: React.ReactNode }) {
  const router = useRouter();
  const { id, data } = useStaffing();
  const current = router.pathname.endsWith("/staffing") ? "" : router.pathname.split("/").pop();
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <Head><title>{`${title} - Staffing`}</title></Head>
      <nav className="-mx-1 mb-6 flex gap-1 overflow-x-auto pb-1 md:hidden" aria-label="Staffing sections">
        {STAFFING_TABS.filter((t) => !t.staffOnly || data?.can?.view).map((t) => (
          <Link key={t.slug} href={`/workspace/${id}/staffing${t.slug ? `/${t.slug}` : ""}`} aria-current={current === t.slug ? "page" : undefined}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium ${current === t.slug ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "text-zinc-600 dark:text-zinc-300"}`}>
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
      {data && data.enabled === false ? (
        <Empty>Staffing is turned off for this workspace. An admin can turn it on in Settings → Feature Flags.</Empty>
      ) : (
        children
      )}
    </div>
  );
}
