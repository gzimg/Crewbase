import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import axios from "axios";
import workspace from "@/layouts/workspace";
import { pageWithLayout } from "@/layoutTypes";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
import { Card, Empty } from "@/components/team/teamkit";

export const getServerSideProps = withPermissionCheckSsr(async () => ({ props: {} }));

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const BestTimes: pageWithLayout = () => {
  const router = useRouter();
  const id = router.query.id as string;
  const [data, setData] = useState<{ hours: number[]; staff: number } | null>(null);

  useEffect(() => {
    if (!id) return;
    axios.get(`/api/workspace/${id}/activity/times`).then((r) => setData(r.data)).catch(() => setData({ hours: [], staff: 0 }));
  }, [id]);

  // Shift UTC hours of the week into the viewer’s own time zone
  const local = useMemo(() => {
    if (!data?.hours.length) return null;
    const offset = Math.round(-new Date().getTimezoneOffset() / 60);
    const arr = new Array(168).fill(0);
    data.hours.forEach((v, how) => { arr[(how + offset + 168) % 168] = v; });
    return arr as number[];
  }, [data]);

  const max = local ? Math.max(0.1, ...local) : 1;
  const best = local ? local.map((v, how) => ({ how, v })).filter((x) => x.v > 0).sort((a, b) => b.v - a.v).slice(0, 3) : [];
  const label = (how: number) => {
    const h = how % 24;
    const t = new Date(2000, 0, 1, h).toLocaleTimeString([], { hour: "numeric" });
    return `${DAYS[Math.floor(how / 24)]} ${t}`;
  };
  const tz = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "";

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <Head><title>Best times to host</title></Head>
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Best times to host</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        When your staff are actually in game, from the last four weeks. Schedule trainings and shifts when people can come, instead of guessing. Times are in your time zone{tz ? ` (${tz})` : ""}.
      </p>
      {!data && <p className="mt-6 text-sm text-zinc-500">Working it out…</p>}
      {data && !local && <div className="mt-6"><Empty>Not enough activity yet. Once your game is sending activity, this fills in automatically.</Empty></div>}
      {local && (
        <div className="mt-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            {best.map((b, i) => (
              <Card key={b.how}>
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">{["Best time", "Runner-up", "Also good"][i]}</p>
                <p className="mt-2 text-xl font-bold text-zinc-900 dark:text-white">{label(b.how)}</p>
                <p className="mt-1 text-sm text-zinc-500">About {b.v} staff usually online</p>
              </Card>
            ))}
          </div>
          <Card className="overflow-x-auto">
            <h2 className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">Staff online by hour</h2>
            <table className="mt-4 border-separate" style={{ borderSpacing: 3 }} aria-label="Average staff online for each hour of the week">
              <thead>
                <tr>
                  <th />
                  {Array.from({ length: 24 }, (_, h) => (
                    <th key={h} scope="col" className="w-6 text-center text-[10px] font-normal text-zinc-500">{h % 3 === 0 ? new Date(2000, 0, 1, h).toLocaleTimeString([], { hour: "numeric" }).replace(" ", "") : ""}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAYS.map((d, di) => (
                  <tr key={d}>
                    <th scope="row" className="pr-2 text-right text-xs font-medium text-zinc-500">{d}</th>
                    {Array.from({ length: 24 }, (_, h) => {
                      const v = local[di * 24 + h];
                      const a = v / max;
                      return (
                        <td key={h} title={`${d} ${h}:00 · about ${v} staff online`} className="h-6 w-6 rounded" style={{ backgroundColor: v ? `rgba(242,140,40,${0.12 + a * 0.88})` : "rgba(161,161,170,0.12)" }}>
                          <span className="sr-only">{v}</span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-zinc-500">Darker squares mean more staff online on average. Based on {data!.staff} staff members’ activity.</p>
          </Card>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Ready to plan? <Link href={`/workspace/${id}/sessions`} className="font-medium underline">Schedule a session</Link> at one of the best times.
          </p>
        </div>
      )}
    </div>
  );
};

BestTimes.layout = workspace;
export default BestTimes;
