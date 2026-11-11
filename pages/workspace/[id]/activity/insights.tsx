import { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import axios from "axios";
import workspace from "@/layouts/workspace";
import { pageWithLayout } from "@/layoutTypes";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
import { Card, Empty, inputClass, btn } from "@/components/team/teamkit";

export const getServerSideProps = withPermissionCheckSsr(async () => ({ props: {} }));

const fmt = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`);

const Insights: pageWithLayout = () => {
  const router = useRouter();
  const id = router.query.id as string;
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!id) return;
    axios.get(`/api/workspace/${id}/activity/insights`).then((r) => setData(r.data)).catch((e) => setError(e?.response?.data?.error || "Couldn’t load insights"));
  }, [id]);

  const max = data ? Math.max(1, ...data.totals) : 1;
  const rows = (data?.rows || []).filter((r: any) => !q || r.username.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <Head><title>Activity insights</title></Head>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Activity insights</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Time in game over the last four weeks, trends, and who’s gone quiet.</p>
        </div>
        {data && <a href={`/api/workspace/${id}/activity/insights?format=csv`} className={btn}>Export CSV</a>}
      </div>
      {error && <Empty>{error}</Empty>}
      {!data && !error && <p className="text-sm text-zinc-500">Loading…</p>}
      {data && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card><p className="text-2xl font-bold text-zinc-900 dark:text-white">{fmt(data.totals[0])}</p><p className="text-xs text-zinc-500">Team time in game this week</p></Card>
            <Card><p className="text-2xl font-bold text-zinc-900 dark:text-white">{data.activeThisWeek} / {data.members}</p><p className="text-xs text-zinc-500">Staff active this week</p></Card>
            <Card><p className="text-2xl font-bold text-zinc-900 dark:text-white">{data.quietWithoutNotice.length}</p><p className="text-xs text-zinc-500">Quiet for 14+ days with no notice</p></Card>
          </div>
          <Card>
            <h2 className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">Team total by week</h2>
            <div className="mt-4 flex h-40 items-end gap-4" role="img" aria-label="Team time in game for each of the last four weeks">
              {[3, 2, 1, 0].map((i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-2">
                  <span className="text-xs tabular-nums text-zinc-500">{fmt(data.totals[i])}</span>
                  <div className="w-full rounded-t-lg" style={{ height: `${Math.max(4, (data.totals[i] / max) * 110)}px`, backgroundColor: i === 0 ? "#F28C28" : "#A1A1AA" }} />
                  <span className="text-xs text-zinc-500">{i === 0 ? "This week" : i === 1 ? "Last week" : `${i} weeks ago`}</span>
                </div>
              ))}
            </div>
          </Card>
          {data.quietWithoutNotice.length > 0 && (
            <Card>
              <h2 className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">Gone quiet, no notice</h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">No time in game for 14 days and no approved inactivity notice. Worth a friendly check-in.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {data.quietWithoutNotice.map((m: any) => (
                  <a key={m.userId} href={`/workspace/${id}/profile/${m.userId}`} className="rounded-full border border-zinc-300 px-3 py-1 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-700">
                    {m.username} <span className="text-zinc-500">· {m.lastSeen ? `last seen ${new Date(m.lastSeen).toLocaleDateString()}` : "never seen"}</span>
                  </a>
                ))}
              </div>
            </Card>
          )}
          <Card className="p-0">
            <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-5 py-3 dark:border-zinc-700">
              <h2 className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">By member</h2>
              <input aria-label="Search members" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className={`${inputClass} max-w-[200px]`} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-xs text-zinc-500">
                  <tr>
                    <th className="px-5 py-2 font-medium">Member</th>
                    <th className="px-3 py-2 font-medium">This week</th>
                    <th className="px-3 py-2 font-medium">Last week</th>
                    <th className="px-3 py-2 font-medium">2 wks ago</th>
                    <th className="px-3 py-2 font-medium">3 wks ago</th>
                    <th className="px-3 py-2 font-medium">Trend</th>
                    <th className="px-5 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                  {rows.map((r: any) => (
                    <tr key={r.userId}>
                      <td className="px-5 py-2.5 font-medium text-zinc-900 dark:text-white">{r.username}</td>
                      {r.weeks.map((w: number, i: number) => <td key={i} className="px-3 py-2.5 tabular-nums text-zinc-700 dark:text-zinc-300">{fmt(w)}</td>)}
                      <td className={`px-3 py-2.5 tabular-nums font-medium ${r.trend > 10 ? "text-emerald-600 dark:text-emerald-400" : r.trend < -10 ? "text-red-600 dark:text-red-400" : "text-zinc-500"}`}>
                        {r.trend > 0 ? "▲" : r.trend < 0 ? "▼" : "–"} {Math.abs(r.trend)}%
                      </td>
                      <td className="px-5 py-2.5 text-xs text-zinc-500">{r.onNotice ? "On notice" : r.quiet ? "Quiet" : "Active"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

Insights.layout = workspace;
export default Insights;
