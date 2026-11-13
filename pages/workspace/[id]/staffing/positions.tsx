import { useState } from "react";
import workspace from "@/layouts/workspace";
import { pageWithLayout } from "@/layoutTypes";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
export const getServerSideProps = withPermissionCheckSsr(async () => ({ props: {} }));
import { StaffingShell, useStaffing } from "@/components/staffing/kit";
import { useTeam, Card, Empty, inputClass, btn, btnPrimary } from "@/components/team/teamkit";

const Positions: pageWithLayout = () => {
  const { data } = useStaffing();
  const t = useTeam("positions");
  const canManage = !!data?.can?.manage;
  const [open, setOpen] = useState(false);
  const blank = { title: "", department: "", roleName: "", openings: 1, description: "", requirements: "", public: false, applyLink: "" };
  const [form, setForm] = useState(blank);
  const list = t.items.filter((p) => canManage || p.status === "open");

  return (
    <StaffingShell
      title="Open positions"
      description="Roles your team is hiring for. Public positions also appear on your careers page."
      action={canManage && (
        <div className="flex gap-2">
          <a href={`/careers/${t.id}`} target="_blank" rel="noopener noreferrer" className={btn}>Careers page</a>
          <button onClick={() => setOpen(!open)} className={btnPrimary}>{open ? "Close" : "New position"}</button>
        </div>
      )}
    >
      {open && (
        <Card className="mb-6 grid gap-2 sm:grid-cols-2">
          <input aria-label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={80} placeholder="Position, e.g. Moderator" className={inputClass} />
          <input aria-label="Department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} maxLength={60} placeholder="Department (optional)" className={inputClass} />
          <input aria-label="Crewbase role" value={form.roleName} onChange={(e) => setForm({ ...form, roleName: e.target.value })} maxLength={60} placeholder="Role they’ll get (optional)" className={inputClass} />
          <label className="text-xs text-zinc-500">Spots open<input type="number" min={1} max={100} value={form.openings} onChange={(e) => setForm({ ...form, openings: Number(e.target.value) })} className={inputClass} /></label>
          <textarea aria-label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} maxLength={3000} placeholder="What they’ll do" className={`${inputClass} sm:col-span-2`} />
          <textarea aria-label="Requirements" value={form.requirements} onChange={(e) => setForm({ ...form, requirements: e.target.value })} rows={2} maxLength={2000} placeholder="Requirements, e.g. 13+, active 5 hours a week, good communication" className={`${inputClass} sm:col-span-2`} />
          <input aria-label="Apply link" value={form.applyLink} onChange={(e) => setForm({ ...form, applyLink: e.target.value })} maxLength={300} placeholder="Apply link (optional), e.g. your application form" className={`${inputClass} sm:col-span-2`} />
          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 sm:col-span-2"><input type="checkbox" checked={form.public} onChange={(e) => setForm({ ...form, public: e.target.checked })} className="h-4 w-4" /> Show on our public careers page</label>
          <div className="sm:col-span-2"><button disabled={!form.title.trim()} onClick={async () => { if (await t.create(form, "Position posted")) { setForm(blank); setOpen(false); } }} className={btnPrimary}>Post position</button></div>
        </Card>
      )}
      {!t.loading && list.length === 0 && <Empty>No open positions right now. Check back later!</Empty>}
      <div className="space-y-3">
        {list.map((p) => (
          <Card key={p.id}>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">{p.title}</h2>
              {p.department && <span className="text-sm text-zinc-500">{p.department}</span>}
              <span className="ml-auto text-xs text-zinc-500">{p.openings} spot{p.openings === 1 ? "" : "s"}{p.public ? " · public" : ""}{p.status !== "open" ? ` · ${p.status}` : ""}</span>
            </div>
            {p.description && <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">{p.description}</p>}
            {p.requirements && <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-500"><strong>Requirements:</strong> {p.requirements}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {p.applyLink && <a href={p.applyLink} target="_blank" rel="noopener noreferrer" className={btnPrimary}>Apply</a>}
              {canManage && (
                <>
                  <select aria-label="Status" value={p.status} onChange={(e) => t.update(p.id, { status: e.target.value }, "Updated")} className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-white">
                    <option value="open">Open</option><option value="paused">Paused</option><option value="filled">Filled</option>
                  </select>
                  <button onClick={() => t.update(p.id, { public: !p.public }, p.public ? "Hidden from careers page" : "Shown on careers page")} className={btn}>{p.public ? "Make private" : "Make public"}</button>
                  <button onClick={() => window.confirm("Delete this position?") && t.remove(p.id)} className={`${btn} ml-auto`}>Delete</button>
                </>
              )}
            </div>
          </Card>
        ))}
      </div>
    </StaffingShell>
  );
};
Positions.layout = workspace;
export default Positions;
