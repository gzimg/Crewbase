import { useState } from "react";
import workspace from "@/layouts/workspace";
import { pageWithLayout } from "@/layoutTypes";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
export const getServerSideProps = withPermissionCheckSsr(async () => ({ props: {} }));
import { TeamShell, useTeam, useMembers, MemberSelect, Card, Empty, inputClass, btn, btnPrimary, Member } from "@/components/team/teamkit";

const Spotlight: pageWithLayout = () => {
  const t = useTeam("nominations");
  const members = useMembers();
  const [form, setForm] = useState<{ member: Member | null; reason: string }>({ member: null, reason: "" });
  const month = new Date().toISOString().slice(0, 7);
  const monthName = new Date().toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const current = t.items.filter((n) => n.month === month).sort((a, b) => (b.voters?.length || 0) - (a.voters?.length || 0));
  const winners = t.items.filter((n) => n.winner).sort((a, b) => b.month.localeCompare(a.month));
  const alreadyNominated = current.some((n) => n.createdBy === t.me.id);

  return (
    <TeamShell title="Staff of the Month" description={`Nominate teammates and vote for ${monthName}’s Staff of the Month. Managers pick the winner.`}>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          {!alreadyNominated ? (
            <Card className="space-y-2">
              <p className="text-sm font-semibold text-zinc-900 dark:text-white">Nominate someone for {monthName}</p>
              <MemberSelect id="nom-member" members={members.filter((m) => m.userId !== t.me.id)} value={form.member?.userId || ""} onChange={(m) => setForm({ ...form, member: m })} />
              <textarea aria-label="Why?" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={3} maxLength={600} placeholder="Why do they deserve it?" className={inputClass} />
              <button disabled={!form.member || form.reason.trim().length < 10} onClick={async () => { if (form.member && await t.create({ nomineeId: form.member.userId, nomineeName: form.member.username, reason: form.reason }, "Nomination sent")) setForm({ member: null, reason: "" }); }} className={btnPrimary}>Nominate</button>
            </Card>
          ) : (
            <Card><p className="text-sm text-zinc-600 dark:text-zinc-300">✓ You’ve nominated someone this month. You can still vote for other nominations.</p></Card>
          )}
          <h2 className="pt-2 text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">{monthName} nominations</h2>
          {!t.loading && current.length === 0 && <Empty>No nominations yet this month.</Empty>}
          {current.map((n, i) => {
            const voted = (n.voters || []).includes(t.me.id);
            return (
              <Card key={n.id} className={n.winner ? "border-amber-400" : ""}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-lg" aria-hidden="true">{n.winner ? "🏆" : i === 0 && (n.voters || []).length > 0 ? "🔥" : "🌟"}</span>
                  <h3 className="font-semibold text-zinc-900 dark:text-white">{n.nomineeName}</h3>
                  <span className="text-xs text-zinc-500">nominated by {n.createdByName}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">{n.reason}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button onClick={() => t.act(n.id, "upvote")} aria-pressed={voted} className={voted ? btnPrimary : btn}>👍 {(n.voters || []).length}</button>
                  {t.me.isManager && <button onClick={() => t.act(n.id, "winner", {}, n.winner ? "Winner removed" : "Winner announced!")} className={`${btn} ml-auto`}>{n.winner ? "Remove winner" : "Pick as winner"}</button>}
                  {(t.me.isManager || n.createdBy === t.me.id) && <button onClick={() => window.confirm("Delete this nomination?") && t.remove(n.id)} className={btn}>Delete</button>}
                </div>
              </Card>
            );
          })}
        </div>
        <Card>
          <h2 className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">Hall of fame</h2>
          {winners.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">No winners yet.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {winners.map((w) => (
                <li key={w.id} className="text-sm">
                  <p className="font-semibold text-zinc-900 dark:text-white">🏆 {w.nomineeName}</p>
                  <p className="text-xs text-zinc-500">{new Date(w.month + "-01T12:00:00").toLocaleDateString(undefined, { month: "long", year: "numeric" })}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </TeamShell>
  );
};
Spotlight.layout = workspace;
export default Spotlight;
