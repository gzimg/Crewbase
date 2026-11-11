import { useEffect, useState } from "react";
import axios from "axios";
import { useRecoilState } from "recoil";
import workspace from "@/layouts/workspace";
import { pageWithLayout } from "@/layoutTypes";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
import { workspacestate } from "@/state";
import { HrShell } from "@/components/hr/hrkit";
import { useTeam, Card, Empty, inputClass, btn, btnPrimary } from "@/components/team/teamkit";

export const getServerSideProps = withPermissionCheckSsr(async () => ({ props: {} }));

type Req = { key: string; label: string; met: boolean; current: string; target: string; progress: number };
type PathProgress = { pathId: string; fromRole: string; toRole: string; note?: string; requirements: Req[]; ready: boolean; progress: number };

const PromotionPaths: pageWithLayout = () => {
  const [ws] = useRecoilState(workspacestate);
  const paths = useTeam("paths");
  const certs = useTeam("certifications");
  const isManager = paths.me.isManager;
  const [mine, setMine] = useState<{ roles: string[]; paths: PathProgress[] } | null>(null);
  const [ready, setReady] = useState<any[] | null>(null);
  const [open, setOpen] = useState(false);
  const blank = { fromRole: "", toRole: "", note: "", minHoursPerWeek: 0, minDaysOnTeam: 0, certIds: [] as string[], noActiveInfractions: true, minKudos: 0, minReviewAverage: 0 };
  const [form, setForm] = useState(blank);
  const roleNames: string[] = ((ws as any).roles || []).map((r: any) => r.name).filter(Boolean);

  useEffect(() => {
    if (!paths.id) return;
    axios.get(`/api/workspace/${paths.id}/paths/progress`).then((r) => setMine(r.data)).catch(() => {});
    if (isManager) axios.get(`/api/workspace/${paths.id}/paths/progress`, { params: { ready: 1 } }).then((r) => setReady(r.data.ready)).catch(() => {});
  }, [paths.id, isManager, paths.items.length]);

  const create = async () => {
    const ok = await paths.create({
      fromRole: form.fromRole, toRole: form.toRole, note: form.note,
      criteria: { minHoursPerWeek: form.minHoursPerWeek, minDaysOnTeam: form.minDaysOnTeam, certIds: form.certIds, noActiveInfractions: form.noActiveInfractions, minKudos: form.minKudos, minReviewAverage: form.minReviewAverage },
    }, "Promotion path published");
    if (ok) { setForm(blank); setOpen(false); }
  };

  const num = (label: string, key: keyof typeof form, step = 1) => (
    <label className="block text-xs text-zinc-500">{label}
      <input type="number" min={0} step={step} value={form[key] as number} onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })} className={inputClass} />
    </label>
  );

  return (
    <HrShell
      title="Promotion paths"
      description="Clear, published requirements for every promotion, and your live progress towards the next rank."
      action={isManager && <button onClick={() => setOpen(!open)} className={btnPrimary}>{open ? "Close" : "New path"}</button>}
    >
      {open && (
        <Card className="mb-6 space-y-3">
          <datalist id="role-names">{roleNames.map((r) => <option key={r} value={r} />)}</datalist>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block text-xs text-zinc-500">From role<input list="role-names" value={form.fromRole} onChange={(e) => setForm({ ...form, fromRole: e.target.value })} placeholder="e.g. Trial Moderator" className={inputClass} /></label>
            <label className="block text-xs text-zinc-500">To role<input list="role-names" value={form.toRole} onChange={(e) => setForm({ ...form, toRole: e.target.value })} placeholder="e.g. Moderator" className={inputClass} /></label>
          </div>
          <div className="grid gap-2 sm:grid-cols-4">
            {num("Hours a week in game (avg)", "minHoursPerWeek", 0.5)}
            {num("Days on the team", "minDaysOnTeam")}
            {num("Kudos received", "minKudos")}
            {num("Average review ★ (0–5)", "minReviewAverage", 0.5)}
          </div>
          {certs.items.length > 0 && (
            <fieldset>
              <legend className="text-xs text-zinc-500">Required certifications</legend>
              <div className="mt-1 flex flex-wrap gap-2">
                {certs.items.map((c) => (
                  <label key={c.id} className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-2 py-1 text-sm dark:border-zinc-700 dark:text-zinc-200">
                    <input type="checkbox" checked={form.certIds.includes(c.id)} onChange={(e) => setForm({ ...form, certIds: e.target.checked ? [...form.certIds, c.id] : form.certIds.filter((x) => x !== c.id) })} className="h-4 w-4" />
                    {c.name}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300"><input type="checkbox" checked={form.noActiveInfractions} onChange={(e) => setForm({ ...form, noActiveInfractions: e.target.checked })} className="h-4 w-4" /> No active infractions</label>
          <textarea aria-label="Note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} rows={2} maxLength={500} placeholder="Anything else they should know (optional), e.g. also needs an interview" className={inputClass} />
          <button disabled={!form.fromRole.trim() || !form.toRole.trim()} onClick={create} className={btnPrimary}>Publish path</button>
          <p className="text-xs text-zinc-500">Everyone can see published paths. That’s the point: promotions everyone understands.</p>
        </Card>
      )}

      <h2 className="mb-3 text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">Your progress</h2>
      {!mine ? <p className="text-sm text-zinc-500">Loading…</p> : mine.paths.length === 0 ? (
        <Empty>{paths.items.length ? `There’s no published path from your role${mine.roles.length ? ` (${mine.roles.join(", ")})` : ""} yet.` : "No promotion paths have been published yet."}</Empty>
      ) : (
        <div className="space-y-4">
          {mine.paths.map((p) => (
            <Card key={p.pathId}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-zinc-900 dark:text-white">{p.fromRole} → {p.toRole}</p>
                {p.ready ? <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">Ready for promotion</span> : <span className="text-sm font-medium text-zinc-500">{p.progress}% there</span>}
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-700" role="progressbar" aria-valuenow={p.progress} aria-valuemin={0} aria-valuemax={100} aria-label="Overall progress">
                <div className="h-full rounded-full" style={{ width: `${p.progress}%`, backgroundColor: p.ready ? "#10B981" : "#F28C28" }} />
              </div>
              <ul className="mt-4 space-y-2">
                {p.requirements.map((r) => (
                  <li key={r.key} className="flex items-center gap-3 text-sm">
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs ${r.met ? "bg-emerald-500 text-white" : "border border-zinc-300 dark:border-zinc-600"}`} aria-hidden="true">{r.met ? "✓" : ""}</span>
                    <span className="flex-1 text-zinc-800 dark:text-zinc-200">{r.label}<span className="sr-only">{r.met ? ", done" : ", not yet"}</span></span>
                    <span className="text-xs text-zinc-500">{r.current} / {r.target}</span>
                  </li>
                ))}
              </ul>
              {p.note && <p className="mt-3 text-sm text-zinc-500">{p.note}</p>}
              <p className="mt-3 text-xs text-zinc-500">Meeting every requirement makes you eligible, and leadership makes the final call.</p>
            </Card>
          ))}
        </div>
      )}

      {isManager && (
        <>
          <h2 className="mb-3 mt-8 text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">Ready for promotion</h2>
          {!ready ? <p className="text-sm text-zinc-500">Checking everyone…</p> : ready.length === 0 ? <Empty>Nobody meets every requirement right now.</Empty> : (
            <Card className="divide-y divide-zinc-200 p-0 dark:divide-zinc-700">
              {ready.map((r, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3 text-sm">
                  <img src={r.picture || "/default-avatar.jpg"} alt="" className="h-8 w-8 rounded-full bg-zinc-200 object-cover dark:bg-zinc-700" />
                  <span className="flex-1 font-medium text-zinc-900 dark:text-white">{r.username}</span>
                  <span className="text-zinc-500">{r.fromRole} → <strong className="text-zinc-800 dark:text-zinc-200">{r.toRole}</strong></span>
                </div>
              ))}
            </Card>
          )}
          <h2 className="mb-3 mt-8 text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">Published paths</h2>
          {paths.items.length === 0 ? <Empty>No paths yet.</Empty> : (
            <Card className="divide-y divide-zinc-200 p-0 dark:divide-zinc-700">
              {paths.items.map((p) => (
                <div key={p.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                  <span className="flex-1 font-medium text-zinc-900 dark:text-white">{p.fromRole} → {p.toRole}</span>
                  <button onClick={() => window.confirm("Remove this path?") && paths.remove(p.id)} className={btn}>Remove</button>
                </div>
              ))}
            </Card>
          )}
        </>
      )}
    </HrShell>
  );
};

PromotionPaths.layout = workspace;
export default PromotionPaths;
