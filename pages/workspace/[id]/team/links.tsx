import { useState } from "react";
import workspace from "@/layouts/workspace";
import { pageWithLayout } from "@/layoutTypes";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
export const getServerSideProps = withPermissionCheckSsr(async () => ({ props: {} }));
import { TeamShell, useTeam, Card, Empty, inputClass, btn, btnPrimary } from "@/components/team/teamkit";

const Links: pageWithLayout = () => {
  const t = useTeam("links");
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [form, setForm] = useState({ title: "", url: "", description: "", category: "", pinned: false });

  const shown = t.items.filter((l) => !q || `${l.title} ${l.description} ${l.category}`.toLowerCase().includes(q.toLowerCase()));
  const groups = Array.from(new Set(shown.map((l) => l.category || "General"))).sort();

  return (
    <TeamShell
      title="Links"
      description="Your team’s important links in one place: games, Discord, forms and guides."
      action={t.me.isManager && <button onClick={() => setOpen(!open)} className={btnPrimary}>{open ? "Close" : "Add link"}</button>}
    >
      {open && (
        <Card className="mb-6 grid gap-2 sm:grid-cols-2">
          <input aria-label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={100} placeholder="Title" className={inputClass} />
          <input aria-label="Link" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} maxLength={500} placeholder="https://…" className={inputClass} />
          <input aria-label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} maxLength={40} placeholder="Category, e.g. Games" list="link-cats" className={inputClass} />
          <datalist id="link-cats">{Array.from(new Set(t.items.map((l) => l.category))).map((c) => <option key={c} value={c} />)}</datalist>
          <input aria-label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={300} placeholder="Short description (optional)" className={inputClass} />
          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300"><input type="checkbox" checked={form.pinned} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} className="h-4 w-4" /> Pin to the top</label>
          <div><button disabled={!form.title.trim() || !form.url.trim()} onClick={async () => { if (await t.create(form, "Link added")) { setForm({ title: "", url: "", description: "", category: form.category, pinned: false }); setOpen(false); } }} className={btnPrimary}>Add link</button></div>
        </Card>
      )}
      <label htmlFor="link-search" className="sr-only">Search links</label>
      <input id="link-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search links…" className={`${inputClass} mb-6`} />
      {!t.loading && shown.length === 0 && <Empty>No links yet.</Empty>}
      {groups.map((g) => (
        <section key={g} className="mb-8">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">{g}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shown.filter((l) => (l.category || "General") === g).sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned)).map((l) => {
              let host = "";
              try { host = new URL(l.url).hostname.replace(/^www\./, ""); } catch {}
              return (
                <Card key={l.id} className="flex flex-col">
                  <a href={l.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-zinc-900 hover:underline dark:text-white">{l.pinned ? "📌 " : ""}{l.title} ↗</a>
                  <p className="text-xs text-zinc-500">{host}</p>
                  {l.description && <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{l.description}</p>}
                  {t.me.isManager && (
                    <div className="mt-auto flex gap-2 pt-3">
                      <button onClick={() => t.update(l.id, { pinned: !l.pinned }, l.pinned ? "Unpinned" : "Pinned")} className={btn}>{l.pinned ? "Unpin" : "Pin"}</button>
                      <button onClick={() => window.confirm("Delete this link?") && t.remove(l.id)} className={btn}>Delete</button>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </section>
      ))}
    </TeamShell>
  );
};
Links.layout = workspace;
export default Links;
