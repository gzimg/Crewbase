import { useEffect, useState } from "react";
import workspace from "@/layouts/workspace";
import { pageWithLayout } from "@/layoutTypes";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
export const getServerSideProps = withPermissionCheckSsr(async () => ({ props: {} }));
import { StaffingShell, useStaffing } from "@/components/staffing/kit";
import { useTeam, Card, Empty, inputClass, btnPrimary } from "@/components/team/teamkit";

const DAYS: [string, string][] = [["mon", "Mon"], ["tue", "Tue"], ["wed", "Wed"], ["thu", "Thu"], ["fri", "Fri"], ["sat", "Sat"], ["sun", "Sun"]];
const hourLabel = (h: number) => new Date(2000, 0, 1, h % 24).toLocaleTimeString([], { hour: "numeric" });

const Availability: pageWithLayout = () => {
  const { data } = useStaffing();
  const t = useTeam("availability");
  const mine = t.items.find((a) => a.createdBy === data?.me);
  const [form, setForm] = useState({ days: [] as string[], fromHour: 17, toHour: 22, hoursPerWeek: 5, note: "", timezone: "" });

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (mine) setForm({ days: mine.days, fromHour: mine.fromHour, toHour: mine.toHour, hoursPerWeek: mine.hoursPerWeek, note: mine.note || "", timezone: mine.timezone || tz });
    else setForm((f) => ({ ...f, timezone: tz }));
  }, [mine?.id]);

  const save = () => (mine ? t.update(mine.id, form, "Availability updated") : t.create(form, "Availability saved"));
  const others = t.items.filter((a) => a.createdBy !== data?.me);

  return (
    <StaffingShell title="Availability" description="When you’re usually free to help. Leadership uses this to plan shifts and trainings around the team.">
      <Card className="space-y-3">
        <p className="text-sm font-semibold text-zinc-900 dark:text-white">Your availability</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Days">
          {DAYS.map(([k, label]) => {
            const on = form.days.includes(k);
            return <button key={k} onClick={() => setForm({ ...form, days: on ? form.days.filter((d) => d !== k) : [...form.days, k] })} aria-pressed={on} className={`rounded-lg border px-3 py-1.5 text-sm ${on ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900" : "border-zinc-300 text-zinc-700 dark:border-zinc-600 dark:text-zinc-200"}`}>{label}</button>;
          })}
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs text-zinc-500">From<select value={form.fromHour} onChange={(e) => setForm({ ...form, fromHour: Number(e.target.value) })} className={`${inputClass} w-auto`}>{Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{hourLabel(h)}</option>)}</select></label>
          <label className="text-xs text-zinc-500">Until<select value={form.toHour} onChange={(e) => setForm({ ...form, toHour: Number(e.target.value) })} className={`${inputClass} w-auto`}>{Array.from({ length: 24 }, (_, h) => <option key={h + 1} value={h + 1}>{hourLabel(h + 1)}</option>)}</select></label>
          <label className="text-xs text-zinc-500">Hours a week<input type="number" min={0} max={168} value={form.hoursPerWeek} onChange={(e) => setForm({ ...form, hoursPerWeek: Number(e.target.value) })} className={`${inputClass} w-24`} /></label>
          <input aria-label="Note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Note (optional), e.g. busier in exam season" className={`${inputClass} min-w-[180px] flex-1`} />
        </div>
        <p className="text-xs text-zinc-500">Times are in your time zone ({form.timezone}).</p>
        <button disabled={!form.days.length} onClick={save} className={btnPrimary}>{mine ? "Update" : "Save"} my availability</button>
      </Card>

      {data?.can?.view && (
        <>
          <h2 className="mb-3 mt-8 text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">Team availability</h2>
          <Card className="mb-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-300">People free each day:</p>
            <div className="mt-2 grid grid-cols-7 gap-2 text-center">
              {DAYS.map(([k, label]) => {
                const n = t.items.filter((a) => a.days.includes(k)).length;
                return <div key={k} className="rounded-lg bg-zinc-50 p-2 dark:bg-zinc-900/60"><p className="text-lg font-bold tabular-nums text-zinc-900 dark:text-white">{n}</p><p className="text-xs text-zinc-500">{label}</p></div>;
              })}
            </div>
          </Card>
          {others.length === 0 ? <Empty>Nobody else has shared their availability yet.</Empty> : (
            <Card className="divide-y divide-zinc-200 p-0 dark:divide-zinc-700">
              {others.map((a) => (
                <div key={a.id} className="flex flex-wrap items-center gap-3 px-5 py-2.5 text-sm">
                  <span className="w-36 font-medium text-zinc-900 dark:text-white">{a.createdByName}</span>
                  <span className="text-zinc-600 dark:text-zinc-300">{DAYS.filter(([k]) => a.days.includes(k)).map(([, l]) => l).join(", ")}</span>
                  <span className="text-xs text-zinc-500">{a.fromHour}:00–{a.toHour}:00 {a.timezone} · ~{a.hoursPerWeek}h/week</span>
                  {a.note && <span className="text-xs text-zinc-500">· {a.note}</span>}
                </div>
              ))}
            </Card>
          )}
        </>
      )}
    </StaffingShell>
  );
};
Availability.layout = workspace;
export default Availability;
