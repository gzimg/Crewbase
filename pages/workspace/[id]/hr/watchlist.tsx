import { useState } from "react";
import workspace from "@/layouts/workspace";
import { pageWithLayout } from "@/layoutTypes";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
export const getServerSideProps = withPermissionCheckSsr(async () => ({ props: {} }));
import { HrShell, useHrMe } from "@/components/hr/hrkit";
import { useTeam, useMembers, MemberSelect, Card, Empty, inputClass, btn, btnPrimary, Member } from "@/components/team/teamkit";
import UserName from "@/components/username";

const LEVEL: Record<string, string> = { monitor: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200", concern: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200", serious: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200" };

const Watchlist: pageWithLayout = () => {
  const me = useHrMe();
  const t = useTeam("watchlist");
  const members = useMembers();
  const [form, setForm] = useState<{ member: Member | null; reason: string; level: string; reviewDate: string }>({ member: null, reason: "", level: "monitor", reviewDate: "" });
  if (me && !me.isHR) return <HrShell title="Watchlist" description=""><Empty>Only HR can see the watchlist.</Empty></HrShell>;
  const canEdit = !!(me?.can.infractions || me?.can.cases);
  const due = (d?: string) => d && new Date(d).getTime() < Date.now();

  return (
    <HrShell title="Watchlist" description="Staff HR is keeping an eye on, with a date to review. Private to HR; the person can’t see it.">
      {canEdit && (
        <Card className="mb-6 space-y-2">
          <div className="grid gap-2 sm:grid-cols-3">
            <MemberSelect id="wl-member" members={members} value={form.member?.userId || ""} onChange={(m) => setForm({ ...form, member: m })} />
            <select aria-label="Level" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} className={inputClass}>
              <option value="monitor">Monitor</option><option value="concern">Concern</option><option value="serious">Serious</option>
            </select>
            <label className="text-xs text-zinc-500">Review on<input type="date" value={form.reviewDate} onChange={(e) => setForm({ ...form, reviewDate: e.target.value })} className={inputClass} /></label>
          </div>
          <input aria-label="Why" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} maxLength={500} placeholder="Why are we watching? Stick to facts." className={inputClass} />
          <button disabled={!form.member || !form.reason.trim()} onClick={async () => { if (form.member && await t.create({ userId: form.member.userId, username: form.member.username, reason: form.reason, level: form.level, reviewDate: form.reviewDate ? new Date(form.reviewDate + "T12:00:00").toISOString() : null }, "Added to watchlist")) setForm({ member: null, reason: "", level: "monitor", reviewDate: "" }); }} className={btnPrimary}>Add</button>
        </Card>
      )}
      {!t.loading && t.items.length === 0 && <Empty>Nobody’s on the watchlist.</Empty>}
      <Card className="divide-y divide-zinc-200 p-0 dark:divide-zinc-700">
        {t.items.map((w) => (
          <div key={w.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
            <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold capitalize ${LEVEL[w.level]}`}>{w.level}</span>
            <span className="font-medium text-zinc-900 dark:text-white"><UserName userId={w.userId} name={w.username} /></span>
            <span className="flex-1 text-zinc-600 dark:text-zinc-400">{w.reason}</span>
            {w.reviewDate && <span className={`text-xs ${due(w.reviewDate) ? "font-semibold text-red-600 dark:text-red-400" : "text-zinc-500"}`}>{due(w.reviewDate) ? "Review overdue" : `Review ${new Date(w.reviewDate).toLocaleDateString()}`}</span>}
            {canEdit && <button onClick={() => t.remove(w.id, "Removed from watchlist")} className={btn}>Remove</button>}
          </div>
        ))}
      </Card>
    </HrShell>
  );
};
Watchlist.layout = workspace;
export default Watchlist;
