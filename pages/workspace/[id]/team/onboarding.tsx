import { useState } from "react";
import workspace from "@/layouts/workspace";
import { pageWithLayout } from "@/layoutTypes";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
export const getServerSideProps = withPermissionCheckSsr(async () => ({ props: {} }));
import { TeamShell, useTeam, useMembers, MemberSelect, Card, Empty, inputClass, btn, btnPrimary, Member } from "@/components/team/teamkit";

const Onboarding: pageWithLayout = () => {
  const templates = useTeam("checklists");
  const assigned = useTeam("onboarding");
  const members = useMembers();
  const isManager = templates.me.isManager;
  const [tpl, setTpl] = useState({ name: "", description: "", steps: "" });
  const [assign, setAssign] = useState<{ templateId: string; member: Member | null; due: string }>({ templateId: "", member: null, due: "" });

  const createTemplate = async () => {
    const steps = tpl.steps.split("\n").map((s) => s.trim()).filter(Boolean);
    if (await templates.create({ name: tpl.name, description: tpl.description, steps }, "Checklist saved")) setTpl({ name: "", description: "", steps: "" });
  };
  const doAssign = async () => {
    const t = templates.items.find((x) => x.id === assign.templateId);
    if (!t || !assign.member) return;
    const ok = await assigned.create({ userId: assign.member.userId, username: assign.member.username, name: t.name, steps: t.steps, due: assign.due ? new Date(assign.due + "T23:59:00").toISOString() : null }, `Assigned to ${assign.member.username}`);
    if (ok) setAssign({ ...assign, member: null });
  };

  const mine = assigned.items.filter((a) => a.userId === templates.me.id);
  const others = isManager ? assigned.items.filter((a) => a.userId !== templates.me.id) : [];

  const ChecklistCard = ({ a, showName }: { a: any; showName?: boolean }) => {
    const done = a.steps.filter((s: any) => s.done).length;
    const pct = Math.round((done / a.steps.length) * 100);
    return (
      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-zinc-900 dark:text-white">{showName ? `${a.username} · ` : ""}{a.name}</h3>
          {a.completedAt ? <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">✓ Complete</span> : a.due && <span className={`text-xs ${new Date(a.due) < new Date() ? "font-semibold text-red-600 dark:text-red-400" : "text-zinc-500"}`}>due {new Date(a.due).toLocaleDateString()}</span>}
          {isManager && <button onClick={() => window.confirm("Remove this checklist?") && assigned.remove(a.id)} className={`${btn} ml-auto`}>Remove</button>}
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-700" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progress">
          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-1 text-xs text-zinc-500">{done} of {a.steps.length} done</p>
        <ul className="mt-3 space-y-1">
          {a.steps.map((s: any, i: number) => (
            <li key={i}>
              <label className="flex items-start gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-700/40">
                <input type="checkbox" checked={!!s.done} onChange={() => assigned.act(a.id, "toggle", { step: i })} disabled={!(isManager || a.userId === templates.me.id)} className="mt-0.5 h-4 w-4" />
                <span className={s.done ? "text-zinc-400 line-through" : "text-zinc-800 dark:text-zinc-200"}>{s.text}</span>
              </label>
            </li>
          ))}
        </ul>
      </Card>
    );
  };

  return (
    <TeamShell title="Onboarding" description="Step-by-step checklists that help new staff get up to speed.">
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <h2 className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">Your checklists</h2>
          {!assigned.loading && mine.length === 0 && <Empty>You don’t have any checklists right now.</Empty>}
          {mine.map((a) => <ChecklistCard key={a.id} a={a} />)}
          {isManager && (
            <>
              <h2 className="pt-4 text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">Team progress</h2>
              {others.length === 0 && <Empty>No checklists assigned to others yet.</Empty>}
              {others.map((a) => <ChecklistCard key={a.id} a={a} showName />)}
            </>
          )}
        </div>
        {isManager && (
          <div className="space-y-4">
            <Card className="space-y-2">
              <p className="text-sm font-semibold text-zinc-900 dark:text-white">Assign a checklist</p>
              <select aria-label="Checklist" value={assign.templateId} onChange={(e) => setAssign({ ...assign, templateId: e.target.value })} className={inputClass}>
                <option value="">Choose a checklist…</option>
                {templates.items.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.steps.length} steps)</option>)}
              </select>
              <MemberSelect id="onb-member" members={members} value={assign.member?.userId || ""} onChange={(m) => setAssign({ ...assign, member: m })} />
              <label className="block text-xs text-zinc-500">Due (optional)<input type="date" value={assign.due} onChange={(e) => setAssign({ ...assign, due: e.target.value })} className={inputClass} /></label>
              <button disabled={!assign.templateId || !assign.member} onClick={doAssign} className={btnPrimary}>Assign</button>
            </Card>
            <Card className="space-y-2">
              <p className="text-sm font-semibold text-zinc-900 dark:text-white">New checklist template</p>
              <input aria-label="Name" value={tpl.name} onChange={(e) => setTpl({ ...tpl, name: e.target.value })} maxLength={80} placeholder="e.g. New moderator" className={inputClass} />
              <textarea aria-label="Steps, one per line" value={tpl.steps} onChange={(e) => setTpl({ ...tpl, steps: e.target.value })} rows={6} placeholder={"One step per line, e.g.\nRead the staff handbook\nJoin the staff Discord\nShadow a training session"} className={inputClass} />
              <button disabled={!tpl.name.trim() || !tpl.steps.trim()} onClick={createTemplate} className={btnPrimary}>Save template</button>
            </Card>
            {templates.items.length > 0 && (
              <Card>
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">Templates</p>
                <ul className="mt-2 divide-y divide-zinc-200 text-sm dark:divide-zinc-700">
                  {templates.items.map((t) => (
                    <li key={t.id} className="flex items-center justify-between py-2">
                      <span className="text-zinc-700 dark:text-zinc-300">{t.name} · {t.steps.length} steps</span>
                      <button onClick={() => window.confirm(`Delete the ${t.name} template?`) && templates.remove(t.id)} className={btn}>Delete</button>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        )}
      </div>
    </TeamShell>
  );
};
Onboarding.layout = workspace;
export default Onboarding;
