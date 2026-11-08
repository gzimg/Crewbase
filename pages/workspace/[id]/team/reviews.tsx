import { useState } from "react";
import workspace from "@/layouts/workspace";
import { pageWithLayout } from "@/layoutTypes";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
export const getServerSideProps = withPermissionCheckSsr(async () => ({ props: {} }));
import { TeamShell, useTeam, useMembers, MemberSelect, Card, Empty, inputClass, btn, btnPrimary, ago, Member } from "@/components/team/teamkit";

const AREAS = ["reliability", "communication", "activity", "teamwork", "leadership"];

function Stars({ value, onChange, label }: { value: number; onChange?: (n: number) => void; label: string }) {
  return (
    <span className="inline-flex" role={onChange ? "radiogroup" : "img"} aria-label={`${label}: ${value || 0} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          role={onChange ? "radio" : undefined}
          aria-checked={onChange ? value === n : undefined}
          aria-label={onChange ? `${n} star${n > 1 ? "s" : ""}` : undefined}
          onClick={() => onChange?.(n)}
          className={`text-lg leading-none ${n <= value ? "text-amber-400" : "text-zinc-300 dark:text-zinc-600"} disabled:cursor-default`}
        >
          ★
        </button>
      ))}
    </span>
  );
}

const Reviews: pageWithLayout = () => {
  const reviews = useTeam("reviews");
  const feedback = useTeam("feedback");
  const members = useMembers();
  const isManager = reviews.me.isManager;
  const [open, setOpen] = useState(false);
  const blank = { member: null as Member | null, period: "", ratings: {} as Record<string, number>, strengths: "", improvements: "", goals: "", shared: true };
  const [form, setForm] = useState(blank);
  const [fb, setFb] = useState({ text: "", category: "idea", anonymous: false });

  const save = async () => {
    if (!form.member) return;
    const ok = await reviews.create({ userId: form.member.userId, username: form.member.username, period: form.period, ratings: form.ratings, strengths: form.strengths, improvements: form.improvements, goals: form.goals, shared: form.shared }, "Review saved");
    if (ok) { setForm(blank); setOpen(false); }
  };

  const average = (r: Record<string, number>) => {
    const v = Object.values(r || {});
    return v.length ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(1) : "–";
  };

  return (
    <TeamShell
      title="Reviews & feedback"
      description={isManager ? "Write staff performance reviews and read feedback from your team." : "See reviews shared with you, and send feedback to leadership."}
      action={isManager && <button onClick={() => setOpen(!open)} className={btnPrimary}>{open ? "Close" : "Write a review"}</button>}
    >
      {open && (
        <Card className="mb-6 space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <MemberSelect id="review-member" members={members} value={form.member?.userId || ""} onChange={(m) => setForm({ ...form, member: m })} />
            <input aria-label="Review period" value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} maxLength={60} placeholder="Period, e.g. November 2026" className={inputClass} />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {AREAS.map((a) => (
              <div key={a} className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 text-sm capitalize dark:bg-zinc-900/60">
                <span className="text-zinc-700 dark:text-zinc-300">{a}</span>
                <Stars label={a} value={form.ratings[a] || 0} onChange={(n) => setForm({ ...form, ratings: { ...form.ratings, [a]: n } })} />
              </div>
            ))}
          </div>
          <textarea aria-label="Strengths" value={form.strengths} onChange={(e) => setForm({ ...form, strengths: e.target.value })} rows={3} maxLength={2000} placeholder="What they’re doing well" className={inputClass} />
          <textarea aria-label="Areas to improve" value={form.improvements} onChange={(e) => setForm({ ...form, improvements: e.target.value })} rows={3} maxLength={2000} placeholder="What they could improve" className={inputClass} />
          <textarea aria-label="Goals" value={form.goals} onChange={(e) => setForm({ ...form, goals: e.target.value })} rows={2} maxLength={2000} placeholder="Goals for next period (optional)" className={inputClass} />
          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input type="checkbox" checked={form.shared} onChange={(e) => setForm({ ...form, shared: e.target.checked })} className="h-4 w-4" />
            Share this review with them
          </label>
          <button disabled={!form.member} onClick={save} className={btnPrimary}>Save review</button>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <h2 className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">{isManager ? "All reviews" : "Your reviews"}</h2>
          {!reviews.loading && reviews.items.length === 0 && <Empty>{isManager ? "No reviews yet." : "No reviews have been shared with you yet."}</Empty>}
          {reviews.items.map((r) => (
            <Card key={r.id}>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-zinc-900 dark:text-white">{r.username || r.userId}</p>
                <span className="text-sm text-zinc-500">{r.period}</span>
                <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">★ {average(r.ratings)}</span>
              </div>
              <div className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
                {Object.entries(r.ratings || {}).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between capitalize text-zinc-600 dark:text-zinc-400">{k} <Stars label={k} value={v as number} /></div>
                ))}
              </div>
              {r.strengths && <p className="mt-3 text-sm text-zinc-700 dark:text-zinc-300"><strong>Strengths:</strong> {r.strengths}</p>}
              {r.improvements && <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300"><strong>To improve:</strong> {r.improvements}</p>}
              {r.goals && <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300"><strong>Goals:</strong> {r.goals}</p>}
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                <span>By {r.createdByName || "leadership"} · {ago(r.createdAt)}</span>
                {isManager && <span>· {r.shared ? "Shared with them" : "Private"}</span>}
                {r.acknowledgedAt && <span className="text-emerald-600 dark:text-emerald-400">· Acknowledged</span>}
                {!isManager && r.userId === reviews.me.id && !r.acknowledgedAt && (
                  <button onClick={() => reviews.act(r.id, "acknowledge", {}, "Thanks!")} className={`${btnPrimary} ml-auto`}>Acknowledge</button>
                )}
                {isManager && (
                  <>
                    <button onClick={() => reviews.update(r.id, { shared: !r.shared }, r.shared ? "Now private" : "Shared")} className={`${btn} ml-auto`}>{r.shared ? "Make private" : "Share"}</button>
                    <button onClick={() => window.confirm("Delete this review?") && reviews.remove(r.id)} className={btn}>Delete</button>
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>

        <div className="space-y-4">
          <h2 className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">Feedback for leadership</h2>
          <Card className="space-y-2">
            <select aria-label="Type of feedback" value={fb.category} onChange={(e) => setFb({ ...fb, category: e.target.value })} className={inputClass}>
              <option value="idea">💡 Idea</option>
              <option value="concern">⚠️ Concern</option>
              <option value="praise">🙌 Praise</option>
              <option value="other">💬 Other</option>
            </select>
            <textarea aria-label="Your feedback" value={fb.text} onChange={(e) => setFb({ ...fb, text: e.target.value })} rows={4} maxLength={2000} placeholder="What’s on your mind?" className={inputClass} />
            <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
              <input type="checkbox" checked={fb.anonymous} onChange={(e) => setFb({ ...fb, anonymous: e.target.checked })} className="h-4 w-4" />
              Send anonymously
            </label>
            {fb.anonymous && <p className="text-xs text-zinc-500">Your name isn’t saved with anonymous feedback, so nobody, including you, can see who sent it.</p>}
            <button disabled={fb.text.trim().length < 5} onClick={async () => { if (await feedback.create(fb, "Feedback sent")) setFb({ text: "", category: fb.category, anonymous: fb.anonymous }); }} className={btnPrimary}>Send feedback</button>
          </Card>
          {(isManager || feedback.items.length > 0) && (
            <>
              {isManager && !feedback.loading && feedback.items.length === 0 && <Empty>No feedback yet.</Empty>}
              {feedback.items.map((f) => (
                <Card key={f.id} className={f.status === "done" ? "opacity-60" : ""}>
                  <p className="text-xs text-zinc-500">{f.category} · {f.anonymous ? "Anonymous" : f.createdByName} · {ago(f.createdAt)} · {f.status}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-800 dark:text-zinc-200">{f.text}</p>
                  {f.reply && <p className="mt-2 text-sm text-zinc-500">Reply: {f.reply}</p>}
                  {isManager && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {f.status !== "seen" && f.status !== "done" && <button onClick={() => feedback.act(f.id, "status", { status: "seen" })} className={btn}>Mark seen</button>}
                      {f.status !== "done" && (
                        <button
                          onClick={() => { const reply = f.anonymous ? "" : window.prompt("Reply to them (optional):") || ""; feedback.act(f.id, "status", { status: "done", reply }, "Marked done"); }}
                          className={btn}
                        >
                          Done
                        </button>
                      )}
                      <button onClick={() => window.confirm("Delete this feedback?") && feedback.remove(f.id)} className={btn}>Delete</button>
                    </div>
                  )}
                </Card>
              ))}
            </>
          )}
        </div>
      </div>
    </TeamShell>
  );
};
Reviews.layout = workspace;
export default Reviews;
