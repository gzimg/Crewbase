import { useState } from "react";
import workspace from "@/layouts/workspace";
import { pageWithLayout } from "@/layoutTypes";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
export const getServerSideProps = withPermissionCheckSsr(async () => ({ props: {} }));
import { StaffingShell, useStaffing, STAGE_LABELS } from "@/components/staffing/kit";
import { useTeam, Card, Empty, inputClass, btn, btnPrimary, ago } from "@/components/team/teamkit";

const REC: Record<string, string> = { strong_yes: "Strong yes", yes: "Yes", no: "No", strong_no: "Strong no" };
const STAGES = Object.keys(STAGE_LABELS);

const Candidates: pageWithLayout = () => {
  const { data } = useStaffing();
  const t = useTeam("candidates");
  const positions = useTeam("positions");
  const canRecruit = !!data?.can?.recruit;
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ username: "", positionId: "", source: "application" });
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [iv, setIv] = useState({ at: "", interviewers: "", location: "" });
  const [card, setCard] = useState<{ ratings: Record<string, number>; recommendation: string; notes: string }>({ ratings: {}, recommendation: "", notes: "" });
  const [showClosed, setShowClosed] = useState(false);

  if (data && !data.can?.view) return <StaffingShell title="Candidates" description=""><Empty>Only the staffing team can see candidates.</Empty></StaffingShell>;
  const c = t.items.find((x) => x.id === selected);
  const columns = STAGES.filter((s) => showClosed || !["hired", "rejected"].includes(s));

  const add = async () => {
    const pos = positions.items.find((p) => p.id === form.positionId);
    if (await t.create({ username: form.username, positionId: form.positionId, positionTitle: pos?.title || "", source: form.source }, "Candidate added")) {
      setForm({ username: "", positionId: form.positionId, source: form.source });
      setOpen(false);
    }
  };

  return (
    <StaffingShell
      title="Candidates"
      description="Your hiring pipeline: move people from application to interview to hired, with notes and interview scorecards."
      action={
        <div className="flex gap-2">
          <button onClick={() => setShowClosed(!showClosed)} aria-pressed={showClosed} className={btn}>{showClosed ? "Hide hired & rejected" : "Show hired & rejected"}</button>
          {canRecruit && <button onClick={() => setOpen(!open)} className={btnPrimary}>{open ? "Close" : "Add candidate"}</button>}
        </div>
      }
    >
      {open && (
        <Card className="mb-6 flex flex-wrap gap-2">
          <input aria-label="Roblox username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} maxLength={30} placeholder="Roblox username" className={`${inputClass} min-w-[160px] flex-1`} />
          <select aria-label="Position" value={form.positionId} onChange={(e) => setForm({ ...form, positionId: e.target.value })} className={`${inputClass} w-auto`}>
            <option value="">Position…</option>
            {positions.items.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
          <select aria-label="Source" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} className={`${inputClass} w-auto`}>
            <option value="application">Application</option><option value="referral">Referral</option><option value="discord">Discord</option><option value="headhunted">Headhunted</option><option value="other">Other</option>
          </select>
          <button disabled={!form.username.trim()} onClick={add} className={btnPrimary}>Add</button>
        </Card>
      )}

      <div className="grid gap-3 overflow-x-auto pb-2" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(180px, 1fr))` }}>
        {columns.map((stage) => {
          const list = t.items.filter((x) => (x.stage || "applied") === stage);
          return (
            <section key={stage} className="rounded-2xl bg-zinc-100 p-2 dark:bg-zinc-800/60" aria-label={STAGE_LABELS[stage]}>
              <h2 className="mb-2 flex justify-between px-1 text-sm font-semibold text-zinc-700 dark:text-zinc-200">{STAGE_LABELS[stage]}<span className="font-normal text-zinc-500">{list.length}</span></h2>
              <div className="space-y-2">
                {list.map((x) => {
                  const yes = (x.scorecards || []).filter((s: any) => s.recommendation.includes("yes")).length;
                  return (
                    <button key={x.id} onClick={() => setSelected(x.id)} className={`w-full rounded-xl border bg-white p-2.5 text-left text-sm dark:bg-zinc-800 ${selected === x.id ? "border-[#F28C28]" : "border-zinc-200 dark:border-zinc-700"}`}>
                      <p className="font-medium text-zinc-900 dark:text-white">{x.username}</p>
                      <p className="truncate text-xs text-zinc-500">{x.positionTitle || "No position"}</p>
                      {(x.scorecards || []).length > 0 && <p className="mt-1 text-xs text-zinc-500">👍 {yes}/{x.scorecards.length} scorecards</p>}
                      {x.interview?.status === "scheduled" && <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">📅 {new Date(x.interview.at).toLocaleDateString()}</p>}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
      {!t.loading && t.items.length === 0 && <div className="mt-4"><Empty>No candidates yet.</Empty></div>}

      {c && (
        <Card className="mt-6 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <a href={`https://www.roblox.com/search/users?keyword=${encodeURIComponent(c.username)}`} target="_blank" rel="noopener noreferrer" className="text-lg font-semibold text-zinc-900 underline-offset-4 hover:underline dark:text-white">{c.username}</a>
            <span className="text-sm text-zinc-500">{c.positionTitle} · {c.source} · added {ago(c.createdAt)}</span>
            <button onClick={() => setSelected(null)} className={`${btn} ml-auto`}>Close</button>
          </div>
          {canRecruit && (
            <div className="flex flex-wrap gap-2">
              {STAGES.map((s) => (
                <button key={s} onClick={() => { const reason = s === "rejected" ? window.prompt("Reason (optional, private):") ?? "" : ""; t.act(c.id, "stage", { stage: s, reason }, `Moved to ${STAGE_LABELS[s]}`); }} aria-pressed={c.stage === s} className={c.stage === s ? btnPrimary : btn}>{STAGE_LABELS[s]}</button>
              ))}
            </div>
          )}
          {c.stage === "hired" && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">Hired! Next: give them their role, and assign an onboarding checklist from Team → Onboarding.</p>}

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <h3 className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">Interview</h3>
              {c.interview ? (
                <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
                  {new Date(c.interview.at).toLocaleString()} · {c.interview.status.replace("_", " ")}{c.interview.interviewers?.length ? ` · with ${c.interview.interviewers.join(", ")}` : ""}{c.interview.location ? ` · ${c.interview.location}` : ""}
                </p>
              ) : <p className="mt-2 text-sm text-zinc-500">Not scheduled.</p>}
              {canRecruit && (
                <div className="mt-2 space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <input type="datetime-local" aria-label="Interview time" value={iv.at} onChange={(e) => setIv({ ...iv, at: e.target.value })} className={`${inputClass} w-auto`} />
                    <input aria-label="Interviewers" value={iv.interviewers} onChange={(e) => setIv({ ...iv, interviewers: e.target.value })} placeholder="Interviewers, comma separated" className={`${inputClass} min-w-[160px] flex-1`} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <input aria-label="Where" value={iv.location} onChange={(e) => setIv({ ...iv, location: e.target.value })} placeholder="Where? (Discord VC, game…)" className={`${inputClass} min-w-[160px] flex-1`} />
                    <button disabled={!iv.at} onClick={() => t.act(c.id, "interview", { at: new Date(iv.at).toISOString(), interviewers: iv.interviewers.split(",").map((s) => s.trim()).filter(Boolean), location: iv.location }, "Interview scheduled")} className={btnPrimary}>{c.interview ? "Reschedule" : "Schedule"}</button>
                  </div>
                  {c.interview && (
                    <div className="flex flex-wrap gap-2">
                      {["completed", "no_show", "cancelled"].map((s) => <button key={s} onClick={() => t.act(c.id, "interviewStatus", { status: s }, "Updated")} className={btn}>{s === "no_show" ? "No-show" : s[0].toUpperCase() + s.slice(1)}</button>)}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div>
              <h3 className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">Scorecards</h3>
              {(c.scorecards || []).length === 0 ? <p className="mt-2 text-sm text-zinc-500">No scorecards yet.</p> : (
                <ul className="mt-2 space-y-2 text-sm">
                  {c.scorecards.map((s: any, i: number) => (
                    <li key={i} className="rounded-lg bg-zinc-50 p-2 dark:bg-zinc-900/60">
                      <strong className="text-zinc-900 dark:text-white">{s.by}</strong>: {REC[s.recommendation]}
                      <span className="text-xs text-zinc-500"> · {Object.entries(s.ratings).map(([k, v]) => `${k} ${v}/5`).join(", ")}</span>
                      {s.notes && <p className="text-zinc-600 dark:text-zinc-400">{s.notes}</p>}
                    </li>
                  ))}
                </ul>
              )}
              {canRecruit && (
                <div className="mt-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    {["communication", "experience", "attitude", "judgement"].map((k) => (
                      <label key={k} className="flex items-center justify-between gap-2 text-xs capitalize text-zinc-600 dark:text-zinc-300">{k}
                        <select value={card.ratings[k] || ""} onChange={(e) => setCard({ ...card, ratings: { ...card.ratings, [k]: Number(e.target.value) } })} className="rounded border border-zinc-300 bg-white px-1 py-0.5 dark:border-zinc-600 dark:bg-zinc-900">
                          <option value="">–</option>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </label>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <select aria-label="Recommendation" value={card.recommendation} onChange={(e) => setCard({ ...card, recommendation: e.target.value })} className={`${inputClass} w-auto`}>
                      <option value="">Recommendation…</option>{Object.entries(REC).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                    <input aria-label="Scorecard notes" value={card.notes} onChange={(e) => setCard({ ...card, notes: e.target.value })} placeholder="Notes" className={`${inputClass} min-w-[140px] flex-1`} />
                    <button disabled={!card.recommendation} onClick={async () => { if (await t.act(c.id, "scorecard", card, "Scorecard saved")) setCard({ ratings: {}, recommendation: "", notes: "" }); }} className={btnPrimary}>Save</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">Notes</h3>
            <ul className="mt-2 space-y-1 text-sm">
              {(c.notes || []).map((n: any, i: number) => <li key={i} className="text-zinc-600 dark:text-zinc-400"><strong>{n.by}</strong> · {ago(n.at)}: {n.text}</li>)}
            </ul>
            {canRecruit && (
              <div className="mt-2 flex gap-2">
                <input aria-label="Note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a private note" className={inputClass} />
                <button disabled={!note.trim()} onClick={async () => { if (await t.act(c.id, "note", { text: note }, "Note added")) setNote(""); }} className={btn}>Add</button>
              </div>
            )}
            {canRecruit && <button onClick={() => window.confirm("Delete this candidate?") && t.remove(c.id).then(() => setSelected(null))} className={`${btn} mt-4`}>Delete candidate</button>}
          </div>
        </Card>
      )}
    </StaffingShell>
  );
};
Candidates.layout = workspace;
export default Candidates;
