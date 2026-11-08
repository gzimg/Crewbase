import { useState } from "react";
import workspace from "@/layouts/workspace";
import { pageWithLayout } from "@/layoutTypes";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
export const getServerSideProps = withPermissionCheckSsr(async () => ({ props: {} }));
import { TeamShell, useTeam, Card, Empty, inputClass, btn, btnPrimary, ago } from "@/components/team/teamkit";

const STATUS: Record<string, { label: string; cls: string }> = {
  open: { label: "Open", cls: "bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200" },
  planned: { label: "Planned", cls: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200" },
  done: { label: "Done", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200" },
  declined: { label: "Declined", cls: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200" },
};

const Ideas: pageWithLayout = () => {
  const t = useTeam("ideas");
  const [form, setForm] = useState({ title: "", details: "" });
  const [filter, setFilter] = useState("open");
  const [sort, setSort] = useState<"top" | "new">("top");

  const list = t.items
    .filter((i) => filter === "all" || (i.status || "open") === filter)
    .sort((a, b) => (sort === "top" ? (b.voters?.length || 0) - (a.voters?.length || 0) : b.createdAt.localeCompare(a.createdAt)));

  return (
    <TeamShell title="Ideas board" description="Suggest improvements for the group and upvote the ones you like.">
      <Card className="mb-6 space-y-2">
        <input aria-label="Idea" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={140} placeholder="Your idea in one line" className={inputClass} />
        <textarea aria-label="Details" value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} rows={2} maxLength={2000} placeholder="Why would it help? (optional)" className={inputClass} />
        <button disabled={!form.title.trim()} onClick={async () => { if (await t.create(form, "Idea posted")) setForm({ title: "", details: "" }); }} className={btnPrimary}>Post idea</button>
      </Card>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {["open", "planned", "done", "declined", "all"].map((f) => (
          <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f} className={filter === f ? btnPrimary : btn}>{f === "all" ? "All" : STATUS[f].label}</button>
        ))}
        <select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value as any)} className={`${inputClass} ml-auto w-auto`}>
          <option value="top">Most votes</option><option value="new">Newest</option>
        </select>
      </div>
      {!t.loading && list.length === 0 && <Empty>No ideas here yet.</Empty>}
      <div className="space-y-3">
        {list.map((i) => {
          const voted = (i.voters || []).includes(t.me.id);
          const st = STATUS[i.status || "open"];
          return (
            <Card key={i.id} className="flex gap-4">
              <button onClick={() => t.act(i.id, "upvote")} aria-pressed={voted} aria-label={voted ? "Remove your vote" : "Upvote"} className={`flex h-14 w-12 shrink-0 flex-col items-center justify-center rounded-xl border text-sm font-semibold ${voted ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900" : "border-zinc-300 text-zinc-700 dark:border-zinc-600 dark:text-zinc-200"}`}>
                ▲<span>{(i.voters || []).length}</span>
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-zinc-900 dark:text-white">{i.title}</h3>
                  <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${st.cls}`}>{st.label}</span>
                </div>
                {i.details && <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-400">{i.details}</p>}
                {i.response && <p className="mt-2 text-sm text-zinc-500">Leadership: {i.response}</p>}
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                  <span>{i.createdByName} · {ago(i.createdAt)}</span>
                  {t.me.isManager && (
                    <select
                      aria-label="Change status"
                      value={i.status || "open"}
                      onChange={(e) => { const response = e.target.value === "declined" || e.target.value === "planned" ? window.prompt("Add a note for the team (optional)") || "" : ""; t.act(i.id, "status", { status: e.target.value, response }, "Status updated"); }}
                      className="ml-auto rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
                    >
                      {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  )}
                  {(t.me.isManager || i.createdBy === t.me.id) && <button onClick={() => window.confirm("Delete this idea?") && t.remove(i.id)} className={`${btn} ${t.me.isManager ? "" : "ml-auto"}`}>Delete</button>}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </TeamShell>
  );
};
Ideas.layout = workspace;
export default Ideas;
