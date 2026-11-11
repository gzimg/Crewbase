import { useState } from "react";
import workspace from "@/layouts/workspace";
import { pageWithLayout } from "@/layoutTypes";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
export const getServerSideProps = withPermissionCheckSsr(async () => ({ props: {} }));
import { HrShell, useHrMe, StatusPill } from "@/components/hr/hrkit";
import { useTeam, useMembers, MemberSelect, Card, Empty, inputClass, btn, btnPrimary, ago, Member } from "@/components/team/teamkit";

const Plans: pageWithLayout = () => {
  const me = useHrMe();
  const t = useTeam("pips");
  const members = useMembers();
  const canManage = !!me?.can.plans;
  const [open, setOpen] = useState(false);
  const blank = { member: null as Member | null, concern: "", goals: "", support: "", reviewDate: "" };
  const [form, setForm] = useState(blank);
  const [checkin, setCheckin] = useState<Record<string, string>>({});

  const create = async () => {
    if (!form.member) return;
    const ok = await t.create({
      userId: form.member.userId, username: form.member.username, concern: form.concern,
      goals: form.goals.split("\n").map((g) => g.trim()).filter(Boolean), support: form.support,
      reviewDate: form.reviewDate ? new Date(form.reviewDate + "T12:00:00").toISOString() : null,
    }, "Improvement plan created");
    if (ok) { setForm(blank); setOpen(false); }
  };

  return (
    <HrShell
      title="Improvement plans"
      description={canManage ? "Clear goals, support and check-ins to help someone get back on track." : "Plans to help you succeed, with clear goals and support."}
      action={canManage && <button onClick={() => setOpen(!open)} className={btnPrimary}>{open ? "Close" : "New plan"}</button>}
    >
      {open && (
        <Card className="mb-6 space-y-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <MemberSelect id="pip-member" members={members} value={form.member?.userId || ""} onChange={(m) => setForm({ ...form, member: m })} />
            <label className="text-xs text-zinc-500">Review date<input type="date" value={form.reviewDate} onChange={(e) => setForm({ ...form, reviewDate: e.target.value })} className={inputClass} /></label>
          </div>
          <textarea aria-label="Concern" value={form.concern} onChange={(e) => setForm({ ...form, concern: e.target.value })} rows={2} maxLength={2000} placeholder="What’s the concern? Be specific and kind." className={inputClass} />
          <textarea aria-label="Goals, one per line" value={form.goals} onChange={(e) => setForm({ ...form, goals: e.target.value })} rows={4} placeholder={"Goals, one per line, e.g.\nReach the weekly quota for 3 weeks\nAttend 2 trainings"} className={inputClass} />
          <textarea aria-label="Support offered" value={form.support} onChange={(e) => setForm({ ...form, support: e.target.value })} rows={2} maxLength={2000} placeholder="How will you support them? (mentor, training, check-ins)" className={inputClass} />
          <button disabled={!form.member || !form.goals.trim()} onClick={create} className={btnPrimary}>Create plan</button>
        </Card>
      )}
      {!t.loading && t.items.length === 0 && <Empty>{canManage ? "No improvement plans." : "You don’t have an improvement plan."}</Empty>}
      <div className="space-y-4">
        {t.items.map((p) => {
          const done = p.goals.filter((g: any) => g.done).length;
          return (
            <Card key={p.id}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-zinc-900 dark:text-white">{p.username}</span>
                <span className="text-xs text-zinc-500">started {new Date(p.createdAt).toLocaleDateString()}{p.reviewDate ? ` · review ${new Date(p.reviewDate).toLocaleDateString()}` : ""}</span>
                <span className="ml-auto"><StatusPill status={p.status} /></span>
              </div>
              {p.concern && <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300"><strong>Concern:</strong> {p.concern}</p>}
              <p className="mt-3 text-xs font-medium text-zinc-500">Goals ({done}/{p.goals.length})</p>
              <ul className="mt-1 space-y-1">
                {p.goals.map((g: any, i: number) => (
                  <li key={i}>
                    <label className="flex items-start gap-2 text-sm">
                      <input type="checkbox" checked={!!g.done} disabled={!canManage} onChange={() => t.act(p.id, "goal", { index: i })} className="mt-0.5 h-4 w-4" />
                      <span className={g.done ? "text-zinc-400 line-through" : "text-zinc-800 dark:text-zinc-200"}>{g.text}</span>
                    </label>
                  </li>
                ))}
              </ul>
              {p.support && <p className="mt-3 text-sm text-zinc-700 dark:text-zinc-300"><strong>Support:</strong> {p.support}</p>}
              {(p.checkins || []).length > 0 && (
                <ul className="mt-3 space-y-1 border-l-2 border-zinc-200 pl-3 text-sm dark:border-zinc-700">
                  {p.checkins.map((c: any, i: number) => <li key={i} className="text-zinc-600 dark:text-zinc-400"><strong>{c.by}</strong> · {ago(c.at)}: {c.text}</li>)}
                </ul>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {p.userId === me?.id && !p.acknowledgedAt && <button onClick={() => t.act(p.id, "acknowledge", {}, "Thanks")} className={btnPrimary}>I’ve read my plan</button>}
                {canManage && (
                  <>
                    <input aria-label="Check-in note" value={checkin[p.id] || ""} onChange={(e) => setCheckin({ ...checkin, [p.id]: e.target.value })} placeholder="Check-in note" className={`${inputClass} min-w-[180px] flex-1`} />
                    <button disabled={!checkin[p.id]?.trim()} onClick={async () => { if (await t.act(p.id, "checkin", { text: checkin[p.id] }, "Check-in added")) setCheckin({ ...checkin, [p.id]: "" }); }} className={btn}>Add check-in</button>
                    <select aria-label="Outcome" value={p.status} onChange={(e) => t.act(p.id, "outcome", { status: e.target.value }, "Updated")} className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-white">
                      <option value="active">Active</option><option value="passed">Passed</option><option value="extended">Extended</option><option value="unsuccessful">Unsuccessful</option>
                    </select>
                  </>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </HrShell>
  );
};
Plans.layout = workspace;
export default Plans;
