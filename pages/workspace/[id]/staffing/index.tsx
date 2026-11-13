import Link from "next/link";
import workspace from "@/layouts/workspace";
import { pageWithLayout } from "@/layoutTypes";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
export const getServerSideProps = withPermissionCheckSsr(async () => ({ props: {} }));
import { StaffingShell, useStaffing, STAGE_LABELS } from "@/components/staffing/kit";
import { Card, Empty } from "@/components/team/teamkit";

const StaffingOverview: pageWithLayout = () => {
  const { id, data } = useStaffing();
  const d = data;
  const stat = (n: any, label: string, href?: string) => {
    const body = <><p className="text-2xl font-bold tabular-nums text-zinc-900 dark:text-white">{n}</p><p className="mt-1 text-xs text-zinc-500">{label}</p></>;
    return href ? <Link href={href} className="rounded-2xl border border-zinc-200 bg-white p-4 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800">{body}</Link> : <Card className="p-4">{body}</Card>;
  };

  return (
    <StaffingShell title="Staffing" description="Hiring, headcount and coverage for your staff team, all in one place.">
      {!d && <p className="text-sm text-zinc-500">Loading…</p>}
      {d && !d.can?.view && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <h2 className="font-semibold text-zinc-900 dark:text-white">Looking to join the staff team?</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">See which positions are open right now.</p>
            <Link href={`/workspace/${id}/staffing/positions`} className="mt-3 inline-block text-sm font-medium underline">Open positions</Link>
          </Card>
          <Card>
            <h2 className="font-semibold text-zinc-900 dark:text-white">Share your availability</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Tell leadership when you’re usually free, so shifts get planned around you.</p>
            <Link href={`/workspace/${id}/staffing/availability`} className="mt-3 inline-block text-sm font-medium underline">Set my availability</Link>
          </Card>
        </div>
      )}
      {d?.can?.view && d.enabled && (
        <div className="space-y-8">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {stat(d.members, "Staff members")}
            {stat(d.positions.open, `Open positions (${d.positions.openings} spots)`, `/workspace/${id}/staffing/positions`)}
            {stat(Object.entries(d.pipeline).filter(([k]) => !["hired", "rejected"].includes(k)).reduce((s, [, v]) => s + (v as number), 0), "Candidates in progress", `/workspace/${id}/staffing/candidates`)}
            {stat(`${d.turnover.rate}%`, `Turnover, 90 days (${d.turnover.left90} left, ${d.turnover.joined90} joined)`)}
            {stat(`${d.availability.submitted}/${d.availability.members}`, "Shared their availability", `/workspace/${id}/staffing/availability`)}
          </div>

          <section>
            <h2 className="mb-3 text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">Hiring pipeline</h2>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {Object.entries(STAGE_LABELS).map(([k, label]) => (
                <Link key={k} href={`/workspace/${id}/staffing/candidates`} className="rounded-xl border border-zinc-200 bg-white p-3 text-center dark:border-zinc-700 dark:bg-zinc-800">
                  <p className="text-xl font-bold tabular-nums text-zinc-900 dark:text-white">{d.pipeline[k] || 0}</p>
                  <p className="text-xs text-zinc-500">{label}</p>
                </Link>
              ))}
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section>
              <h2 className="mb-3 text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">Headcount vs target</h2>
              {d.headcount.length === 0 ? <Empty>No targets yet. Set them under Headcount.</Empty> : (
                <Card className="space-y-3">
                  {d.headcount.map((h: any) => {
                    const pct = h.target ? Math.min(100, Math.round((h.current / h.target) * 100)) : 100;
                    return (
                      <div key={h.id}>
                        <div className="flex justify-between text-sm"><span className="font-medium text-zinc-900 dark:text-white">{h.roleName}</span><span className={`tabular-nums ${h.belowMinimum ? "font-semibold text-red-600 dark:text-red-400" : "text-zinc-500"}`}>{h.current} / {h.target}</span></div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-700"><div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: h.belowMinimum ? "#EF4444" : h.gap > 0 ? "#F28C28" : "#10B981" }} /></div>
                        {h.gap > 0 && <p className="mt-0.5 text-xs text-zinc-500">{h.gap} more needed{h.belowMinimum ? " · below the minimum" : ""}</p>}
                      </div>
                    );
                  })}
                </Card>
              )}
            </section>
            <section>
              <h2 className="mb-3 text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">Shift coverage, next 7 days</h2>
              {d.coverage.length === 0 ? <Empty>No sessions in the next 7 days.</Empty> : (
                <Card className="divide-y divide-zinc-200 p-0 dark:divide-zinc-700">
                  {d.coverage.slice(0, 10).map((c: any) => (
                    <div key={c.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                      <span className="flex-1 truncate text-zinc-900 dark:text-white">{c.name}</span>
                      <span className="text-xs text-zinc-500">{new Date(c.date).toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" })}</span>
                      <span className={`w-16 text-right text-xs font-semibold tabular-nums ${c.short ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>{c.signedUp}{c.slots ? ` / ${c.slots}` : ""}</span>
                    </div>
                  ))}
                </Card>
              )}
            </section>
          </div>

          <section>
            <h2 className="mb-3 text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">Upcoming interviews</h2>
            {d.upcomingInterviews.length === 0 ? <Empty>No interviews scheduled.</Empty> : (
              <Card className="divide-y divide-zinc-200 p-0 dark:divide-zinc-700">
                {d.upcomingInterviews.map((i: any) => (
                  <div key={i.id} className="flex flex-wrap items-center gap-3 px-5 py-2.5 text-sm">
                    <span className="font-medium text-zinc-900 dark:text-white">{i.username}</span>
                    <span className="text-zinc-500">{i.positionTitle}</span>
                    <span className="ml-auto text-xs text-zinc-500">{new Date(i.at).toLocaleString()}{i.interviewers?.length ? ` · with ${i.interviewers.join(", ")}` : ""}</span>
                  </div>
                ))}
              </Card>
            )}
          </section>
        </div>
      )}
    </StaffingShell>
  );
};
StaffingOverview.layout = workspace;
export default StaffingOverview;
