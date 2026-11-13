import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import workspace from "@/layouts/workspace";
import { pageWithLayout } from "@/layoutTypes";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
export const getServerSideProps = withPermissionCheckSsr(async () => ({ props: {} }));
import { HrShell, LEVELS } from "@/components/hr/hrkit";
import { Card, Empty } from "@/components/team/teamkit";

function Bars({ values, labels, color }: { values: number[]; labels: string[]; color: string }) {
  const max = Math.max(1, ...values);
  return (
    <div className="mt-4 flex h-32 items-end gap-2" role="img" aria-label={labels.map((l, i) => `${l}: ${values[i]}`).join(", ")}>
      {values.map((v, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <span className="text-xs tabular-nums text-zinc-500">{v}</span>
          <div className="w-full rounded-t-md" style={{ height: `${Math.max(3, (v / max) * 90)}px`, backgroundColor: color }} />
          <span className="text-[10px] text-zinc-500">{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}

function Breakdown({ data, labels = {} }: { data: Record<string, number>; labels?: Record<string, string> }) {
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  if (!total) return <p className="mt-3 text-sm text-zinc-500">Nothing yet.</p>;
  return (
    <ul className="mt-3 space-y-2">
      {Object.entries(data).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
        <li key={k} className="text-sm">
          <div className="flex justify-between text-zinc-700 dark:text-zinc-300"><span className="capitalize">{labels[k] || k.replace(/_/g, " ")}</span><span className="tabular-nums">{v}</span></div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-700"><div className="h-full rounded-full bg-[#F28C28]" style={{ width: `${(v / total) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}

const Reports: pageWithLayout = () => {
  const router = useRouter();
  const id = router.query.id as string;
  const [d, setD] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!id) return;
    axios.get(`/api/workspace/${id}/hr/reports`).then((r) => setD(r.data)).catch((e) => setError(e?.response?.data?.error || "Couldn’t load reports"));
  }, [id]);
  const monthLabel = (m: string) => new Date(m + "-01T12:00:00").toLocaleDateString(undefined, { month: "short" });

  return (
    <HrShell title="HR reports" description="Trends across the last six months, to spot problems early and check HR is fair and balanced.">
      {error && <Empty>{error}</Empty>}
      {!d && !error && <p className="text-sm text-zinc-500">Loading…</p>}
      {d && (
        <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card><h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Infractions per month</h2><Bars values={d.infractions.perMonth} labels={d.months.map(monthLabel)} color="#EF4444" /></Card>
            <Card><h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Commendations per month</h2><Bars values={d.commendations.perMonth} labels={d.months.map(monthLabel)} color="#10B981" /></Card>
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Balance check: <strong>{d.commendations.total}</strong> commendations to <strong>{d.infractions.total}</strong> infractions.
            {d.infractions.total > d.commendations.total * 2 && d.infractions.total > 4 ? " Discipline is far outpacing recognition. Make sure good work is being noticed too." : ""}
          </p>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card><h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Infractions by level</h2><Breakdown data={d.infractions.byLevel} labels={Object.fromEntries(Object.entries(LEVELS).map(([k, v]) => [k, v.label]))} /></Card>
            <Card>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Most common reasons</h2>
              {d.infractions.topReasons.length === 0 ? <p className="mt-3 text-sm text-zinc-500">Nothing yet.</p> : (
                <ol className="mt-3 space-y-1.5 text-sm">{d.infractions.topReasons.map((r: any, i: number) => <li key={i} className="flex justify-between gap-2 text-zinc-700 dark:text-zinc-300"><span className="truncate">{r.reason}</span><span className="tabular-nums">{r.count}</span></li>)}</ol>
              )}
            </Card>
            <Card><h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Appeal outcomes</h2><Breakdown data={d.appeals.byDecision} /><p className="mt-3 text-xs text-zinc-500">{d.appeals.pending} waiting</p></Card>
            <Card>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Complaints</h2>
              <Breakdown data={d.complaints.byCategory} labels={{ unfair: "Unfair treatment" }} />
              <p className="mt-3 text-xs text-zinc-500">{d.complaints.avgDaysToResolve !== null ? `Resolved in ${d.complaints.avgDaysToResolve} days on average` : "None resolved yet"}</p>
            </Card>
            <Card><h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Why people leave</h2><Breakdown data={d.resignations.byReason} labels={{ other_group: "Joined another group", not_enjoying: "Not enjoying it", school: "School or work", time: "Not enough time" }} /></Card>
            <Card><h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Would they come back?</h2><Breakdown data={d.resignations.wouldReturn} /><p className="mt-3 text-xs text-zinc-500">{d.watchlist} on the watchlist · {Object.values(d.investigations.byStatus as Record<string, number>).reduce((a, b) => a + b, 0)} investigations</p></Card>
          </div>
        </div>
      )}
    </HrShell>
  );
};
Reports.layout = workspace;
export default Reports;
