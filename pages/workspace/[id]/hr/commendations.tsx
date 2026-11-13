import { useState } from "react";
import workspace from "@/layouts/workspace";
import { pageWithLayout } from "@/layoutTypes";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
export const getServerSideProps = withPermissionCheckSsr(async () => ({ props: {} }));
import { HrShell, useHrMe } from "@/components/hr/hrkit";
import { useTeam, useMembers, MemberSelect, Card, Empty, inputClass, btn, btnPrimary, ago, Member } from "@/components/team/teamkit";
import UserName from "@/components/username";

const CATS: Record<string, string> = { above_and_beyond: "🌟 Above and beyond", leadership: "🧭 Leadership", teamwork: "🤝 Teamwork", reliability: "⏰ Reliability", helpfulness: "💬 Helpfulness", other: "🏅 Other" };

const Commendations: pageWithLayout = () => {
  const me = useHrMe();
  const t = useTeam("commendations");
  const members = useMembers();
  const [form, setForm] = useState<{ member: Member | null; category: string; reason: string }>({ member: null, category: "above_and_beyond", reason: "" });
  const canGive = !!me?.isHR;

  return (
    <HrShell title="Commendations" description="The good side of a staff record. Formal recognition that stays on someone’s file, next to any discipline.">
      {canGive && (
        <Card className="mb-6 space-y-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <MemberSelect id="com-member" members={members} value={form.member?.userId || ""} onChange={(m) => setForm({ ...form, member: m })} />
            <select aria-label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputClass}>
              {Object.entries(CATS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <textarea aria-label="What they did" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={2} maxLength={500} placeholder="What did they do?" className={inputClass} />
          <button disabled={!form.member || form.reason.trim().length < 5} onClick={async () => { if (form.member && await t.create({ userId: form.member.userId, username: form.member.username, category: form.category, reason: form.reason }, "Commendation given")) setForm({ ...form, member: null, reason: "" }); }} className={btnPrimary}>Commend</button>
        </Card>
      )}
      {!t.loading && t.items.length === 0 && <Empty>{canGive ? "No commendations yet." : "You don’t have any commendations yet."}</Empty>}
      <div className="space-y-3">
        {t.items.map((c) => (
          <Card key={c.id}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-zinc-900 dark:text-white"><UserName userId={c.userId} name={c.username} /></span>
              <span className="text-sm text-zinc-500">{CATS[c.category]}</span>
              <span className="ml-auto text-xs text-zinc-500">by {c.createdByName} · {ago(c.createdAt)}</span>
            </div>
            <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">{c.reason}</p>
            {canGive && <button onClick={() => window.confirm("Remove this commendation?") && t.remove(c.id)} className={`${btn} mt-3`}>Remove</button>}
          </Card>
        ))}
      </div>
    </HrShell>
  );
};
Commendations.layout = workspace;
export default Commendations;
