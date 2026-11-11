import Link from "next/link";
import workspace from "@/layouts/workspace";
import { pageWithLayout } from "@/layoutTypes";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
export const getServerSideProps = withPermissionCheckSsr(async () => ({ props: {} }));
import { HrShell, useHrMe, escalation, isActiveInfraction, LEVELS, StatusPill } from "@/components/hr/hrkit";
import { useTeam, Card, Empty } from "@/components/team/teamkit";

const HrOverview: pageWithLayout = () => {
  const me = useHrMe();
  const infractions = useTeam("infractions");
  const complaints = useTeam("complaints");
  const appeals = useTeam("appeals");
  const pips = useTeam("pips");
  const resignations = useTeam("resignations");
  const id = infractions.id;
  const isHR = !!me?.isHR;

  const myInfractions = infractions.items.filter((i) => i.userId === me?.id);
  const myPoints = myInfractions.filter(isActiveInfraction).reduce((s, i) => s + (i.points || 0), 0);
  const myPips = pips.items.filter((p) => p.userId === me?.id && p.status === "active");

  const queue = [
    { label: "Complaints to review", n: complaints.items.filter((c) => c.status === "new" || c.status === "investigating").length, href: "complaints" },
    { label: "Appeals waiting", n: appeals.items.filter((a) => a.status === "pending").length, href: "appeals" },
    { label: "Resignations to process", n: resignations.items.filter((r) => r.status === "received").length, href: "resignations" },
    { label: "Active improvement plans", n: pips.items.filter((p) => p.status === "active").length, href: "plans" },
    { label: "Active infractions", n: infractions.items.filter(isActiveInfraction).length, href: "infractions" },
  ];

  const status = escalation(myPoints);

  return (
    <HrShell title="Human resources" description={isHR ? "Discipline, complaints, appeals, improvement plans and offboarding for your staff team." : "Your HR records, and a private way to raise concerns."}>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">Your standing</h2>
          <p className="mt-3 text-3xl font-bold text-zinc-900 dark:text-white">{myPoints} <span className="text-base font-medium text-zinc-500">active points</span></p>
          <p className={`mt-1 text-sm font-medium ${status.tone}`}>{status.label}</p>
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
            {myInfractions.length ? <>You have {myInfractions.filter(isActiveInfraction).length} active infraction(s). <Link href={`/workspace/${id}/hr/infractions`} className="underline">View them</Link>.</> : "You have no infractions."}
            {myPips.length > 0 && <> You’re on an <Link href={`/workspace/${id}/hr/plans`} className="underline">improvement plan</Link>.</>}
          </p>
        </Card>
        <Card>
          <h2 className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">Need something?</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href={`/workspace/${id}/hr/complaints`} className="font-medium text-zinc-900 underline dark:text-white">Raise a complaint</Link> <span className="text-zinc-500">privately, or anonymously</span></li>
            <li><Link href={`/workspace/${id}/hr/appeals`} className="font-medium text-zinc-900 underline dark:text-white">Appeal an infraction</Link> <span className="text-zinc-500">if you think it was unfair</span></li>
            <li><Link href={`/workspace/${id}/hr/resignations`} className="font-medium text-zinc-900 underline dark:text-white">Resign from the team</Link> <span className="text-zinc-500">with a short exit survey</span></li>
            <li><Link href={`/workspace/${id}/notices`} className="font-medium text-zinc-900 underline dark:text-white">Log time away</Link> <span className="text-zinc-500">with an inactivity notice</span></li>
          </ul>
        </Card>
      </div>

      {isHR && (
        <>
          <h2 className="mb-3 mt-8 text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">HR queue</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {queue.map((q) => (
              <Link key={q.label} href={`/workspace/${id}/hr/${q.href}`} className="rounded-2xl border border-zinc-200 bg-white p-4 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-zinc-500">
                <p className="text-2xl font-bold tabular-nums text-zinc-900 dark:text-white">{q.n}</p>
                <p className="mt-1 text-xs text-zinc-500">{q.label}</p>
              </Link>
            ))}
          </div>
          <h2 className="mb-3 mt-8 text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">Recent infractions</h2>
          {infractions.items.length === 0 ? <Empty>No infractions recorded.</Empty> : (
            <Card className="divide-y divide-zinc-200 p-0 dark:divide-zinc-700">
              {infractions.items.slice(0, 6).map((i) => (
                <div key={i.id} className="flex flex-wrap items-center gap-2 px-5 py-3 text-sm">
                  <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${LEVELS[i.level]?.tone}`}>{LEVELS[i.level]?.label}</span>
                  <span className="font-medium text-zinc-900 dark:text-white">{i.username}</span>
                  <span className="truncate text-zinc-500">{i.reason}</span>
                  <span className="ml-auto"><StatusPill status={isActiveInfraction(i) ? "active" : i.status === "revoked" ? "revoked" : "expired"} /></span>
                </div>
              ))}
            </Card>
          )}
        </>
      )}
    </HrShell>
  );
};
HrOverview.layout = workspace;
export default HrOverview;
