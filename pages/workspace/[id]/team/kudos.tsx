import { useState } from "react";
import workspace from "@/layouts/workspace";
import { pageWithLayout } from "@/layoutTypes";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
export const getServerSideProps = withPermissionCheckSsr(async () => ({ props: {} }));
import { TeamShell, useTeam, useMembers, MemberSelect, Card, Empty, inputClass, btn, btnPrimary, ago, Member } from "@/components/team/teamkit";

const EMOJI = ["⭐", "🔥", "🙌", "💪", "🏆", "❤️", "🎉", "🧠"];

const Kudos: pageWithLayout = () => {
  const t = useTeam("kudos");
  const members = useMembers();
  const [form, setForm] = useState<{ member: Member | null; message: string; emoji: string }>({ member: null, message: "", emoji: "⭐" });

  // Top receivers this month
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
  const counts = new Map<string, { name: string; n: number }>();
  for (const k of t.items) {
    if (new Date(k.createdAt).getTime() < monthStart) continue;
    const c = counts.get(k.toUserId) || { name: k.toUsername, n: 0 };
    counts.set(k.toUserId, { name: c.name, n: c.n + 1 });
  }
  const leaders = Array.from(counts.values()).sort((a, b) => b.n - a.n).slice(0, 5);

  const send = async () => {
    if (!form.member) return;
    if (await t.create({ toUserId: form.member.userId, toUsername: form.member.username, message: form.message, emoji: form.emoji }, `Kudos sent to ${form.member.username}`)) {
      setForm({ member: null, message: "", emoji: form.emoji });
    }
  };

  return (
    <TeamShell title="Kudos" description="Shout out teammates who went above and beyond.">
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-4">
          <Card className="space-y-2">
            <MemberSelect id="kudos-member" label="Who’s it for?" members={members.filter((m) => m.userId !== t.me.id)} value={form.member?.userId || ""} onChange={(m) => setForm({ ...form, member: m })} />
            <textarea aria-label="Message" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={3} maxLength={500} placeholder="What did they do?" className={inputClass} />
            <div className="flex flex-wrap items-center gap-1" role="radiogroup" aria-label="Emoji">
              {EMOJI.map((e) => (
                <button key={e} role="radio" aria-checked={form.emoji === e} onClick={() => setForm({ ...form, emoji: e })} className={`h-9 w-9 rounded-lg text-lg ${form.emoji === e ? "bg-zinc-200 dark:bg-zinc-600" : "hover:bg-zinc-100 dark:hover:bg-zinc-700"}`}>{e}</button>
              ))}
              <button disabled={!form.member || form.message.trim().length < 3} onClick={send} className={`${btnPrimary} ml-auto`}>Send kudos</button>
            </div>
          </Card>
          {!t.loading && t.items.length === 0 && <Empty>No kudos yet. Be the first!</Empty>}
          {t.items.map((k) => {
            const cheered = (k.cheers || []).includes(t.me.id);
            return (
              <Card key={k.id} className="flex gap-4">
                <span className="text-3xl" aria-hidden="true">{k.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-zinc-500"><strong className="text-zinc-900 dark:text-white">{k.createdByName}</strong> to <strong className="text-zinc-900 dark:text-white">{k.toUsername}</strong> · {ago(k.createdAt)}</p>
                  <p className="mt-1 whitespace-pre-wrap text-zinc-800 dark:text-zinc-200">{k.message}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <button onClick={() => t.act(k.id, "cheer")} aria-pressed={cheered} className={cheered ? btnPrimary : btn}>👏 {(k.cheers || []).length || ""}</button>
                    {(t.me.isManager || k.createdBy === t.me.id) && <button onClick={() => t.remove(k.id)} className={`${btn} ml-auto`}>Delete</button>}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
        <div>
          <Card>
            <h2 className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">Most kudos this month</h2>
            {leaders.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-500">Nobody yet this month.</p>
            ) : (
              <ol className="mt-3 space-y-2">
                {leaders.map((l, i) => (
                  <li key={l.name} className="flex items-center justify-between text-sm">
                    <span className="text-zinc-800 dark:text-zinc-200">{["🥇", "🥈", "🥉", "4.", "5."][i]} {l.name}</span>
                    <span className="tabular-nums text-zinc-500">{l.n}</span>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
      </div>
    </TeamShell>
  );
};
Kudos.layout = workspace;
export default Kudos;
