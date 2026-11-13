import { useState } from "react";
import UserName from "@/components/username";
import workspace from "@/layouts/workspace";
import { pageWithLayout } from "@/layoutTypes";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
export const getServerSideProps = withPermissionCheckSsr(async () => ({ props: {} }));
import { TeamShell, useTeam, Card, Empty, inputClass, btn, btnPrimary, ago } from "@/components/team/teamkit";

const Announcements: pageWithLayout = () => {
  const t = useTeam("announcements");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", pinned: false, important: false });
  const sorted = [...t.items].sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned));

  return (
    <TeamShell
      title="Announcements"
      description="Official updates from your workspace’s leadership."
      action={t.me.isManager && <button onClick={() => setOpen(!open)} className={btnPrimary}>{open ? "Close" : "New announcement"}</button>}
    >
      {open && (
        <Card className="mb-6 space-y-3">
          <label htmlFor="a-title" className="sr-only">Title</label>
          <input id="a-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={120} placeholder="Title" className={inputClass} />
          <label htmlFor="a-body" className="sr-only">Message</label>
          <textarea id="a-body" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={5} maxLength={4000} placeholder="What does the team need to know?" className={inputClass} />
          <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-700 dark:text-zinc-300">
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.pinned} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} className="h-4 w-4" /> Pin to top</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.important} onChange={(e) => setForm({ ...form, important: e.target.checked })} className="h-4 w-4" /> Ask members to confirm they’ve read it</label>
            <button
              disabled={!form.title.trim()}
              onClick={async () => { if (await t.create(form, "Posted")) { setForm({ title: "", body: "", pinned: false, important: false }); setOpen(false); } }}
              className={`${btnPrimary} ml-auto`}
            >
              Post
            </button>
          </div>
        </Card>
      )}
      {!t.loading && sorted.length === 0 && <Empty>No announcements yet.</Empty>}
      <div className="space-y-4">
        {sorted.map((a) => {
          const read = (a.readBy || []).includes(t.me.id);
          return (
            <Card key={a.id} className={a.pinned ? "border-[color:var(--group-theme,#F28C28)]" : ""}>
              <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                {a.pinned && <span className="rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">Pinned</span>}
                {a.important && <span className="rounded bg-red-100 px-1.5 py-0.5 font-medium text-red-800 dark:bg-red-900/40 dark:text-red-200">Important</span>}
                <span><UserName userId={a.createdBy} name={a.createdByName || "Leadership"} /> · {ago(a.createdAt)}</span>
              </div>
              <h2 className="mt-2 text-lg font-semibold text-zinc-900 dark:text-white">{a.title}</h2>
              {a.body && <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{a.body}</p>}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {a.important && (read ? (
                  <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">✓ You’ve confirmed you read this</span>
                ) : (
                  <button onClick={() => t.act(a.id, "ack", {}, "Thanks for confirming")} className={btnPrimary}>I’ve read this</button>
                ))}
                {a.important && t.me.isManager && <span className="text-xs text-zinc-500">{(a.readBy || []).length} confirmed</span>}
                {t.me.isManager && (
                  <>
                    <button onClick={() => t.update(a.id, { pinned: !a.pinned }, a.pinned ? "Unpinned" : "Pinned")} className={`${btn} ml-auto`}>{a.pinned ? "Unpin" : "Pin"}</button>
                    <button onClick={() => window.confirm("Delete this announcement?") && t.remove(a.id)} className={btn}>Delete</button>
                  </>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </TeamShell>
  );
};
Announcements.layout = workspace;
export default Announcements;
