import { useState } from "react";
import workspace from "@/layouts/workspace";
import { pageWithLayout } from "@/layoutTypes";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
export const getServerSideProps = withPermissionCheckSsr(async () => ({ props: {} }));
import { HrShell, useHrMe, StatusPill } from "@/components/hr/hrkit";
import { useTeam, useMembers, MemberSelect, Card, Empty, inputClass, btn, btnPrimary, ago, Member } from "@/components/team/teamkit";

const CATEGORIES: Record<string, string> = { conduct: "Staff conduct", harassment: "Harassment or bullying", unfair: "Unfair treatment", safety: "Safety concern", other: "Something else" };

const Complaints: pageWithLayout = () => {
  const me = useHrMe();
  const t = useTeam("complaints");
  const members = useMembers();
  const canHandle = !!me?.can.cases;
  const [form, setForm] = useState<{ subject: string; details: string; category: string; about: Member | null; anonymous: boolean }>({ subject: "", details: "", category: "conduct", about: null, anonymous: false });
  const [note, setNote] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<"open" | "all">("open");

  const send = async () => {
    const ok = await t.create({ subject: form.subject, details: form.details, category: form.category, aboutUserId: form.about?.userId, aboutUsername: form.about?.username, anonymous: form.anonymous }, "Complaint sent to HR");
    if (ok) setForm({ subject: "", details: "", category: "conduct", about: null, anonymous: false });
  };
  const list = t.items.filter((c) => filter === "all" || c.status === "new" || c.status === "investigating");

  return (
    <HrShell title="Complaints" description={canHandle ? "Concerns raised by staff. Notes are private to HR; outcomes are shared with the person who raised it." : "Raise a concern with HR privately. Only HR can see it."}>
      <Card className="mb-6 space-y-2">
        <p className="text-sm font-semibold text-zinc-900 dark:text-white">Raise a concern</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <select aria-label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputClass}>
            {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <MemberSelect id="cp-about" label="About (optional)" members={members.filter((m) => m.userId !== me?.id)} value={form.about?.userId || ""} onChange={(m) => setForm({ ...form, about: m })} />
        </div>
        <input aria-label="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} maxLength={140} placeholder="Subject" className={inputClass} />
        <textarea aria-label="Details" value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} rows={5} maxLength={4000} placeholder="What happened, when, and who was involved?" className={inputClass} />
        <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300"><input type="checkbox" checked={form.anonymous} onChange={(e) => setForm({ ...form, anonymous: e.target.checked })} className="h-4 w-4" /> Send anonymously</label>
        {form.anonymous && <p className="text-xs text-zinc-500">Your name won’t be saved, so HR can’t reply to you and you won’t see updates on it.</p>}
        <button disabled={!form.subject.trim() || form.details.trim().length < 20} onClick={send} className={btnPrimary}>Send to HR</button>
        <p className="text-xs text-zinc-500">If someone is in immediate danger, contact local emergency services. For problems with Crewbase itself, use Report a problem.</p>
      </Card>

      {(canHandle || t.items.length > 0) && (
        <>
          {canHandle && (
            <div className="mb-4 flex gap-2">
              {(["open", "all"] as const).map((f) => <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f} className={filter === f ? btnPrimary : btn}>{f === "open" ? "Open" : "All"}</button>)}
            </div>
          )}
          {list.length === 0 && <Empty>No complaints here.</Empty>}
          <div className="space-y-3">
            {list.map((c) => (
              <Card key={c.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-zinc-900 dark:text-white">{c.subject}</span>
                  <span className="text-xs text-zinc-500">{CATEGORIES[c.category]} · {c.anonymous ? "Anonymous" : c.createdByName} · {ago(c.createdAt)}</span>
                  <span className="ml-auto"><StatusPill status={c.status} /></span>
                </div>
                {c.aboutUsername && <p className="mt-1 text-xs text-zinc-500">About: <strong>{c.aboutUsername}</strong></p>}
                <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-800 dark:text-zinc-200">{c.details}</p>
                {c.outcome && <p className="mt-3 rounded-lg bg-zinc-50 p-3 text-sm text-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-300"><strong>Outcome:</strong> {c.outcome}</p>}
                {canHandle && (
                  <>
                    {(c.notes || []).length > 0 && (
                      <ul className="mt-3 space-y-1 border-l-2 border-zinc-200 pl-3 text-sm dark:border-zinc-700">
                        {c.notes.map((n: any, i: number) => <li key={i} className="text-zinc-600 dark:text-zinc-400"><strong>{n.by}</strong> · {ago(n.at)}: {n.text}</li>)}
                      </ul>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <input aria-label="Private note" value={note[c.id] || ""} onChange={(e) => setNote({ ...note, [c.id]: e.target.value })} placeholder="Private HR note" className={`${inputClass} min-w-[200px] flex-1`} />
                      <button disabled={!note[c.id]?.trim()} onClick={async () => { if (await t.act(c.id, "note", { text: note[c.id] }, "Note added")) setNote({ ...note, [c.id]: "" }); }} className={btn}>Add note</button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {c.status === "new" && <button onClick={() => t.act(c.id, "status", { status: "investigating" }, "Marked as investigating")} className={btn}>Start investigating</button>}
                      {c.status !== "resolved" && c.status !== "closed" && (
                        <button onClick={() => { const outcome = window.prompt("Outcome to share with them (optional):") ?? ""; t.act(c.id, "status", { status: "resolved", outcome }, "Resolved"); }} className={btnPrimary}>Resolve</button>
                      )}
                      {c.status !== "closed" && <button onClick={() => t.act(c.id, "status", { status: "closed" }, "Closed")} className={btn}>Close without action</button>}
                    </div>
                  </>
                )}
              </Card>
            ))}
          </div>
        </>
      )}
    </HrShell>
  );
};
Complaints.layout = workspace;
export default Complaints;
