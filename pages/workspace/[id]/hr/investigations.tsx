import { useState } from "react";
import workspace from "@/layouts/workspace";
import { pageWithLayout } from "@/layoutTypes";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
export const getServerSideProps = withPermissionCheckSsr(async () => ({ props: {} }));
import { HrShell, useHrMe, StatusPill } from "@/components/hr/hrkit";
import { useTeam, useMembers, MemberSelect, Card, Empty, inputClass, btn, btnPrimary, ago, Member } from "@/components/team/teamkit";

const PRIORITY: Record<string, string> = { low: "text-zinc-500", normal: "text-sky-600 dark:text-sky-400", high: "text-amber-600 dark:text-amber-400", urgent: "font-semibold text-red-600 dark:text-red-400" };
const OUTCOMES: Record<string, string> = { substantiated: "Substantiated", unsubstantiated: "Unsubstantiated", inconclusive: "Inconclusive" };

const Investigations: pageWithLayout = () => {
  const me = useHrMe();
  const t = useTeam("investigations");
  const complaints = useTeam("complaints");
  const members = useMembers();
  const canEdit = !!me?.can.cases;
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{ title: string; summary: string; priority: string; subjects: Member[]; complaintId: string; assignee: string }>({ title: "", summary: "", priority: "normal", subjects: [], complaintId: "", assignee: "" });
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [ev, setEv] = useState({ url: "", label: "" });
  const [filter, setFilter] = useState<"open" | "closed">("open");

  if (me && !(me.can.cases || me.can.view)) return <HrShell title="Investigations" description=""><Empty>Only HR can see investigations.</Empty></HrShell>;
  const isOpen = (i: any) => i.status === "open" || i.status === "in_progress";
  const list = t.items.filter((i) => (filter === "open" ? isOpen(i) : !isOpen(i)));
  const inv = t.items.find((i) => i.id === selected);

  const create = async () => {
    const ok = await t.create({ title: form.title, summary: form.summary, priority: form.priority, subjects: form.subjects.map((m) => ({ userId: m.userId, username: m.username })), complaintId: form.complaintId, assignee: form.assignee }, "Investigation opened");
    if (ok) { setForm({ title: "", summary: "", priority: "normal", subjects: [], complaintId: "", assignee: "" }); setOpen(false); }
  };

  return (
    <HrShell
      title="Investigations"
      description="A proper case file when something needs looking into: who’s involved, a timeline of what you find, evidence links, and a fair conclusion."
      action={canEdit && <button onClick={() => setOpen(!open)} className={btnPrimary}>{open ? "Close" : "Open investigation"}</button>}
    >
      {open && (
        <Card className="mb-6 space-y-2">
          <input aria-label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={140} placeholder="Title, e.g. Reports of abuse of moderator powers" className={inputClass} />
          <textarea aria-label="Summary" value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} rows={3} maxLength={3000} placeholder="What are you looking into?" className={inputClass} />
          <div className="grid gap-2 sm:grid-cols-3">
            <select aria-label="Priority" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className={inputClass}>
              <option value="low">Low priority</option><option value="normal">Normal priority</option><option value="high">High priority</option><option value="urgent">Urgent</option>
            </select>
            <select aria-label="Linked complaint" value={form.complaintId} onChange={(e) => setForm({ ...form, complaintId: e.target.value })} className={inputClass}>
              <option value="">No linked complaint</option>
              {complaints.items.map((c) => <option key={c.id} value={c.id}>{c.subject}</option>)}
            </select>
            <input aria-label="Lead investigator" value={form.assignee} onChange={(e) => setForm({ ...form, assignee: e.target.value })} maxLength={50} placeholder="Lead investigator" className={inputClass} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="min-w-[200px] flex-1"><MemberSelect id="inv-subject" label="Add someone involved" members={members.filter((m) => !form.subjects.some((s) => s.userId === m.userId))} value="" onChange={(m) => m && setForm({ ...form, subjects: [...form.subjects, m] })} /></div>
            {form.subjects.map((s) => <button key={s.userId} onClick={() => setForm({ ...form, subjects: form.subjects.filter((x) => x.userId !== s.userId) })} className="rounded-full border border-zinc-300 px-2.5 py-1 text-xs dark:border-zinc-600 dark:text-zinc-200">{s.username} ×</button>)}
          </div>
          <button disabled={!form.title.trim()} onClick={create} className={btnPrimary}>Open investigation</button>
        </Card>
      )}

      <div className="mb-4 flex gap-2">
        {(["open", "closed"] as const).map((f) => <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f} className={filter === f ? btnPrimary : btn}>{f === "open" ? "Open" : "Closed"}</button>)}
      </div>
      {!t.loading && list.length === 0 && <Empty>No {filter} investigations.</Empty>}
      <div className="space-y-3">
        {list.map((i) => (
          <button key={i.id} onClick={() => setSelected(selected === i.id ? null : i.id)} className="w-full rounded-2xl border border-zinc-200 bg-white p-5 text-left hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-zinc-900 dark:text-white">{i.title}</span>
              <span className={`text-xs capitalize ${PRIORITY[i.priority]}`}>{i.priority}</span>
              <span className="ml-auto"><StatusPill status={isOpen(i) ? (i.status === "in_progress" ? "investigating" : "new") : i.status === "substantiated" ? "resolved" : "closed"} /></span>
            </div>
            <p className="mt-1 text-xs text-zinc-500">{(i.subjects || []).map((s: any) => s.username).join(", ") || "Nobody named"} · opened {ago(i.createdAt)}{i.assignee ? ` · lead: ${i.assignee}` : ""}</p>
          </button>
        ))}
      </div>

      {inv && (
        <Card className="mt-6 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">{inv.title}</h2>
            <button onClick={() => setSelected(null)} className={`${btn} ml-auto`}>Close</button>
          </div>
          {inv.summary && <p className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">{inv.summary}</p>}
          {inv.complaintId && <p className="text-xs text-zinc-500">Linked complaint: {complaints.items.find((c) => c.id === inv.complaintId)?.subject || "removed"}</p>}
          <div>
            <h3 className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">Timeline</h3>
            <ol className="mt-2 space-y-2 border-l-2 border-zinc-200 pl-4 text-sm dark:border-zinc-700">
              <li className="text-zinc-500">Opened by {inv.createdByName} · {new Date(inv.createdAt).toLocaleString()}</li>
              {(inv.timeline || []).map((n: any, k: number) => <li key={k} className="text-zinc-700 dark:text-zinc-300"><strong>{n.by}</strong> · {new Date(n.at).toLocaleString()}<br />{n.text}</li>)}
            </ol>
            {canEdit && isOpen(inv) && (
              <div className="mt-2 flex gap-2">
                <input aria-label="Timeline entry" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add to the timeline: interviews, findings, steps taken" className={inputClass} />
                <button disabled={!note.trim()} onClick={async () => { if (await t.act(inv.id, "note", { text: note }, "Added")) setNote(""); }} className={btn}>Add</button>
              </div>
            )}
          </div>
          <div>
            <h3 className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">Evidence</h3>
            <ul className="mt-2 space-y-1 text-sm">
              {(inv.evidence || []).length === 0 && <li className="text-zinc-500">No evidence linked.</li>}
              {(inv.evidence || []).map((e: any, k: number) => <li key={k}><a href={e.url} target="_blank" rel="noopener noreferrer" className="underline">{e.label || e.url}</a> <span className="text-xs text-zinc-500">· {e.by}</span></li>)}
            </ul>
            {canEdit && isOpen(inv) && (
              <div className="mt-2 flex flex-wrap gap-2">
                <input aria-label="Evidence link" value={ev.url} onChange={(e) => setEv({ ...ev, url: e.target.value })} placeholder="https:// link to a screenshot, video or message" className={`${inputClass} min-w-[200px] flex-1`} />
                <input aria-label="Label" value={ev.label} onChange={(e) => setEv({ ...ev, label: e.target.value })} placeholder="Label" className={`${inputClass} w-40`} />
                <button disabled={!ev.url.trim()} onClick={async () => { if (await t.act(inv.id, "evidence", ev, "Evidence added")) setEv({ url: "", label: "" }); }} className={btn}>Add</button>
              </div>
            )}
          </div>
          {!isOpen(inv) && (
            <div className="rounded-lg bg-zinc-50 p-3 text-sm text-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-300">
              <p><strong>{OUTCOMES[inv.status]}</strong>{inv.closedAt ? ` · ${new Date(inv.closedAt).toLocaleDateString()}` : ""}</p>
              {inv.findings && <p className="mt-1"><strong>Findings:</strong> {inv.findings}</p>}
              {inv.outcome && <p className="mt-1"><strong>Outcome:</strong> {inv.outcome}</p>}
            </div>
          )}
          {canEdit && (
            <div className="flex flex-wrap gap-2">
              {inv.status === "open" && <button onClick={() => t.act(inv.id, "close", { status: "in_progress" }, "Marked in progress")} className={btn}>Mark in progress</button>}
              {isOpen(inv) && Object.entries(OUTCOMES).map(([k, v]) => (
                <button key={k} onClick={() => { const findings = window.prompt("Findings: what did you conclude?") ?? ""; const outcome = window.prompt("Outcome: what happens now? (e.g. infraction issued)") ?? ""; t.act(inv.id, "close", { status: k, findings, outcome }, "Investigation closed"); }} className={btn}>Close as {v.toLowerCase()}</button>
              ))}
              {!isOpen(inv) && <button onClick={() => t.act(inv.id, "close", { status: "open" }, "Reopened")} className={btn}>Reopen</button>}
            </div>
          )}
        </Card>
      )}
    </HrShell>
  );
};
Investigations.layout = workspace;
export default Investigations;
