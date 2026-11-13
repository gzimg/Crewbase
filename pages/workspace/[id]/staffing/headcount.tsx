import { useState } from "react";
import { useRecoilState } from "recoil";
import workspace from "@/layouts/workspace";
import { pageWithLayout } from "@/layoutTypes";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
export const getServerSideProps = withPermissionCheckSsr(async () => ({ props: {} }));
import { workspacestate } from "@/state";
import { StaffingShell, useStaffing } from "@/components/staffing/kit";
import { useTeam, Card, Empty, inputClass, btn, btnPrimary } from "@/components/team/teamkit";

const Headcount: pageWithLayout = () => {
  const [ws] = useRecoilState(workspacestate);
  const { data, reload } = useStaffing();
  const t = useTeam("headcount");
  const canManage = !!data?.can?.manage;
  const [form, setForm] = useState({ roleName: "", target: 5, minimum: 0 });
  const roleNames: string[] = ((ws as any).roles || []).map((r: any) => r.name).filter(Boolean);
  const rows = data?.headcount || [];

  if (data && !data.can?.view) return <StaffingShell title="Headcount" description=""><Empty>Only the staffing team can see headcount.</Empty></StaffingShell>;

  return (
    <StaffingShell title="Headcount" description="How many people you want in each role, and how far off you are. Roles below their minimum show in red.">
      {canManage && (
        <Card className="mb-6 flex flex-wrap items-end gap-2">
          <datalist id="hc-roles">{roleNames.map((r) => <option key={r} value={r} />)}</datalist>
          <label className="text-xs text-zinc-500">Role<input list="hc-roles" value={form.roleName} onChange={(e) => setForm({ ...form, roleName: e.target.value })} placeholder="e.g. Moderator" className={inputClass} /></label>
          <label className="text-xs text-zinc-500">Target<input type="number" min={0} value={form.target} onChange={(e) => setForm({ ...form, target: Number(e.target.value) })} className={`${inputClass} w-24`} /></label>
          <label className="text-xs text-zinc-500">Minimum<input type="number" min={0} value={form.minimum} onChange={(e) => setForm({ ...form, minimum: Number(e.target.value) })} className={`${inputClass} w-24`} /></label>
          <button disabled={!form.roleName.trim()} onClick={async () => { if (await t.create(form, "Target saved")) { setForm({ roleName: "", target: 5, minimum: 0 }); reload(); } }} className={btnPrimary}>Add target</button>
        </Card>
      )}
      {rows.length === 0 ? <Empty>No headcount targets yet.</Empty> : (
        <Card className="divide-y divide-zinc-200 p-0 dark:divide-zinc-700">
          {rows.map((h: any) => (
            <div key={h.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
              <span className="w-40 font-medium text-zinc-900 dark:text-white">{h.roleName}</span>
              <span className="tabular-nums text-zinc-700 dark:text-zinc-300">{h.current} now</span>
              <span className="text-zinc-500">target {h.target}{h.minimum ? ` · min ${h.minimum}` : ""}</span>
              <span className={`font-semibold ${h.belowMinimum ? "text-red-600 dark:text-red-400" : h.gap > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                {h.gap > 0 ? `Need ${h.gap} more` : h.gap < 0 ? `${-h.gap} over` : "On target"}
              </span>
              {canManage && <button onClick={() => t.remove(h.id, "Target removed").then(reload)} className={`${btn} ml-auto`}>Remove</button>}
            </div>
          ))}
        </Card>
      )}
      <p className="mt-4 text-xs text-zinc-500">Counts come from who has each Crewbase role. Need more people? Post an open position.</p>
    </StaffingShell>
  );
};
Headcount.layout = workspace;
export default Headcount;
