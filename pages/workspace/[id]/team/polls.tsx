import { useState } from "react";
import workspace from "@/layouts/workspace";
import { pageWithLayout } from "@/layoutTypes";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
export const getServerSideProps = withPermissionCheckSsr(async () => ({ props: {} }));
import { TeamShell, useTeam, Card, Empty, inputClass, btn, btnPrimary, ago } from "@/components/team/teamkit";

const Polls: pageWithLayout = () => {
  const t = useTeam("polls");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ question: "", options: ["", ""], anonymous: false, closesAt: "" });

  const save = async () => {
    const payload = { ...form, options: form.options.filter((o) => o.trim()), closesAt: form.closesAt ? new Date(form.closesAt).toISOString() : null };
    if (await t.create(payload, "Poll created")) { setForm({ question: "", options: ["", ""], anonymous: false, closesAt: "" }); setOpen(false); }
  };

  return (
    <TeamShell
      title="Polls"
      description="Ask the team and see what everyone thinks."
      action={t.me.isManager && <button onClick={() => setOpen(!open)} className={btnPrimary}>{open ? "Close" : "New poll"}</button>}
    >
      {open && (
        <Card className="mb-6 space-y-2">
          <input aria-label="Question" value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} maxLength={200} placeholder="Ask a question" className={inputClass} />
          {form.options.map((o, i) => (
            <div key={i} className="flex gap-2">
              <input aria-label={`Option ${i + 1}`} value={o} onChange={(e) => { const options = [...form.options]; options[i] = e.target.value; setForm({ ...form, options }); }} maxLength={80} placeholder={`Option ${i + 1}`} className={inputClass} />
              {form.options.length > 2 && <button onClick={() => setForm({ ...form, options: form.options.filter((_, j) => j !== i) })} className={btn} aria-label={`Remove option ${i + 1}`}>×</button>}
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-700 dark:text-zinc-300">
            {form.options.length < 8 && <button onClick={() => setForm({ ...form, options: [...form.options, ""] })} className={btn}>Add option</button>}
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.anonymous} onChange={(e) => setForm({ ...form, anonymous: e.target.checked })} className="h-4 w-4" /> Anonymous votes</label>
            <label className="flex items-center gap-2 text-xs text-zinc-500">Closes <input type="datetime-local" value={form.closesAt} onChange={(e) => setForm({ ...form, closesAt: e.target.value })} className={`${inputClass} w-auto`} /></label>
            <button disabled={!form.question.trim() || form.options.filter((o) => o.trim()).length < 2} onClick={save} className={`${btnPrimary} ml-auto`}>Create poll</button>
          </div>
        </Card>
      )}
      {!t.loading && t.items.length === 0 && <Empty>No polls yet.</Empty>}
      <div className="grid gap-4 md:grid-cols-2">
        {t.items.map((p) => {
          const votes = p.votes || {};
          const tally: Record<number, number> = p.tally || {};
          if (!p.tally) for (const v of Object.values(votes) as any[]) tally[v.option] = (tally[v.option] || 0) + 1;
          const total = Object.values(tally).reduce((a, b) => a + b, 0);
          const mine = votes[t.me.id]?.option;
          const closed = p.closesAt && new Date(p.closesAt) < new Date();
          return (
            <Card key={p.id}>
              <p className="text-xs text-zinc-500">{p.createdByName || "Leadership"} · {ago(p.createdAt)}{p.anonymous ? " · anonymous" : ""}{closed ? " · closed" : p.closesAt ? ` · closes ${new Date(p.closesAt).toLocaleString()}` : ""}</p>
              <h3 className="mt-1 font-semibold text-zinc-900 dark:text-white">{p.question}</h3>
              <div className="mt-3 space-y-2">
                {p.options.map((o: string, i: number) => {
                  const pct = total ? Math.round(((tally[i] || 0) / total) * 100) : 0;
                  const voters = !p.anonymous ? (Object.values(votes) as any[]).filter((v) => v.option === i).map((v) => v.name).join(", ") : "";
                  return (
                    <button
                      key={i}
                      disabled={!!closed}
                      onClick={() => t.act(p.id, "vote", { option: i })}
                      title={voters}
                      aria-pressed={mine === i}
                      className={`relative w-full overflow-hidden rounded-lg border px-3 py-2 text-left text-sm ${mine === i ? "border-zinc-900 dark:border-white" : "border-zinc-200 dark:border-zinc-700"} disabled:cursor-default`}
                    >
                      <span className="absolute inset-y-0 left-0 bg-zinc-100 dark:bg-zinc-700" style={{ width: `${pct}%` }} aria-hidden="true" />
                      <span className="relative flex justify-between gap-2 text-zinc-900 dark:text-white">
                        <span>{mine === i ? "✓ " : ""}{o}</span>
                        <span className="tabular-nums text-zinc-500">{pct}%</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
                <span>{total} vote{total === 1 ? "" : "s"}</span>
                {t.me.isManager && <button onClick={() => window.confirm("Delete this poll?") && t.remove(p.id)} className={btn}>Delete</button>}
              </div>
            </Card>
          );
        })}
      </div>
    </TeamShell>
  );
};
Polls.layout = workspace;
export default Polls;
